// Jest globals
import { fmtDate, daysUntil, isDueSoon, isOverdue, fmtRelativeDate } from '../date';

describe('Date Utilities', () => {
  describe('fmtDate', () => {
    it('should format date string correctly', () => {
      expect(fmtDate('2025-12-25')).toBe('Dec 25, 2025');
    });

    it('should return — for null/undefined', () => {
      expect(fmtDate(null)).toBe('—');
      expect(fmtDate(undefined)).toBe('—');
    });
  });

  describe('daysUntil', () => {
    it('should calculate days until future date', () => {
      const future = new Date();
      future.setDate(future.getDate() + 5);
      const dateStr = future.toISOString().split('T')[0]!;
      const days = daysUntil(dateStr);
      expect(days).toBeGreaterThanOrEqual(4);
      expect(days).toBeLessThanOrEqual(5);
    });

    it('should return null for invalid date', () => {
      expect(daysUntil(null)).toBeNull();
      expect(daysUntil(undefined)).toBeNull();
    });
  });

  describe('isDueSoon', () => {
    it('should return true for dates within 7 days', () => {
      const soon = new Date();
      soon.setDate(soon.getDate() + 3);
      const dateStr = soon.toISOString().split('T')[0]!;
      expect(isDueSoon(dateStr)).toBe(true);
    });

    it('should return false for dates beyond 7 days', () => {
      const far = new Date();
      far.setDate(far.getDate() + 10);
      const dateStr = far.toISOString().split('T')[0]!;
      expect(isDueSoon(dateStr)).toBe(false);
    });
  });

  describe('isOverdue', () => {
    it('should return true for past dates', () => {
      const past = new Date();
      past.setDate(past.getDate() - 2);
      const dateStr = past.toISOString().split('T')[0]!;
      expect(isOverdue(dateStr)).toBe(true);
    });

    it('should return false for future dates', () => {
      const future = new Date();
      future.setDate(future.getDate() + 2);
      const dateStr = future.toISOString().split('T')[0]!;
      expect(isOverdue(dateStr)).toBe(false);
    });
  });
});

