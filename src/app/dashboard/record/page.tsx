"use client";

import { useState, useEffect, useCallback } from "react";
import { RecordButton } from "@/components/recording/RecordButton";
import { RecordingStatus } from "@/components/recording/RecordingStatus";
import { RecordingCard } from "@/components/recording/RecordingCard";

interface RecordingData {
  recordingNumber: string;
  sessionId: string;
  telLink: string;
}

interface RecentRecording {
  id: string;
  contactName?: string | null;
  contactNumber?: string | null;
  recordingNumber: string;
  durationSec?: number | null;
  status: "WAITING" | "RECORDING" | "UPLOADING" | "TRANSCRIBING" | "SUMMARIZING" | "COMPLETED" | "FAILED";
  createdAt: string;
  summary?: { summaryText: string; topics: string[] } | null;
}

export default function RecordPage() {
  const [recording, setRecording] = useState<RecordingData | null>(null);
  const [recentRecordings, setRecentRecordings] = useState<RecentRecording[]>([]);

  const fetchRecordings = useCallback(async () => {
    try {
      const res = await fetch("/api/recordings");
      if (res.ok) {
        const data = await res.json();
        setRecentRecordings(data.slice(0, 5));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  const handleRecordingStarted = (data: RecordingData) => {
    setRecording(data);
  };

  const handleRecordingStop = () => {
    setRecording(null);
    fetchRecordings();
  };

  return (
    <div className="space-y-8">
      {/* 録音コントロール */}
      <div className="flex flex-col items-center py-8">
        {recording ? (
          <RecordingStatus
            recordingNumber={recording.recordingNumber}
            sessionId={recording.sessionId}
            telLink={recording.telLink}
            onStop={handleRecordingStop}
          />
        ) : (
          <RecordButton onRecordingStarted={handleRecordingStarted} />
        )}
      </div>

      {/* 最近の録音 */}
      {recentRecordings.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            最近の録音
          </h2>
          <div className="space-y-2">
            {recentRecordings.map((rec) => (
              <RecordingCard
                key={rec.id}
                id={rec.id}
                contactName={rec.contactName}
                contactNumber={rec.contactNumber}
                recordingNumber={rec.recordingNumber}
                durationSec={rec.durationSec}
                status={rec.status}
                summaryText={rec.summary?.summaryText}
                topics={rec.summary?.topics as string[] | undefined}
                createdAt={rec.createdAt}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
