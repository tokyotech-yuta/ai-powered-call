"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Phone, Loader2 } from "lucide-react";

interface RecordButtonProps {
  onRecordingStarted?: (data: {
    recordingNumber: string;
    sessionId: string;
    telLink: string;
  }) => void;
}

export function RecordButton({ onRecordingStarted }: RecordButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartRecording = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/recordings/start", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "録音の開始に失敗しました");
        return;
      }

      onRecordingStarted?.(data);
    } catch {
      setError("サーバーに接続できません");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <Button
        variant="recording"
        size="xl"
        onClick={handleStartRecording}
        disabled={isLoading}
        className="w-40 h-40 rounded-full flex flex-col gap-2 text-lg shadow-xl hover:shadow-2xl transition-all"
      >
        {isLoading ? (
          <Loader2 className="h-10 w-10 animate-spin" />
        ) : (
          <>
            <Mic className="h-10 w-10" />
            <span>録音を開始</span>
          </>
        )}
      </Button>

      {error && (
        <p className="text-red-600 text-sm text-center">{error}</p>
      )}

      <div className="text-center text-sm text-gray-500 max-w-xs">
        <p className="font-medium mb-2">使い方:</p>
        <ol className="text-left space-y-1">
          <li className="flex items-start gap-2">
            <Phone className="h-4 w-4 mt-0.5 shrink-0" />
            <span>通常通り電話をかける</span>
          </li>
          <li className="flex items-start gap-2">
            <Mic className="h-4 w-4 mt-0.5 shrink-0" />
            <span>上のボタンをタップ</span>
          </li>
          <li className="flex items-start gap-2">
            <Phone className="h-4 w-4 mt-0.5 shrink-0" />
            <span>表示される番号に追加発信</span>
          </li>
          <li className="flex items-start gap-2">
            <Phone className="h-4 w-4 mt-0.5 shrink-0" />
            <span>「通話を統合」をタップ</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
