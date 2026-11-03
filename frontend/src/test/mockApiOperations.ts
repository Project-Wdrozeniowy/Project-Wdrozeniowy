import type { AxiosRequestConfig } from 'axios';
import type { Mock } from 'vitest';
import type { ApiRequestOptions } from '@/shared/api/client/orvalTransport';

/** UI fixtures stop at the generated transport boundary; generated hooks/keys stay real. */
export function mockApiOperations(
  config: AxiosRequestConfig,
  options: ApiRequestOptions | undefined,
  handlers: Record<string, Record<string, Mock>>
) {
  const request = { ...options, ...(config.signal ? { signal: config.signal } : {}) };
  switch (`${config.method?.toUpperCase()} ${config.url}`) {
    case 'GET /forum/posts':
      return handlers.postService.list(config.params ?? {}, request);
    case 'GET /forum/categories':
      return handlers.categoryService.list(request);
    case 'POST /forum/posts':
      return handlers.postService.create(config.data, request);
    case 'POST /forum/votes':
      return handlers.voteService.cast(config.data, request);
    case 'GET /search':
      return handlers.searchService.search(config.params, request);
    default:
      if (config.method?.toUpperCase() === 'DELETE' && config.url?.startsWith('/forum/votes/')) {
        return handlers.voteService.retract(Number(config.url.split('/').at(-1)), request);
      }
      throw new Error(`Unexpected fixture request: ${config.method} ${config.url}`);
  }
}
