package com.lgableband.app;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/app")
public class AppStatusController {

	@GetMapping("/status")
	public Map<String, String> status() {
		return Map.of(
			"service", "lg-able-band-backend",
			"module", "app",
			"status", "running"
		);
	}
}
