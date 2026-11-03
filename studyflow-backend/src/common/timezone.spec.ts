import {
  getLessonEnd,
  isLessonStartInFuture,
  isValidTimezone,
  todayInAppTimezone,
  zonedTimeToDate,
} from './timezone';

const WARSAW = 'Europe/Warsaw';

describe('timezone helpers', () => {
  describe('todayInAppTimezone', () => {
    it('uses the school date when UTC is still on the previous day (winter)', () => {
      // 2026-11-01 23:30 UTC is already 00:30 on 2 November in Warsaw (UTC+1).
      const today = todayInAppTimezone(new Date('2026-11-01T23:30:00Z'), WARSAW);
      expect(today.toISOString()).toBe('2026-11-02T00:00:00.000Z');
    });

    it('uses the school date when UTC is still on the previous day (summer)', () => {
      // 2026-07-01 22:30 UTC is 00:30 on 2 July in Warsaw (UTC+2).
      const today = todayInAppTimezone(new Date('2026-07-01T22:30:00Z'), WARSAW);
      expect(today.toISOString()).toBe('2026-07-02T00:00:00.000Z');
    });

    it('keeps the same day when the school clock has not passed midnight', () => {
      const today = todayInAppTimezone(new Date('2026-11-01T22:30:00Z'), WARSAW);
      expect(today.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    });
  });

  describe('zonedTimeToDate', () => {
    it('converts winter wall-clock time (UTC+1)', () => {
      expect(zonedTimeToDate('2026-11-01', '11:00', WARSAW).toISOString()).toBe(
        '2026-11-01T10:00:00.000Z',
      );
    });

    it('converts summer wall-clock time (UTC+2)', () => {
      expect(zonedTimeToDate('2026-07-01', '11:00', WARSAW).toISOString()).toBe(
        '2026-07-01T09:00:00.000Z',
      );
    });

    it('handles the days when daylight-saving time changes', () => {
      // Clocks go forward on 29 March 2026 and back on 25 October 2026.
      expect(zonedTimeToDate('2026-03-29', '12:00', WARSAW).toISOString()).toBe(
        '2026-03-29T10:00:00.000Z',
      );
      expect(zonedTimeToDate('2026-10-25', '12:00', WARSAW).toISOString()).toBe(
        '2026-10-25T11:00:00.000Z',
      );
    });

    it('is the identity for UTC', () => {
      expect(zonedTimeToDate('2026-11-01', '11:00', 'UTC').toISOString()).toBe(
        '2026-11-01T11:00:00.000Z',
      );
    });
  });

  describe('isLessonStartInFuture', () => {
    const lessonDate = new Date('2026-11-01T00:00:00.000Z');
    // 22:30 UTC is 23:30 in Warsaw.
    const now = new Date('2026-11-01T22:30:00Z');

    it('rejects a start that has already passed in Warsaw time', () => {
      expect(isLessonStartInFuture(lessonDate, '23:00', now, WARSAW)).toBe(false);
    });

    it('accepts a start later tonight in Warsaw time', () => {
      expect(isLessonStartInFuture(lessonDate, '23:45', now, WARSAW)).toBe(true);
    });
  });

  describe('getLessonEnd', () => {
    it('returns the real instant at which the lesson ends', () => {
      expect(
        getLessonEnd(new Date('2026-11-01T00:00:00.000Z'), '11:00', WARSAW).toISOString(),
      ).toBe('2026-11-01T10:00:00.000Z');
    });
  });

  describe('isValidTimezone', () => {
    it('accepts IANA names and rejects unknown ones', () => {
      expect(isValidTimezone('Europe/Warsaw')).toBe(true);
      expect(isValidTimezone('Mars/Olympus')).toBe(false);
    });
  });
});
