package com.lgableband.chatbot;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class ChatbotRouter {

	private static final List<String> SOUND_CHATBOT_KEYWORDS = List.of(
		"알림", "최근 알림", "미확인 알림", "위험 알림", "다시 읽어줘", "방금 알림",
		"세탁기", "냉장고", "공기질", "tv", "티비", "전기레인지", "인덕션", "가스레인지",
		"문 열려", "현관문", "보호자 연락", "보호자에게 연락", "보호자한테 알려줘", "sos", "도움 요청"
	);
	private static final List<String> INFO_AGENT_KEYWORDS = List.of(
		"지원", "지원사업", "복지", "복지서비스", "신청", "신청 조건", "보조기기", "보조공학",
		"의료비", "취업", "교육", "이동지원", "교통지원", "수어", "수어통역", "문자통역",
		"청각장애", "시각장애", "시청각장애", "농맹", "폭염", "화재", "재난", "안전", "대피",
		"차별", "신고", "인권위", "권리구제", "활동지원"
	);
	private static final String INFO_UNAVAILABLE = "정보 안내 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.";
	private static final String CHATBOT_UNAVAILABLE = "음성 챗봇 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.";

	private final SoundChatbotClient soundChatbotClient;
	private final InfoAgentClient infoAgentClient;

	public ChatbotRouter(SoundChatbotClient soundChatbotClient, InfoAgentClient infoAgentClient) {
		this.soundChatbotClient = soundChatbotClient;
		this.infoAgentClient = infoAgentClient;
	}

	public Map<String, Object> route(Map<String, Object> request) {
		String text = requestText(request);
		if (!shouldUseInfoAgent(text)) {
			return this.soundChatbotClient.chat(request).orElseGet(() -> unavailable("SOUND_CHATBOT_UNAVAILABLE", CHATBOT_UNAVAILABLE));
		}

		String accessibilityType = accessibilityType(request);
		return this.infoAgentClient.query(text, accessibilityType, 5)
			.map(this::toChatbotResponse)
			.orElseGet(() -> unavailable("INFO_AGENT_UNAVAILABLE", INFO_UNAVAILABLE));
	}

	boolean shouldUseInfoAgent(String text) {
		String normalized = text.toLowerCase(Locale.ROOT);
		if (containsAny(normalized, SOUND_CHATBOT_KEYWORDS)) {
			return false;
		}
		return containsAny(normalized, INFO_AGENT_KEYWORDS);
	}

	String accessibilityType(Map<String, Object> request) {
		Object userValue = request.get("user");
		if (!(userValue instanceof Map<?, ?> user)) {
			return "ALL";
		}
		Object accessibilityValue = user.get("accessibilityType");
		String value = accessibilityValue == null ? "" : String.valueOf(accessibilityValue).trim().toUpperCase(Locale.ROOT);
		return switch (value) {
			case "VISUAL", "VISUAL_IMPAIRED" -> "VISUAL_IMPAIRED";
			case "HEARING", "HEARING_IMPAIRED" -> "HEARING_IMPAIRED";
			case "VISUAL_HEARING_IMPAIRED" -> "VISUAL_HEARING_IMPAIRED";
			case "PHYSICAL_IMPAIRED" -> "PHYSICAL_IMPAIRED";
			default -> "ALL";
		};
	}

	private String requestText(Map<String, Object> request) {
		Object text = request.get("text");
		if (text == null || String.valueOf(text).isBlank()) {
			text = request.get("transcript");
		}
		return text == null ? "" : String.valueOf(text).trim();
	}

	private boolean containsAny(String text, List<String> keywords) {
		return keywords.stream().anyMatch(text::contains);
	}

	private Map<String, Object> toChatbotResponse(Map<String, Object> infoResponse) {
		Map<String, Object> appCard = mapValue(infoResponse.get("appCard"));
		String notification = stringValue(infoResponse.get("notificationTabMessage"));
		String actionGuide = stringValue(appCard.get("recommendedAction"));
		String title = stringValue(appCard.get("title"));
		String answerText = !notification.isBlank()
			? notification
			: !title.isBlank()
				? title + " 정보입니다. " + actionGuide
				: "관련 정보를 찾았습니다. 앱에서 자세히 확인하세요.";
		String voiceText = stringValue(infoResponse.get("voiceMessage"));

		Map<String, Object> response = new LinkedHashMap<>();
		response.put("intent", "INFO_AGENT_QUERY");
		response.put("action", "SHOW_INFO_CARD");
		response.put("answerText", answerText);
		response.put("voiceText", voiceText.isBlank() ? answerText : voiceText);
		response.put("infoCard", appCard);
		copyIfPresent(infoResponse, response, "bandMessage");
		copyIfPresent(infoResponse, response, "notificationTabMessage");
		copyIfPresent(infoResponse, response, "recommendedChannels");
		copyIfPresent(infoResponse, response, "notifyGuardian");
		copyIfPresent(infoResponse, response, "classification");
		copyIfPresent(infoResponse, response, "sourceDocuments");
		return response;
	}

	private Map<String, Object> unavailable(String action, String message) {
		Map<String, Object> response = new LinkedHashMap<>();
		response.put("intent", "INFO_AGENT_UNAVAILABLE".equals(action) ? "INFO_AGENT_QUERY" : "SERVICE_UNAVAILABLE");
		response.put("action", action);
		response.put("answerText", message);
		response.put("voiceText", message);
		return response;
	}

	@SuppressWarnings("unchecked")
	private Map<String, Object> mapValue(Object value) {
		return value instanceof Map<?, ?> map ? (Map<String, Object>) map : Map.of();
	}

	private String stringValue(Object value) {
		return value == null ? "" : String.valueOf(value);
	}

	private void copyIfPresent(Map<String, Object> source, Map<String, Object> target, String key) {
		if (source.containsKey(key)) {
			target.put(key, source.get(key));
		}
	}
}
