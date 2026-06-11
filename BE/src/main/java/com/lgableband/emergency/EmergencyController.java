package com.lgableband.emergency;

import com.lgableband.emergency.EmergencyService.CreateEmergencyCommand;
import com.lgableband.mock.MockDataStore;
import com.lgableband.mock.MockDataStore.EmergencyRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/emergency-requests")
public class EmergencyController {

	private final MockDataStore store;
	private final EmergencyService service;

	public EmergencyController(MockDataStore store, EmergencyService service) {
		this.store = store;
		this.service = service;
	}

	@PostMapping
	public ResponseEntity<EmergencyRequest> create(
		@RequestHeader("Authorization") String authorization,
		@Valid @RequestBody EmergencyRequestBody request
	) {
		long userId = this.store.requireUser(authorization).userId();
		return ResponseEntity.status(HttpStatus.CREATED)
			.body(this.service.create(userId, request.toCommand()));
	}

	@GetMapping
	public EmergencyRequestListResponse list(@RequestHeader("Authorization") String authorization) {
		long userId = this.store.requireUser(authorization).userId();
		return new EmergencyRequestListResponse(this.store.emergencies(userId));
	}

	@GetMapping("/{emergencyRequestId}")
	public EmergencyRequest detail(
		@RequestHeader("Authorization") String authorization,
		@PathVariable long emergencyRequestId
	) {
		long userId = this.store.requireUser(authorization).userId();
		return this.store.emergency(userId, emergencyRequestId);
	}

	@PatchMapping("/{emergencyRequestId}/status")
	public EmergencyRequest updateStatus(
		@RequestHeader("Authorization") String authorization,
		@PathVariable long emergencyRequestId,
		@Valid @RequestBody EmergencyStatusBody request
	) {
		long userId = this.store.requireUser(authorization).userId();
		return this.store.updateEmergencyStatus(userId, emergencyRequestId, request.status());
	}

	public record EmergencyRequestBody(
		@NotBlank String message,
		@NotBlank @Pattern(regexp = "APP|WEARABLE") String source,
		String triggerType,
		Integer pressCount,
		String riskLevel,
		Integer riskScore,
		String location,
		String userResponse
	) {
		CreateEmergencyCommand toCommand() {
			return new CreateEmergencyCommand(message, source, triggerType, pressCount, riskLevel, riskScore, location, userResponse);
		}
	}

	public record EmergencyRequestListResponse(List<EmergencyRequest> items) {
	}

	public record EmergencyStatusBody(
		@NotBlank @Pattern(regexp = "SENT|ACKNOWLEDGED|RESOLVED|CANCELED") String status
	) {
	}
}
