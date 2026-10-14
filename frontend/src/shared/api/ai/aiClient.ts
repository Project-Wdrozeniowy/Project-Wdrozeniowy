import { apiClient } from '../client/api';
import type { SuggestTagsRequest, SuggestTagsResponse } from './ai.dto';

export const aiService = {
  suggestTags: (data: SuggestTagsRequest): Promise<SuggestTagsResponse> =>
    apiClient.post<SuggestTagsResponse>('/ai/suggest-tags', data),
};
