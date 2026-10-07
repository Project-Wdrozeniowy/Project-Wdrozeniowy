package com.devpulse.forum.util;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class SlugUtilTest {

    @Test
    void slugifyHandlesAsciiAndPunctuation() {
        assertThat(SlugUtil.slugify("Hello, World!")).isEqualTo("hello-world");
    }

    @Test
    void slugifyStripsAccents() {
        assertThat(SlugUtil.slugify("Café résumé")).isEqualTo("cafe-resume");
    }

    @Test
    void slugifyTrimsLeadingAndTrailingDashes() {
        assertThat(SlugUtil.slugify("  ---title---  ")).isEqualTo("title");
    }

    @Test
    void slugifyFallsBackForEmptyInput() {
        assertThat(SlugUtil.slugify("")).isEqualTo("post");
        assertThat(SlugUtil.slugify(null)).isEqualTo("post");
        assertThat(SlugUtil.slugify("!!!")).isEqualTo("post");
    }

    @Test
    void slugifyTruncatesToMaxLength() {
        String long_ = "a".repeat(SlugUtil.MAX_LENGTH + 50);
        assertThat(SlugUtil.slugify(long_)).hasSize(SlugUtil.MAX_LENGTH);
    }

    @Test
    void uniqueSlugSuffixesOnCollisions() {
        Set<String> taken = new HashSet<>();
        taken.add("hello");
        taken.add("hello-2");

        String slug = SlugUtil.uniqueSlug("Hello", taken::contains);

        assertThat(slug).isEqualTo("hello-3");
    }

    @Test
    void uniqueSlugReturnsBaseWhenFree() {
        assertThat(SlugUtil.uniqueSlug("Brand new", s -> false)).isEqualTo("brand-new");
    }
}
