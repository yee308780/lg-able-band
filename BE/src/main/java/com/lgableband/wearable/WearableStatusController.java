package com.lgableband.wearable;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/wearable")
public class WearableStatusController {

	@GetMapping("/status")
	public Map<String, String> status() {
		return Map.of(
			"service", "lg-able-band-backend",
			"module", "wearable",
			"status", "running"
		);
	}
}
