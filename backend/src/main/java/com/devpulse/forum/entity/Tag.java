package com.devpulse.forum.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;

/**
 * A tag that can be attached to posts.
 *
 * <p>Maps to the {@code tags} table created by migration V2. Tags are created
 * on first use when a post is saved with them. Equality is based on the slug,
 * the natural key, so tags behave correctly in a post's tag set before they
 * have an id.
 */
@Entity
@Table(name = "tags")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Tag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String name;

    @EqualsAndHashCode.Include
    @Column(nullable = false, unique = true, length = 50)
    private String slug;

    /** Number of publicly visible posts carrying this tag; maintained by the posts service. */
    @Column(name = "post_count", nullable = false)
    @Builder.Default
    private Integer postCount = 0;

    /** Timestamp of creation — set automatically, immutable. */
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    /** Timestamp of the last record update — updated automatically. */
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
