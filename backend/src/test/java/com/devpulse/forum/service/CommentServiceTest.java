package com.devpulse.forum.service;

import com.devpulse.auth.entity.Role;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.util.AuthenticatedUserResolver;
import com.devpulse.common.dto.PagedResponse;
import com.devpulse.exception.AppException;
import com.devpulse.forum.dto.CommentDto;
import com.devpulse.forum.dto.CreateCommentRequest;
import com.devpulse.forum.dto.UpdateCommentRequest;
import com.devpulse.forum.entity.Comment;
import com.devpulse.forum.entity.CommentStatus;
import com.devpulse.forum.entity.Post;
import com.devpulse.forum.entity.PostStatus;
import com.devpulse.forum.repository.CommentRepository;
import com.devpulse.forum.repository.PostRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @Mock private CommentRepository commentRepository;
    @Mock private PostRepository postRepository;
    @Mock private AuthenticatedUserResolver currentUser;

    @InjectMocks private CommentService commentService;

    private User alice;
    private User bob;
    private Post post;

    @BeforeEach
    void setUp() {
        alice = User.builder().id(1L).username("alice").role(Role.USER).build();
        bob = User.builder().id(2L).username("bob").role(Role.USER).build();
        post = Post.builder().id(10L).slug("hello").status(PostStatus.PUBLISHED).author(alice).build();
    }

    private Comment comment(long id, User author, Comment parent, int depth, CommentStatus status) {
        return Comment.builder()
                .id(id)
                .post(post)
                .author(author)
                .parent(parent)
                .content("text " + id)
                .status(status)
                .depth((short) depth)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();
    }

    private CreateCommentRequest createRequest(String content, Long parentId) {
        CreateCommentRequest request = new CreateCommentRequest();
        ReflectionTestUtils.setField(request, "content", content);
        ReflectionTestUtils.setField(request, "parentId", parentId);
        return request;
    }

    private UpdateCommentRequest updateRequest(String content) {
        UpdateCommentRequest request = new UpdateCommentRequest();
        ReflectionTestUtils.setField(request, "content", content);
        return request;
    }

    private void assertAppException(Runnable action, HttpStatus status) {
        assertThatThrownBy(action::run)
                .isInstanceOf(AppException.class)
                .satisfies(e -> assertThat(((AppException) e).getStatus()).isEqualTo(status));
    }

    // ───────────────────────── listComments ─────────────────────────

    @Test
    void listComments_buildsNestedReplyTreeBelowEachRoot() {
        Comment root = comment(1, alice, null, 0, CommentStatus.VISIBLE);
        Comment reply = comment(2, bob, root, 1, CommentStatus.VISIBLE);
        Comment grandchild = comment(3, alice, reply, 2, CommentStatus.VISIBLE);
        when(postRepository.findBySlug("hello")).thenReturn(Optional.of(post));
        when(commentRepository.findRoots(eq(10L), anyCollection(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(root), PageRequest.of(0, 20), 1));
        when(commentRepository.findReplies(eq(List.of(1L)), anyCollection())).thenReturn(List.of(reply));
        when(commentRepository.findReplies(eq(List.of(2L)), anyCollection())).thenReturn(List.of(grandchild));
        when(commentRepository.findReplies(eq(List.of(3L)), anyCollection())).thenReturn(List.of());

        PagedResponse<CommentDto> result = commentService.listComments("hello", 0, 20);

        assertThat(result.getTotalElements()).isEqualTo(1);
        CommentDto rootDto = result.getContent().get(0);
        assertThat(rootDto.getParentId()).isNull();
        assertThat(rootDto.getAuthor().getUsername()).isEqualTo("alice");
        CommentDto replyDto = rootDto.getReplies().get(0);
        assertThat(replyDto.getId()).isEqualTo(2L);
        assertThat(replyDto.getParentId()).isEqualTo(1L);
        assertThat(replyDto.getReplies().get(0).getId()).isEqualTo(3L);
        assertThat(replyDto.getReplies().get(0).getReplies()).isEmpty();
    }

    @Test
    void listComments_blanksContentAndAuthorOfDeletedComments() {
        Comment deleted = comment(1, alice, null, 0, CommentStatus.DELETED);
        when(postRepository.findBySlug("hello")).thenReturn(Optional.of(post));
        when(commentRepository.findRoots(eq(10L), anyCollection(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(deleted), PageRequest.of(0, 20), 1));
        when(commentRepository.findReplies(anyCollection(), anyCollection())).thenReturn(List.of());

        CommentDto dto = commentService.listComments("hello", 0, 20).getContent().get(0);

        assertThat(dto.getStatus()).isEqualTo("DELETED");
        assertThat(dto.getContent()).isNull();
        assertThat(dto.getAuthor()).isNull();
    }

    @Test
    void listComments_excludesHiddenComments() {
        when(postRepository.findBySlug("hello")).thenReturn(Optional.of(post));
        when(commentRepository.findRoots(eq(10L), anyCollection(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

        commentService.listComments("hello", 0, 20);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<java.util.Collection<CommentStatus>> statuses = ArgumentCaptor.forClass(java.util.Collection.class);
        verify(commentRepository).findRoots(eq(10L), statuses.capture(), any(Pageable.class));
        assertThat(statuses.getValue()).containsExactlyInAnyOrder(CommentStatus.VISIBLE, CommentStatus.DELETED);
    }

    @Test
    void listComments_clampsPageAndSize() {
        when(postRepository.findBySlug("hello")).thenReturn(Optional.of(post));
        when(commentRepository.findRoots(eq(10L), anyCollection(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 100), 0));

        commentService.listComments("hello", -3, 5000);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(commentRepository).findRoots(eq(10L), anyCollection(), pageable.capture());
        assertThat(pageable.getValue().getPageNumber()).isZero();
        assertThat(pageable.getValue().getPageSize()).isEqualTo(100);
    }

    @Test
    void listComments_unknownPost_returns404() {
        when(postRepository.findBySlug("nope")).thenReturn(Optional.empty());

        assertAppException(() -> commentService.listComments("nope", 0, 20), HttpStatus.NOT_FOUND);
    }

    @Test
    void listComments_draftOrDeletedPost_returns404() {
        post.setStatus(PostStatus.DRAFT);
        when(postRepository.findBySlug("hello")).thenReturn(Optional.of(post));

        assertAppException(() -> commentService.listComments("hello", 0, 20), HttpStatus.NOT_FOUND);
    }

    // ───────────────────────── createComment ─────────────────────────

    @Test
    void createComment_root_savesTrimmedContentAndBumpsCounter() {
        when(postRepository.findBySlug("hello")).thenReturn(Optional.of(post));
        when(currentUser.currentUser()).thenReturn(bob);
        when(commentRepository.save(any(Comment.class))).thenAnswer(inv -> {
            Comment c = inv.getArgument(0);
            c.setId(50L);
            return c;
        });

        CommentDto dto = commentService.createComment("hello", createRequest("  Nice post  ", null));

        ArgumentCaptor<Comment> saved = ArgumentCaptor.forClass(Comment.class);
        verify(commentRepository).save(saved.capture());
        assertThat(saved.getValue().getContent()).isEqualTo("Nice post");
        assertThat(saved.getValue().getDepth()).isZero();
        assertThat(saved.getValue().getParent()).isNull();
        assertThat(dto.getId()).isEqualTo(50L);
        assertThat(dto.getAuthor().getUsername()).isEqualTo("bob");
        assertThat(dto.getReplies()).isEmpty();
        verify(postRepository).incrementCommentCount(eq(10L), any(OffsetDateTime.class));
    }

    @Test
    void createComment_reply_incrementsDepthFromParent() {
        Comment parent = comment(5, alice, null, 2, CommentStatus.VISIBLE);
        when(postRepository.findBySlug("hello")).thenReturn(Optional.of(post));
        when(currentUser.currentUser()).thenReturn(bob);
        when(commentRepository.findById(5L)).thenReturn(Optional.of(parent));
        when(commentRepository.save(any(Comment.class))).thenAnswer(inv -> inv.getArgument(0));

        CommentDto dto = commentService.createComment("hello", createRequest("reply", 5L));

        assertThat(dto.getDepth()).isEqualTo(3);
        assertThat(dto.getParentId()).isEqualTo(5L);
    }

    @Test
    void createComment_beyondMaxDepth_returns422() {
        Comment parent = comment(5, alice, null, 5, CommentStatus.VISIBLE);
        when(postRepository.findBySlug("hello")).thenReturn(Optional.of(post));
        when(currentUser.currentUser()).thenReturn(bob);
        when(commentRepository.findById(5L)).thenReturn(Optional.of(parent));

        assertAppException(() -> commentService.createComment("hello", createRequest("too deep", 5L)),
                HttpStatus.UNPROCESSABLE_ENTITY);
        verify(commentRepository, never()).save(any());
        verify(postRepository, never()).incrementCommentCount(any(), any());
    }

    @Test
    void createComment_atMaxDepthIsAllowed() {
        Comment parent = comment(5, alice, null, 4, CommentStatus.VISIBLE);
        when(postRepository.findBySlug("hello")).thenReturn(Optional.of(post));
        when(currentUser.currentUser()).thenReturn(bob);
        when(commentRepository.findById(5L)).thenReturn(Optional.of(parent));
        when(commentRepository.save(any(Comment.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThat(commentService.createComment("hello", createRequest("ok", 5L)).getDepth()).isEqualTo(5);
    }

    @Test
    void createComment_parentFromAnotherPost_returns400() {
        Post other = Post.builder().id(99L).slug("other").status(PostStatus.PUBLISHED).author(alice).build();
        Comment parent = comment(5, alice, null, 0, CommentStatus.VISIBLE);
        parent.setPost(other);
        when(postRepository.findBySlug("hello")).thenReturn(Optional.of(post));
        when(currentUser.currentUser()).thenReturn(bob);
        when(commentRepository.findById(5L)).thenReturn(Optional.of(parent));

        assertAppException(() -> commentService.createComment("hello", createRequest("x", 5L)),
                HttpStatus.BAD_REQUEST);
    }

    @Test
    void createComment_replyToDeletedComment_returns400() {
        Comment parent = comment(5, alice, null, 0, CommentStatus.DELETED);
        when(postRepository.findBySlug("hello")).thenReturn(Optional.of(post));
        when(currentUser.currentUser()).thenReturn(bob);
        when(commentRepository.findById(5L)).thenReturn(Optional.of(parent));

        assertAppException(() -> commentService.createComment("hello", createRequest("x", 5L)),
                HttpStatus.BAD_REQUEST);
    }

    @Test
    void createComment_unknownParent_returns404() {
        when(postRepository.findBySlug("hello")).thenReturn(Optional.of(post));
        when(currentUser.currentUser()).thenReturn(bob);
        when(commentRepository.findById(5L)).thenReturn(Optional.empty());

        assertAppException(() -> commentService.createComment("hello", createRequest("x", 5L)),
                HttpStatus.NOT_FOUND);
    }

    @Test
    void createComment_lockedPost_returns409() {
        post.setStatus(PostStatus.LOCKED);
        when(postRepository.findBySlug("hello")).thenReturn(Optional.of(post));

        assertAppException(() -> commentService.createComment("hello", createRequest("x", null)),
                HttpStatus.CONFLICT);
        verify(commentRepository, never()).save(any());
    }

    @Test
    void createComment_unknownPost_returns404() {
        when(postRepository.findBySlug("nope")).thenReturn(Optional.empty());

        assertAppException(() -> commentService.createComment("nope", createRequest("x", null)),
                HttpStatus.NOT_FOUND);
    }

    // ───────────────────────── updateComment ─────────────────────────

    @Test
    void updateComment_byAuthor_changesContent() {
        Comment existing = comment(7, alice, null, 0, CommentStatus.VISIBLE);
        when(commentRepository.findById(7L)).thenReturn(Optional.of(existing));
        when(currentUser.currentUser()).thenReturn(alice);
        when(commentRepository.save(existing)).thenReturn(existing);

        CommentDto dto = commentService.updateComment(7L, updateRequest("  edited "));

        assertThat(dto.getContent()).isEqualTo("edited");
    }

    @Test
    void updateComment_byAnotherUser_returns403() {
        Comment existing = comment(7, alice, null, 0, CommentStatus.VISIBLE);
        when(commentRepository.findById(7L)).thenReturn(Optional.of(existing));
        when(currentUser.currentUser()).thenReturn(bob);

        assertAppException(() -> commentService.updateComment(7L, updateRequest("hax")), HttpStatus.FORBIDDEN);
        verify(commentRepository, never()).save(any());
    }

    @Test
    void updateComment_deletedComment_returns404() {
        Comment existing = comment(7, alice, null, 0, CommentStatus.DELETED);
        when(commentRepository.findById(7L)).thenReturn(Optional.of(existing));

        assertAppException(() -> commentService.updateComment(7L, updateRequest("x")), HttpStatus.NOT_FOUND);
    }

    // ───────────────────────── deleteComment ─────────────────────────

    @Test
    void deleteComment_byAuthor_softDeletesAndDecrementsCounter() {
        Comment existing = comment(7, alice, null, 0, CommentStatus.VISIBLE);
        when(commentRepository.findById(7L)).thenReturn(Optional.of(existing));
        when(currentUser.currentUser()).thenReturn(alice);

        commentService.deleteComment(7L);

        assertThat(existing.getStatus()).isEqualTo(CommentStatus.DELETED);
        verify(commentRepository).save(existing);
        verify(postRepository).decrementCommentCount(10L);
    }

    @Test
    void deleteComment_byAdmin_isAllowed() {
        User admin = User.builder().id(3L).username("root").role(Role.ADMIN).build();
        Comment existing = comment(7, alice, null, 0, CommentStatus.VISIBLE);
        when(commentRepository.findById(7L)).thenReturn(Optional.of(existing));
        when(currentUser.currentUser()).thenReturn(admin);

        commentService.deleteComment(7L);

        assertThat(existing.getStatus()).isEqualTo(CommentStatus.DELETED);
    }

    @Test
    void deleteComment_byAnotherUser_returns403() {
        Comment existing = comment(7, alice, null, 0, CommentStatus.VISIBLE);
        when(commentRepository.findById(7L)).thenReturn(Optional.of(existing));
        when(currentUser.currentUser()).thenReturn(bob);

        assertAppException(() -> commentService.deleteComment(7L), HttpStatus.FORBIDDEN);
        assertThat(existing.getStatus()).isEqualTo(CommentStatus.VISIBLE);
        verify(postRepository, never()).decrementCommentCount(any());
    }

    @Test
    void deleteComment_alreadyDeleted_returns404WithoutTouchingCounter() {
        Comment existing = comment(7, alice, null, 0, CommentStatus.DELETED);
        when(commentRepository.findById(7L)).thenReturn(Optional.of(existing));

        assertAppException(() -> commentService.deleteComment(7L), HttpStatus.NOT_FOUND);
        verify(postRepository, never()).decrementCommentCount(any());
    }

    @Test
    void deleteComment_unknownComment_returns404() {
        when(commentRepository.findById(7L)).thenReturn(Optional.empty());

        assertAppException(() -> commentService.deleteComment(7L), HttpStatus.NOT_FOUND);
    }
}
