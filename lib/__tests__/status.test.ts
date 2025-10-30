// Jest globals
import { calculateOverallStatus, calculateOnTrackPercentage } from '../status';
import type { Workstream } from '../types';

describe('Status Utilities', () => {
  describe('calculateOverallStatus', () => {
    it('should return RED when 2+ workstreams are RED', () => {
      const workstreams: Workstream[] = [
        { id: '1', program_id: 'p1', name: 'WS1', lead: null, status: 'RED', percent_complete: 50, summary: '', next_milestone: null, next_milestone_due: null, updated_at: '' },
        { id: '2', program_id: 'p1', name: 'WS2', lead: null, status: 'RED', percent_complete: 30, summary: '', next_milestone: null, next_milestone_due: null, updated_at: '' },
        { id: '3', program_id: 'p1', name: 'WS3', lead: null, status: 'GREEN', percent_complete: 80, summary: '', next_milestone: null, next_milestone_due: null, updated_at: '' },
      ];
      expect(calculateOverallStatus(workstreams)).toBe('RED');
    });

    it('should return YELLOW when 1 RED and multiple YELLOW', () => {
      const workstreams: Workstream[] = [
        { id: '1', program_id: 'p1', name: 'WS1', lead: null, status: 'RED', percent_complete: 50, summary: '', next_milestone: null, next_milestone_due: null, updated_at: '' },
        { id: '2', program_id: 'p1', name: 'WS2', lead: null, status: 'YELLOW', percent_complete: 60, summary: '', next_milestone: null, next_milestone_due: null, updated_at: '' },
        { id: '3', program_id: 'p1', name: 'WS3', lead: null, status: 'GREEN', percent_complete: 80, summary: '', next_milestone: null, next_milestone_due: null, updated_at: '' },
      ];
      expect(calculateOverallStatus(workstreams)).toBe('YELLOW');
    });

    it('should return YELLOW when 2+ YELLOW workstreams', () => {
      const workstreams: Workstream[] = [
        { id: '1', program_id: 'p1', name: 'WS1', lead: null, status: 'YELLOW', percent_complete: 50, summary: '', next_milestone: null, next_milestone_due: null, updated_at: '' },
        { id: '2', program_id: 'p1', name: 'WS2', lead: null, status: 'YELLOW', percent_complete: 60, summary: '', next_milestone: null, next_milestone_due: null, updated_at: '' },
        { id: '3', program_id: 'p1', name: 'WS3', lead: null, status: 'GREEN', percent_complete: 80, summary: '', next_milestone: null, next_milestone_due: null, updated_at: '' },
      ];
      expect(calculateOverallStatus(workstreams)).toBe('YELLOW');
    });

    it('should return GREEN when all are GREEN', () => {
      const workstreams: Workstream[] = [
        { id: '1', program_id: 'p1', name: 'WS1', lead: null, status: 'GREEN', percent_complete: 80, summary: '', next_milestone: null, next_milestone_due: null, updated_at: '' },
        { id: '2', program_id: 'p1', name: 'WS2', lead: null, status: 'GREEN', percent_complete: 90, summary: '', next_milestone: null, next_milestone_due: null, updated_at: '' },
      ];
      expect(calculateOverallStatus(workstreams)).toBe('GREEN');
    });

    it('should return GREEN for empty array', () => {
      expect(calculateOverallStatus([])).toBe('GREEN');
    });
  });

  describe('calculateOnTrackPercentage', () => {
    it('should calculate percentage correctly', () => {
      const workstreams: Workstream[] = [
        { id: '1', program_id: 'p1', name: 'WS1', lead: null, status: 'GREEN', percent_complete: 50, summary: '', next_milestone: null, next_milestone_due: null, updated_at: '' },
        { id: '2', program_id: 'p1', name: 'WS2', lead: null, status: 'GREEN', percent_complete: 60, summary: '', next_milestone: null, next_milestone_due: null, updated_at: '' },
        { id: '3', program_id: 'p1', name: 'WS3', lead: null, status: 'YELLOW', percent_complete: 70, summary: '', next_milestone: null, next_milestone_due: null, updated_at: '' },
      ];
      expect(calculateOnTrackPercentage(workstreams)).toBe(67); // 2 of 3 = 67%
    });

    it('should return 0 for empty array', () => {
      expect(calculateOnTrackPercentage([])).toBe(0);
    });
  });
});

