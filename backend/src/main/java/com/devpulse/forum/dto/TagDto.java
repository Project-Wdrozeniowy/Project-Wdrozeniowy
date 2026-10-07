package com.devpulse.forum.dto;

import com.devpulse.forum.entity.Tag;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Post tag")
public class TagDto {

    @Schema(description = "Tag ID", example = "7")
    private Long id;

    @Schema(description = "Tag name", example = "spring-boot")
    private String name;

    @Schema(description = "URL slug", example = "spring-boot")
    private String slug;

    @Schema(description = "Number of posts using this tag", example = "42")
    private int postCount;

    /** Builds the DTO of {@code tag}. */
    public static TagDto from(Tag tag) {
        return TagDto.builder()
                .id(tag.getId())
                .name(tag.getName())
                .slug(tag.getSlug())
                .postCount(tag.getPostCount())
                .build();
    }
}
