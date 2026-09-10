/**
 * Recall and precision against an authorized set (DEV-12). Pure: the predicted
 * ids and the ground-truth ids arrive already collected. The gate thresholds
 * live at the call site so this file never stores a behaviour constant other
 * than the empty-set identity (S-8).
 *
 * Recall is gated at completeness (every truth id is present). Precision is
 * computed and published, never used as a pass/fail threshold.
 */

export interface RecallPrecision {
  readonly hits: number;
  readonly truth: number;
  readonly predicted: number;
  readonly recall: number;
  readonly precision: number;
}

export function recallPrecision(
  predicted: readonly string[],
  truth: readonly string[],
): RecallPrecision {
  const pred = new Set(predicted);
  const want = new Set(truth);
  let hits = 0;
  for (const id of want) {
    if (pred.has(id)) hits += 1;
  }
  return {
    hits,
    truth: want.size,
    predicted: pred.size,
    recall: ratio(hits, want.size),
    precision: ratio(hits, pred.size),
  };
}

export function aggregateScores(parts: readonly RecallPrecision[]): RecallPrecision {
  let hits = 0;
  let truth = 0;
  let predicted = 0;
  for (const part of parts) {
    hits += part.hits;
    truth += part.truth;
    predicted += part.predicted;
  }
  return {
    hits,
    truth,
    predicted,
    recall: ratio(hits, truth),
    precision: ratio(hits, predicted),
  };
}

/** Completeness: no authorized id is missing. Vacuous when truth is empty. */
export function recallIsComplete(score: RecallPrecision): boolean {
  return score.hits === score.truth;
}

function ratio(hits: number, total: number): number {
  if (total === 0) return 1;
  return hits / total;
}
