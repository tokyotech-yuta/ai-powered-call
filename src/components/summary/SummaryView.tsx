"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ListChecks, Tag, MessageSquare } from "lucide-react";

interface SummaryViewProps {
  summaryText: string;
  keyPoints?: string[];
  actionItems?: { task: string; assignee?: string; deadline?: string }[];
  topics?: string[];
  sentiment?: string | null;
}

const sentimentLabels: Record<string, { label: string; variant: "success" | "default" | "destructive" }> = {
  positive: { label: "ポジティブ", variant: "success" },
  neutral: { label: "ニュートラル", variant: "default" },
  negative: { label: "ネガティブ", variant: "destructive" },
};

export function SummaryView({
  summaryText,
  keyPoints,
  actionItems,
  topics,
  sentiment,
}: SummaryViewProps) {
  const sentimentInfo = sentiment ? sentimentLabels[sentiment] : null;

  return (
    <div className="space-y-4">
      {/* 要約 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            AI要約
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed">{summaryText}</p>
          {sentimentInfo && (
            <div className="mt-3">
              <Badge variant={sentimentInfo.variant}>
                {sentimentInfo.label}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* キーポイント */}
      {keyPoints && keyPoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              重要ポイント
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {keyPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-700">
                  <span className="text-blue-500 mt-1 shrink-0">-</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* アクションアイテム */}
      {actionItems && actionItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              アクションアイテム
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {actionItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-gray-700">{item.task}</p>
                    <div className="flex gap-2 mt-1">
                      {item.assignee && (
                        <Badge variant="secondary" className="text-xs">
                          {item.assignee}
                        </Badge>
                      )}
                      {item.deadline && (
                        <Badge variant="warning" className="text-xs">
                          {item.deadline}
                        </Badge>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* トピック */}
      {topics && topics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              トピック
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {topics.map((topic) => (
                <Badge key={topic}>{topic}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
