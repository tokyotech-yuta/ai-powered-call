import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mic, Zap, Share2, Shield } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">AI Powered Call</h1>
        <Link href="/login">
          <Button variant="outline" size="sm">
            ログイン
          </Button>
        </Link>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
          通話を録音し、
          <br />
          <span className="text-blue-600">AIが自動で要約</span>
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-10">
          既存の電話回線をそのまま使用。通話相手に気づかれることなくサーバーサイドで録音し、AIが文字起こしと要約を自動生成します。
        </p>
        <Link href="/login">
          <Button size="xl">無料で始める</Button>
        </Link>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
          <div className="text-center p-6">
            <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Mic className="h-7 w-7 text-red-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              サイレント録音
            </h3>
            <p className="text-sm text-gray-600">
              3者通話マージにより、通話相手に録音を意識させることなく録音
            </p>
          </div>

          <div className="text-center p-6">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Zap className="h-7 w-7 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">AI自動要約</h3>
            <p className="text-sm text-gray-600">
              録音された音声をAIが自動で文字起こしし、重要ポイントを要約
            </p>
          </div>

          <div className="text-center p-6">
            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Share2 className="h-7 w-7 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">外部連携</h3>
            <p className="text-sm text-gray-600">
              要約結果をSlack・Outlookに自動送信。チームへの共有がスムーズ
            </p>
          </div>

          <div className="text-center p-6">
            <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield className="h-7 w-7 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              セキュリティ
            </h3>
            <p className="text-sm text-gray-600">
              全通信TLS暗号化、音声ファイルAES-256暗号化、自動削除設定
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">
          使い方
        </h2>
        <div className="max-w-2xl mx-auto space-y-6">
          {[
            { step: 1, text: "通常通り電話をかける（または受ける）" },
            { step: 2, text: "ブラウザでAI Powered Callを開き「録音開始」をタップ" },
            { step: 3, text: "表示される番号に追加発信し「通話を統合」" },
            { step: 4, text: "通話終了後、自動でAI要約が生成される" },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                {step}
              </div>
              <p className="text-gray-700">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">
          料金プラン
        </h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            {
              name: "Free",
              price: "0",
              features: ["月5回まで録音", "AI要約", "90日保存"],
            },
            {
              name: "Pro",
              price: "980",
              features: ["無制限録音", "全外部連携", "90日保存", "優先処理"],
              popular: true,
            },
            {
              name: "Business",
              price: "2,980",
              features: [
                "Pro全機能",
                "チーム共有",
                "1年保存",
                "優先サポート",
              ],
            },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl border p-6 ${plan.popular ? "border-blue-600 bg-blue-50 shadow-lg ring-2 ring-blue-600" : "bg-white"}`}
            >
              {plan.popular && (
                <div className="text-xs font-bold text-blue-600 mb-2">
                  人気
                </div>
              )}
              <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
              <div className="mt-2">
                <span className="text-3xl font-bold text-gray-900">
                  ¥{plan.price}
                </span>
                <span className="text-gray-500">/月</span>
              </div>
              <ul className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-gray-600"
                  >
                    <span className="text-green-500">-</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/login">
                <Button
                  className="w-full mt-6"
                  variant={plan.popular ? "default" : "outline"}
                >
                  始める
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          <p>&copy; 2026 AI Powered Call. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
