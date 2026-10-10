package com.devpulse.forum.repository;

import com.devpulse.forum.entity.Comment;
import com.devpulse.forum.entity.CommentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

/**
 * JPA repository for {@link Comment}.
 *
 * <p>The listing queries fetch {@code author} eagerly: comments are mapped to DTOs
 * after the transaction's lazy-loading window, and one author lookup per comment would
 * be an N+1.
 */
public interface CommentRepository extends JpaRepository<Comment, Long> {

    /** One page of a post's root comments, oldest first. */
    @Query(value = """
            select c from Comment c join fetch c.author
            where c.post.id = :postId and c.parent is null and c.status in :statuses
            order by c.createdAt asc, c.id asc
            """,
            countQuery = """
            select count(c) from Comment c
            where c.post.id = :postId and c.parent is null and c.status in :statuses
            """)
    Page<Comment> findRoots(
            @Param("postId") Long postId,
            @Param("statuses") Collection<CommentStatus> statuses,
            Pageable pageable);

    /** Direct replies to any of the given comments, oldest first. */
    @Query("""
            select c from Comment c join fetch c.author
            where c.parent.id in :parentIds and c.status in :statuses
            order by c.createdAt asc, c.id asc
            """)
    List<Comment> findReplies(
            @Param("parentIds") Collection<Long> parentIds,
            @Param("statuses") Collection<CommentStatus> statuses);
}
