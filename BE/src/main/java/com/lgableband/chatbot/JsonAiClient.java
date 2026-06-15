package com.lgableband.chatbot;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tools.jackson.databind.ObjectMapper;

final class JsonAiClient {

	private static final Logger log = LoggerFactory.getLogger(JsonAiClient.class);

	private final ObjectMapper objectMapper;
	private final URI uri;
	private final int connectTimeoutMs;
	private final int readTimeoutMs;
	private final String serviceName;

	JsonAiClient(ObjectMapper objectMapper, String baseUrl, String path, long connectTimeoutMs, long readTimeoutMs, String serviceName) {
		this.objectMapper = objectMapper;
		this.uri = URI.create(baseUrl.replaceAll("/+$", "") + path);
		this.connectTimeoutMs = Math.toIntExact(connectTimeoutMs);
		this.readTimeoutMs = Math.toIntExact(readTimeoutMs);
		this.serviceName = serviceName;
	}

	@SuppressWarnings("unchecked")
	Optional<Map<String, Object>> post(Map<String, Object> payload) {
		HttpURLConnection connection = null;
		try {
			byte[] requestBody = this.objectMapper.writeValueAsBytes(payload);
			connection = (HttpURLConnection) this.uri.toURL().openConnection();
			connection.setConnectTimeout(this.connectTimeoutMs);
			connection.setReadTimeout(this.readTimeoutMs);
			connection.setRequestMethod("POST");
			connection.setDoOutput(true);
			connection.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
			connection.setRequestProperty("Accept", "application/json");
			connection.setFixedLengthStreamingMode(requestBody.length);
			try (var output = connection.getOutputStream()) {
				output.write(requestBody);
			}

			int statusCode = connection.getResponseCode();
			if (statusCode < 200 || statusCode >= 300) {
				log.warn("{} returned HTTP {}: {}", this.serviceName, statusCode, readBody(connection.getErrorStream()));
				return Optional.empty();
			}
			return Optional.of(this.objectMapper.readValue(readBody(connection.getInputStream()), Map.class));
		} catch (Exception ex) {
			log.warn("{} request failed.", this.serviceName, ex);
			return Optional.empty();
		} finally {
			if (connection != null) {
				connection.disconnect();
			}
		}
	}

	private String readBody(InputStream stream) throws Exception {
		if (stream == null) {
			return "";
		}
		try (stream) {
			return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
		}
	}
}
