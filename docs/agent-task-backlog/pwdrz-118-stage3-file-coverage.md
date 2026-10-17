# PWDRZ-118 — stage 3: per-file coverage evidence

SHA: `cc998e7ec9f627be613f902638b96cc780d4f40e`; 2026-10-16. Counts are covered/total. 0/0 means no counter, not failed coverage. Backend data comes from the clean single-session run. Frontend V8 synthetic counters on unimported files require the caveat in the main report. Paths are repository-relative. All 239 production source files from the stage 2 inventory are listed.

## frontend

| Source | Scope status | Lines | Branches | Functions / Java methods |
| --- | --- | ---: | ---: | ---: |
| `frontend/src/app/_guards/AuthGuard.tsx` | measured | 17/17 | 10/10 | 1/1 |
| `frontend/src/app/_guards/RoleGuard.tsx` | measured | 21/21 | 14/14 | 1/1 |
| `frontend/src/app/_guards/SessionLoader.tsx` | measured | 7/7 | 1/1 | 1/1 |
| `frontend/src/app/_providers/AuthProvider.tsx` | measured | 26/26 | 10/10 | 2/2 |
| `frontend/src/app/_providers/QueryProvider.tsx` | measured | 46/46 | 11/12 | 1/2 |
| `frontend/src/app/_providers/ToastProvider.tsx` | measured | 0/4 | 1/1 | 1/1 |
| `frontend/src/app/(auth)/layout.tsx` | measured | 0/6 | 0/1 | 0/1 |
| `frontend/src/app/(auth)/login/page.tsx` | measured | 0/116 | 1/1 | 1/1 |
| `frontend/src/app/(auth)/register/page.tsx` | measured | 0/214 | 1/1 | 1/1 |
| `frontend/src/app/(main)/_lib/categoryColor.ts` | measured | 7/7 | 9/9 | 1/1 |
| `frontend/src/app/(main)/_lib/postCard.const.ts` | measured | 1/1 | 0/0 | 0/0 |
| `frontend/src/app/(main)/_lib/postCard.ts` | measured | 19/19 | 9/10 | 1/1 |
| `frontend/src/app/(main)/_ui/forumFeed.const.ts` | measured | 1/1 | 0/0 | 0/0 |
| `frontend/src/app/(main)/_ui/homeFeed.const.ts` | measured | 2/2 | 0/0 | 0/0 |
| `frontend/src/app/(main)/_ui/HomeFeed.tsx` | measured | 35/35 | 11/11 | 2/3 |
| `frontend/src/app/(main)/_ui/postCard.const.ts` | measured | 1/1 | 0/0 | 0/0 |
| `frontend/src/app/(main)/_ui/PostCard.tsx` | measured | 58/58 | 6/6 | 1/1 |
| `frontend/src/app/(main)/_ui/PostFeedError.tsx` | measured | 14/14 | 3/3 | 1/1 |
| `frontend/src/app/(main)/_ui/PostFeedSkeleton.tsx` | measured | 23/23 | 2/2 | 1/1 |
| `frontend/src/app/(main)/(protected)/admin/layout.tsx` | measured | 0/4 | 0/1 | 0/1 |
| `frontend/src/app/(main)/(protected)/admin/page.tsx` | measured | 0/7 | 0/1 | 0/1 |
| `frontend/src/app/(main)/(protected)/dashboard/_lib/dashboard.const.ts` | measured | 0/33 | 0/1 | 0/1 |
| `frontend/src/app/(main)/(protected)/dashboard/_ui/BarChart.tsx` | measured | 0/48 | 0/1 | 0/1 |
| `frontend/src/app/(main)/(protected)/dashboard/_ui/ChartCard.tsx` | measured | 0/11 | 0/1 | 0/1 |
| `frontend/src/app/(main)/(protected)/dashboard/_ui/LineChart.tsx` | measured | 0/73 | 0/1 | 0/1 |
| `frontend/src/app/(main)/(protected)/dashboard/_ui/PostsCard.tsx` | measured | 0/19 | 0/1 | 0/1 |
| `frontend/src/app/(main)/(protected)/dashboard/_ui/StatCard.tsx` | measured | 0/23 | 0/1 | 0/1 |
| `frontend/src/app/(main)/(protected)/dashboard/_ui/StatsGrid.tsx` | measured | 0/17 | 0/1 | 0/1 |
| `frontend/src/app/(main)/(protected)/dashboard/_ui/TopPostRow.tsx` | measured | 0/21 | 0/1 | 0/1 |
| `frontend/src/app/(main)/(protected)/dashboard/_ui/TopPosts.tsx` | measured | 0/17 | 0/1 | 0/1 |
| `frontend/src/app/(main)/(protected)/dashboard/page.tsx` | measured | 0/36 | 0/1 | 0/1 |
| `frontend/src/app/(main)/(protected)/layout.tsx` | measured | 0/4 | 0/1 | 0/1 |
| `frontend/src/app/(main)/(protected)/profile/_ui/PostsSkeleton.tsx` | measured | 0/12 | 0/1 | 0/1 |
| `frontend/src/app/(main)/(protected)/profile/_ui/ProfileCard.tsx` | measured | 48/48 | 12/14 | 3/3 |
| `frontend/src/app/(main)/(protected)/profile/_ui/ProfileLoadError.tsx` | measured | 14/14 | 1/2 | 1/1 |
| `frontend/src/app/(main)/(protected)/profile/_ui/ProfileSkeleton.tsx` | measured | 22/22 | 2/2 | 1/1 |
| `frontend/src/app/(main)/(protected)/profile/_ui/ProfileTabs.tsx` | measured | 0/22 | 1/1 | 1/1 |
| `frontend/src/app/(main)/(protected)/profile/_ui/profileView.const.ts` | measured | 6/6 | 0/0 | 0/0 |
| `frontend/src/app/(main)/(protected)/profile/_ui/ProfileView.tsx` | measured | 19/19 | 6/6 | 2/2 |
| `frontend/src/app/(main)/(protected)/profile/page.tsx` | measured | 0/11 | 0/1 | 0/1 |
| `frontend/src/app/(main)/forum/_lib/forumFeed.ts` | measured | 9/9 | 10/10 | 2/2 |
| `frontend/src/app/(main)/forum/_ui/CategoryFilter.tsx` | measured | 23/23 | 6/6 | 2/2 |
| `frontend/src/app/(main)/forum/_ui/EmptyFeed.tsx` | measured | 19/19 | 5/5 | 1/1 |
| `frontend/src/app/(main)/forum/_ui/ForumFeed.tsx` | measured | 95/95 | 37/37 | 6/7 |
| `frontend/src/app/(main)/forum/_ui/PostPagination.tsx` | measured | 34/34 | 8/8 | 3/3 |
| `frontend/src/app/(main)/forum/[slug]/page.tsx` | measured | 0/30 | 0/1 | 0/1 |
| `frontend/src/app/(main)/forum/page.tsx` | measured | 0/16 | 0/1 | 0/1 |
| `frontend/src/app/(main)/layout.tsx` | measured | 0/16 | 0/1 | 0/1 |
| `frontend/src/app/(main)/page.tsx` | measured | 0/28 | 1/1 | 1/1 |
| `frontend/src/app/layout.tsx` | measured | 0/27 | 1/1 | 1/1 |
| `frontend/src/features/create-post/createPost.const.ts` | measured | 30/30 | 0/0 | 0/0 |
| `frontend/src/features/create-post/createPost.schema.ts` | measured | 16/16 | 0/0 | 0/0 |
| `frontend/src/features/create-post/createPost.ts` | measured | 48/48 | 27/28 | 7/7 |
| `frontend/src/features/create-post/CreatePostButton.tsx` | measured | 30/30 | 11/11 | 3/3 |
| `frontend/src/features/create-post/CreatePostDialog.tsx` | measured | 134/134 | 46/47 | 8/8 |
| `frontend/src/features/create-post/CreatePostForm.tsx` | measured | 223/223 | 54/59 | 6/6 |
| `frontend/src/features/create-post/FieldLabel.tsx` | measured | 18/18 | 3/4 | 1/1 |
| `frontend/src/features/create-post/TagInput.tsx` | measured | 91/91 | 29/30 | 6/6 |
| `frontend/src/features/edit-profile/profile.const.ts` | measured | 23/23 | 0/0 | 0/0 |
| `frontend/src/features/edit-profile/profile.schema.ts` | measured | 23/23 | 2/2 | 1/1 |
| `frontend/src/features/edit-profile/profile.ts` | measured | 42/42 | 16/16 | 4/4 |
| `frontend/src/features/edit-profile/ProfileForm.tsx` | measured | 165/165 | 30/37 | 4/4 |
| `frontend/src/features/post-comments/comment.const.ts` | measured | 2/2 | 0/0 | 0/0 |
| `frontend/src/features/post-comments/CommentForm.tsx` | measured | 68/68 | 10/11 | 3/3 |
| `frontend/src/features/post-comments/CommentItem.tsx` | measured | 95/95 | 19/20 | 4/5 |
| `frontend/src/features/post-comments/comments.ts` | measured | 12/12 | 9/9 | 3/3 |
| `frontend/src/features/post-comments/CommentSection.tsx` | measured | 73/73 | 35/36 | 5/5 |
| `frontend/src/features/post-interactions/ActionButton.tsx` | measured | 11/11 | 1/1 | 1/1 |
| `frontend/src/features/post-interactions/PostVoteColumn.tsx` | measured | 26/26 | 9/10 | 2/2 |
| `frontend/src/features/post-interactions/VoteButton.tsx` | measured | 28/28 | 11/11 | 1/1 |
| `frontend/src/features/post-interactions/VoteColumn.tsx` | measured | 40/40 | 13/14 | 4/4 |
| `frontend/src/features/sign-in/login.schema.ts` | measured | 0/12 | 0/1 | 0/1 |
| `frontend/src/features/sign-up/register.schema.ts` | measured | 0/28 | 0/1 | 0/1 |
| `frontend/src/shared/api/ai/ai.dto.ts` | no executable line counters | 0/0 | 1/1 | 1/1 |
| `frontend/src/shared/api/ai/aiClient.ts` | measured | 5/5 | 1/1 | 1/1 |
| `frontend/src/shared/api/analytics/analytics.dto.ts` | no executable line counters | 0/0 | 1/1 | 1/1 |
| `frontend/src/shared/api/analytics/analyticsClient.ts` | measured | 21/21 | 7/7 | 7/7 |
| `frontend/src/shared/api/auth/auth.dto.ts` | no executable line counters | 0/0 | 1/1 | 1/1 |
| `frontend/src/shared/api/auth/authClient.ts` | measured | 14/14 | 4/4 | 4/4 |
| `frontend/src/shared/api/client/api.ts` | measured | 102/108 | 35/38 | 9/9 |
| `frontend/src/shared/api/client/apiError.ts` | measured | 10/10 | 8/8 | 2/2 |
| `frontend/src/shared/api/client/pagination.dto.ts` | no executable line counters | 0/0 | 1/1 | 1/1 |
| `frontend/src/shared/api/client/problem.dto.ts` | no executable line counters | 0/0 | 1/1 | 1/1 |
| `frontend/src/shared/api/forum/category.dto.ts` | no executable line counters | 0/0 | 1/1 | 1/1 |
| `frontend/src/shared/api/forum/comment.dto.ts` | no executable line counters | 0/0 | 1/1 | 1/1 |
| `frontend/src/shared/api/forum/commentQuery.const.ts` | measured | 1/1 | 0/0 | 0/0 |
| `frontend/src/shared/api/forum/feedQuery.const.ts` | measured | 3/3 | 0/0 | 0/0 |
| `frontend/src/shared/api/forum/forumClient.ts` | measured | 49/49 | 19/19 | 19/19 |
| `frontend/src/shared/api/forum/post.dto.ts` | no executable line counters | 0/0 | 1/1 | 1/1 |
| `frontend/src/shared/api/forum/postVote.ts` | measured | 22/22 | 15/15 | 4/4 |
| `frontend/src/shared/api/forum/tag.dto.ts` | no executable line counters | 0/0 | 1/1 | 1/1 |
| `frontend/src/shared/api/forum/useCategories.ts` | measured | 13/13 | 4/4 | 2/2 |
| `frontend/src/shared/api/forum/useComments.ts` | measured | 24/24 | 8/8 | 6/6 |
| `frontend/src/shared/api/forum/useCreatePost.ts` | measured | 14/14 | 3/3 | 3/3 |
| `frontend/src/shared/api/forum/useForumPosts.ts` | measured | 17/17 | 7/7 | 3/3 |
| `frontend/src/shared/api/forum/useVotePost.ts` | measured | 51/51 | 26/27 | 5/5 |
| `frontend/src/shared/api/forum/vote.const.ts` | measured | 5/5 | 0/0 | 0/0 |
| `frontend/src/shared/api/forum/vote.dto.ts` | no executable line counters | 0/0 | 1/1 | 1/1 |
| `frontend/src/shared/api/notification/notification.dto.ts` | no executable line counters | 0/0 | 1/1 | 1/1 |
| `frontend/src/shared/api/notification/notificationClient.ts` | measured | 9/9 | 4/4 | 4/4 |
| `frontend/src/shared/api/profile/useMyProfile.ts` | measured | 12/12 | 4/4 | 3/3 |
| `frontend/src/shared/api/profile/useUpdateProfile.ts` | measured | 18/18 | 4/4 | 3/3 |
| `frontend/src/shared/api/recommendation/recommendation.dto.ts` | no executable line counters | 0/0 | 1/1 | 1/1 |
| `frontend/src/shared/api/user/user.dto.ts` | no executable line counters | 0/0 | 1/1 | 1/1 |
| `frontend/src/shared/api/user/userClient.ts` | measured | 11/11 | 4/4 | 4/4 |
| `frontend/src/shared/api/websocket/forumEvent.dto.ts` | no executable line counters | 0/0 | 1/1 | 1/1 |
| `frontend/src/shared/auth/tokenMemory.ts` | measured | 7/7 | 2/2 | 2/2 |
| `frontend/src/shared/constants/categories.const.ts` | measured | 42/42 | 5/5 | 1/1 |
| `frontend/src/shared/lib/cn.ts` | measured | 4/4 | 1/1 | 1/1 |
| `frontend/src/shared/lib/toast.ts` | measured | 8/8 | 1/1 | 1/4 |
| `frontend/src/shared/lib/url.ts` | measured | 8/8 | 3/3 | 1/1 |
| `frontend/src/shared/ui/FormField.tsx` | measured | 24/24 | 3/5 | 1/1 |
| `frontend/src/shared/ui/icons.tsx` | measured | 124/153 | 8/8 | 8/10 |
| `frontend/src/shared/ui/OrbitaLogo.tsx` | measured | 16/16 | 1/1 | 1/1 |
| `frontend/src/store/index.ts` | measured | 7/7 | 1/1 | 0/0 |
| `frontend/src/store/slices/authSlice.ts` | measured | 16/16 | 8/8 | 5/5 |
| `frontend/src/store/slices/uiSlice.ts` | measured | 4/4 | 2/2 | 2/2 |
| `frontend/src/utils/format.ts` | measured | 19/19 | 17/17 | 3/3 |
| `frontend/src/widgets/header/Header.tsx` | measured | 42/42 | 6/6 | 2/2 |
| `frontend/src/widgets/header/ui/header.const.ts` | measured | 5/5 | 0/0 | 0/0 |
| `frontend/src/widgets/header/ui/NavLinks.tsx` | measured | 28/28 | 10/10 | 2/2 |
| `frontend/src/widgets/header/ui/SearchBar.tsx` | measured | 15/15 | 1/1 | 1/1 |
| `frontend/src/widgets/header/ui/UserActions.tsx` | measured | 29/41 | 1/3 | 1/1 |
| `frontend/src/widgets/sidebar/Sidebar.tsx` | measured | 0/26 | 1/1 | 1/1 |
| `frontend/src/widgets/sidebar/ui/GuestCard.tsx` | measured | 0/21 | 0/1 | 0/1 |
| `frontend/src/widgets/sidebar/ui/LiveActivity.tsx` | measured | 0/24 | 0/1 | 0/1 |
| `frontend/src/widgets/sidebar/ui/sidebar.const.ts` | measured | 0/18 | 0/1 | 0/1 |
| `frontend/src/widgets/sidebar/ui/TrendingTopics.tsx` | measured | 0/27 | 0/1 | 0/1 |
| `frontend/src/widgets/sidebar/ui/UserCard.tsx` | measured | 0/47 | 0/1 | 0/1 |

## gateway

| Source | Scope status | Lines | Branches | Functions / Java methods |
| --- | --- | ---: | ---: | ---: |
| `gateway/src/app.ts` | measured | 24/24 | 0/0 | 2/2 |
| `gateway/src/config/index.ts` | measured | 16/16 | 4/4 | 6/6 |
| `gateway/src/index.ts` | excluded: exact process bootstrap | — | — | — |
| `gateway/src/middleware/auth.ts` | measured | 27/27 | 10/10 | 4/4 |
| `gateway/src/middleware/authGuard.ts` | measured | 0/17 | 0/10 | 0/3 |
| `gateway/src/middleware/cors.ts` | measured | 7/7 | 4/4 | 1/1 |
| `gateway/src/middleware/errorHandler.ts` | measured | 14/17 | 12/15 | 3/3 |
| `gateway/src/middleware/logger.ts` | measured | 10/12 | 0/0 | 3/5 |
| `gateway/src/middleware/rateLimiter.ts` | measured | 5/6 | 0/0 | 0/1 |
| `gateway/src/routes/proxy.ts` | measured | 12/14 | 5/10 | 2/2 |
| `gateway/src/routes/wsProxy.ts` | measured | 5/9 | 0/1 | 0/1 |
| `gateway/src/types/index.ts` | type-only, no runtime report entry | — | — | — |

## backend

| Source | Scope status | Lines | Branches | Functions / Java methods |
| --- | --- | ---: | ---: | ---: |
| `backend/src/main/java/com/devpulse/admin/controller/AdminController.java` | measured | 2/2 | 0/0 | 2/2 |
| `backend/src/main/java/com/devpulse/ai/controller/AiController.java` | measured | 2/2 | 0/0 | 2/2 |
| `backend/src/main/java/com/devpulse/ai/dto/SuggestTagsRequest.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/ai/dto/TagSuggestionsDto.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/analytics/controller/AnalyticsController.java` | measured | 6/6 | 0/0 | 6/6 |
| `backend/src/main/java/com/devpulse/analytics/dto/ActivityTrendDto.java` | excluded: DTO-only package, no executable lines at this SHA | — | — | — |
| `backend/src/main/java/com/devpulse/analytics/dto/PlatformSummaryDto.java` | excluded: DTO-only package, no executable lines at this SHA | — | — | — |
| `backend/src/main/java/com/devpulse/analytics/dto/PostAnalyticsDto.java` | excluded: DTO-only package, no executable lines at this SHA | — | — | — |
| `backend/src/main/java/com/devpulse/analytics/dto/TrendDataPointDto.java` | excluded: DTO-only package, no executable lines at this SHA | — | — | — |
| `backend/src/main/java/com/devpulse/analytics/dto/UserActivitySummaryDto.java` | excluded: DTO-only package, no executable lines at this SHA | — | — | — |
| `backend/src/main/java/com/devpulse/auth/controller/AuthController.java` | measured | 12/12 | 2/2 | 5/5 |
| `backend/src/main/java/com/devpulse/auth/cookie/RefreshTokenCookies.java` | measured | 18/18 | 0/0 | 5/5 |
| `backend/src/main/java/com/devpulse/auth/dto/AuthRequest.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/auth/dto/AuthResponse.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/auth/dto/RegisterRequest.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/auth/entity/RefreshToken.java` | measured | 3/3 | 5/6 | 3/3 |
| `backend/src/main/java/com/devpulse/auth/entity/Role.java` | measured | 4/4 | 0/0 | 1/1 |
| `backend/src/main/java/com/devpulse/auth/entity/User.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/auth/entity/UserStatus.java` | measured | 4/4 | 0/0 | 1/1 |
| `backend/src/main/java/com/devpulse/auth/filter/JwtAuthenticationFilter.java` | measured | 19/19 | 9/10 | 1/1 |
| `backend/src/main/java/com/devpulse/auth/repository/RefreshTokenRepository.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/auth/repository/UserRepository.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/auth/service/AuthService.java` | measured | 80/80 | 28/28 | 11/12 |
| `backend/src/main/java/com/devpulse/auth/service/UserDetailsServiceImpl.java` | measured | 6/6 | 0/0 | 2/2 |
| `backend/src/main/java/com/devpulse/auth/util/AuthenticatedUserResolver.java` | measured | 6/7 | 3/6 | 1/2 |
| `backend/src/main/java/com/devpulse/BackendApplication.java` | excluded: exact process bootstrap | — | — | — |
| `backend/src/main/java/com/devpulse/common/dto/PagedResponse.java` | measured | 10/10 | 0/0 | 2/2 |
| `backend/src/main/java/com/devpulse/common/util/LikePatterns.java` | measured | 5/5 | 0/0 | 1/1 |
| `backend/src/main/java/com/devpulse/common/validation/ValidationPatterns.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/config/OpenApiConfig.java` | measured | 23/23 | 0/0 | 3/3 |
| `backend/src/main/java/com/devpulse/config/OpenApiContractCustomizer.java` | measured | 104/108 | 42/52 | 24/24 |
| `backend/src/main/java/com/devpulse/config/SecurityConfig.java` | measured | 37/38 | 0/0 | 11/12 |
| `backend/src/main/java/com/devpulse/config/WebSocketConfig.java` | measured | 10/10 | 0/0 | 3/3 |
| `backend/src/main/java/com/devpulse/exception/AppException.java` | measured | 4/4 | 0/0 | 2/2 |
| `backend/src/main/java/com/devpulse/exception/GlobalExceptionHandler.java` | measured | 19/23 | 2/2 | 6/7 |
| `backend/src/main/java/com/devpulse/forum/controller/CategoryController.java` | measured | 5/5 | 0/0 | 5/5 |
| `backend/src/main/java/com/devpulse/forum/controller/CommentController.java` | measured | 5/5 | 0/0 | 5/5 |
| `backend/src/main/java/com/devpulse/forum/controller/PostController.java` | measured | 17/18 | 7/10 | 7/7 |
| `backend/src/main/java/com/devpulse/forum/controller/PostSubscriptionController.java` | measured | 5/5 | 0/0 | 3/3 |
| `backend/src/main/java/com/devpulse/forum/controller/TagController.java` | measured | 3/3 | 0/0 | 3/3 |
| `backend/src/main/java/com/devpulse/forum/controller/VoteController.java` | measured | 4/4 | 2/2 | 2/2 |
| `backend/src/main/java/com/devpulse/forum/dto/CategoryDto.java` | measured | 11/11 | 2/2 | 1/1 |
| `backend/src/main/java/com/devpulse/forum/dto/CommentDto.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/forum/dto/CreateCategoryRequest.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/forum/dto/CreateCommentRequest.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/forum/dto/CreatePostRequest.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/forum/dto/MyVoteDto.java` | measured | 1/1 | 0/0 | 1/1 |
| `backend/src/main/java/com/devpulse/forum/dto/PostDto.java` | measured | 9/9 | 0/0 | 1/1 |
| `backend/src/main/java/com/devpulse/forum/dto/PostSummaryDto.java` | measured | 15/15 | 0/0 | 2/2 |
| `backend/src/main/java/com/devpulse/forum/dto/TagDto.java` | measured | 6/6 | 0/0 | 1/1 |
| `backend/src/main/java/com/devpulse/forum/dto/UpdateCategoryRequest.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/forum/dto/UpdateCommentRequest.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/forum/dto/UpdatePostRequest.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/forum/dto/VoteDto.java` | measured | 9/9 | 6/6 | 1/1 |
| `backend/src/main/java/com/devpulse/forum/dto/VoteRequest.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/forum/entity/Category.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/forum/entity/Post.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/forum/entity/PostStatus.java` | measured | 5/5 | 0/0 | 1/1 |
| `backend/src/main/java/com/devpulse/forum/entity/PostSubscription.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/forum/entity/Tag.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/forum/entity/Vote.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/forum/enums/VoteEntityType.java` | measured | 3/3 | 0/0 | 1/1 |
| `backend/src/main/java/com/devpulse/forum/enums/VoteType.java` | measured | 3/3 | 0/0 | 1/1 |
| `backend/src/main/java/com/devpulse/forum/repository/CategoryRepository.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/forum/repository/PostRepository.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/forum/repository/PostSubscriptionRepository.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/forum/repository/TagRepository.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/forum/repository/VoteRepository.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/forum/security/ForumAuthorities.java` | measured | 12/12 | 19/20 | 5/5 |
| `backend/src/main/java/com/devpulse/forum/security/PostSecurity.java` | measured | 7/7 | 4/4 | 2/2 |
| `backend/src/main/java/com/devpulse/forum/service/CategoryService.java` | measured | 6/6 | 0/0 | 3/3 |
| `backend/src/main/java/com/devpulse/forum/service/PostFilter.java` | measured | 1/1 | 0/0 | 1/1 |
| `backend/src/main/java/com/devpulse/forum/service/PostService.java` | measured | 142/145 | 90/95 | 33/33 |
| `backend/src/main/java/com/devpulse/forum/service/PostSpecifications.java` | measured | 18/18 | 0/0 | 14/14 |
| `backend/src/main/java/com/devpulse/forum/service/PostSubscriptionService.java` | measured | 16/16 | 4/6 | 5/5 |
| `backend/src/main/java/com/devpulse/forum/service/VoteService.java` | measured | 50/53 | 25/28 | 14/15 |
| `backend/src/main/java/com/devpulse/forum/util/SlugUtil.java` | measured | 23/23 | 9/10 | 2/2 |
| `backend/src/main/java/com/devpulse/notification/controller/NotificationController.java` | measured | 5/5 | 0/0 | 5/5 |
| `backend/src/main/java/com/devpulse/notification/dto/NotificationDto.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/recommendation/controller/RecommendationController.java` | measured | 3/3 | 0/0 | 3/3 |
| `backend/src/main/java/com/devpulse/recommendation/dto/RecommendedPostDto.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/search/controller/SearchController.java` | measured | 1/1 | 0/0 | 1/1 |
| `backend/src/main/java/com/devpulse/search/dto/SearchResultsDto.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/search/dto/SearchType.java` | measured | 4/4 | 0/0 | 1/1 |
| `backend/src/main/java/com/devpulse/search/service/SearchService.java` | measured | 20/20 | 20/24 | 1/1 |
| `backend/src/main/java/com/devpulse/security/JwtUtil.java` | measured | 32/32 | 5/6 | 8/8 |
| `backend/src/main/java/com/devpulse/user/controller/UserController.java` | measured | 5/5 | 0/0 | 4/4 |
| `backend/src/main/java/com/devpulse/user/dto/ChangePasswordRequest.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/user/dto/MyProfileDto.java` | measured | 3/3 | 0/0 | 1/1 |
| `backend/src/main/java/com/devpulse/user/dto/UpdateProfileRequest.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/user/dto/UserProfileDto.java` | measured | 12/12 | 0/0 | 2/2 |
| `backend/src/main/java/com/devpulse/user/dto/UserSummaryDto.java` | measured | 7/7 | 0/0 | 1/1 |
| `backend/src/main/java/com/devpulse/user/service/UserService.java` | measured | 29/29 | 15/16 | 7/7 |
| `backend/src/main/java/com/devpulse/websocket/controller/WebSocketController.java` | measured | 1/3 | 0/0 | 1/3 |
| `backend/src/main/java/com/devpulse/websocket/dto/NewCommentEvent.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/websocket/dto/PostSubscriptionRequest.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/websocket/dto/VoteScoreEvent.java` | no executable line counters | 0/0 | 0/0 | 0/0 |
| `backend/src/main/java/com/devpulse/websocket/interceptor/WebSocketAuthInterceptor.java` | measured | 0/14 | 0/12 | 0/1 |
