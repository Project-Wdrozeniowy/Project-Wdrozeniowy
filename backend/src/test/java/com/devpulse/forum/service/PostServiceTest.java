package com.devpulse.forum.service;

import com.devpulse.auth.entity.Role;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.util.AuthenticatedUserResolver;
import com.devpulse.exception.AppException;
import com.devpulse.forum.dto.CreatePostRequest;
import com.devpulse.forum.dto.PostResponse;
import com.devpulse.forum.dto.UpdatePostRequest;
import com.devpulse.forum.entity.Category;
import com.devpulse.forum.entity.Post;
import com.devpulse.forum.entity.PostStatus;
import com.devpulse.forum.repository.CategoryRepository;
import com.devpulse.forum.repository.PostRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link PostService} covering the full CRUD lifecycle and
 * the standard error branches surfaced through {@link AppException}.
 */
@ExtendWith(MockitoExtension.class)
class PostServiceTest {

    @Mock private PostRepository postRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private AuthenticatedUserResolver currentUser;

    @InjectMocks private PostService postService;

    private User author;
    private Category category;

    @BeforeEach
    void setUp() {
        author = User.builder().id(1L).username("alice").role(Role.USER).build();
        category = Category.builder().id(7L).name("News").slug("news").build();
    }

    @AfterEach
    void clearAuth() {
        SecurityContextHolder.clearContext();
    }

    private static void setAuth(String username, String... roles) {
        List<SimpleGrantedAuthority> authorities = java.util.Arrays.stream(roles)
                .map(SimpleGrantedAuthority::new).toList();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(username, "n/a", authorities));
    }

    @Test
    void create_persistsPostWithUniqueSlug() {
        when(currentUser.currentUser()).thenReturn(author);
        when(categoryRepository.findById(7L)).thenReturn(Optional.of(category));
        when(postRepository.existsBySlug("hello-world")).thenReturn(false);
        when(postRepository.save(any(Post.class))).thenAnswer(i -> {
            Post p = i.getArgument(0);
            p.setId(42L);
            return p;
        });

        CreatePostRequest req = new CreatePostRequest("Hello World", "body", 7L);
        PostResponse response = postService.create(req);

        assertThat(response.getId()).isEqualTo(42L);
        assertThat(response.getSlug()).isEqualTo("hello-world");
        assertThat(response.getCategory().getId()).isEqualTo(7L);
    }

    @Test
    void create_rejectsUnknownCategory() {
        when(currentUser.currentUser()).thenReturn(author);
        when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

        CreatePostRequest req = new CreatePostRequest("Hello", "body", 99L);

        assertThatThrownBy(() -> postService.create(req))
                .isInstanceOf(AppException.class)
                .satisfies(e -> assertThat(((AppException) e).getStatus())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void create_retriesSlugOnUniqueConstraintRace() {
        when(currentUser.currentUser()).thenReturn(author);
        when(categoryRepository.findById(7L)).thenReturn(Optional.of(category));
        when(postRepository.existsBySlug("hello-world")).thenReturn(false);
        when(postRepository.save(any(Post.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate key value violates unique constraint"))
                .thenAnswer(i -> {
                    Post p = i.getArgument(0);
                    p.setId(42L);
                    return p;
                });

        CreatePostRequest req = new CreatePostRequest("Hello World", "body", 7L);
        PostResponse response = postService.create(req);

        assertThat(response.getId()).isEqualTo(42L);
        assertThat(response.getSlug()).startsWith("hello-world-");
        verify(postRepository, times(2)).save(any(Post.class));
    }

    @Test
    void create_givesUpAfterRepeatedSlugCollisions() {
        when(currentUser.currentUser()).thenReturn(author);
        when(categoryRepository.findById(7L)).thenReturn(Optional.of(category));
        when(postRepository.existsBySlug("hello-world")).thenReturn(false);
        when(postRepository.save(any(Post.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate key value violates unique constraint"));

        CreatePostRequest req = new CreatePostRequest("Hello World", "body", 7L);

        assertThatThrownBy(() -> postService.create(req))
                .isInstanceOf(DataIntegrityViolationException.class);
        verify(postRepository, times(3)).save(any(Post.class));
    }

    @Test
    void getById_returnsVisiblePost() {
        Post post = Post.builder().id(1L).author(author).title("t").slug("t")
                .content("c").status(PostStatus.PUBLISHED).build();
        when(postRepository.findById(1L)).thenReturn(Optional.of(post));

        PostResponse response = postService.getById(1L);

        assertThat(response.getTitle()).isEqualTo("t");
    }

    @Test
    void getById_throwsForDeletedPost() {
        Post post = Post.builder().id(1L).author(author).title("t").slug("t")
                .content("c").status(PostStatus.DELETED).build();
        when(postRepository.findById(1L)).thenReturn(Optional.of(post));

        assertThatThrownBy(() -> postService.getById(1L))
                .isInstanceOf(AppException.class)
                .satisfies(e -> assertThat(((AppException) e).getStatus())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void getById_throwsWhenMissing() {
        when(postRepository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> postService.getById(404L))
                .isInstanceOf(AppException.class)
                .satisfies(e -> assertThat(((AppException) e).getStatus())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void getById_hidesDraftFromOtherUser() {
        Post post = Post.builder().id(1L).author(author).title("t").slug("t")
                .content("c").status(PostStatus.DRAFT).build();
        when(postRepository.findById(1L)).thenReturn(Optional.of(post));
        setAuth("bob", "ROLE_USER");

        assertThatThrownBy(() -> postService.getById(1L))
                .isInstanceOf(AppException.class)
                .satisfies(e -> assertThat(((AppException) e).getStatus())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void getById_allowsDraftForAuthor() {
        Post post = Post.builder().id(1L).author(author).title("t").slug("t")
                .content("c").status(PostStatus.DRAFT).build();
        when(postRepository.findById(1L)).thenReturn(Optional.of(post));
        setAuth("alice", "ROLE_USER");

        assertThat(postService.getById(1L).getTitle()).isEqualTo("t");
    }

    @Test
    void getById_allowsDraftForAdmin() {
        Post post = Post.builder().id(1L).author(author).title("t").slug("t")
                .content("c").status(PostStatus.DRAFT).build();
        when(postRepository.findById(1L)).thenReturn(Optional.of(post));
        setAuth("root", "ROLE_ADMIN");

        assertThat(postService.getById(1L).getTitle()).isEqualTo("t");
    }

    @Test
    void getBySlug_returnsVisible() {
        Post post = Post.builder().id(1L).author(author).title("t").slug("t")
                .content("c").status(PostStatus.PUBLISHED).build();
        when(postRepository.findBySlug("t")).thenReturn(Optional.of(post));

        assertThat(postService.getBySlug("t").getTitle()).isEqualTo("t");
    }

    @Test
    void getBySlug_hidesDeleted() {
        Post post = Post.builder().id(1L).author(author).title("t").slug("t")
                .content("c").status(PostStatus.DELETED).build();
        when(postRepository.findBySlug("t")).thenReturn(Optional.of(post));

        assertThatThrownBy(() -> postService.getBySlug("t"))
                .isInstanceOf(AppException.class);
    }

    @Test
    void getBySlug_hidesDraftFromOtherUser() {
        Post post = Post.builder().id(1L).author(author).title("t").slug("t")
                .content("c").status(PostStatus.DRAFT).build();
        when(postRepository.findBySlug("t")).thenReturn(Optional.of(post));
        setAuth("bob", "ROLE_USER");

        assertThatThrownBy(() -> postService.getBySlug("t"))
                .isInstanceOf(AppException.class)
                .satisfies(e -> assertThat(((AppException) e).getStatus())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void getBySlug_allowsDraftForAuthor() {
        Post post = Post.builder().id(1L).author(author).title("t").slug("t")
                .content("c").status(PostStatus.DRAFT).build();
        when(postRepository.findBySlug("t")).thenReturn(Optional.of(post));
        setAuth("alice", "ROLE_USER");

        assertThat(postService.getBySlug("t").getTitle()).isEqualTo("t");
    }

    @Test
    void update_appliesProvidedFields() {
        Post post = Post.builder().id(1L).author(author).title("t").slug("t")
                .content("c").status(PostStatus.PUBLISHED).build();
        when(postRepository.findById(1L)).thenReturn(Optional.of(post));
        when(postRepository.save(any(Post.class))).thenAnswer(i -> i.getArgument(0));

        UpdatePostRequest req = new UpdatePostRequest();
        req.setTitle("new title");
        req.setContent("new content");

        PostResponse response = postService.update(1L, req);

        assertThat(response.getTitle()).isEqualTo("new title");
        assertThat(response.getContent()).isEqualTo("new content");
    }

    @Test
    void update_clearCategoryDetachesCategory() {
        Post post = Post.builder().id(1L).author(author).title("t").slug("t")
                .content("c").status(PostStatus.PUBLISHED).category(category).build();
        when(postRepository.findById(1L)).thenReturn(Optional.of(post));
        when(postRepository.save(any(Post.class))).thenAnswer(i -> i.getArgument(0));

        UpdatePostRequest req = new UpdatePostRequest();
        req.setClearCategory(true);

        PostResponse response = postService.update(1L, req);

        assertThat(response.getCategory()).isNull();
    }

    @Test
    void update_setsNewCategory() {
        Post post = Post.builder().id(1L).author(author).title("t").slug("t")
                .content("c").status(PostStatus.PUBLISHED).build();
        when(postRepository.findById(1L)).thenReturn(Optional.of(post));
        when(categoryRepository.findById(7L)).thenReturn(Optional.of(category));
        when(postRepository.save(any(Post.class))).thenAnswer(i -> i.getArgument(0));

        UpdatePostRequest req = new UpdatePostRequest();
        req.setCategoryId(7L);

        PostResponse response = postService.update(1L, req);

        assertThat(response.getCategory().getSlug()).isEqualTo("news");
    }

    @Test
    void delete_marksPostAsDeleted() {
        Post post = Post.builder().id(1L).author(author).title("t").slug("t")
                .content("c").status(PostStatus.PUBLISHED).build();
        when(postRepository.findById(1L)).thenReturn(Optional.of(post));

        postService.delete(1L);

        assertThat(post.getStatus()).isEqualTo(PostStatus.DELETED);
        verify(postRepository).save(post);
    }

    @Test
    void delete_isIdempotentForAlreadyDeleted() {
        Post post = Post.builder().id(1L).author(author).title("t").slug("t")
                .content("c").status(PostStatus.DELETED).build();
        when(postRepository.findById(1L)).thenReturn(Optional.of(post));

        postService.delete(1L);

        verify(postRepository, never()).save(any());
    }

    @Test
    void delete_missingThrowsNotFound() {
        when(postRepository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> postService.delete(404L))
                .isInstanceOf(AppException.class)
                .satisfies(e -> assertThat(((AppException) e).getStatus())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }
}
