package com.devpulse.forum.enums;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Type of entity that can be voted on")
public enum VoteEntityType {
    POST,
    COMMENT
}
