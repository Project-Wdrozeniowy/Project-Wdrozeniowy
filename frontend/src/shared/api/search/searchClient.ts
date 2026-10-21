import type { AxiosRequestConfig } from 'axios';
import { apiClient } from '../client/api';
import type { SearchParams, SearchResults } from './search.dto';

export const searchService = {
  /** The only search endpoint: `GET /search?q=&type=&page=&size=`. Public. */
  search: (params: SearchParams, config?: AxiosRequestConfig): Promise<SearchResults> =>
    apiClient.get<SearchResults>('/search', { params, ...config }),
};
