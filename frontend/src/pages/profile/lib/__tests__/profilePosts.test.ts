import { uniquePosts } from '@/pages/profile/lib/profilePosts';
import { makePost } from '@/test/fakeAnalyticsServer';

describe('uniquePosts', () => {
  it('keeps each post once, in the order first met', () => {
    const posts = [makePost(3, 'c'), makePost(2, 'b'), makePost(2, 'b again'), makePost(1, 'a')];

    expect(uniquePosts(posts).map((post) => post.id)).toEqual([3, 2, 1]);
    expect(uniquePosts(posts)[1].title).toBe('b');
  });

  it('is empty for no posts', () => {
    expect(uniquePosts([])).toEqual([]);
  });
});
