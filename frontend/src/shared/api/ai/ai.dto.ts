export interface SuggestTagsRequest {
  content: string;
  title?: string;
}

export interface SuggestTagsResponse {
  tags: string[];
  aiGenerated: boolean;
}
