package com.devpulse.forum.repository;

import com.devpulse.forum.entity.Tag;
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
}
