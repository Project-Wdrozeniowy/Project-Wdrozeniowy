package com.orbit;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Главный класс запуска приложения Orbit Backend.
 *
 * <p>Запускает контейнер Spring Boot, который автоматически сканирует
 * все компоненты в пакете {@code com.orbit} и подпакетах.
 */
@SpringBootApplication
public class BackendApplication {

    /**
     * Точка входа в приложение.
     *
     * @param args аргументы командной строки, передаваемые в Spring
     */
    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }
}