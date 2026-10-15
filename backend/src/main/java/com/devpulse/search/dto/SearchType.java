package com.devpulse.search.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Kind of search result")
public enum SearchType {
    POST,
    USER,
    TAG
}
