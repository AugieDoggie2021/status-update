/**
 * Fuzzy match workstream name from parsed text to existing workstream ID
 */

export function matchWorkstreamId(
  inputName: string,
  all: { id: string; name: string }[]
): string | null {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  const target = norm(inputName);

  // exact match
  const exact = all.find((w) => norm(w.name) === target);
  if (exact) {
    console.log(`[matchWorkstream] exact match: "${inputName}" -> "${exact.name}" (${exact.id})`);
    return exact.id;
  }

  // starts-with match
  const starts = all.find((w) => norm(w.name).startsWith(target));
  if (starts) {
    console.log(`[matchWorkstream] starts-with match: "${inputName}" -> "${starts.name}" (${starts.id})`);
    return starts.id;
  }

  // includes match
  const incl = all.find((w) => norm(w.name).includes(target));
  if (incl) {
    console.log(`[matchWorkstream] includes match: "${inputName}" -> "${incl.name}" (${incl.id})`);
    return incl.id;
  }

  console.warn(`[matchWorkstream] no match found for: "${inputName}"`);
  return null;
}

