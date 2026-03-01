"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SummaryView } from "@/components/summary/SummaryView";
import {
  ArrowLeft,
  Phone,
  Clock,
  Play,
  Pause,
  Loader2,
  Trash2,
} from "lucide-react";
import { formatDuration, formatDate } from "@/lib/utils";

interface RecordingDetail {
  id: string;
  recordingNumber: string;
  callerNumber?: string | null;
  contactName?: string | null;
  contactNumber?: string | null;
  durationSec?: number | null;
  status: string;
  createdAt: string;
  transcription?: {
    fullText: string;
    language: string;
    segments: unknown;
  } | null;
  summary?: {
    summaryText: string;
    keyPoints: string[];
    actionItems: { task: string; assignee?: string; deadline?: string }[];
    topics: string[];
    sentiment: string | null;
  } | null;
}

export default function RecordingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [recording, setRecording] = useState<RecordingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchRecording = async () => {
      try {
        const res = await fetch(`/api/recordings/${id}`);
        if (res.ok) {
          setRecording(await res.json());
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecording();

    // ステータスポーリング（処理中の場合）
    const interval = setInterval(fetchRecording, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const handlePlayAudio = async () => {
    if (isPlaying && audio) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    if (!audioUrl) {
      const res = await fetch(`/api/recordings/${id}/audio`);
      if (res.ok) {
        const data = await res.json();
        setAudioUrl(data.url);
        const newAudio = new Audio(data.url);
        newAudio.onended = () => setIsPlaying(false);
        setAudio(newAudio);
        newAudio.play();
        setIsPlaying(true);
      }
    } else if (audio) {
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleDelete = async () => {
    if (!confirm("この録音を削除しますか？")) return;
    await fetch(`/api/recordings/${id}`, { method: "DELETE" });
    window.location.href = "/dashboard/recordings";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!recording) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">録音が見つかりません</p>
      </div>
    );
  }

  const isProcessing = [
    "UPLOADING",
    "TRANSCRIBING",
    "SUMMARIZING",
  ].includes(recording.status);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/dashboard/recordings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">録音詳細</h1>
      </div>

      {/* メタ情報 */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-gray-400" />
                <span className="font-medium text-gray-900">
                  {recording.contactName || recording.contactNumber || recording.recordingNumber}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>{formatDate(recording.createdAt)}</span>
                {recording.durationSec != null && (
                  <>
                    <span>-</span>
                    <span>{formatDuration(recording.durationSec)}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 音声再生 */}
      {recording.status === "COMPLETED" && (
        <Card>
          <CardContent className="pt-4">
            <Button
              variant="outline"
              onClick={handlePlayAudio}
              className="w-full"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  一時停止
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  音声を再生
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 処理中表示 */}
      {isProcessing && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">処理中...</p>
              <p className="text-sm text-yellow-600">
                {recording.status === "UPLOADING" && "音声をアップロードしています"}
                {recording.status === "TRANSCRIBING" && "文字起こしを実行しています"}
                {recording.status === "SUMMARIZING" && "AI要約を生成しています"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI要約 */}
      {recording.summary && (
        <SummaryView
          summaryText={recording.summary.summaryText}
          keyPoints={recording.summary.keyPoints}
          actionItems={recording.summary.actionItems}
          topics={recording.summary.topics}
          sentiment={recording.summary.sentiment}
        />
      )}

      {/* 文字起こし */}
      {recording.transcription && (
        <Card>
          <CardHeader>
            <CardTitle>文字起こし全文</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary">
                {recording.transcription.language === "ja" ? "日本語" : recording.transcription.language}
              </Badge>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {recording.transcription.fullText}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
