package com.devpulse.forum.service;

import com.devpulse.auth.entity.User;
import com.devpulse.auth.util.AuthenticatedUserResolver;
import com.devpulse.exception.AppException;
import com.devpulse.forum.dto.VoteRequest;
import com.devpulse.forum.entity.Post;
import com.devpulse.forum.entity.Vote;
import com.devpulse.forum.enums.VoteEntityType;
import com.devpulse.forum.enums.VoteType;
import com.devpulse.forum.repository.VoteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The bounded retry of {@link VoteService} when concurrent requests keep
 * changing the same vote, forced deterministically with a mocked repository:
 * after {@link VoteService#MAX_ATTEMPTS} lost steps the request fails with 409
 * and the score is never moved, while a request that wins a later attempt
 * moves it exactly once. Real concurrent requests against PostgreSQL are
 * covered by {@link VoteConcurrencyTest}.
 */
@ExtendWith(MockitoExtension.class)
class VoteServiceConflictTest {

    private static final long POST_ID = 10L;
    private static final long VOTE_ID = 50L;

    @Mock private VoteRepository voteRepository;
    @Mock private PostService postService;
    @Mock private AuthenticatedUserResolver currentUser;

    @InjectMocks private VoteService voteService;

    private final User voter = User.builder().id(7L).username("voter").build();

    @BeforeEach
    void setUp() {
        when(currentUser.currentUser()).thenReturn(voter);
    }

    @Test
    void aFirstVoteThatKeepsLosingTheInsertFailsWith409AndLeavesTheScore() {
        votablePost();
        when(voteRepository.findByUserIdAndPostId(voter.getId(), POST_ID)).thenReturn(Optional.empty());
        when(voteRepository.insertPostVote(voter.getId(), POST_ID, "UP")).thenReturn(0);

        assertConflict(() -> voteService.cast(request(VoteType.UP)));

        verify(voteRepository, times(VoteService.MAX_ATTEMPTS)).insertPostVote(voter.getId(), POST_ID, "UP");
        verifyScoreUntouched();
    }

    @Test
    void aSwitchThatKeepsLosingFailsWith409AndLeavesTheScore() {
        votablePost();
        when(voteRepository.findByUserIdAndPostId(voter.getId(), POST_ID))
                .thenReturn(Optional.of(vote(VoteType.UP)));
        when(voteRepository.switchDirection(VOTE_ID, "UP", "DOWN")).thenReturn(0);

        assertConflict(() -> voteService.cast(request(VoteType.DOWN)));

        verify(voteRepository, times(VoteService.MAX_ATTEMPTS)).switchDirection(VOTE_ID, "UP", "DOWN");
        verifyScoreUntouched();
    }

    @Test
    void aRetractThatKeepsLosingFailsWith409AndLeavesTheScore() {
        when(voteRepository.findById(VOTE_ID)).thenReturn(Optional.of(vote(VoteType.UP)));
        when(voteRepository.deleteIfDirection(VOTE_ID, "UP")).thenReturn(0);

        assertConflict(() -> voteService.retract(VOTE_ID));

        verify(voteRepository, times(VoteService.MAX_ATTEMPTS)).deleteIfDirection(VOTE_ID, "UP");
        verifyScoreUntouched();
    }

    @Test
    void aLostInsertKeepsTheConcurrentVoteOfTheSameDirectionWithoutCountingItAgain() {
        votablePost();
        Vote concurrent = vote(VoteType.UP);
        when(voteRepository.findByUserIdAndPostId(voter.getId(), POST_ID))
                .thenReturn(Optional.empty(), Optional.of(concurrent));
        when(voteRepository.insertPostVote(voter.getId(), POST_ID, "UP")).thenReturn(0);
        when(voteRepository.postScore(POST_ID)).thenReturn(1);

        VoteService.CastResult result = voteService.cast(request(VoteType.UP));

        assertThat(result.created()).isFalse();
        assertThat(result.vote().getId()).isEqualTo(VOTE_ID);
        assertThat(result.vote().getNewScore()).isEqualTo(1);
        verifyScoreUntouched();
    }

    @Test
    void aSwitchThatWinsTheLastAttemptMovesTheScoreOnce() {
        votablePost();
        when(voteRepository.findByUserIdAndPostId(voter.getId(), POST_ID))
                .thenReturn(Optional.of(vote(VoteType.UP)), Optional.of(vote(VoteType.UP)),
                        Optional.of(vote(VoteType.UP)), Optional.of(vote(VoteType.DOWN)));
        when(voteRepository.switchDirection(VOTE_ID, "UP", "DOWN")).thenReturn(0, 0, 1);
        when(voteRepository.postScore(POST_ID)).thenReturn(-1);

        VoteService.CastResult result = voteService.cast(request(VoteType.DOWN));

        assertThat(result.vote().getVoteType()).isEqualTo(VoteType.DOWN);
        verify(voteRepository, times(VoteService.MAX_ATTEMPTS)).switchDirection(VOTE_ID, "UP", "DOWN");
        verify(voteRepository, times(1)).adjustPostScore(POST_ID, -2);
        verify(voteRepository, never()).adjustCommentScore(anyLong(), anyInt());
    }

    @Test
    void aRetractAfterAConcurrentSwitchTakesBackTheDirectionThatWasStored() {
        when(voteRepository.findById(VOTE_ID))
                .thenReturn(Optional.of(vote(VoteType.UP)), Optional.of(vote(VoteType.DOWN)));
        when(voteRepository.deleteIfDirection(VOTE_ID, "UP")).thenReturn(0);
        when(voteRepository.deleteIfDirection(VOTE_ID, "DOWN")).thenReturn(1);

        voteService.retract(VOTE_ID);

        verify(voteRepository, times(1)).adjustPostScore(POST_ID, 1);
        verify(voteRepository, never()).adjustPostScore(POST_ID, -1);
    }

    private void votablePost() {
        Post post = new Post();
        ReflectionTestUtils.setField(post, "id", POST_ID);
        when(postService.loadVotable(POST_ID)).thenReturn(post);
    }

    private Vote vote(VoteType direction) {
        Vote vote = new Vote();
        ReflectionTestUtils.setField(vote, "id", VOTE_ID);
        ReflectionTestUtils.setField(vote, "userId", voter.getId());
        ReflectionTestUtils.setField(vote, "postId", POST_ID);
        ReflectionTestUtils.setField(vote, "voteType", direction);
        return vote;
    }

    private static VoteRequest request(VoteType direction) {
        VoteRequest request = new VoteRequest();
        ReflectionTestUtils.setField(request, "entityType", VoteEntityType.POST);
        ReflectionTestUtils.setField(request, "entityId", POST_ID);
        ReflectionTestUtils.setField(request, "voteType", direction);
        return request;
    }

    private static void assertConflict(Runnable call) {
        assertThatThrownBy(call::run)
                .isInstanceOfSatisfying(AppException.class,
                        ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT));
    }

    private void verifyScoreUntouched() {
        verify(voteRepository, never()).adjustPostScore(anyLong(), anyInt());
        verify(voteRepository, never()).adjustCommentScore(anyLong(), anyInt());
    }
}
