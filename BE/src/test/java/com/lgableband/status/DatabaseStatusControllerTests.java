package com.lgableband.status;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
	"db.host=",
	"db.port=",
	"db.name=",
	"db.user=",
	"db.password="
})
@AutoConfigureMockMvc
class DatabaseStatusControllerTests {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void returnsUnavailableWhenDatabaseIsNotConfigured() throws Exception {
		this.mockMvc.perform(get("/api/db/status"))
			.andExpect(status().isServiceUnavailable())
			.andExpect(jsonPath("$.connected").value(false))
			.andExpect(jsonPath("$.database").value("unconfigured"))
			.andExpect(jsonPath("$.sslMode").value("REQUIRED"));
	}
}
