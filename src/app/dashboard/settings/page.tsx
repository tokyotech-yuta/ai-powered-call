"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Shield, Bell } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">設定</h1>

      {/* アカウント */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            アカウント
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">プラン</span>
            <Badge>Free</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">言語</span>
            <span className="text-sm text-gray-900">日本語</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">自動要約</span>
            <span className="text-sm text-gray-900">有効</span>
          </div>
        </CardContent>
      </Card>

      {/* プライバシー */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            プライバシー
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">録音保存期間</span>
            <span className="text-sm text-gray-900">90日</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">音声暗号化</span>
            <Badge variant="success">AES-256</Badge>
          </div>
        </CardContent>
      </Card>

      {/* 通知 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            通知
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">要約完了通知</span>
            <span className="text-sm text-gray-900">有効</span>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-gray-400 py-4">
        AI Powered Call v0.1.0
      </p>
    </div>
  );
}
