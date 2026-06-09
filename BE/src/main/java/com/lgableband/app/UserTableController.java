package com.lgableband.app;

import java.sql.ResultSetMetaData;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/app")
public class UserTableController {

	private static final String USERS_QUERY = "SELECT * FROM users LIMIT 100";

	private final ObjectProvider<JdbcTemplate> jdbcTemplateProvider;

	public UserTableController(ObjectProvider<JdbcTemplate> jdbcTemplateProvider) {
		this.jdbcTemplateProvider = jdbcTemplateProvider;
	}

	@GetMapping("/users")
	public ResponseEntity<Map<String, Object>> users() {
		JdbcTemplate jdbcTemplate = this.jdbcTemplateProvider.getIfAvailable();
		if (jdbcTemplate == null) {
			return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
				"connected", false,
				"table", "users",
				"message", "Database is not configured. Add DB_* values to BE/.env."
			));
		}

		try {
			UserTableResponse response = jdbcTemplate.query(USERS_QUERY, resultSet -> {
				ResultSetMetaData metaData = resultSet.getMetaData();
				int columnCount = metaData.getColumnCount();
				List<String> columns = new ArrayList<>(columnCount);
				for (int index = 1; index <= columnCount; index++) {
					columns.add(metaData.getColumnLabel(index));
				}

				List<Map<String, Object>> rows = new ArrayList<>();
				while (resultSet.next()) {
					Map<String, Object> row = new LinkedHashMap<>();
					for (String column : columns) {
						row.put(column, resultSet.getObject(column));
					}
					rows.add(row);
				}

				return new UserTableResponse(columns, rows);
			});

			Map<String, Object> payload = new LinkedHashMap<>();
			payload.put("connected", true);
			payload.put("table", "users");
			payload.put("columns", response.columns());
			payload.put("rows", response.rows());
			payload.put("rowCount", response.rows().size());
			return ResponseEntity.ok(payload);
		}
		catch (Exception ex) {
			return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
				"connected", false,
				"table", "users",
				"message", ex.getMessage() == null ? "Failed to read users table." : ex.getMessage()
			));
		}
	}

	private record UserTableResponse(List<String> columns, List<Map<String, Object>> rows) {
	}
}
