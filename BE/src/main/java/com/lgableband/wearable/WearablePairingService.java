package com.lgableband.wearable;

import com.lgableband.auth.MvpDataService;
import com.lgableband.common.ApiException;
import com.lgableband.common.DeviceType;
import com.lgableband.device.DeviceService;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class WearablePairingService {

	private static final Duration SESSION_TTL = Duration.ofMinutes(5);
	private static final String DEFAULT_VENDOR = "LG";

	private final MvpDataService dataService;
	private final DeviceService deviceService;
	private final ConcurrentMap<String, PairingSession> sessions = new ConcurrentHashMap<>();

	public WearablePairingService(MvpDataService dataService, DeviceService deviceService) {
		this.dataService = dataService;
		this.deviceService = deviceService;
	}

	public PairingSessionResponse createSession(String deviceId, String deviceName, String pairingCode) {
		OffsetDateTime issuedAt = now();
		OffsetDateTime expiresAt = issuedAt.plus(SESSION_TTL);
		PairingSession session = new PairingSession(
			"pairing-" + UUID.randomUUID(),
			deviceId,
			deviceName.isBlank() ? "LG Able Band" : deviceName,
			pairingCode,
			UUID.randomUUID().toString(),
			issuedAt,
			expiresAt
		);

		this.sessions.put(session.pairingSessionId(), session);
		return sessionResponse(session);
	}

	public PairingSessionStatusResponse status(String pairingSessionId, String deviceId, String nonce) {
		PairingSession session = session(pairingSessionId);
		validateDeviceSecret(session, deviceId, nonce);
		PairingStatus status = currentStatus(session);

		return new PairingSessionStatusResponse(
			session.pairingSessionId(),
			session.deviceId(),
			session.deviceName(),
			session.pairingCode(),
			status,
			session.pairedAt(),
			session.device() == null ? null : session.device().deviceId(),
			status == PairingStatus.PAIRED ? session.accessToken() : null
		);
	}

	public PairingCompleteResponse complete(
		String authorization,
		String pairingSessionId,
		String deviceId,
		String pairingCode,
		String nonce
	) {
		MvpDataService.CurrentUser user = this.dataService.currentUser(authorization);
		PairingSession session = session(pairingSessionId);
		validatePairingPayload(session, deviceId, pairingCode, nonce);

		if (currentStatus(session) == PairingStatus.EXPIRED) {
			throw new ApiException(HttpStatus.CONFLICT, "PAIRING_EXPIRED", "웨어러블 연동 시간이 만료되었습니다.");
		}

		if (session.status() == PairingStatus.PAIRED) {
			if (session.linkedUserId() == user.userId()) {
				return completeResponse(session);
			}
			throw new ApiException(HttpStatus.CONFLICT, "PAIRING_ALREADY_COMPLETED", "이미 완료된 웨어러블 연동입니다.");
		}

		DeviceService.DeviceSummary device = this.deviceService.createDevice(
			authorization,
			new DeviceService.DeviceCreateRequest(
				DEFAULT_VENDOR,
				session.deviceId(),
				session.deviceName(),
				DeviceType.WEARABLE,
				false,
				true
			)
		);
		PairingSession paired = session.pair(
			user.userId(),
			device,
			bearerToken(authorization),
			now()
		);
		this.sessions.put(pairingSessionId, paired);
		return completeResponse(paired);
	}

	private PairingSession session(String pairingSessionId) {
		PairingSession session = this.sessions.get(pairingSessionId);
		if (session == null) {
			throw new ApiException(HttpStatus.NOT_FOUND, "PAIRING_SESSION_NOT_FOUND", "웨어러블 연동 세션을 찾을 수 없습니다.");
		}
		return session;
	}

	private void validateDeviceSecret(PairingSession session, String deviceId, String nonce) {
		if (!session.deviceId().equals(deviceId) || !session.nonce().equals(nonce)) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PAIRING_PAYLOAD", "연동 QR 정보가 올바르지 않습니다.");
		}
	}

	private void validatePairingPayload(PairingSession session, String deviceId, String pairingCode, String nonce) {
		validateDeviceSecret(session, deviceId, nonce);
		if (!session.pairingCode().equals(pairingCode)) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PAIRING_PAYLOAD", "연동 QR 정보가 올바르지 않습니다.");
		}
	}

	private PairingStatus currentStatus(PairingSession session) {
		if (session.status() == PairingStatus.PAIRED) {
			return PairingStatus.PAIRED;
		}

		if (now().isAfter(session.expiresAt())) {
			return PairingStatus.EXPIRED;
		}

		return PairingStatus.WAITING;
	}

	private PairingSessionResponse sessionResponse(PairingSession session) {
		return new PairingSessionResponse(
			session.pairingSessionId(),
			session.deviceId(),
			session.deviceName(),
			session.pairingCode(),
			session.nonce(),
			session.issuedAt(),
			session.expiresAt(),
			(int) SESSION_TTL.toMinutes(),
			PairingStatus.WAITING,
			pairingPayload(session)
		);
	}

	private PairingCompleteResponse completeResponse(PairingSession session) {
		return new PairingCompleteResponse(
			session.pairingSessionId(),
			PairingStatus.PAIRED,
			session.device(),
			session.accessToken(),
			"웨어러블 연동이 완료되었습니다."
		);
	}

	private String pairingPayload(PairingSession session) {
		return "lg-able-band://pair"
			+ "?pairingSessionId=" + url(session.pairingSessionId())
			+ "&deviceId=" + url(session.deviceId())
			+ "&deviceName=" + url(session.deviceName())
			+ "&pairingCode=" + url(session.pairingCode())
			+ "&nonce=" + url(session.nonce())
			+ "&issuedAt=" + url(session.issuedAt().toString())
			+ "&expiresAt=" + url(session.expiresAt().toString())
			+ "&source=wearable";
	}

	private String bearerToken(String authorization) {
		String prefix = "Bearer ";
		if (authorization != null && authorization.startsWith(prefix)) {
			return authorization.substring(prefix.length());
		}
		return authorization;
	}

	private String url(String value) {
		return URLEncoder.encode(value, StandardCharsets.UTF_8);
	}

	private OffsetDateTime now() {
		return OffsetDateTime.now(ZoneOffset.ofHours(9));
	}

	public enum PairingStatus {
		WAITING,
		PAIRED,
		EXPIRED,
		INVALID
	}

	public record PairingSessionResponse(
		String pairingSessionId,
		String deviceId,
		String deviceName,
		String pairingCode,
		String nonce,
		OffsetDateTime issuedAt,
		OffsetDateTime expiresAt,
		int expiresInMinutes,
		PairingStatus status,
		String pairingPayload
	) {
	}

	public record PairingSessionStatusResponse(
		String pairingSessionId,
		String deviceId,
		String deviceName,
		String pairingCode,
		PairingStatus status,
		OffsetDateTime pairedAt,
		Long linkedDeviceId,
		String accessToken
	) {
	}

	public record PairingCompleteResponse(
		String pairingSessionId,
		PairingStatus status,
		DeviceService.DeviceSummary device,
		String accessToken,
		String message
	) {
	}

	private record PairingSession(
		String pairingSessionId,
		String deviceId,
		String deviceName,
		String pairingCode,
		String nonce,
		OffsetDateTime issuedAt,
		OffsetDateTime expiresAt,
		PairingStatus status,
		Long linkedUserId,
		DeviceService.DeviceSummary device,
		String accessToken,
		OffsetDateTime pairedAt
	) {

		private PairingSession(
			String pairingSessionId,
			String deviceId,
			String deviceName,
			String pairingCode,
			String nonce,
			OffsetDateTime issuedAt,
			OffsetDateTime expiresAt
		) {
			this(
				pairingSessionId,
				deviceId,
				deviceName,
				pairingCode,
				nonce,
				issuedAt,
				expiresAt,
				PairingStatus.WAITING,
				null,
				null,
				null,
				null
			);
		}

		private PairingSession pair(
			long linkedUserId,
			DeviceService.DeviceSummary device,
			String accessToken,
			OffsetDateTime pairedAt
		) {
			return new PairingSession(
				this.pairingSessionId,
				this.deviceId,
				this.deviceName,
				this.pairingCode,
				this.nonce,
				this.issuedAt,
				this.expiresAt,
				PairingStatus.PAIRED,
				linkedUserId,
				device,
				accessToken,
				pairedAt
			);
		}
	}
}
