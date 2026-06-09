package com.lgableband.config;

import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.core.type.AnnotatedTypeMetadata;
import org.springframework.util.StringUtils;

public class DatabasePropertiesPresentCondition implements Condition {

	@Override
	public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
		return hasText(context, "db.host")
			&& hasText(context, "db.port")
			&& hasText(context, "db.name")
			&& hasText(context, "db.user")
			&& hasText(context, "db.password");
	}

	private boolean hasText(ConditionContext context, String key) {
		return StringUtils.hasText(context.getEnvironment().getProperty(key));
	}
}
