package com.lgableband.chatbot;

import java.util.Map;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public class SoundChatbotClient {

	private final JsonAiClient client;

	public SoundChatbotClient(
		ObjectMapper objectMapper,
		@Value("${ml.sound-chatbot.base-url:http://127.0.0.1:8002}") String baseUrl,
		@Value("${ml.sound-chatbot.connect-timeout-ms:1000}") long connectTimeoutMs,
		@Value("${ml.sound-chatbot.timeout-ms:5000}") long timeoutMs
	) {
		this.client = new JsonAiClient(
			objectMapper,
			baseUrl,
			"/api/ai/voice-chat",
			connectTimeoutMs,
			timeoutMs,
			"Sound Chatbot"
		);
	}

	public Optional<Map<String, Object>> chat(Map<String, Object> request) {
		return this.client.post(request);
	}
}
