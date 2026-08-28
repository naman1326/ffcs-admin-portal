import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import { AttendanceStatus, Role } from "../types";

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function friendlyError(err: unknown): string {
  const e = err as { message?: string };
  return e?.message || "Something went wrong. Please try again.";
}

export const api = {
  // Members
  createMember: httpsCallable<
    { name: string; registrationNumber: string; collegeEmail: string; role?: Role },
    { memberId: string; collegeEmail: string }
  >(functions, "createMember"),
  setMemberRole: httpsCallable<{ memberId: string; role: Role }, { success: boolean }>(functions, "setMemberRole"),
  setMemberActive: httpsCallable<{ memberId: string; isActive: boolean }, { success: boolean }>(functions, "setMemberActive"),
  updateMember: httpsCallable<{ memberId: string; updates: Record<string, unknown> }, { success: boolean }>(
    functions,
    "updateMember"
  ),
  deleteMember: httpsCallable<{ memberId: string }, { success: boolean }>(functions, "deleteMember"),

  // Administrators (not club members — no registration number, no roster presence)
  createAdministrator: httpsCallable<{ name: string; email: string }, { adminId: string; email: string }>(
    functions,
    "createAdministrator"
  ),
  revokeAdministrator: httpsCallable<{ adminId: string }, { success: boolean }>(functions, "revokeAdministrator"),

  // Meetings
  createMeeting: httpsCallable<
    { title: string; description: string; date: string; startTime: string; endTime: string; location: string },
    { meetingId: string }
  >(functions, "createMeeting"),
  updateMeeting: httpsCallable<{ meetingId: string; updates: Record<string, unknown> }, { success: boolean }>(
    functions,
    "updateMeeting"
  ),
  cancelMeeting: httpsCallable<{ meetingId: string }, { success: boolean }>(functions, "cancelMeeting"),
  deleteMeeting: httpsCallable<{ meetingId: string }, { success: boolean }>(functions, "deleteMeeting"),

  // Attendance (meetings + events share this)
  bulkSetAttendance: httpsCallable<
    { scope: "meeting" | "event"; scopeId: string; defaultStatus: "Present" | "Absent" },
    { success: boolean; memberCount: number }
  >(functions, "bulkSetAttendance"),
  setAttendance: httpsCallable<
    { scope: "meeting" | "event"; scopeId: string; memberId: string; status: AttendanceStatus; otherReason?: string | null },
    { success: boolean }
  >(functions, "setAttendance"),

  // Events
  createEvent: httpsCallable<
    {
      title: string;
      description: string;
      date: string;
      startTime: string;
      endTime: string;
      venue: string;
      registrationDeadline: string;
    },
    { eventId: string }
  >(functions, "createEvent"),
  updateEvent: httpsCallable<{ eventId: string; updates: Record<string, unknown> }, { success: boolean }>(functions, "updateEvent"),
  publishEvent: httpsCallable<{ eventId: string }, { success: boolean }>(functions, "publishEvent"),
  unpublishEvent: httpsCallable<{ eventId: string }, { success: boolean }>(functions, "unpublishEvent"),
  cancelEvent: httpsCallable<{ eventId: string }, { success: boolean }>(functions, "cancelEvent"),

  // Registrations
  deleteRegistration: httpsCallable<{ registrationId: string; kind: "external" | "own" }, { success: boolean }>(
    functions,
    "deleteRegistration"
  ),
  replaceRegistrationReceipt: httpsCallable<
    { registrationId: string; kind: "external" | "own"; fileBase64: string },
    { success: boolean }
  >(functions, "replaceRegistrationReceipt"),
  exportEventRegistrationsCsv: httpsCallable<{ eventId: string }, { csv: string }>(functions, "exportEventRegistrationsCsv"),

  // Announcements
  createAnnouncement: httpsCallable<{ title: string; body: string }, { announcementId: string }>(
    functions,
    "createAnnouncement"
  ),
  deleteAnnouncement: httpsCallable<{ announcementId: string }, { success: boolean }>(functions, "deleteAnnouncement"),
};
