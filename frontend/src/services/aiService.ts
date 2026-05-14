import { apiClient } from './api';
import type { SuggestTagsRequest, SuggestTagsResponse } from '../types';

export const aiService = {
  suggestTags: (data: SuggestTagsRequest): Promise<SuggestTagsResponse> =>
    apiClient.post<SuggestTagsResponse>('/ai/suggest-tags', data),
};
