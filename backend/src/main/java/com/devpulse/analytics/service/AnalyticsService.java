package com.devpulse.analytics.service;

import com.devpulse.analytics.dto.ActivityTrendDto;
import com.devpulse.analytics.dto.PlatformSummaryDto;
import com.devpulse.analytics.dto.PostAnalyticsDto;
import com.devpulse.analytics.dto.TrendDataPointDto;
import com.devpulse.analytics.dto.UserActivitySummaryDto;
import com.devpulse.analytics.repository.AnalyticsRepository;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.util.AuthenticatedUserResolver;
import com.devpulse.exception.AppException;
import com.devpulse.forum.dto.PostSummaryDto;
import com.devpulse.forum.entity.Post;
import com.devpulse.forum.repository.PostRepository;
import com.devpulse.forum.service.PostService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Activity and engagement figures.
 *
 * <ul>
 *   <li>Posts count while public (published or locked), comments while visible.</li>
 *   <li>Votes received are the votes on the user's posts and comments.</li>
 *   <li>Views are recorded when a post is read ({@code POST_VIEWED} events);
 *       unique viewers count signed-in readers only, since anonymous views
 *       cannot be told apart.</li>
 *   <li>Trends count the rows created in the window per UTC day, with 0 for
 *       quiet days; the first day only counts from the window start.</li>
 *   <li>Trending posts rank public posts by views + 2 × votes + 3 × comments
 *       within the window (see {@link AnalyticsRepository#trendingPostIds}).</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class AnalyticsService {

    public static final int MAX_TRENDING_LIMIT = 50;

    /** Trend windows by name. */
    static final Map<String, Duration> TREND_PERIODS = Map.of(
            "24h", Duration.ofHours(24),
            "7d", Duration.ofDays(7),
            "30d", Duration.ofDays(30),
            "90d", Duration.ofDays(90));

    /** Windows offered for trending posts. */
    static final Map<String, Duration> TRENDING_PERIODS = Map.of(
            "24h", Duration.ofHours(24),
            "7d", Duration.ofDays(7),
            "30d", Duration.ofDays(30));

    private static final List<String> METRICS = List.of("posts", "comments", "votes", "users");

    private final AnalyticsRepository analyticsRepository;
    private final PostRepository postRepository;
    private final PostService postService;
    private final AuthenticatedUserResolver currentUser;

    /** The caller's own activity. */
    @Transactional(readOnly = true)
    public UserActivitySummaryDto myActivity() {
        User user = currentUser.currentUser();
        AnalyticsRepository.UserActivity activity = analyticsRepository.userActivity(user.getId());
        return UserActivitySummaryDto.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .totalPosts(Math.toIntExact(activity.posts()))
                .totalComments(Math.toIntExact(activity.comments()))
                .totalVotesCast(Math.toIntExact(activity.votesCast()))
                .totalUpvotesReceived(Math.toIntExact(activity.upvotesReceived()))
                .totalDownvotesReceived(Math.toIntExact(activity.downvotesReceived()))
                .lastActivityAt(activity.lastActivityAt())
                .build();
    }

    /**
     * Engagement of any post, including drafts and deleted ones, for staff.
     *
     * @throws AppException HTTP 404 if the post does not exist
     */
    @Transactional(readOnly = true)
    public PostAnalyticsDto postAnalytics(Long postId) {
        AnalyticsRepository.PostEngagement engagement = analyticsRepository.postEngagement(postId)
                .orElseThrow(() -> new AppException("Post not found", HttpStatus.NOT_FOUND));
        return PostAnalyticsDto.builder()
                .postId(postId)
                .postTitle(engagement.title())
                .viewCount(Math.toIntExact(engagement.views()))
                .uniqueViewCount(Math.toIntExact(engagement.uniqueViewers()))
                .commentCount(Math.toIntExact(engagement.comments()))
                .voteScore(engagement.voteScore())
                .upvoteCount(Math.toIntExact(engagement.upvotes()))
                .downvoteCount(Math.toIntExact(engagement.downvotes()))
                .subscriptionCount(Math.toIntExact(engagement.subscriptions()))
                .build();
    }

    @Transactional(readOnly = true)
    public PlatformSummaryDto platformSummary() {
        AnalyticsRepository.PlatformTotals totals = analyticsRepository.platformTotals();
        return PlatformSummaryDto.builder()
                .totalUsers(totals.users())
                .activeUsers(totals.activeUsers())
                .totalPosts(totals.posts())
                .totalComments(totals.comments())
                .totalVotes(totals.votes())
                .totalCategories(totals.categories())
                .totalTags(totals.tags())
                .build();
    }

    /**
     * Daily counts of {@code metric} over {@code period}.
     *
     * @throws AppException HTTP 400 for an unknown metric or period
     */
    @Transactional(readOnly = true)
    public ActivityTrendDto trend(String metric, String period) {
        if (!METRICS.contains(metric)) {
            throw new AppException("metric must be one of " + METRICS, HttpStatus.BAD_REQUEST);
        }
        Duration window = window(TREND_PERIODS, period);
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        List<TrendDataPointDto> data = analyticsRepository.dailyCounts(metric, now.minus(window), now)
                .entrySet().stream()
                .map(day -> new TrendDataPointDto(day.getKey(), day.getValue()))
                .toList();
        return ActivityTrendDto.builder()
                .metric(metric)
                .period(period)
                .total(data.stream().mapToLong(TrendDataPointDto::getCount).sum())
                .data(data)
                .build();
    }

    /**
     * The most active public posts in {@code period}, with the caller's votes.
     *
     * @throws AppException HTTP 400 for an unknown period or a limit outside 1–50
     */
    @Transactional(readOnly = true)
    public List<PostSummaryDto> trendingPosts(String period, int limit) {
        Duration window = window(TRENDING_PERIODS, period);
        if (limit < 1 || limit > MAX_TRENDING_LIMIT) {
            throw new AppException("limit must be between 1 and " + MAX_TRENDING_LIMIT, HttpStatus.BAD_REQUEST);
        }
        List<Long> ids = analyticsRepository.trendingPostIds(OffsetDateTime.now(ZoneOffset.UTC).minus(window), limit);
        Map<Long, Integer> rank = ids.stream().collect(Collectors.toMap(Function.identity(), ids::indexOf));
        List<Post> posts = postRepository.findAllById(ids).stream()
                .sorted(Comparator.comparing(post -> rank.get(post.getId())))
                .toList();
        return postService.summaries(new PageImpl<>(posts)).getContent();
    }

    private static Duration window(Map<String, Duration> periods, String period) {
        Duration window = periods.get(period);
        if (window == null) {
            throw new AppException("period must be one of " + periods.keySet().stream().sorted().toList(),
                    HttpStatus.BAD_REQUEST);
        }
        return window;
    }
}
