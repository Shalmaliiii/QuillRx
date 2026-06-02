/**
 * RxNorm REST API (US NLM) — free, no API key.
 * Docs: https://lhncbc.nlm.nih.gov/RxNav/APIs/RxNormAPIs.html
 */

const RXNORM_BASE = "https://rxnav.nlm.nih.gov/REST";

export interface RxNormCandidate {
  genericName: string;
  rxCui: string | null;
  score: number;
}

interface ApproximateTermResponse {
  approximateGroup?: {
    candidate?:
      | Array<{
          rxcui?: string;
          name?: string;
          score?: string;
        }>
      | {
          rxcui?: string;
          name?: string;
          score?: string;
        };
  };
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export async function searchRxNorm(query: string, limit = 10): Promise<RxNormCandidate[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  const url = `${RXNORM_BASE}/approximateTerm.json?term=${encodeURIComponent(term)}&maxEntries=${limit}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return [];

  const data = (await res.json()) as ApproximateTermResponse;
  const candidates = asArray(data.approximateGroup?.candidate);

  const seen = new Set<string>();
  const results: RxNormCandidate[] = [];

  for (const c of candidates) {
    const name = c.name?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({
      genericName: name,
      rxCui: c.rxcui ?? null,
      score: Number(c.score ?? 0),
    });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
