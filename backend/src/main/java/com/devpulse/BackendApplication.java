package com.devpulse;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Main entry point for the DevPulse Backend application.
 *
 * <p>Starts the Spring Boot container and auto-scans all components
 * in the {@code com.devpulse} package and sub-packages.
 */
@SpringBootApplication
public class BackendApplication {

    /**
     * Application entry point.
     *
     * @param args command-line arguments passed to Spring
     */
    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }
}