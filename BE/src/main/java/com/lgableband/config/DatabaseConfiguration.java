package com.lgableband.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import javax.sql.DataSource;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(AivenDatabaseProperties.class)
public class DatabaseConfiguration {

	@Bean
	@Conditional(DatabasePropertiesPresentCondition.class)
	public DataSource dataSource(AivenDatabaseProperties properties) {
		HikariConfig config = new HikariConfig();
		config.setPoolName("able-band-mysql");
		config.setDriverClassName("com.mysql.cj.jdbc.Driver");
		config.setJdbcUrl(buildJdbcUrl(properties));
		config.setUsername(properties.getUser());
		config.setPassword(properties.getPassword());
		config.setMaximumPoolSize(5);
		config.setMinimumIdle(1);
		return new HikariDataSource(config);
	}

	private String buildJdbcUrl(AivenDatabaseProperties properties) {
		return "jdbc:mysql://%s:%s/%s?sslMode=REQUIRED&serverTimezone=UTC&characterEncoding=UTF-8"
			.formatted(properties.getHost(), properties.getPort(), properties.getName());
	}
}
