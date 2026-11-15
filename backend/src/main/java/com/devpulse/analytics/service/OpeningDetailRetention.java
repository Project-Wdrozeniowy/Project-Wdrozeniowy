package com.devpulse.analytics.service;

import com.devpulse.analytics.repository.AnalyticsRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;

/**
 * How long an opening keeps its reader.
 *
 * <p>An opening row names who opened the post only for
 * {@code app.analytics.opening-detail-retention} (default 30 days, the
 * longest analytics window). Older rows are cleared of their reader, address
 * and metadata but kept, so views, daily openings, trending and the
 * recommendation scores, which only count rows, never change. The only
 * figure that needs the reader, the unique signed-in viewers of a post,
 * therefore covers the retention period and says from when
 * ({@link #cutoff()}), never all time.
 *
 * <p>The cleanup runs on {@code app.analytics.opening-detail-cleanup-cron}
 * (hourly; {@code -} turns it off) in batches of
 * {@code app.analytics.opening-detail-batch-size}. Each batch is one
 * statement that commits on its own and skips rows other transactions hold,
 * so it never blocks new openings, and it only clears columns, so a run that
 * stops halfway, or runs twice, leaves every count as it was.
 */
@Slf4j
@Component
public class OpeningDetailRetention {

    private final AnalyticsRepository analyticsRepository;
    private final Clock clock;
    private final Duration retention;
    private final int batchSize;

    public OpeningDetailRetention(AnalyticsRepository analyticsRepository, Clock clock,
                                  @Value("${app.analytics.opening-detail-retention:30d}") Duration retention,
                                  @Value("${app.analytics.opening-detail-batch-size:1000}") int batchSize) {
        if (retention.isNegative() || retention.isZero()) {
            throw new IllegalArgumentException("app.analytics.opening-detail-retention must be positive");
        }
        if (batchSize < 1) {
            throw new IllegalArgumentException("app.analytics.opening-detail-batch-size must be at least 1");
        }
        this.analyticsRepository = analyticsRepository;
        this.clock = clock;
        this.retention = retention;
        this.batchSize = batchSize;
    }

    /** The instant, in UTC and to the millisecond, before which openings no longer name their reader. */
    public OffsetDateTime cutoff() {
        return OffsetDateTime.now(clock).withOffsetSameInstant(ZoneOffset.UTC)
                .truncatedTo(ChronoUnit.MILLIS).minus(retention);
    }

    /** Scheduled entry point of {@link #clearExpiredDetails()}. */
    @Scheduled(cron = "${app.analytics.opening-detail-cleanup-cron:0 0 * * * *}")
    public void scheduledCleanup() {
        clearExpiredDetails();
    }

    /**
     * Clears the reader of every opening older than {@link #cutoff()}, one
     * batch after another until none is left. Not transactional on purpose:
     * each batch commits by itself and holds its row locks only briefly.
     *
     * @return the number of rows cleared
     */
    public long clearExpiredDetails() {
        OffsetDateTime cutoff = cutoff();
        long cleared = 0;
        int batch;
        do {
            batch = analyticsRepository.anonymizeOpeningDetails(cutoff, batchSize);
            cleared += batch;
        } while (batch == batchSize);
        if (cleared > 0) {
            log.info("Cleared the reader of {} openings created before {}", cleared, cutoff);
        }
        return cleared;
    }
}
