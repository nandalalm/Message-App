export interface PollOptionDTO {
  text: string;
  votes: number;
}

export interface PollDTO {
  id: string;
  creatorId: string;
  creatorName: string;
  question: string;
  options: PollOptionDTO[];
  expiresAt: string;
  isActive: boolean;
  hasVoted: boolean; // Field to indicate if the requesting user has already voted
}

export interface CreatePollDTO {
  creatorId: string;
  creatorName: string;
  question: string;
  options: string[]; // Just the text for the options
  durationMinutes: number;
}
