export type Role = "member" | "admin";
export type AttendanceStatus = "Present" | "Absent" | "Other";
export type MeetingStatus = "scheduled" | "cancelled" | "completed";
export type EventStatus = "draft" | "published" | "cancelled" | "completed";

export interface Member {
  memberId: string;
  firebaseUid: string;
  name: string;
  registrationNumber: string;
  collegeEmail: string;
  role: Role;
  isActive: boolean;
}

export interface Meeting {
  meetingId: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  status: MeetingStatus;
}

export interface MeetingAttendance {
  meetingId: string;
  memberId: string;
  status: AttendanceStatus;
  otherReason: string | null;
}

export interface ClubEvent {
  eventId: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  registrationDeadline?: string;
  status: EventStatus;
}

export interface EventAttendance {
  eventId: string;
  memberId: string;
  status: AttendanceStatus;
  otherReason: string | null;
}

export interface Administrator {
  adminId: string;
  name: string;
  email: string;
  createdAt: { toDate: () => Date } | null;
}

export interface AuditLog {
  action: string;
  performedBy: string;
  timestamp: { toDate: () => Date } | null;
  targetId: string;
  oldValue: unknown;
  newValue: unknown;
}
