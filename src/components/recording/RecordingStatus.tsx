"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Square } from "lucide-react";

interface RecordingStatusProps {
  recordingNumber: string;
  sessionId: string;
  telLink: string;
  onStop?: () => void;
}

export function RecordingStatus({
  recordingNumber,
  sessionId,
  telLink,
  onStop,
}: RecordingStatusProps) {
  const [elapsed, setElapsed] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 録音状態をポーリング
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/recordings/${sessionId}`);
        const data = await res.json();
        if (data.status === "RECORDING") {
          setIsConnected(true);
        } else if (
          data.status === "UPLOADING" ||
          data.status === "TRANSCRIBING" ||
          data.status === "SUMMARIZING" ||
          data.status === "COMPLETED"
        ) {
          onStop?.();
        }
      } catch {
        // ignore polling errors
      }
    };

    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [sessionId, onStop]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center gap-4">
          {/* 録音中ステータス */}
          <div className="flex items-center gap-2 text-red-600">
            <div className="h-3 w-3 rounded-full bg-red-600 animate-pulse" />
            <span className="font-bold text-lg">
              {isConnected ? "録音中" : "接続待ち..."}
            </span>
            <span className="font-mono text-lg">{formatTime(elapsed)}</span>
          </div>

          {/* 録音番号表示 & 発信リンク */}
          {!isConnected && (
            <div className="text-center space-y-3">
              <p className="text-sm text-gray-600">
                以下の番号に追加発信してください
              </p>
              <a
                href={telLink}
                className="block text-2xl font-bold text-blue-600 hover:text-blue-700"
              >
                <Phone className="inline h-5 w-5 mr-2" />
                {recordingNumber}
              </a>
              <p className="text-xs text-gray-500">
                発信後、電話アプリで「通話を統合」をタップ
              </p>
            </div>
          )}

          {isConnected && (
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                録音サーバーに接続済み
              </p>
              <p className="text-xs text-gray-500">
                通話相手への通知: なし
              </p>
            </div>
          )}

          {/* 停止ボタン */}
          <Button
            variant="destructive"
            size="lg"
            onClick={onStop}
            className="mt-2"
          >
            <Square className="h-5 w-5 mr-2" />
            録音停止
          </Button>

          <p className="text-xs text-gray-500 text-center max-w-xs">
            通話を終了すると自動的に録音が停止し、AI要約が生成されます
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
