export interface Sm2Parameters {
  quality: number;
  repetitions: number;
  easeFactor: number;
  interval: number;
}

export interface Sm2Result {
  repetitions: number;
  easeFactor: number;
  interval: number;
  isCorrect: boolean;
}

const MIN_EASE_FACTOR = 1.3;

export function sm2({ quality, repetitions, easeFactor, interval }: Sm2Parameters): Sm2Result {
  if (quality < 0 || quality > 5) {
    throw new Error("Quality must be between 0 and 5.");
  }

  const isCorrect = quality >= 3;

  if (!isCorrect) {
    return {
      repetitions: 0,
      easeFactor,
      interval: 1,
      isCorrect,
    };
  }

  let newRepetitions: number;
  let newEaseFactor: number;
  let newInterval: number;

  if (repetitions === 0) {
    newRepetitions = 1;
    newInterval = 1;
  } else if (repetitions === 1) {
    newRepetitions = 2;
    newInterval = 6;
  } else {
    newRepetitions = repetitions + 1;
    newInterval = Math.round(interval * easeFactor);
  }

  const q = quality;
  newEaseFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

  if (newEaseFactor < MIN_EASE_FACTOR) {
    newEaseFactor = MIN_EASE_FACTOR;
  }

  return {
    repetitions: newRepetitions,
    easeFactor: newEaseFactor,
    interval: newInterval,
    isCorrect,
  };
}
