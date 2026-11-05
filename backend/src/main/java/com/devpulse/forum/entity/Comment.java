package com.devpulse.forum.entity;

import com.devpulse.auth.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

/**
 * A comment on a post, or a reply to another comment of the same post.
 *
 * <p>Maps to the {@code comments} table created by migration V2. Roots have
 * depth 0 and no parent; a reply is one level deeper than its parent, at most
 * {@code 5} ({@code comments_depth_check}). {@code vote_score} is moved only by
 * the atomic updates in {@link com.devpulse.forum.repository.VoteRepository}.
 */
@Entity
@Table(name = "comments")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "post_id", nullable = false, updatable = false)
    private Long postId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, updatable = false)
    private User author;

    /** The comment this one replies to; {@code null} for a root comment. */
    @Column(name = "parent_id", updatable = false)
    private Long parentId;

    @Column(nullable = false, columnDefinition = "text")
    private String content;

    /** Stored in the PostgreSQL enum column {@code comment_status}, hence {@link SqlTypes#NAMED_ENUM}. */
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false)
    @Builder.Default
    private CommentStatus status = CommentStatus.VISIBLE;

    @Column(name = "vote_score", nullable = false, insertable = false, updatable = false)
    private int voteScore;

    @Column(nullable = false, updatable = false)
    private short depth;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
