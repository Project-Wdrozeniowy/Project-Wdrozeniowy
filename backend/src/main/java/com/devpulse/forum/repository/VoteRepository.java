package com.devpulse.forum.repository;

import com.devpulse.forum.entity.Vote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Votes and the vote scores of their targets.
 *
 * <p>Every write is a single SQL statement that PostgreSQL makes atomic: an
 * insert that does nothing when the user already voted, and an update or
 * delete that only applies while the vote still has the direction the caller
 * read. Score changes are relative ({@code vote_score + delta}), so concurrent
 * votes never overwrite each other. The writes clear the persistence context,
 * so later reads see the new rows.
 */
public interface VoteRepository extends JpaRepository<Vote, Long> {

    Optional<Vote> findByUserIdAndPostId(Long userId, Long postId);

    Optional<Vote> findByUserIdAndCommentId(Long userId, Long commentId);

    /** The votes of the user with {@code username} on any of {@code postIds}. */
    @Query("SELECT v FROM Vote v WHERE v.postId IN :postIds "
            + "AND v.userId = (SELECT u.id FROM User u WHERE u.username = :username)")
    List<Vote> findPostVotesOf(@Param("username") String username, @Param("postIds") Collection<Long> postIds);

    /** Records the vote unless the user already voted on the post; returns the number of rows inserted. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "INSERT INTO votes (user_id, post_id, vote_type) "
            + "VALUES (:userId, :postId, CAST(:voteType AS vote_type)) ON CONFLICT DO NOTHING",
            nativeQuery = true)
    int insertPostVote(@Param("userId") Long userId, @Param("postId") Long postId, @Param("voteType") String voteType);

    /** Records the vote unless the user already voted on the comment; returns the number of rows inserted. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "INSERT INTO votes (user_id, comment_id, vote_type) "
            + "VALUES (:userId, :commentId, CAST(:voteType AS vote_type)) ON CONFLICT DO NOTHING",
            nativeQuery = true)
    int insertCommentVote(@Param("userId") Long userId, @Param("commentId") Long commentId,
                          @Param("voteType") String voteType);

    /** Changes the direction of vote {@code id} if it is still {@code from}; returns the number of rows changed. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "UPDATE votes SET vote_type = CAST(:to AS vote_type) "
            + "WHERE id = :id AND vote_type = CAST(:from AS vote_type)",
            nativeQuery = true)
    int switchDirection(@Param("id") Long id, @Param("from") String from, @Param("to") String to);

    /** Deletes vote {@code id} if it still has direction {@code voteType}; returns the number of rows deleted. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "DELETE FROM votes WHERE id = :id AND vote_type = CAST(:voteType AS vote_type)",
            nativeQuery = true)
    int deleteIfDirection(@Param("id") Long id, @Param("voteType") String voteType);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "UPDATE posts SET vote_score = vote_score + :delta WHERE id = :id", nativeQuery = true)
    int adjustPostScore(@Param("id") Long postId, @Param("delta") int delta);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "UPDATE comments SET vote_score = vote_score + :delta WHERE id = :id", nativeQuery = true)
    int adjustCommentScore(@Param("id") Long commentId, @Param("delta") int delta);

    @Query(value = "SELECT vote_score FROM posts WHERE id = :id", nativeQuery = true)
    int postScore(@Param("id") Long postId);

    @Query(value = "SELECT vote_score FROM comments WHERE id = :id", nativeQuery = true)
    int commentScore(@Param("id") Long commentId);

    /** A comment as a vote target: its status and the post it belongs to. */
    interface CommentTarget {
        String getStatus();

        Long getPostId();
    }

    @Query(value = "SELECT CAST(status AS text) AS status, post_id AS postId FROM comments WHERE id = :id",
            nativeQuery = true)
    Optional<CommentTarget> findCommentTarget(@Param("id") Long commentId);
}
