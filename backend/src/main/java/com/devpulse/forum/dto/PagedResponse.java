package com.devpulse.forum.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;

/**
 * Stable JSON shape for paginated responses.
 *
 * <p>Wraps a Spring Data {@link Page} so the verbose default serialization
 * (and the warnings it emits) never leaks to the client.
 *
 * @param <T> response element type
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PagedResponse<T> {

    private List<T> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean hasNext;
    private boolean hasPrev;

    /** Maps a {@link Page} of entities into a {@link PagedResponse} of DTOs. */
    public static <E, T> PagedResponse<T> from(Page<E> page, Function<E, T> mapper) {
        return PagedResponse.<T>builder()
                .content(page.map(mapper).getContent())
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .hasNext(page.hasNext())
                .hasPrev(page.hasPrevious())
                .build();
    }
}
