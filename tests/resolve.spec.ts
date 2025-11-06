import { describe, it, expect } from 'vitest';
import { resolveSingle } from '@/lib/server/resolve';

const all = [
  { id: '1', name: 'Modeling & Analytics' },
  { id: '2', name: 'Data Pipeline Ingest' },
  { id: '3', name: 'Data Ingest Pipeline' },
];

describe('resolver', () => {
  it('prefers exact-ish match', () => {
    const { chosen } = resolveSingle('Data Pipeline Ingest', all);

    expect(chosen?.id).toBe('2');
    expect(chosen?.score).toBeGreaterThanOrEqual(0.88);
  });

  it('keeps ambiguous when close', () => {
    const { chosen, candidates } = resolveSingle('data ingest', all);

    expect(chosen).toBeUndefined();
    expect(candidates.length).toBeGreaterThan(1);
    // Both "Data Pipeline Ingest" and "Data Ingest Pipeline" should match
    expect(candidates.some((c) => c.id === '2')).toBe(true);
    expect(candidates.some((c) => c.id === '3')).toBe(true);
  });

  it('returns empty when no match', () => {
    const { chosen, candidates } = resolveSingle('NonExistent Workstream', all);

    expect(chosen).toBeUndefined();
    expect(candidates.length).toBe(0);
  });

  it('handles aliases when provided', () => {
    const aliases = {
      '1': ['M&A', 'M and A'],
    };

    const { chosen } = resolveSingle('M&A', all, aliases);

    expect(chosen?.id).toBe('1');
  });

  it('requires high confidence score', () => {
    // "data" is too ambiguous - should not be confident
    const { chosen } = resolveSingle('data', all);

    expect(chosen).toBeUndefined();
  });
});

