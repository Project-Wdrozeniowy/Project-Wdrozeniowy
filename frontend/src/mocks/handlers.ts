import { http, HttpResponse } from 'msw';
import { MOCK_POSTS } from '@/constants/forum';

export const handlers = [
  http.get('/api/posts', () => {
    return HttpResponse.json(MOCK_POSTS);
  }),
];
