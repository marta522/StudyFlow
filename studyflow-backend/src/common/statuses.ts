export const UserStatus = {
  ACTIVE: 'ACTIVE',
  BLOCKED: 'BLOCKED',
} as const;

export const SubjectStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export const LessonStatus = {
  SCHEDULED: 'SCHEDULED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export const BookingStatus = {
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
} as const;

export const SubjectRequestStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export const LessonIssueStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
} as const;

export type UserStatusValue = (typeof UserStatus)[keyof typeof UserStatus];
export type SubjectStatusValue =
  (typeof SubjectStatus)[keyof typeof SubjectStatus];
export type LessonStatusValue = (typeof LessonStatus)[keyof typeof LessonStatus];
export type SubjectRequestStatusValue =
  (typeof SubjectRequestStatus)[keyof typeof SubjectRequestStatus];
