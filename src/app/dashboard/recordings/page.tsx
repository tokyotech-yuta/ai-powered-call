"use client";

import { useState, useEffect } from "react";
import { RecordingCard } from "@/components/recording/RecordingCard";
import { Loader2 } from "lucide-react";

interface Recording {
  id: string;
  contactName?: string | null;
  contactNumber?: string | null;
  recordingNumber: string;
  durationSec?: number | null;
  status: "WAITING" | "RECORDING" | "UPLOADING" | "TRANSCRIBING" | "SUMMARIZING" | "COMPLETED" | "FAILED";
  createdAt: string;
  summary?: { summaryText: string; topics: string[] } | null;
}

export default function RecordingsPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecordings = async () => {
      try {
        const res = await fetch("/api/recordings");
        if (res.ok) {
          setRecordings(await res.json());
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecordings();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">録音履歴はまだありません</p>
        <p className="text-sm text-gray-400 mt-1">
          録音を開始すると、ここに履歴が表示されます
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">録音履歴</h1>
      <div className="space-y-2">
        {recordings.map((rec) => (
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
  );
}
