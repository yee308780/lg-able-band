package com.lgableband.status;

import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class BackendStatusController {

	@GetMapping("/status")
	public Map<String, Object> status() {
		return Map.of(
			"service", "lg-able-band-backend",
			"status", "running",
			"modules", List.of("app", "wearable")
		);
	}
}
