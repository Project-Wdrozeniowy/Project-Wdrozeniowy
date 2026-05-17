package com.devpulse.forum.repository;

import com.devpulse.forum.entity.Comment;
import com.devpulse.forum.entity.CommentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    @Query("""
            SELECT c FROM Comment c
            JOIN FETCH c.author
            WHERE c.post.id = :postId
              AND c.parent IS NULL
              AND c.status = :status
            ORDER BY c.createdAt ASC
            """)
    Page<Comment> findRootCommentsByPostId(
            @Param("postId") Long postId,
            @Param("status") CommentStatus status,
            Pageable pageable);

    @Query("""
            SELECT c FROM Comment c
            JOIN FETCH c.author
            WHERE c.parent.id IN :parentIds
              AND c.status = :status
            ORDER BY c.createdAt ASC
            """)
    List<Comment> findRepliesByParentIds(
            @Param("parentIds") List<Long> parentIds,
            @Param("status") CommentStatus status);
}
