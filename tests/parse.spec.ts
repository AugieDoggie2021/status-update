import { describe, it, expect } from 'vitest';
import { parseNaive } from '@/lib/openai';

describe('parseNaive basic', () => {
  it("handles 'Update Data Pipeline Ingest to Green 70%'", async () => {
    const r = parseNaive('Update Data Pipeline Ingest to Green 70%');
    const a = r.actions.find((x) => x.intent === 'update');

    expect(a).toBeDefined();
    expect(a?.name?.toLowerCase()).toContain('data pipeline ingest');
    expect(a?.status).toBe('GREEN');
    expect(a?.percent).toBe(70);
  });

  it("handles 'Set Modeling & Analytics 47%'", async () => {
    const r = parseNaive('Set Modeling & Analytics 47%');
    const a = r.actions.find((x) => x.intent === 'update');

    expect(a).toBeDefined();
    expect(a?.name?.toLowerCase()).toContain('modeling');
    expect(a?.percent).toBe(47);
  });

  it('maps amber→YELLOW', async () => {
    const r = parseNaive('Change M&A to amber');
    const a = r.actions.find((x) => x.intent === 'update');

    expect(a).toBeDefined();
    expect(a?.status).toBe('YELLOW');
  });

  it("supports delete", async () => {
    const r = parseNaive("remove 'Update'");
    const a = r.actions.find((x) => x.intent === 'delete');

    expect(a).toBeDefined();
    expect(a?.name).toBe('Update');
  });

  it('handles commands without workstream word', () => {
    const r = parseNaive('Data Pipeline Ingest to red at 50%');
    const a = r.actions.find((x) => x.intent === 'update');

    expect(a).toBeDefined();
    expect(a?.name?.toLowerCase()).toContain('data pipeline ingest');
    expect(a?.status).toBe('RED');
    expect(a?.percent).toBe(50);
  });

  it('handles multiple sentences', () => {
    const r = parseNaive('Update Data Pipeline to green. Set Analytics to 75%.');
    const actions = r.actions.filter((x) => x.intent === 'update');

    expect(actions.length).toBeGreaterThanOrEqual(2);
  });
});

