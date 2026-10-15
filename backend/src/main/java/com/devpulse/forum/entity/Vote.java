package com.devpulse.forum.entity;

import com.devpulse.forum.enums.VoteType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

/**
 * One user's vote on a post or a comment.
 *
 * <p>Maps to the {@code votes} table created by migration V2: exactly one of
 * {@code postId} and {@code commentId} is set, and a user has at most one vote
 * per target. Rows are written only through the native statements in
 * {@link com.devpulse.forum.repository.VoteRepository}, which let PostgreSQL
 * settle concurrent votes; this entity is read-only.
 */
@Entity
@Table(name = "votes")
@Getter
@NoArgsConstructor
public class Vote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, insertable = false, updatable = false)
    private Long userId;

    @Column(name = "post_id", insertable = false, updatable = false)
    private Long postId;

    @Column(name = "comment_id", insertable = false, updatable = false)
    private Long commentId;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "vote_type", nullable = false, insertable = false, updatable = false)
    private VoteType voteType;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime updatedAt;
}
