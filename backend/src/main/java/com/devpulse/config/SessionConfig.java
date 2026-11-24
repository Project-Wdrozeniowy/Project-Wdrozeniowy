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
    public org.springframework.session.web.http.HttpSessionIdResolver httpSessionIdResolver(CookieSerializer cookies) {
        var delegate = new org.springframework.session.web.http.CookieHttpSessionIdResolver();
        delegate.setCookieSerializer(cookies);
        return new org.springframework.session.web.http.HttpSessionIdResolver() {
            private boolean transport(jakarta.servlet.http.HttpServletRequest request) {
                String path = request.getRequestURI().substring(request.getContextPath().length());
                return path.equals("/ws") || path.startsWith("/ws/");
            }
            @Override public java.util.List<String> resolveSessionIds(jakarta.servlet.http.HttpServletRequest request) {
                // FrameworkServlet also reads getSession(false) for its handled-event metadata.
                // Keep the standard mutable HttpSession wrapper unaware of transport cookies;
                // WsSessionAccess reads the same serializer/repository independently, without saving.
                return transport(request) ? java.util.List.of() : delegate.resolveSessionIds(request);
            }
            @Override public void setSessionId(jakarta.servlet.http.HttpServletRequest request,
                    jakarta.servlet.http.HttpServletResponse response, String id) {
                if (transport(request)) throw new IllegalStateException("Notification transport cannot create sessions");
                delegate.setSessionId(request, response, id);
            }
            @Override public void expireSession(jakarta.servlet.http.HttpServletRequest request,
                    jakarta.servlet.http.HttpServletResponse response) {
                if (!transport(request)) delegate.expireSession(request, response);
            }
        };
    }
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
