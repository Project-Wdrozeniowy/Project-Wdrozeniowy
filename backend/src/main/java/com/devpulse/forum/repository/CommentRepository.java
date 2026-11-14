package com.devpulse.forum.repository;

import com.devpulse.forum.entity.Comment;
import com.devpulse.forum.entity.CommentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * JPA repository for {@link Comment}.
 *
 * <p>The queries fetch the author with the comment, since every response
 * shows it and loading it per comment would be an N+1.
 */
public interface CommentRepository extends JpaRepository<Comment, Long> {

    /** One page of a post's root comments with {@code statuses}, oldest first. */
    @Query(value = "SELECT c FROM Comment c JOIN FETCH c.author "
            + "WHERE c.postId = :postId AND c.parentId IS NULL AND c.status IN :statuses "
            + "ORDER BY c.createdAt ASC, c.id ASC",
            countQuery = "SELECT count(c) FROM Comment c "
                    + "WHERE c.postId = :postId AND c.parentId IS NULL AND c.status IN :statuses")
    Page<Comment> findRoots(@Param("postId") Long postId,
                            @Param("statuses") Collection<CommentStatus> statuses,
                            Pageable pageable);

    /** Direct replies with {@code statuses} to any of {@code parentIds}, oldest first. */
    @Query("SELECT c FROM Comment c JOIN FETCH c.author "
            + "WHERE c.parentId IN :parentIds AND c.status IN :statuses "
            + "ORDER BY c.createdAt ASC, c.id ASC")
    List<Comment> findReplies(@Param("parentIds") Collection<Long> parentIds,
                              @Param("statuses") Collection<CommentStatus> statuses);

    /** The comment with its author. */
    @EntityGraph(attributePaths = "author")
    Optional<Comment> findWithAuthorById(Long id);

    /** Where each of the comments sits, in one query; comments that do not exist are left out. */
    @Query("SELECT new com.devpulse.forum.repository.CommentDestinationRow(c.id, c.status, p.slug, p.status, a.username) "
            + "FROM Comment c JOIN Post p ON p.id = c.postId JOIN p.author a WHERE c.id IN :ids")
    List<CommentDestinationRow> findDestinations(@Param("ids") Collection<Long> ids);
}
