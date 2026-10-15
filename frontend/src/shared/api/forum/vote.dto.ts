export type VoteType = 'UP' | 'DOWN';
export type VoteEntityType = 'POST' | 'COMMENT';

/** The signed-in user's own vote on a post, as returned inside post listings. */
export interface MyVote {
  /** Needed to retract the vote with `DELETE /forum/votes/{id}`. */
  id: number;
  voteType: VoteType;
}

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
