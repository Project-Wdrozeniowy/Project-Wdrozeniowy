/** Development-only controlled visual fixture, never proof of real API integration. */
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PostInsights from '@/pages/post/ui/PostInsights';
import PostPage from '@/pages/post/ui/PostPage';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { PostDto } from '@/shared/api/generated/models/postDto.dto';
import { signInUser } from './session';
import '@/app/styles/globals.css';

const params = new URLSearchParams(location.search);
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
if (params.get('audience') === 'author') signInUser(client, { id: 1, username: 'alice' });
if (params.get('audience') === 'staff')
  signInUser(client, { id: 2, username: 'moderator', role: 'ADMIN' });
document.documentElement.dataset.theme = params.get('theme') ?? 'light';
document.body.style.background = 'white';
document.getElementById('root')!.style.width = (params.get('width') ?? '672') + 'px';
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={client}>
    {params.get('page') === 'true' ? (
      <MemoryRouter initialEntries={['/forum/visual-fixture']}>
        <Routes>
          <Route path="/forum/:slug" element={<PostPage />} />
        </Routes>
      </MemoryRouter>
    ) : (
      <PostInsights
        post={{ id: 5, slug: 'visual-fixture', status: 'PUBLISHED', author: { id: 1 } } as PostDto}
        onRefreshPost={async () => ({ isError: false })}
      />
    )}
  </QueryClientProvider>
);
