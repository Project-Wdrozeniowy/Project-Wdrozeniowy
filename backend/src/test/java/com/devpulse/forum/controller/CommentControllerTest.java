package com.devpulse.forum.controller;

import com.devpulse.common.dto.PagedResponse;
import com.devpulse.exception.AppException;
import com.devpulse.exception.GlobalExceptionHandler;
import com.devpulse.forum.dto.CommentDto;
import com.devpulse.forum.dto.CreateCommentRequest;
import com.devpulse.forum.dto.UpdateCommentRequest;
import com.devpulse.forum.service.CommentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class CommentControllerTest {

    @Mock private CommentService commentService;
    @InjectMocks private CommentController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();
    }

    private static CommentDto dto(long id) {
        return CommentDto.builder().id(id).postId(10L).content("hi").status("VISIBLE").replies(List.of()).build();
    }

    @Test
    void list_returnsPagedComments() throws Exception {
        PagedResponse<CommentDto> page = PagedResponse.<CommentDto>builder()
                .content(List.of(dto(1))).page(0).size(20).totalElements(1).totalPages(1).first(true).last(true)
                .build();
        when(commentService.listComments("hello", 0, 20)).thenReturn(page);

        mockMvc.perform(get("/forum/posts/hello/comments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.last").value(true));
    }

    @Test
    void list_passesPaginationParams() throws Exception {
        when(commentService.listComments("hello", 2, 5)).thenReturn(PagedResponse.<CommentDto>builder()
                .content(List.of()).page(2).size(5).build());

        mockMvc.perform(get("/forum/posts/hello/comments").param("page", "2").param("size", "5"))
                .andExpect(status().isOk());
        verify(commentService).listComments("hello", 2, 5);
    }

    @Test
    void list_unknownPost_returns404() throws Exception {
        when(commentService.listComments("nope", 0, 20))
                .thenThrow(new AppException("Post not found", HttpStatus.NOT_FOUND));

        mockMvc.perform(get("/forum/posts/nope/comments"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Post not found"));
    }

    @Test
    void create_validBody_returns201() throws Exception {
        when(commentService.createComment(eq("hello"), any(CreateCommentRequest.class))).thenReturn(dto(9));

        mockMvc.perform(post("/forum/posts/hello/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"hi\",\"parentId\":3}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(9));
    }

    @Test
    void create_blankContent_returns400() throws Exception {
        mockMvc.perform(post("/forum/posts/hello/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"   \"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_tooLongContent_returns400() throws Exception {
        String content = "a".repeat(10_001);
        mockMvc.perform(post("/forum/posts/hello/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"" + content + "\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_tooDeep_returns422() throws Exception {
        when(commentService.createComment(eq("hello"), any(CreateCommentRequest.class)))
                .thenThrow(new AppException("Maximum comment nesting depth (5) exceeded",
                        HttpStatus.UNPROCESSABLE_ENTITY));

        mockMvc.perform(post("/forum/posts/hello/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"hi\",\"parentId\":3}"))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void update_validBody_returns200() throws Exception {
        when(commentService.updateComment(eq(4L), any(UpdateCommentRequest.class))).thenReturn(dto(4));

        mockMvc.perform(patch("/forum/comments/4")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"edited\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(4));
    }

    @Test
    void update_forbidden_returns403() throws Exception {
        when(commentService.updateComment(eq(4L), any(UpdateCommentRequest.class)))
                .thenThrow(new AppException("You can only edit your own comments", HttpStatus.FORBIDDEN));

        mockMvc.perform(patch("/forum/comments/4")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"edited\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void delete_returns204() throws Exception {
        mockMvc.perform(delete("/forum/comments/4")).andExpect(status().isNoContent());
        verify(commentService).deleteComment(4L);
    }

    @Test
    void delete_forbidden_returns403() throws Exception {
        org.mockito.Mockito.doThrow(new AppException("nope", HttpStatus.FORBIDDEN))
                .when(commentService).deleteComment(4L);

        mockMvc.perform(delete("/forum/comments/4")).andExpect(status().isForbidden());
    }
}
