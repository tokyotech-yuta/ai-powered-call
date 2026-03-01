"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Mic } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("メールアドレスまたはパスワードが正しくありません");
      setIsLoading(false);
    } else {
      window.location.href = "/dashboard/record";
    }
  };

  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl: "/dashboard/record" });
  };

  const handleDemoLogin = async () => {
    setIsDemoLoading(true);
    setError(null);

    // まずログインを試行
    let result = await signIn("credentials", {
      email: "demo@aipoweredcall.com",
      password: "demo1234",
      redirect: false,
    });

    // ログイン失敗時はデモアカウントを自動作成してリトライ
    if (result?.error) {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "demo@aipoweredcall.com",
            password: "demo1234",
            name: "デモユーザー",
          }),
        });

        if (res.ok || res.status === 409) {
          result = await signIn("credentials", {
            email: "demo@aipoweredcall.com",
            password: "demo1234",
            redirect: false,
          });
        } else {
          const data = await res.json().catch(() => ({}));
          setError(
            `アカウント作成に失敗しました (${res.status}): ${data.error || "不明なエラー"}`
          );
          setIsDemoLoading(false);
          return;
        }
      } catch (e) {
        setError(
          `通信エラー: ${e instanceof Error ? e.message : "サーバーに接続できません"}`
        );
        setIsDemoLoading(false);
        return;
      }
    }

    if (result?.error) {
      setError(`ログインに失敗しました: ${result.error}`);
      setIsDemoLoading(false);
    } else {
      window.location.href = "/dashboard/record";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mic className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl">AI Powered Call</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            ログインして通話録音を始めましょう
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google Login */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
          >
            Googleでログイン
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">または</span>
            </div>
          </div>

          {/* Email/Password Login */}
          <form onSubmit={handleCredentialLogin} className="space-y-3">
            <input
              type="email"
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <input
              type="password"
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />

            {error && (
              <p className="text-red-600 text-sm text-center">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "ログイン中..." : "ログイン"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">お試し</span>
            </div>
          </div>

          <Button
            variant="secondary"
            className="w-full"
            onClick={handleDemoLogin}
            disabled={isDemoLoading}
          >
            {isDemoLoading ? "ログイン中..." : "デモアカウントでログイン"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
