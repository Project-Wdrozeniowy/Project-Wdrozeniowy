package com.devpulse.forum.service;

import com.devpulse.auth.entity.User;
import com.devpulse.auth.util.AuthenticatedUserResolver;
import com.devpulse.exception.AppException;
import com.devpulse.forum.dto.VoteDto;
import com.devpulse.forum.dto.VoteRequest;
import com.devpulse.forum.entity.Vote;
import com.devpulse.forum.enums.VoteEntityType;
import com.devpulse.forum.enums.VoteType;
import com.devpulse.forum.repository.VoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Votes on posts and comments.
 *
 * <p>Semantics of {@code POST /forum/votes}:
 * <ul>
 *   <li>first vote on a target: recorded, the score moves by one ({@code created});</li>
 *   <li>the same direction again: nothing changes, the existing vote is returned;</li>
 *   <li>the other direction: the vote switches and the score moves by two.</li>
 * </ul>
 * A vote is retracted with {@code DELETE /forum/votes/{id}} by its owner only;
 * the score moves back.
 *
 * <p>Votes are accepted on published posts and on visible comments of
 * published posts. A target the caller cannot read answers 404, a locked post
 * 403 and a draft 409. Retracting is always possible.
 *
 * <p>Each step is one atomic SQL statement (see {@link VoteRepository}). When a
 * concurrent request changes the same vote in between, the step affects no
 * row and the operation reads the vote again, so the score always matches the
 * stored votes.
 */
@Service
@RequiredArgsConstructor
public class VoteService {

    /** How often to re-read a vote that a concurrent request keeps changing. */
    static final int MAX_ATTEMPTS = 3;

    private final VoteRepository voteRepository;
    private final PostService postService;
    private final AuthenticatedUserResolver currentUser;

    /** The caller's vote after {@link #cast} and whether this request created it. */
    public record CastResult(VoteDto vote, boolean created) {
    }

    /**
     * Casts, keeps or switches the caller's vote on a post or comment.
     *
     * @throws AppException HTTP 404 if the target does not exist or the caller
     *                      may not read it; HTTP 403 if its post is locked;
     *                      HTTP 409 if its post is a draft
     */
    @Transactional
    public CastResult cast(VoteRequest request) {
        User voter = currentUser.currentUser();
        Target target = votableTarget(request.getEntityType(), request.getEntityId());
        VoteType direction = request.getVoteType();

        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            Optional<Vote> existing = target.voteOf(voter);
            if (existing.isEmpty()) {
                if (target.insert(voter, direction) == 1) {
                    target.adjustScore(value(direction));
                    return new CastResult(target.dto(target.voteOf(voter).orElseThrow()), true);
                }
                continue;
            }
            Vote vote = existing.get();
            if (vote.getVoteType() == direction) {
                return new CastResult(target.dto(vote), false);
            }
            if (voteRepository.switchDirection(vote.getId(), vote.getVoteType().name(), direction.name()) == 1) {
                target.adjustScore(2 * value(direction));
                return new CastResult(target.dto(target.voteOf(voter).orElseThrow()), false);
            }
        }
        throw concurrentChange();
    }

    /**
     * Retracts one of the caller's votes.
     *
     * @throws AppException HTTP 404 if the vote does not exist; HTTP 403 if it
     *                      belongs to another user
     */
    @Transactional
    public void retract(Long id) {
        User voter = currentUser.currentUser();
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            Vote vote = voteRepository.findById(id)
                    .orElseThrow(() -> new AppException("Vote not found", HttpStatus.NOT_FOUND));
            if (!vote.getUserId().equals(voter.getId())) {
                throw new AppException("Only the voter can retract a vote", HttpStatus.FORBIDDEN);
            }
            if (voteRepository.deleteIfDirection(id, vote.getVoteType().name()) == 1) {
                targetOf(vote).adjustScore(-value(vote.getVoteType()));
                return;
            }
        }
        throw concurrentChange();
    }

    private Target votableTarget(VoteEntityType type, Long id) {
        if (type == VoteEntityType.POST) {
            return new Target(postService.loadVotable(id).getId(), null);
        }
        VoteRepository.CommentTarget comment = voteRepository.findCommentTarget(id)
                .filter(found -> "VISIBLE".equals(found.getStatus()))
                .orElseThrow(() -> new AppException("Comment not found", HttpStatus.NOT_FOUND));
        postService.loadVotable(comment.getPostId());
        return new Target(null, id);
    }

    private Target targetOf(Vote vote) {
        return new Target(vote.getPostId(), vote.getCommentId());
    }

    private static int value(VoteType direction) {
        return direction == VoteType.UP ? 1 : -1;
    }

    private static AppException concurrentChange() {
        return new AppException("The vote is being changed by another request; try again", HttpStatus.CONFLICT);
    }

    /** A post or a comment: exactly one of the ids is set. */
    private final class Target {

        private final Long postId;
        private final Long commentId;

        private Target(Long postId, Long commentId) {
            this.postId = postId;
            this.commentId = commentId;
        }

        Optional<Vote> voteOf(User voter) {
            return postId != null
                    ? voteRepository.findByUserIdAndPostId(voter.getId(), postId)
                    : voteRepository.findByUserIdAndCommentId(voter.getId(), commentId);
        }

        int insert(User voter, VoteType direction) {
            return postId != null
                    ? voteRepository.insertPostVote(voter.getId(), postId, direction.name())
                    : voteRepository.insertCommentVote(voter.getId(), commentId, direction.name());
        }

        void adjustScore(int delta) {
            if (postId != null) {
                voteRepository.adjustPostScore(postId, delta);
            } else {
                voteRepository.adjustCommentScore(commentId, delta);
            }
        }

        VoteDto dto(Vote vote) {
            int score = postId != null ? voteRepository.postScore(postId) : voteRepository.commentScore(commentId);
            return VoteDto.from(vote, score);
        }
    }
}
