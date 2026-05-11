export type Flashcard = {
  id: string;
  word: string;
  definition: string;
  correctCount: number;
  wrongCount: number;
  createdAt: number;
  lastReviewedAt: number | null;
};
