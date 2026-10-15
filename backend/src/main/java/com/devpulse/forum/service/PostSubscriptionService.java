package com.devpulse.forum.service;

import com.devpulse.auth.entity.User;
import com.devpulse.auth.entity.UserStatus;
import com.devpulse.auth.util.AuthenticatedUserResolver;
import com.devpulse.common.dto.PagedResponse;
import com.devpulse.exception.AppException;
import com.devpulse.forum.dto.PostSummaryDto;
import com.devpulse.forum.entity.PostStatus;
import com.devpulse.forum.entity.PostSubscription;
import com.devpulse.forum.repository.PostSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;

/**
 * Subscriptions to post threads.
 *
 * <p>A user may subscribe to any post they can read ({@link PostService#loadReadable}):
 * published and locked posts, and their own drafts. Subscribing and
 * unsubscribing are idempotent. The list shows the subscriptions whose posts
 * the user can still read, most recent subscription first.
 *
 * <p>Notifications: when a comment is created (PWDRZ-142), the comment service
 * asks {@link #subscribersToNotify} whom to notify and stores one notification
 * per recipient (PWDRZ-144); real-time delivery is PWDRZ-104. This class only
 * decides eligibility and sends nothing itself.
 */
@Service
@RequiredArgsConstructor
public class PostSubscriptionService {

    public static final int MAX_PAGE_SIZE = 50;

    /** Statuses of other users' posts that stay in a subscriber's list. */
    private static final Set<PostStatus> PUBLIC_STATUSES = EnumSet.of(PostStatus.PUBLISHED, PostStatus.LOCKED);

    /** Statuses of the caller's own posts that stay in their list as well. */
    private static final Set<PostStatus> OWN_STATUSES = EnumSet.of(PostStatus.DRAFT);

    private final PostSubscriptionRepository subscriptionRepository;
    private final PostService postService;
    private final AuthenticatedUserResolver currentUser;

    /**
     * Subscribes the caller to the post; does nothing if already subscribed.
     *
     * @throws AppException HTTP 404 if the post does not exist or the caller may not read it
     */
    @Transactional
    public void subscribe(String slug) {
        User user = currentUser.currentUser();
        subscriptionRepository.subscribe(user.getId(), postService.loadReadable(slug).getId());
    }

    /**
     * Unsubscribes the caller from the post; does nothing if not subscribed.
     *
     * @throws AppException HTTP 404 if the post does not exist or the caller may not read it
     */
    @Transactional
    public void unsubscribe(String slug) {
        User user = currentUser.currentUser();
        subscriptionRepository.unsubscribe(user.getId(), postService.loadReadable(slug).getId());
    }

    /**
     * The caller's subscriptions, most recent first.
     *
     * @throws AppException HTTP 400 if the page or size is out of range
     */
    @Transactional(readOnly = true)
    public PagedResponse<PostSummaryDto> mySubscriptions(int page, int size) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new AppException("page must be >= 0 and size between 1 and " + MAX_PAGE_SIZE,
                    HttpStatus.BAD_REQUEST);
        }
        User user = currentUser.currentUser();
        Sort order = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("postId"));
        return PagedResponse.from(postService.summaries(subscriptionRepository
                .findReadableOf(user.getId(), PUBLIC_STATUSES, OWN_STATUSES, PageRequest.of(page, size, order))
                .map(PostSubscription::getPost)));
    }

    /**
     * Users to notify about new activity on a post by {@code actorId}: its
     * active subscribers except the actor, so nobody is told about their own
     * comment and banned or deactivated accounts get nothing.
     */
    @Transactional(readOnly = true)
    public List<Long> subscribersToNotify(Long postId, Long actorId) {
        return subscriptionRepository.findSubscriberIds(postId, actorId, UserStatus.ACTIVE);
    }
}
