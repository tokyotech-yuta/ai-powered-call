"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Clock, FileText } from "lucide-react";
import { formatDuration, formatDate } from "@/lib/utils";
import type { RecordingStatus } from "@prisma/client";

interface RecordingCardProps {
  id: string;
  contactName?: string | null;
  contactNumber?: string | null;
  recordingNumber: string;
  durationSec?: number | null;
  status: RecordingStatus;
  summaryText?: string | null;
  topics?: string[] | null;
  createdAt: string | Date;
}

const statusLabels: Record<RecordingStatus, string> = {
  WAITING: "待機中",
  RECORDING: "録音中",
  UPLOADING: "アップロード中",
  TRANSCRIBING: "文字起こし中",
  SUMMARIZING: "要約生成中",
  COMPLETED: "完了",
  FAILED: "失敗",
};

const statusVariants: Record<RecordingStatus, "default" | "success" | "warning" | "destructive" | "recording" | "secondary"> = {
  WAITING: "secondary",
  RECORDING: "recording",
  UPLOADING: "warning",
  TRANSCRIBING: "warning",
  SUMMARIZING: "warning",
  COMPLETED: "success",
  FAILED: "destructive",
};

export function RecordingCard({
  id,
  contactName,
  contactNumber,
  recordingNumber,
  durationSec,
  status,
  summaryText,
  topics,
  createdAt,
}: RecordingCardProps) {
  return (
    <Link href={`/dashboard/recordings/${id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">
                  {contactName || contactNumber || recordingNumber}
                </p>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{formatDate(createdAt)}</span>
                  {durationSec != null && (
                    <>
                      <span>-</span>
                      <span>{formatDuration(durationSec)}</span>
                    </>
                  )}
                </div>
                {summaryText && (
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                    <FileText className="inline h-3.5 w-3.5 mr-1" />
                    {summaryText}
                  </p>
                )}
                {topics && topics.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {topics.map((topic) => (
                      <Badge key={topic} variant="secondary" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <Badge variant={statusVariants[status]}>
              {statusLabels[status]}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
