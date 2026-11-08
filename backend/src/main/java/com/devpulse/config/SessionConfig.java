package com.devpulse.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.session.FlushMode;
import org.springframework.session.config.annotation.web.http.EnableSpringHttpSession;
import org.springframework.session.jdbc.JdbcIndexedSessionRepository;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.session.web.http.DefaultCookieSerializer;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.time.Clock;
import java.time.Duration;

/** Standard JDBC repository; session transitions join the application's existing DB transaction. */
@Configuration
@EnableSpringHttpSession
public class SessionConfig {
    @Bean
    public JdbcIndexedSessionRepository sessionRepository(DataSource dataSource,
                                                          PlatformTransactionManager transactionManager,
                                                          @Value("${app.session-cleanup-cron:0 * * * * *}") String cleanupCron) {
        var repository = new JdbcIndexedSessionRepository(new JdbcTemplate(dataSource),
                new TransactionTemplate(transactionManager));
        repository.setDefaultMaxInactiveInterval(Duration.ofHours(1));
        // Persist authentication inside its transaction, before returning a success response.
        repository.setFlushMode(FlushMode.IMMEDIATE);
        repository.setCleanupCron(cleanupCron);
        return repository;
    }

    @Bean
    public CookieSerializer cookieSerializer(@Value("${app.session-cookie.secure:true}") boolean secure) {
        var serializer = new DefaultCookieSerializer();
        serializer.setCookieName("SESSION");
        serializer.setCookiePath("/");
        serializer.setUseHttpOnlyCookie(true);
        serializer.setUseSecureCookie(secure);
        serializer.setSameSite("Strict");
        serializer.setCookieMaxAge(-1);
        return serializer;
    }

    @Bean
    public Clock sessionClock() {
        return Clock.systemUTC();
    }
}
