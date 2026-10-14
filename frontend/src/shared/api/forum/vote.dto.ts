export type VoteType = 'UP' | 'DOWN';
export type VoteEntityType = 'POST' | 'COMMENT';

export interface VoteRequest {
  entityType: VoteEntityType;
  entityId: number;
  voteType: VoteType;
}

export interface VoteResponse {
  id: number;
  entityType: VoteEntityType;
  entityId: number;
  voteType: VoteType;
  newScore: number;
  createdAt: string;
}
