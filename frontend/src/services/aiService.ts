import { apiClient } from './api';
import type { SuggestTagsRequest, SuggestTagsResponse } from '@/shared/types';

export const aiService = {
  suggestTags: (data: SuggestTagsRequest): Promise<SuggestTagsResponse> =>
    apiClient.post<SuggestTagsResponse>('/ai/suggest-tags', data),
};
