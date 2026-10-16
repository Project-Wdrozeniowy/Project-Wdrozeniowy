// PROVISIONAL (PWDRZ-147): backend returns 501; this adapter is not a published live contract.
import { apiClient } from '../client/api';
import type { SuggestTagsRequest, SuggestTagsResponse } from './ai.dto';

export const aiService = {
  suggestTags: (data: SuggestTagsRequest): Promise<SuggestTagsResponse> =>
    apiClient.post<SuggestTagsResponse>('/ai/suggest-tags', data),
};
