package com.devpulse;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Basic integration test verifying that the Spring context loads correctly.
 */
@SpringBootTest
@ActiveProfiles("test")
class BackendApplicationTests {

    /**
     * Verifies that the Spring Boot context starts without errors.
     * Fails if any bean is misconfigured.
     */
    @Test
    void contextLoads() {
    }
}