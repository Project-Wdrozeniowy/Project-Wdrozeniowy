package com.devpulse.auth.service;

import com.devpulse.auth.dto.AuthResponse;
import com.devpulse.auth.dto.RegisterRequest;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.exception.AppException;
import com.devpulse.support.MigratedSchemaTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Refresh-token rotation against PostgreSQL, with real transactions.
 *
 * <p>The unit tests in {@link AuthServiceRefreshTest} mock the repository, so
 * they cannot tell whether a write survives the 401 that follows it, or how
 * two concurrent rotations of the same row interact. Nothing here runs in a
 * test-managed transaction: every service call commits or rolls back exactly
 * as it would in production, and the created users are deleted afterwards.
 */
@MigratedSchemaTest
class AuthServiceRefreshIntegrationTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final List<String> usernames = new ArrayList<>();

    @AfterEach
    void deleteUsers() {
        // refresh_tokens rows go with the user (ON DELETE CASCADE).
        usernames.forEach(name -> userRepository.findByUsername(name).ifPresent(userRepository::delete));
    }

    @Test
    void replayingARotatedTokenRevokesTheWholeFamily() {
        String first = register().getRefreshToken();
        String second = authService.refresh(first).getRefreshToken();
        moveRevocationOutOfGracePeriod(first);

        assertUnauthorized(() -> authService.refresh(first));

        // The revocation has to be committed, not rolled back with the 401.
        assertThat(isRevoked(second)).isTrue();
        assertUnauthorized(() -> authService.refresh(second));
    }

    @Test
    void refreshingTheSameTokenAgainWithinTheGracePeriodReturnsTheSamePair() {
        String first = register().getRefreshToken();
        String second = authService.refresh(first).getRefreshToken();

        AuthResponse again = authService.refresh(first);

        assertThat(again.getRefreshToken()).isEqualTo(second);
        assertThat(isRevoked(second)).isFalse();
    }

    @Test
    void concurrentRefreshesOfTheSameTokenBothGetTheSamePair() throws Exception {
        String token = register().getRefreshToken();
        CountDownLatch start = new CountDownLatch(1);
        Callable<String> refresh = () -> {
            start.await();
            return authService.refresh(token).getRefreshToken();
        };

        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<String> a = pool.submit(refresh);
            Future<String> b = pool.submit(refresh);
            start.countDown();

            assertThat(a.get()).isEqualTo(b.get());
            assertThat(isRevoked(a.get())).isFalse();
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void loggedOutTokenCannotBeRefreshed() {
        String token = register().getRefreshToken();

        authService.logout(token);

        assertThat(isRevoked(token)).isTrue();
        assertUnauthorized(() -> authService.refresh(token));
    }

    private AuthResponse register() {
        String username = "rt-" + UUID.randomUUID().toString().substring(0, 8);
        usernames.add(username);
        RegisterRequest request = new RegisterRequest();
        request.setUsername(username);
        request.setEmail(username + "@example.com");
        request.setPassword("password123");
        return authService.register(request);
    }

    private void moveRevocationOutOfGracePeriod(String token) {
        OffsetDateTime longAgo = OffsetDateTime.now().minus(AuthService.ROTATION_GRACE).minusMinutes(1);
        jdbcTemplate.update("UPDATE refresh_tokens SET revoked_at = ? WHERE token = ?", longAgo, token);
    }

    private boolean isRevoked(String token) {
        return jdbcTemplate.queryForObject(
                "SELECT revoked_at IS NOT NULL FROM refresh_tokens WHERE token = ?", Boolean.class, token);
    }

    private static void assertUnauthorized(Runnable call) {
        assertThatThrownBy(call::run)
                .isInstanceOfSatisfying(AppException.class,
                        e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED));
    }
}
