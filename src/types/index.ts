import type { RecordingStatus } from "@prisma/client";

export type { RecordingStatus };

export interface RecordingSession {
  recordingNumber: string;
  sessionId: string;
  instruction: string;
}

export interface RecordingWithDetails {
  id: string;
  twilioCallSid: string | null;
  recordingNumber: string;
  callerNumber: string | null;
  contactName: string | null;
  contactNumber: string | null;
  durationSec: number | null;
  status: RecordingStatus;
  createdAt: Date;
  transcription: {
    fullText: string;
    language: string;
    segments: unknown;
  } | null;
  summary: {
    summaryText: string;
    keyPoints: unknown;
    actionItems: unknown;
    topics: unknown;
    sentiment: string | null;
  } | null;
}
