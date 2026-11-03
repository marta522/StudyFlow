const DEFAULT_TIMEZONE = 'Europe/Warsaw';

/**
 * Lessons are stored as a calendar date (UTC midnight) plus "HH:mm" wall-clock
 * strings. Those wall-clock values are local to the school, not to the server,
 * so every comparison with "now" must be done in the school's time zone.
 */
export function getAppTimezone(): string {
  return process.env.APP_TIMEZONE?.trim() || DEFAULT_TIMEZONE;
}

export function isValidTimezone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone });
    return true;
  } catch {
    return false;
  }
}

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function getWallClock(instant: Date, timeZone: string): WallClock {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
    second: value('second'),
  };
}

function getOffsetMs(instant: Date, timeZone: string): number {
  const wall = getWallClock(instant, timeZone);
  const wallAsUtc = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
    wall.second,
  );
  return wallAsUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** Converts a school-local date ("YYYY-MM-DD") and time ("HH:mm") to an instant. */
export function zonedTimeToDate(
  dateText: string,
  time: string,
  timeZone: string = getAppTimezone(),
): Date {
  const [year, month, day] = dateText.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  // Two passes keep the result correct around daylight-saving transitions.
  const firstPass = utcGuess - getOffsetMs(new Date(utcGuess), timeZone);
  const secondPass = utcGuess - getOffsetMs(new Date(firstPass), timeZone);
  return new Date(secondPass);
}

/** Today's school-local date as a UTC-midnight Date (how lesson_date is stored). */
export function todayInAppTimezone(
  now: Date = new Date(),
  timeZone: string = getAppTimezone(),
): Date {
  const wall = getWallClock(now, timeZone);
  return new Date(Date.UTC(wall.year, wall.month - 1, wall.day));
}

function lessonDateText(lessonDate: Date): string {
  return lessonDate.toISOString().slice(0, 10);
}

export function isLessonStartInFuture(
  lessonDate: Date,
  startTime: string,
  now: Date = new Date(),
  timeZone: string = getAppTimezone(),
): boolean {
  return (
    zonedTimeToDate(lessonDateText(lessonDate), startTime, timeZone).getTime() >
    now.getTime()
  );
}

export function getLessonEnd(
  lessonDate: Date,
  endTime: string,
  timeZone: string = getAppTimezone(),
): Date {
  return zonedTimeToDate(lessonDateText(lessonDate), endTime, timeZone);
}
