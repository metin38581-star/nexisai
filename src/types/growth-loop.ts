export interface GrowthQuestionScore {
  question: string;
  initialScore: number;
  currentScore: number;
}

export interface CampaignGrowthLoopResponse {
  campaignId: string;
  emailSent: boolean;
  scoresUpdated: boolean;
  questionScores: GrowthQuestionScore[];
}
