/**
 * Name resolution helpers for workstream matching
 * Supports fuzzy matching, aliases, and confidence scoring
 */

export type Candidate = {
  id: string;
  name: string;
  slug?: string;
  score: number;
};

const norm = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Score how well a query matches a target name
 * Returns a value between 0.0 and 1.0
 */
export function scoreName(query: string, target: string): number {
  const q = norm(query);
  const t = norm(target);

  if (!q || !t) return 0;
  if (q === t) return 1.0;
  if (t.startsWith(q)) return 0.9;
  if (t.includes(q)) return 0.8;

  // Token overlap (Jaccard similarity)
  const qt = new Set(q.split(" ").filter(Boolean));
  const tt = new Set(t.split(" ").filter(Boolean));

  if (qt.size === 0 || tt.size === 0) return 0.0;

  const inter = [...qt].filter((x) => tt.has(x)).length;
  const union = new Set([...qt, ...tt]).size;

  return inter > 0 ? 0.6 + 0.3 * (inter / union) : 0.0;
}

/**
 * Rank candidates by matching score
 */
export function rankCandidates(
  query: string,
  all: { id: string; name: string; slug?: string }[],
  aliases?: Record<string, string[]>
): Candidate[] {
  const list: Candidate[] = [];

  const pool = all.map((w) => ({
    ...w,
    variants: [
      w.name,
      w.slug,
      ...(aliases?.[w.id] ?? []),
    ].filter(Boolean) as string[],
  }));

  for (const w of pool) {
    const scores = w.variants.map((v) => scoreName(query, v!));
    const score = Math.max(0, ...scores);

    if (score > 0) {
      list.push({
        id: w.id,
        name: w.name,
        slug: w.slug,
        score,
      });
    }
  }

  return list.sort((a, b) => b.score - a.score);
}

/**
 * Resolve a single query to a workstream ID with confidence
 * Returns chosen candidate if confidence is high, otherwise returns candidates for disambiguation
 * Confidence: top≥0.88 && (gap≥0.2 || only one candidate)
 */
export function resolveSingle(
  query: string,
  all: { id: string; name: string; slug?: string }[],
  aliases?: Record<string, string[]>
): { chosen?: Candidate; candidates: Candidate[] } {
  const ranked = rankCandidates(query, all, aliases);
  const top = ranked[0];
  const second = ranked[1];

  if (!top) return { candidates: [] };

  // Confidence: top≥0.88 && (gap≥0.2 || only one candidate)
  const confident = top.score >= 0.88 && (!second || top.score - second.score >= 0.2);

  return { chosen: confident ? top : undefined, candidates: ranked };
}

