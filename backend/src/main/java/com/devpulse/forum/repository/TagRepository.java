package com.devpulse.forum.repository;

import com.devpulse.forum.entity.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

/**
 * JPA repository for {@link Tag}.
 */
public interface TagRepository extends JpaRepository<Tag, Long> {

    List<Tag> findBySlugIn(Collection<String> slugs);

    /** The tags of all the given posts in one query, for listing a page of posts. */
    @Query("SELECT new com.devpulse.forum.repository.PostTagRow(p.id, t) FROM Post p JOIN p.tags t "
            + "WHERE p.id IN :postIds")
    List<PostTagRow> findByPostIds(@Param("postIds") Collection<Long> postIds);

    /**
     * Tags on at least one public post, most used first. Tag names are
     * unique, so ordering ties by name gives every call the same order.
     * Pass an unsorted {@code pageable}: it only limits the result.
     */
    @Query("SELECT t FROM Tag t WHERE t.postCount > 0 ORDER BY t.postCount DESC, t.name ASC")
    List<Tag> findInUse(Pageable pageable);

    /**
     * Creates the tag unless one with the same slug exists. Two posts created
     * at the same moment with the same new tag both succeed instead of one of
     * them failing on the unique constraint.
     */
    @Modifying
    @Query(value = "INSERT INTO tags (name, slug) VALUES (:slug, :slug) ON CONFLICT (slug) DO NOTHING",
            nativeQuery = true)
    void insertIfAbsent(@Param("slug") String slug);

    /**
     * Atomically adds {@code delta} to the post counter of the given tags.
     * Pending changes are flushed first, and the persistence context is
     * cleared afterwards so no stale counter is read back.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE Tag t SET t.postCount = t.postCount + :delta WHERE t.id IN :ids")
    int adjustPostCount(@Param("ids") Collection<Long> ids, @Param("delta") int delta);

    /**
     * Tags on at least one public post whose name matches {@code pattern}, a
     * lower-case {@code LIKE} pattern from
     * {@link com.devpulse.common.util.LikePatterns#containing}.
     */
    @Query("SELECT t FROM Tag t WHERE t.postCount > 0 AND LOWER(t.name) LIKE :pattern ESCAPE '\\'")
    Page<Tag> searchInUse(@Param("pattern") String pattern, Pageable pageable);
}
