package com.devpulse.analytics.service;

import com.devpulse.analytics.dto.ActivityChangeDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/** Absolute and relative change of a public figure between two windows. */
class ActivityChangeTest {

    @ParameterizedTest
    @CsvSource({
        "6, 4, 2, 50.0",
        "2, 3, -1, -33.3",
        "1, 3, -2, -66.7",
        "0, 5, -5, -100.0",
        "7, 7, 0, 0.0",
        "1, 6, -5, -83.3",
        "1001, 1000, 1, 0.1"
    })
    void changeAndPercentAgainstANonZeroBaseline(long current, long previous, long change, String percent) {
        ActivityChangeDto result = AnalyticsService.change(current, previous);

        assertThat(result.getCurrent()).isEqualTo(current);
        assertThat(result.getPrevious()).isEqualTo(previous);
        assertThat(result.getChange()).isEqualTo(change);
        assertThat(result.getChangePercent()).isEqualTo(new BigDecimal(percent));
    }

    @Test
    void aZeroBaselineHasNoPercentage() {
        assertThat(AnalyticsService.change(5, 0).getChangePercent()).isNull();
        assertThat(AnalyticsService.change(5, 0).getChange()).isEqualTo(5);
        assertThat(AnalyticsService.change(0, 0).getChangePercent()).isNull();
        assertThat(AnalyticsService.change(0, 0).getChange()).isZero();
    }

    @Test
    void sharesOfAnEmptyTotalAreUnavailable() {
        assertThat(AnalyticsService.share(0, 0)).isNull();
        assertThat(AnalyticsService.share(1, 3)).isEqualTo(new BigDecimal("0.3333"));
        assertThat(AnalyticsService.share(2, 3)).isEqualTo(new BigDecimal("0.6667"));
        assertThat(AnalyticsService.share(0, 3)).isEqualTo(new BigDecimal("0.0000"));
    }
}
