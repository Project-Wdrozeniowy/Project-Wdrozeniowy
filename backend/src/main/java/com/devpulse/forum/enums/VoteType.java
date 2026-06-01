package com.devpulse.forum.enums;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Direction of a vote")
public enum VoteType {
    UP,
    DOWN
}
