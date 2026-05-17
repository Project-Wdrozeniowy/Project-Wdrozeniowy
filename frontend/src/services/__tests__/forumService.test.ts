import { fetchPosts } from '@/services/forumService';
import { MOCK_POSTS } from '@/constants/posts';

describe('forumService.fetchPosts', () => {
  it('returns MOCK_POSTS', async () => {
    const posts = await fetchPosts();
    expect(posts).toEqual(MOCK_POSTS);
  });
});
