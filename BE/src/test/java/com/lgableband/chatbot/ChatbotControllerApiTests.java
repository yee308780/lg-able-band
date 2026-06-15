package com.lgableband.chatbot;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(properties = {
	"db.host=",
	"db.port=",
	"db.name=",
	"db.user=",
	"db.password=",
	"ml.sound-chatbot.base-url=http://127.0.0.1:1",
	"ml.sound-chatbot.connect-timeout-ms=10",
	"ml.sound-chatbot.timeout-ms=10",
	"ml.info-agent.base-url=http://127.0.0.1:1",
	"ml.info-agent.connect-timeout-ms=10",
	"ml.info-agent.timeout-ms=10"
})
@AutoConfigureMockMvc
class ChatbotControllerApiTests {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Test
	void springObjectMapperSerializesChatbotPayload() throws Exception {
		String json = this.objectMapper.writeValueAsString(
			java.util.Map.of("query", "장애인 의료비 지원 정보 알려줘", "topK", 5)
		);

		org.assertj.core.api.Assertions.assertThat(json).contains("\"query\"", "\"topK\"");
	}

	@Test
	void infoAgentFailureReturnsSafeChatbotResponseFromExistingApiPath() throws Exception {
		this.mockMvc.perform(post("/api/ai/voice-chat")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "text": "장애인 의료비 지원 정보 알려줘",
					  "user": {
					    "accessibilityType": "HEARING"
					  }
					}
					"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.intent").value("INFO_AGENT_QUERY"))
			.andExpect(jsonPath("$.action").value("INFO_AGENT_UNAVAILABLE"))
			.andExpect(jsonPath("$.answerText").isNotEmpty())
			.andExpect(jsonPath("$.voiceText").isNotEmpty());
	}
}
