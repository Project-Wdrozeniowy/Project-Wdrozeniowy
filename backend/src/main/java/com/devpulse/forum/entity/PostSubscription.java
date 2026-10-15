package com.devpulse.forum.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.OffsetDateTime;

/**
 * A user's subscription to a post thread.
 *
 * <p>Maps to the {@code post_subscriptions} table created by migration V3,
 * whose primary key is the pair ({@code user_id}, {@code post_id}). Rows are
 * written only through the native statements in
 * {@link com.devpulse.forum.repository.PostSubscriptionRepository}, which let
 * PostgreSQL settle concurrent requests; this entity is read-only.
 */
@Entity
@Table(name = "post_subscriptions")
@IdClass(PostSubscription.Key.class)
@Getter
@NoArgsConstructor
public class PostSubscription {

    @Id
    @Column(name = "user_id", insertable = false, updatable = false)
    private Long userId;

    @Id
    @Column(name = "post_id", insertable = false, updatable = false)
    private Long postId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", insertable = false, updatable = false)
    private Post post;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime updatedAt;

    /** Composite primary key of {@link PostSubscription}. */
    @NoArgsConstructor
    @EqualsAndHashCode
    public static class Key implements Serializable {
        private Long userId;
        private Long postId;
    }
}
