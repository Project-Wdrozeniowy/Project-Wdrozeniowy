# Post engagement and publication privacy

PWDRZ-194 establishes backend publication privacy; PWDRZ-167 exposes the summaries
below. Paths are relative to `/api`. Spring owns session and resource authorization.

| GET                            | Access                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `/analytics/public/posts/{id}` | Public; only PUBLISHED/LOCKED posts. DRAFT/DELETED/missing returns 404, even to the author             |
| `/analytics/me/posts/{id}`     | The author only, including their draft. Guest: 401; another member or staff: 404; deleted/missing: 404 |
| `/analytics/posts/{id}`        | Existing staff analytics; ADMIN/MODERATOR permissions and fields are unchanged                         |

The public response contains exactly `postId`, `viewCount`, `commentCount`,
`voteScore`, `collectedFrom`. The owner response adds `upvoteCount` and
`downvoteCount`. Neither response contains visitor identities, reading histories,
demographics, unique reach or subscription totals.

`viewCount` is the stored intentional-opening total. V10 retired older GET-based
events and reset these totals. `collectedFrom` is the existing V11 collection
metadata, not a reconstructed publication-lifetime history or an exact inferred
V10 deployment timestamp. Reading these summaries, including HEAD, adds no openings.

`commentCount` includes all reachable VISIBLE comments through depth 5. HIDDEN
branches are excluded, DELETED placeholders are not counted, but visible replies
under deleted placeholders remain counted. This is more precise than the legacy
stored count on feed cards and the staff count of all VISIBLE rows. A presentation
must label and consume the intended metric, not silently treat them as equivalent.

`voteScore` is the stored signed score; UP/DOWN counts are votes on this post,
not votes on its comments. All counters are read from the same database statement
snapshot as the resource visibility check.

## Unpublishing and republication

The existing author PATCH changes PUBLISHED to DRAFT or DRAFT to PUBLISHED. It
preserves the slug, body, discussion, votes and opening history. A non-staff author
cannot use this operation to bypass LOCKED. Concurrent post writes lock and refresh
the row before validating access and editing, preserving newly committed counters
and moderation state. Existing staff privileges and deletion rules remain intact.

While a post is non-public its public summary is 404 and its contribution is
excluded from current public post/activity figures, even for historical windows.
Republication restores that public contribution. The owner's undeleted history
remains private. Deletion closes the owner summary as well; existing protected
staff analytics retain their current policy. Category visibility is unrelated.

Public user-profile counters count public posts and reachable visible comments
on public posts. Private own-profile totals retain their existing semantics.
This task does not introduce a new retention or tracking scheme.

## Frontend handoff

Use generated operations and schemas; the backend never returns the staff DTO as
a public response. Public and owner queries are distinct. Owner query compositions
must be account-scoped and follow existing logout/account replacement clearing.
After a publication transition, discard obsolete public results and refetch affected
views. Statistics refetch is not a navigation opening. These frontend controls,
cache changes and page integration belong to their FE tasks and are not implemented
by the backend delivery.

Server denial governs future reads; it cannot retract copies already received by
another person. No live remote-tab invalidation or new realtime infrastructure is
provided. See [sessions](sessions.md), [API bindings](api-bindings.md) and the
[execution record](../agent-task-backlog/pwdrz-167-execution.md) for access and evidence.
