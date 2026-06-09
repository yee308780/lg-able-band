package com.lgableband.status;

import com.lgableband.config.AivenDatabaseProperties;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/db")
public class DatabaseStatusController {

	private final ObjectProvider<JdbcTemplate> jdbcTemplateProvider;
	private final AivenDatabaseProperties properties;

	public DatabaseStatusController(
		ObjectProvider<JdbcTemplate> jdbcTemplateProvider,
		AivenDatabaseProperties properties
	) {
		this.jdbcTemplateProvider = jdbcTemplateProvider;
		this.properties = properties;
	}

	@GetMapping("/status")
	public ResponseEntity<Map<String, Object>> status() {
		JdbcTemplate jdbcTemplate = this.jdbcTemplateProvider.getIfAvailable();
		if (jdbcTemplate == null) {
			return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
				"connected", false,
				"database", "unconfigured",
				"message", "Set DB_HOST, DB_PORT, DB_NAME, DB_USER, and DB_PASSWORD in BE/.env.",
				"sslMode", "REQUIRED"
			));
		}

		try {
			String databaseName = jdbcTemplate.queryForObject("SELECT DATABASE()", String.class);
			Integer ping = jdbcTemplate.queryForObject("SELECT 1", Integer.class);

			Map<String, Object> payload = new LinkedHashMap<>();
			payload.put("connected", true);
			payload.put("database", databaseName);
			payload.put("configuredDatabase", this.properties.getName());
			payload.put("host", this.properties.getHost());
			payload.put("port", this.properties.getPort());
			payload.put("sslMode", "REQUIRED");
			payload.put("ping", ping);
			return ResponseEntity.ok(payload);
		}
		catch (Exception ex) {
			return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
				"connected", false,
				"database", this.properties.getName(),
				"host", this.properties.getHost(),
				"port", this.properties.getPort(),
				"sslMode", "REQUIRED",
				"message", ex.getMessage() == null ? "Failed to connect to MySQL." : ex.getMessage()
			));
		}
	}
}
