package com.devpulse;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Базовый интеграционный тест, проверяющий корректную загрузку контекста Spring.
 */
@SpringBootTest
class BackendApplicationTests {

    /**
     * Проверяет, что контекст Spring Boot загружается без ошибок.
     * Тест упадёт при неправильной конфигурации бинов.
     */
    @Test
    void contextLoads() {
    }
}