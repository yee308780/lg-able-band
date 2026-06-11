package com.lgableband.emergency;

import com.lgableband.emergency.EmergencyAiClient.EmergencyAiRequest;
import com.lgableband.emergency.EmergencyAiClient.EmergencyAiResponse;
import com.lgableband.mock.MockDataStore;
import com.lgableband.mock.MockDataStore.EmergencyRequest;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class EmergencyService {

	private final EmergencyAiClient aiClient;
	private final MockDataStore store;

	public EmergencyService(EmergencyAiClient aiClient, MockDataStore store) {
		this.aiClient = aiClient;
		this.store = store;
	}

	public EmergencyRequest create(long userId, CreateEmergencyCommand command) {
		String triggerType = hasText(command.triggerType())
			? command.triggerType()
			: "APP".equalsIgnoreCase(command.source()) ? "MANUAL_REQUEST" : "SOS_BUTTON";

		EmergencyAiRequest aiRequest = new EmergencyAiRequest(
			userId,
			command.source(),
			triggerType,
			command.pressCount(),
			command.riskLevel(),
			command.riskScore(),
			command.location(),
			command.userResponse(),
			command.message()
		);

		return this.aiClient.judge(aiRequest)
			.map(response -> saveAiJudgment(userId, command.source(), response))
			.orElseGet(() -> saveFallback(userId, command));
	}

	private EmergencyRequest saveAiJudgment(long userId, String source, EmergencyAiResponse response) {
		return this.store.createEmergency(
			userId,
			mapStatus(response.emergencyStatus()),
			defaultValue(response.message(), "보호자에게 긴급 요청을 보냈습니다."),
			source,
			response.notifyGuardian(),
			"AI",
			defaultValue(response.emergencyLevel(), "CRITICAL"),
			response.recommendedChannels() == null ? List.of() : List.copyOf(response.recommendedChannels()),
			defaultValue(response.vibrationPattern(), "SOS_REPEAT"),
			defaultValue(response.screenMode(), "EMERGENCY_FULL_SCREEN")
		);
	}

	private EmergencyRequest saveFallback(long userId, CreateEmergencyCommand command) {
		// A manually pressed SOS must still be delivered when the AI service is unavailable.
		return this.store.createEmergency(
			userId,
			"SENT",
			command.message(),
			command.source(),
			true,
			"FALLBACK",
			"CRITICAL",
			List.of("GUARDIAN_PUSH", "BAND_VIBRATION", "APP_SCREEN"),
			"SOS_REPEAT",
			"EMERGENCY_FULL_SCREEN"
		);
	}

	private String mapStatus(String aiStatus) {
		if ("PENDING_CONFIRMATION".equalsIgnoreCase(aiStatus)
			|| "WATCHING".equalsIgnoreCase(aiStatus)
			|| "NONE".equalsIgnoreCase(aiStatus)) {
			return "PENDING";
		}
		return "SENT";
	}

	private String defaultValue(String value, String fallback) {
		return hasText(value) ? value : fallback;
	}

	private boolean hasText(String value) {
		return value != null && !value.isBlank();
	}

	public record CreateEmergencyCommand(
		String message,
		String source,
		String triggerType,
		Integer pressCount,
		String riskLevel,
		Integer riskScore,
		String location,
		String userResponse
	) {
	}
}
