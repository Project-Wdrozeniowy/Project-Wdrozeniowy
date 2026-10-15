package com.devpulse.forum.repository;

import com.devpulse.auth.entity.UserStatus;
import com.devpulse.forum.entity.PostStatus;
import com.devpulse.forum.entity.PostSubscription;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

/**
 * Post subscriptions. Subscribing and unsubscribing are single statements, so
 * repeated or concurrent requests can neither duplicate a row nor fail on the
 * primary key.
 */
public interface PostSubscriptionRepository extends JpaRepository<PostSubscription, PostSubscription.Key> {

    /** Whether the user with {@code username} is subscribed to the post. */
    @Query("SELECT count(s) > 0 FROM PostSubscription s, com.devpulse.auth.entity.User u "
            + "WHERE u.id = s.userId AND s.postId = :postId AND u.username = :username")
    boolean isSubscribed(@Param("username") String username, @Param("postId") Long postId);

    /** Subscribes the user unless already subscribed; returns the number of rows inserted. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "INSERT INTO post_subscriptions (user_id, post_id) VALUES (:userId, :postId) ON CONFLICT DO NOTHING",
            nativeQuery = true)
    int subscribe(@Param("userId") Long userId, @Param("postId") Long postId);

    /** Removes the subscription if there is one; returns the number of rows deleted. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "DELETE FROM post_subscriptions WHERE user_id = :userId AND post_id = :postId",
            nativeQuery = true)
    int unsubscribe(@Param("userId") Long userId, @Param("postId") Long postId);

    /**
     * The user's subscriptions to posts in one of {@code statuses}, or to
     * their own posts in {@code ownStatuses}; the caller passes the paging and
     * sort.
     */
    @Query(value = "SELECT s FROM PostSubscription s JOIN FETCH s.post p JOIN FETCH p.author LEFT JOIN FETCH p.category "
            + "WHERE s.userId = :userId AND (p.status IN :statuses OR (p.status IN :ownStatuses AND p.author.id = :userId))",
            countQuery = "SELECT count(s) FROM PostSubscription s JOIN s.post p WHERE s.userId = :userId "
                    + "AND (p.status IN :statuses OR (p.status IN :ownStatuses AND p.author.id = :userId))")
    Page<PostSubscription> findReadableOf(@Param("userId") Long userId,
                                          @Param("statuses") Collection<PostStatus> statuses,
                                          @Param("ownStatuses") Collection<PostStatus> ownStatuses,
                                          Pageable pageable);

    /** Users with {@code status} subscribed to the post, except {@code excludedUserId}. */
    @Query("SELECT s.userId FROM PostSubscription s, com.devpulse.auth.entity.User u "
            + "WHERE u.id = s.userId AND s.postId = :postId AND s.userId <> :excludedUserId AND u.status = :status "
            + "ORDER BY s.userId")
    List<Long> findSubscriberIds(@Param("postId") Long postId,
                                 @Param("excludedUserId") Long excludedUserId,
                                 @Param("status") UserStatus status);
}
