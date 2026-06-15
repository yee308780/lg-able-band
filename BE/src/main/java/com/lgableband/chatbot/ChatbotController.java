package com.lgableband.chatbot;

import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class ChatbotController {

	private final ChatbotRouter chatbotRouter;

	public ChatbotController(ChatbotRouter chatbotRouter) {
		this.chatbotRouter = chatbotRouter;
	}

	@PostMapping("/voice-chat")
	public Map<String, Object> voiceChat(@RequestBody Map<String, Object> request) {
		return this.chatbotRouter.route(request);
	}
}
