package com.devpulse.recommendation.service;

import com.devpulse.exception.AppException;
import com.devpulse.forum.dto.TagDto;
import com.devpulse.forum.entity.Post;
import com.devpulse.forum.entity.Tag;
import com.devpulse.forum.repository.PostRepository;
import com.devpulse.forum.repository.TagRepository;
import com.devpulse.recommendation.dto.RecommendedPostDto;
import com.devpulse.recommendation.repository.RecommendationRepository;
import com.devpulse.recommendation.repository.RecommendationRepository.RankedPost;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.devpulse.forum.security.ForumAuthorities.isAuthenticated;

/**
 * Deterministic post and tag recommendations built from persisted forum
 * activity; the rules are documented on {@link RecommendationRepository}.
 *
 * <p>Signed-in callers get posts and tags close to their interest posts, the
 * public posts they wrote, upvoted or commented on, and never the posts they
 * already wrote, voted on or commented on. Anonymous callers and callers
 * without activity get the trending order. Over unchanged data, the same
 * caller always gets the same order. Recent activity counts within
 * {@link #ACTIVITY_WINDOW}, the trending window of the analytics.
 */
@Service
@RequiredArgsConstructor
public class RecommendationService {

    /** Largest {@code limit} a caller may ask for. */
    public static final int MAX_LIMIT = 100;

    /** How far back views, votes, comments and new posts count as recent activity. */
    public static final Duration ACTIVITY_WINDOW = Duration.ofDays(7);

    private final RecommendationRepository recommendationRepository;
    private final PostRepository postRepository;
    private final TagRepository tagRepository;

    /**
     * Recommended public posts for the caller, best first.
     *
     * @throws AppException HTTP 400 if {@code limit} is outside 1–100
     */
    @Transactional(readOnly = true)
    public List<RecommendedPostDto> posts(int limit) {
        List<RankedPost> ranked = recommendationRepository.rankPosts(caller(), since(), checked(limit));
        Map<Long, Post> posts = byId(postRepository.findWithDetailsByIdIn(ranked.stream().map(RankedPost::id).toList()),
                Post::getId);
        return ranked.stream()
                .map(r -> RecommendedPostDto.from(posts.get(r.id()), reason(r)))
                .toList();
    }

    /**
     * Recommended tags for the caller, best first.
     *
     * @throws AppException HTTP 400 if {@code limit} is outside 1–100
     */
    @Transactional(readOnly = true)
    public List<TagDto> tags(int limit) {
        List<Long> ids = recommendationRepository.rankTags(caller(), since(), checked(limit));
        Map<Long, Tag> tags = byId(tagRepository.findAllById(ids), Tag::getId);
        return ids.stream().map(id -> TagDto.from(tags.get(id))).toList();
    }

    private static String reason(RankedPost post) {
        if (post.sharedTags() > 0) {
            return RecommendedPostDto.SIMILAR_TAGS;
        }
        return post.sameCategory() ? RecommendedPostDto.SAME_CATEGORY : RecommendedPostDto.TRENDING;
    }

    private OffsetDateTime since() {
        return OffsetDateTime.now(ZoneOffset.UTC).minus(ACTIVITY_WINDOW);
    }

    private static int checked(int limit) {
        if (limit < 1 || limit > MAX_LIMIT) {
            throw new AppException("limit must be between 1 and " + MAX_LIMIT, HttpStatus.BAD_REQUEST);
        }
        return limit;
    }

    /** The caller's username, or {@code null} for an anonymous caller. */
    private static String caller() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return isAuthenticated(auth) ? auth.getName() : null;
    }

    private static <T> Map<Long, T> byId(List<T> items, Function<T, Long> id) {
        return items.stream().collect(Collectors.toMap(id, Function.identity()));
    }
}
