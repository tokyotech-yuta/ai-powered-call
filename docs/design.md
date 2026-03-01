# AI Powered Call - 設計書

## 1. プロジェクト概要

### 1.1 プロダクト名
**AI Powered Call**

### 1.2 コンセプト
既存の電話回線（携帯電話・固定電話）の通話に**アドオン**として録音機能を提供するWebアプリケーション。通話相手に録音を意識させることなくサーバーサイドで録音し、AIによる自動要約を生成、Slack・Outlookなどの外部サービスへ送信する。

### 1.3 核心要件

| # | 要件 | 説明 |
|---|------|------|
| 1 | **サイレント録音** | 通話相手に録音していることが一切わからない（通知音・ガイダンスなし） |
| 2 | **既存回線アドオン** | IP電話ではなく、普段使っている電話番号・回線をそのまま使用 |
| 3 | **Webアプリ** | App Store審査を回避、ブラウザで完結（iOS/Android両対応） |
| 4 | **AI要約** | 録音 → 文字起こし → 要約を自動パイプライン処理 |
| 5 | **外部連携** | Slack・Outlook等への自動送信 |

### 1.4 主要機能一覧
| # | 機能 | 説明 |
|---|------|------|
| 1 | 通話録音 | 3者通話マージによるサーバーサイドサイレント録音 |
| 2 | AI要約 | 録音された音声をAIで文字起こし・要約 |
| 3 | 外部連携 | 要約結果をSlack・Outlook等に自動送信 |
| 4 | ダッシュボード | 録音履歴・要約の閲覧・管理・検索 |
| 5 | PWA対応 | ホーム画面に追加してネイティブアプリに近い操作感 |

---

## 2. 技術的制約と設計方針

### 2.1 なぜWebアプリか

| 観点 | iOSネイティブアプリ | Webアプリ (PWA) |
|------|-------------------|----------------|
| App Store審査 | 録音通知の表示義務 (ガイドライン 2.5.14) | **審査不要** |
| 録音通知 | 相手に通知が必須 | **通知義務なし（アプリストア規約の対象外）** |
| クロスプラットフォーム | iOSのみ | **iOS / Android / PC すべて対応** |
| インストール | App Storeからダウンロード | **URLアクセスのみ、PWAでホーム追加可** |
| 更新 | Apple審査に数日 | **即座にデプロイ** |

### 2.2 録音方式: 3者通話サイレントマージ

既存の電話回線を活かしつつ、相手に気づかれずに録音する唯一の実用的な方式。

```
┌──────────┐                                    ┌──────────┐
│  ユーザー   │──── 通常の電話回線（通話中）────────│  通話相手   │
│  (携帯電話) │                                    │           │
│            │     ┌─────────────────────┐        └──────────┘
│            │────│ 追加発信 → 録音番号    │
│            │     └──────────┬──────────┘
│            │                │
│            │── 3者通話マージ │
│            │                ▼
└──────────┘        ┌─────────────────┐
                     │  Twilio録音サーバー │ ← サイレント（音声ガイダンスなし）
                     │  - 応答即座に録音開始 │    相手には何も聞こえない
                     │  - ビープ音なし      │
                     │  - ガイダンスなし     │
                     └─────────────────┘
```

**なぜ相手にバレないか:**
1. Twilioの録音サーバーは**応答時に無音**で接続（ビープ音・ガイダンスを一切流さない設定）
2. 3者通話マージ時、相手には**短い保留音 → 復帰のみ**で、録音の存在を示す音声は一切ない
3. 録音はサーバーサイドで行われるため、端末上に録音インジケーターが表示されない
4. Webアプリのため、App Store/Google Playの録音通知義務の対象外

### 2.3 ユーザー操作フロー

```
① 通常通り電話をかける（または受ける）
          ↓
② スマホのブラウザでWebアプリを開く（またはPWAをタップ）
          ↓
③ 「録音開始」ボタンをタップ
          ↓
④ バックエンドがTwilio録音番号を生成 → ユーザーの電話に通知
          ↓
⑤ ユーザーが録音番号に追加発信（電話アプリで「通話を追加」）
          ↓
⑥ 録音サーバーが無音で応答
          ↓
⑦ ユーザーが「通話を統合」で3者通話にマージ
          ↓
⑧ 録音サーバーが全音声をサイレント録音
          ↓
⑨ 通話終了 → 自動で文字起こし → AI要約 → 外部連携送信
          ↓
⑩ Webダッシュボードで要約を確認
```

### 2.4 ワンタップ録音の最適化（UX改善）

上記フロー⑤⑦の手動操作を極力減らすため、以下の最適化を実装する。

**方式A: tel:リンクによる自動発信**
```
Webアプリから tel:{録音番号} リンクを生成
→ ユーザーはリンクタップで自動的に録音番号に発信
→ マージ操作のみ手動（iOSの制約で自動化不可）
```

**方式B: ショートカット (iOS) / Tasker (Android) 連携**
```
iOSショートカットで「録音開始」アクションを作成
→ Siri / ウィジェットから1タップで録音番号に発信+マージ
→ 最小限の操作で録音開始
```

### 2.5 代替方式の比較

| 方式 | 相手への通知 | 既存回線利用 | 実現性 | 採用 |
|------|------------|------------|--------|------|
| **3者通話サイレントマージ** | **なし** | **○** | ○ 実績あり | **採用** |
| VoIP (Twilio経由発信) | なし | × 別番号になる | ○ | 不採用（要件不適合） |
| iOS標準録音 (iOS 18.1+) | **あり**（Apple強制通知） | ○ | ○ | 不採用（通知される） |
| マイクでスピーカー録音 | なし | ○ | △ 品質劣悪 | 不採用 |

---

## 3. システムアーキテクチャ

### 3.1 全体構成図

```
┌──────────────────────────────────────────────────────────┐
│              クライアント (Web App / PWA)                    │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │
│  │ 録音操作   │  │ ダッシュ   │  │  要約     │  │ 外部連携  │  │
│  │ パネル     │  │ ボード    │  │  ビューア  │  │ 設定    │  │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘  │
│                                                          │
│  PWA: ホーム画面追加対応 / オフライン閲覧 / Push通知         │
└──────────────────────┬───────────────────────────────────┘
                       │ HTTPS / WebSocket (リアルタイム更新)
                       ▼
┌──────────────────────────────────────────────────────────┐
│                    バックエンドサーバー                       │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │
│  │  API      │  │ Twilio   │  │  AI処理   │  │ 外部連携  │  │
│  │  Server   │  │ 録音制御  │  │ パイプライン│  │ サービス  │  │
│  │ (Next.js) │  │          │  │          │  │          │  │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘  │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │  認証      │  │ ストレージ │  │  DB      │               │
│  │ (NextAuth) │  │ (S3)     │  │(PostgreSQL)│              │
│  └──────────┘  └──────────┘  └──────────┘               │
└──────────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│                    外部サービス                             │
│  ┌──────┐  ┌──────────┐  ┌──────┐  ┌──────────────┐     │
│  │ Slack │  │ Outlook  │  │ Twilio│  │ OpenAI/Claude│     │
│  │  API  │  │ Graph API│  │      │  │   API        │     │
│  └──────┘  └──────────┘  └──────┘  └──────────────┘     │
└──────────────────────────────────────────────────────────┘
```

### 3.2 技術スタック

| レイヤー | 技術 | 理由 |
|---------|------|------|
| **フロントエンド** | Next.js 15 (App Router) | SSR/SSG対応、フルスタック、PWA対応 |
| **UI** | Tailwind CSS + shadcn/ui | 高速開発、モバイルファーストUI |
| **認証** | NextAuth.js v5 | Google/メール認証、JWT管理 |
| **バックエンドAPI** | Next.js API Routes + Server Actions | フロントと統合、シンプル構成 |
| **テレフォニー** | Twilio Programmable Voice | 録音番号の動的生成、サイレント応答、通話録音 |
| **音声文字起こし** | OpenAI Whisper API | 高精度の日本語音声認識 |
| **AI要約** | Claude API (Anthropic) | 高品質な日本語要約生成 |
| **データベース** | PostgreSQL (Supabase) | マネージドDB、Row Level Security |
| **ORM** | Prisma | 型安全なDB操作 |
| **ファイルストレージ** | AWS S3 | 音声ファイルの暗号化保管 |
| **ジョブキュー** | Inngest | サーバーレス非同期処理 (文字起こし・要約) |
| **ホスティング** | Vercel | Next.jsの最適ホスティング、エッジネットワーク |
| **リアルタイム** | Supabase Realtime | 録音状態・要約完了のリアルタイム通知 |

---

## 4. 詳細設計

### 4.1 Webアプリ画面設計

#### 4.1.1 画面一覧とワイヤーフレーム

```
ページ構成 (Next.js App Router)

/                           → ランディングページ（未ログイン時）
/login                      → ログイン画面
/dashboard                  → メインダッシュボード
/dashboard/record           → 録音操作パネル（メイン画面）
/dashboard/recordings       → 録音履歴一覧
/dashboard/recordings/[id]  → 録音詳細（要約・文字起こし・音声再生）
/dashboard/integrations     → 外部連携設定
/dashboard/settings         → ユーザー設定
```

#### 4.1.2 録音操作パネル（メイン画面）

```
┌─────────────────────────────────┐
│  AI Powered Call                │
│─────────────────────────────────│
│                                 │
│      ┌─────────────────┐       │
│      │                 │       │
│      │   ● REC         │       │
│      │                 │       │
│      │  録音を開始する    │       │
│      │                 │       │
│      └─────────────────┘       │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  使い方:                         │
│  1. 通常通り電話をかける          │
│  2. 上のボタンをタップ            │
│  3. 表示される番号に追加発信      │
│  4. 「通話を統合」をタップ        │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  最近の録音                      │
│  ┌───────────────────────────┐  │
│  │ 📞 090-XXXX-XXXX  15:32  │  │
│  │ 要約: プロジェクトXの進捗... │  │
│  │ 3分前 ✅ 完了              │  │
│  ├───────────────────────────┤  │
│  │ 📞 03-XXXX-XXXX   08:45  │  │
│  │ ⏳ 要約を生成中...         │  │
│  └───────────────────────────┘  │
│                                 │
│  [録音] [履歴] [連携] [設定]     │
└─────────────────────────────────┘
```

#### 4.1.3 録音中の状態表示

```
┌─────────────────────────────────┐
│  🔴 録音中  00:15:32            │
│─────────────────────────────────│
│                                 │
│  ┌─────────────────────────┐   │
│  │ ■ ■ ■ █ █ ■ ■ ■ ■ █ █  │   │  ← 音声波形（リアルタイム）
│  └─────────────────────────┘   │
│                                 │
│  録音サーバーに接続済み            │
│  通話相手への通知: なし           │
│                                 │
│      ┌─────────────────┐       │
│      │   ⏹ 録音停止     │       │
│      └─────────────────┘       │
│                                 │
│  💡 通話を終了すると自動的に       │
│     録音が停止し、AI要約が        │
│     生成されます                 │
│                                 │
└─────────────────────────────────┘
```

#### 4.1.4 録音詳細画面（要約ビュー）

```
┌─────────────────────────────────┐
│  ← 戻る        録音詳細         │
│─────────────────────────────────│
│                                 │
│  📞 090-1234-5678               │
│  2026/03/01 14:30  (15分32秒)   │
│                                 │
│  ── 🔊 音声再生 ──────────────  │
│  ▶ ━━━━━━━━━━━●━━━━━  12:30   │
│                                 │
│  ── 📝 AI要約 ────────────────  │
│                                 │
│  プロジェクトXの進捗確認を実施。  │
│  デザイン案は来週月曜までに提出   │
│  予定。見積もりの再計算が必要。   │
│                                 │
│  ✅ アクションアイテム            │
│  • デザイン案を月曜までに提出     │
│  • 見積もりを再計算              │
│                                 │
│  🏷 トピック                     │
│  [進捗確認] [デザイン] [見積もり] │
│                                 │
│  ── 📄 文字起こし全文 ────────  │
│  ▼ 展開してすべて表示            │
│                                 │
│  ── 共有 ──────────────────────  │
│  [Slackに送信] [メールで送信]     │
│                                 │
└─────────────────────────────────┘
```

### 4.2 Twilio録音サーバー設計

#### 4.2.1 サイレント応答の実装

Twilioが着信に応答する際のTwiML設定。**一切の音声を流さず、即座に録音を開始する。**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <!-- 無音で応答し、即座に録音を開始 -->
    <!-- Say/Play要素なし = 相手には何も聞こえない -->
    <Pause length="0"/>
    <Record
        maxLength="7200"
        recordingStatusCallback="/webhooks/twilio/recording-status"
        recordingStatusCallbackEvent="completed"
        trim="trim-silence"
    />
</Response>
```

**ポイント:**
- `<Say>` や `<Play>` を一切含めない → 応答時に音声が流れない
- 3者通話にマージされた時点で、Twilioは全参加者の音声をキャプチャ
- 通話相手側には、短い保留音（キャリアの仕様）の後に通話が復帰するだけ

#### 4.2.2 録音番号の動的生成

```typescript
// ユーザーが「録音開始」をタップした時の処理
async function createRecordingSession(userId: string) {
    // 1. Twilioで録音用の一時電話番号を取得（またはプール番号を割当）
    const recordingNumber = await twilioClient.incomingPhoneNumbers.create({
        phoneNumber: getAvailableNumberFromPool(),
        voiceUrl: `${BASE_URL}/webhooks/twilio/voice`,  // サイレントTwiML
        voiceMethod: 'POST',
    });

    // 2. セッションをDBに保存
    const session = await prisma.recordingSession.create({
        data: {
            userId,
            twilioPhoneNumber: recordingNumber.phoneNumber,
            status: 'waiting_for_call',
        },
    });

    // 3. ユーザーに録音番号を返す
    return {
        recordingNumber: recordingNumber.phoneNumber,
        sessionId: session.id,
        instruction: 'この番号に追加発信し、通話を統合してください',
    };
}
```

### 4.3 通話録音シーケンス図

```
ユーザー        Webアプリ        バックエンド      Twilio        通話相手
  │               │               │              │              │
  │── 電話中 ─────────────────────────────────────────────────→│
  │               │               │              │              │
  │── ブラウザで   │               │              │              │
  │   録音開始 ──→│               │              │              │
  │               │── POST /api/  │              │              │
  │               │   recordings/ │              │              │
  │               │   start ─────→│              │              │
  │               │               │── 録音番号   │              │
  │               │               │   設定 ─────→│              │
  │               │               │              │              │
  │               │←── 録音番号 ──│              │              │
  │←── 録音番号 ──│    表示       │              │              │
  │   表示        │               │              │              │
  │               │               │              │              │
  │── 録音番号に  │               │              │              │
  │   追加発信 ──────────────────────────────────→│              │
  │               │               │              │── 無音応答   │
  │               │               │              │   録音準備   │
  │               │               │←── Webhook ──│              │
  │               │               │   通話開始    │              │
  │               │               │              │              │
  │── 3者通話    │               │              │              │
  │   マージ ─────────────────────────────────── │              │
  │               │               │              │              │
  │═══ 全音声がTwilioに流れる（相手に気づかれず） ═══════════════│
  │               │               │              │── サイレント │
  │               │               │              │   録音中     │
  │               │               │              │              │
  │               │←── WebSocket ─│              │              │
  │←── 録音中    │   録音状態更新  │              │              │
  │   UI更新     │               │              │              │
  │               │               │              │              │
  │── 通話終了 ──────────────────────────────────→│──────────→  │
  │               │               │              │              │
  │               │               │←── Webhook ──│              │
  │               │               │   録音完了    │              │
  │               │               │              │              │
  │               │               │── 非同期処理開始              │
  │               │               │   ├ S3に音声保存              │
  │               │               │   ├ Whisper文字起こし         │
  │               │               │   ├ Claude要約生成            │
  │               │               │   └ 外部連携送信              │
  │               │               │              │              │
  │               │←── WebSocket ─│              │              │
  │←── 要約完了  │   要約完了通知  │              │              │
  │   表示       │               │              │              │
```

### 4.4 バックエンドAPI設計

#### 4.4.1 API エンドポイント一覧

```
Base URL: https://app.aipoweredcall.com/api

# 認証 (NextAuth.js)
GET    /api/auth/[...nextauth]    # NextAuth認証エンドポイント

# 録音
POST   /api/recordings/start      # 録音セッション開始（録音番号を返す）
POST   /api/recordings/stop       # 録音停止
GET    /api/recordings             # 録音一覧取得
GET    /api/recordings/:id         # 録音詳細取得
DELETE /api/recordings/:id         # 録音削除
GET    /api/recordings/:id/audio   # 音声ファイルの署名付きURL取得

# 文字起こし・要約
GET    /api/recordings/:id/transcription  # 文字起こし取得
GET    /api/recordings/:id/summary        # 要約取得
POST   /api/recordings/:id/resummarize    # 要約再生成

# 外部連携
GET    /api/integrations                  # 連携一覧取得
POST   /api/integrations/slack            # Slack連携 (OAuth)
POST   /api/integrations/outlook          # Outlook連携 (OAuth)
DELETE /api/integrations/:id              # 連携解除
POST   /api/recordings/:id/share          # 要約を外部サービスに送信

# Twilio Webhook（内部）
POST   /api/webhooks/twilio/voice              # 着信応答 TwiML
POST   /api/webhooks/twilio/recording-status   # 録音ステータス

# ユーザー設定
GET    /api/settings                      # 設定取得
PUT    /api/settings                      # 設定更新

# 決済
POST   /api/billing/create-checkout       # Stripe決済セッション作成
POST   /api/webhooks/stripe               # Stripe Webhook
GET    /api/billing/portal                 # 顧客ポータルURL取得
```

#### 4.4.2 主要データモデル (Prisma)

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  plan          Plan      @default(FREE)
  stripeCustomerId String?

  recordings    CallRecording[]
  integrations  Integration[]
  settings      UserSettings?

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

enum Plan {
  FREE
  PRO
  BUSINESS
}

model CallRecording {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  twilioCallSid   String?
  recordingNumber String            // 録音に使用したTwilio番号
  callerNumber    String?           // ユーザーの電話番号
  contactName     String?           // 連絡先名（手動入力）
  contactNumber   String?           // 通話相手の番号（手動入力）
  durationSec     Int?
  audioS3Key      String?           // S3のオブジェクトキー
  status          RecordingStatus   @default(WAITING)

  transcription   Transcription?
  summary         Summary?
  shareHistory    ShareHistory[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([userId, createdAt(sort: Desc)])
}

enum RecordingStatus {
  WAITING         // 録音番号を発行済み、発信待ち
  RECORDING       // 録音中
  UPLOADING       // 音声ファイルアップロード中
  TRANSCRIBING    // 文字起こし中
  SUMMARIZING     // AI要約生成中
  COMPLETED       // 全処理完了
  FAILED          // 処理失敗
}

model Transcription {
  id            String   @id @default(cuid())
  recordingId   String   @unique
  recording     CallRecording @relation(fields: [recordingId], references: [id], onDelete: Cascade)

  fullText      String
  language      String   @default("ja")
  segments      Json?    // タイムスタンプ付きセグメント [{start, end, text}]

  createdAt     DateTime @default(now())
}

model Summary {
  id            String   @id @default(cuid())
  recordingId   String   @unique
  recording     CallRecording @relation(fields: [recordingId], references: [id], onDelete: Cascade)

  summaryText   String              // 要約本文
  keyPoints     Json?               // ["ポイント1", "ポイント2"]
  actionItems   Json?               // [{task, assignee?, deadline?}]
  topics        Json?               // ["トピック1", "トピック2"]
  sentiment     String?             // positive / neutral / negative
  aiModel       String              // 使用したAIモデル名

  createdAt     DateTime @default(now())
}

model Integration {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  serviceType   ServiceType
  accessToken   String              // 暗号化して保存
  refreshToken  String?             // 暗号化して保存
  channelId     String?             // Slack: チャンネルID, Outlook: メールアドレス
  channelName   String?             // 表示用名前
  isActive      Boolean  @default(true)
  autoSend      Boolean  @default(false) // 録音完了時に自動送信

  shareHistory  ShareHistory[]

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([userId, serviceType])
}

enum ServiceType {
  SLACK
  OUTLOOK
  TEAMS
}

model ShareHistory {
  id              String   @id @default(cuid())
  recordingId     String
  recording       CallRecording @relation(fields: [recordingId], references: [id], onDelete: Cascade)
  integrationId   String
  integration     Integration @relation(fields: [integrationId], references: [id], onDelete: Cascade)

  status          ShareStatus
  errorMessage    String?

  createdAt       DateTime @default(now())
}

enum ShareStatus {
  SENT
  FAILED
}

model UserSettings {
  id                    String   @id @default(cuid())
  userId                String   @unique
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  defaultLanguage       String   @default("ja")
  autoSummarize         Boolean  @default(true)
  retentionDays         Int      @default(90)    // 録音の保存日数
  summaryTemplate       String?                   // カスタム要約テンプレート

  updatedAt             DateTime @updatedAt
}
```

### 4.5 AI処理パイプライン

```
通話終了
  │
  ▼
Inngest: recording.completed イベント
  │
  ▼
Step 1: download-audio
  │── TwilioのRecording APIから音声ダウンロード
  │── AES-256暗号化してS3にアップロード
  │── ステータスを UPLOADING → TRANSCRIBING に更新
  │
  ▼
Step 2: transcribe-audio
  │── S3から音声取得
  │── OpenAI Whisper APIで文字起こし（日本語）
  │── セグメント情報付きで結果をDB保存
  │── ステータスを TRANSCRIBING → SUMMARIZING に更新
  │
  ▼
Step 3: generate-summary
  │── 文字起こしテキストを取得
  │── Claude APIで要約・キーポイント・アクションアイテム生成
  │── 結果をDB保存
  │── ステータスを SUMMARIZING → COMPLETED に更新
  │
  ▼
Step 4: notify-and-share
  │── WebSocket経由でリアルタイム通知（ブラウザ）
  │── Web Push通知
  │── 自動送信設定がある場合、Slack/Outlook等に送信
  │
  ▼
完了
```

#### 4.5.1 AI要約プロンプト設計

```
あなたは通話内容を分析するAIアシスタントです。
以下の通話の文字起こしを分析し、JSON形式で結果を返してください。

## 出力フォーマット
{
  "summary": "通話の概要（3-5文）",
  "key_points": ["重要ポイント1", "重要ポイント2", ...],
  "action_items": [
    {
      "task": "タスク内容",
      "assignee": "担当者（わかる場合）",
      "deadline": "期限（わかる場合）"
    }
  ],
  "sentiment": "positive | neutral | negative",
  "topics": ["議題1", "議題2", ...]
}

## 注意事項
- 電話番号や住所などの個人情報はマスクしてください
- 要約は日本語で出力してください
- アクションアイテムは具体的かつ実行可能な形で記述してください

## 通話の文字起こし
{transcription_text}
```

### 4.6 外部連携設計

#### 4.6.1 Slack連携

```
認証方式: OAuth 2.0 (Slack App)
スコープ: chat:write, channels:read
送信先:   ユーザーが指定したチャンネルまたはDM

メッセージフォーマット (Block Kit):
┌──────────────────────────────────────┐
│ 📞 通話要約 - 2026/03/01 14:30      │
│──────────────────────────────────────│
│ 相手: 田中太郎                       │
│ 時間: 15分32秒                       │
│──────────────────────────────────────│
│ 📝 要約                              │
│ プロジェクトXの進捗について確認。       │
│ デザイン案は来週月曜までに提出予定。     │
│──────────────────────────────────────│
│ ✅ アクションアイテム                   │
│ • デザイン案を月曜までに提出（田中）     │
│ • 見積もりを再計算（自分）              │
│──────────────────────────────────────│
│ [📄 詳細を見る → Webアプリ]            │
└──────────────────────────────────────┘
```

#### 4.6.2 Outlook連携

```
認証方式: OAuth 2.0 (Microsoft Graph API)
スコープ: Mail.Send
送信先:   ユーザーが指定したメールアドレス
形式:     HTML形式のメール
```

---

## 5. セキュリティ設計

### 5.1 データ保護

| 項目 | 対策 |
|------|------|
| 通信 | 全通信はTLS 1.3で暗号化 |
| 音声ファイル | AES-256で暗号化してS3に保存 (SSE-S3) |
| 外部連携トークン | AES-256で暗号化してDB保存 |
| 認証 | NextAuth.js + JWT、HttpOnly Cookie |
| アクセス制御 | 全APIでユーザーIDによるスコープ制限 |
| Webhook検証 | Twilio/Stripe署名検証 |

### 5.2 プライバシー対応

| 項目 | 対策 |
|------|------|
| データ削除 | ユーザーがいつでも個別/全件のデータ削除可能 |
| 保存期間 | デフォルト90日で自動削除（設定変更可能） |
| 個人情報マスキング | AI要約生成時に電話番号等の個人情報を自動マスク |
| GDPR対応 | データエクスポート機能、アカウント完全削除機能 |

### 5.3 法的考慮事項

> **注意:** 通話録音の法的要件は地域により異なる

| 地域 | 法律 | 要件 |
|------|------|------|
| **日本** | 個人情報保護法 | 通話当事者の一方が同意していれば録音可能（一方当事者同意）。本アプリのユーザー自身が同意者となるため**合法** |
| **米国** | 州法により異なる | 一部の州では双方の同意が必要（Two-party consent） |
| **EU** | GDPR + EU AI Act | 明示的同意が必要、AI処理の透明性義務あり |

**対応方針:**
- 利用規約で録音機能とユーザー責任を明記
- 初回利用時に利用地域の法的要件を表示し同意取得
- オプション機能として録音通知ガイダンスを提供（法律で必要な地域向け）
- AI処理（文字起こし・要約）に関するデータ処理の説明ページを提供

---

## 6. インフラ構成

### 6.1 構成図

```
┌──────────────────────────────────────────────────────┐
│  Vercel                                              │
│  ┌────────────────────────────────────────────────┐  │
│  │  Next.js App                                    │  │
│  │  - フロントエンド (SSR/CSR)                      │  │
│  │  - API Routes                                   │  │
│  │  - Webhook Handlers                             │  │
│  └────────────────────────────────────────────────┘  │
└──────────────┬───────────────────────────────────────┘
               │
     ┌─────────┼──────────┬──────────────┐
     │         │          │              │
     ▼         ▼          ▼              ▼
┌─────────┐ ┌────────┐ ┌──────────┐ ┌─────────┐
│ Supabase│ │ AWS S3 │ │ Inngest  │ │ Twilio  │
│ (PgSQL) │ │ (音声) │ │ (ジョブ) │ │ (電話)  │
└─────────┘ └────────┘ └──────────┘ └─────────┘
                          │
                    ┌─────┼─────┐
                    │     │     │
                    ▼     ▼     ▼
              ┌──────┐ ┌─────┐ ┌─────┐
              │Whisper│ │Claude│ │Slack│
              │  API  │ │ API │ │ API │
              └──────┘ └─────┘ └─────┘
```

### 6.2 非同期処理 (Inngest)

```typescript
// inngest/functions/process-recording.ts
import { inngest } from '@/lib/inngest';

export const processRecording = inngest.createFunction(
    { id: 'process-recording', retries: 3 },
    { event: 'recording/completed' },
    async ({ event, step }) => {
        const { recordingId } = event.data;

        // Step 1: 音声ダウンロード & S3保存
        const audioKey = await step.run('download-audio', async () => {
            return await downloadAndStoreAudio(recordingId);
        });

        // Step 2: 文字起こし
        const transcription = await step.run('transcribe', async () => {
            return await transcribeAudio(audioKey);
        });

        // Step 3: AI要約
        const summary = await step.run('summarize', async () => {
            return await generateSummary(transcription);
        });

        // Step 4: 通知 & 外部連携
        await step.run('notify-and-share', async () => {
            return await notifyAndShare(recordingId, summary);
        });
    }
);
```

---

## 7. プロジェクト構成（ディレクトリ構造）

```
ai-powered-call/
├── docs/
│   └── design.md                         # 本設計書
│
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── layout.tsx                    # ルートレイアウト
│   │   ├── page.tsx                      # ランディングページ
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── dashboard/
│   │   │   ├── layout.tsx                # ダッシュボードレイアウト
│   │   │   ├── page.tsx                  # ダッシュボードホーム
│   │   │   ├── record/
│   │   │   │   └── page.tsx              # 録音操作パネル
│   │   │   ├── recordings/
│   │   │   │   ├── page.tsx              # 録音一覧
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx          # 録音詳細
│   │   │   ├── integrations/
│   │   │   │   └── page.tsx              # 外部連携設定
│   │   │   └── settings/
│   │   │       └── page.tsx              # ユーザー設定
│   │   └── api/
│   │       ├── auth/
│   │       │   └── [...nextauth]/
│   │       │       └── route.ts
│   │       ├── recordings/
│   │       │   ├── route.ts              # GET一覧 / POST開始
│   │       │   ├── [id]/
│   │       │   │   ├── route.ts          # GET詳細 / DELETE
│   │       │   │   ├── audio/
│   │       │   │   │   └── route.ts      # 音声URL取得
│   │       │   │   ├── summary/
│   │       │   │   │   └── route.ts      # 要約取得
│   │       │   │   └── share/
│   │       │   │       └── route.ts      # 外部送信
│   │       │   └── start/
│   │       │       └── route.ts          # 録音セッション開始
│   │       ├── integrations/
│   │       │   ├── route.ts
│   │       │   ├── slack/
│   │       │   │   └── route.ts
│   │       │   └── outlook/
│   │       │       └── route.ts
│   │       ├── webhooks/
│   │       │   ├── twilio/
│   │       │   │   ├── voice/
│   │       │   │   │   └── route.ts      # サイレント応答TwiML
│   │       │   │   └── recording-status/
│   │       │   │       └── route.ts
│   │       │   └── stripe/
│   │       │       └── route.ts
│   │       ├── billing/
│   │       │   └── route.ts
│   │       └── settings/
│   │           └── route.ts
│   │
│   ├── components/
│   │   ├── ui/                           # shadcn/ui コンポーネント
│   │   ├── recording/
│   │   │   ├── RecordButton.tsx          # 録音開始ボタン
│   │   │   ├── RecordingStatus.tsx       # 録音中ステータス
│   │   │   └── RecordingCard.tsx         # 録音一覧カード
│   │   ├── summary/
│   │   │   ├── SummaryView.tsx           # 要約表示
│   │   │   ├── ActionItems.tsx           # アクションアイテム
│   │   │   └── TranscriptionView.tsx     # 文字起こし表示
│   │   ├── integration/
│   │   │   ├── SlackConnect.tsx
│   │   │   └── OutlookConnect.tsx
│   │   └── layout/
│   │       ├── Navbar.tsx
│   │       ├── Sidebar.tsx
│   │       └── MobileNav.tsx
│   │
│   ├── lib/
│   │   ├── auth.ts                       # NextAuth設定
│   │   ├── prisma.ts                     # Prismaクライアント
│   │   ├── twilio.ts                     # Twilioクライアント
│   │   ├── s3.ts                         # S3クライアント
│   │   ├── inngest.ts                    # Inngestクライアント
│   │   ├── ai/
│   │   │   ├── whisper.ts               # Whisper API
│   │   │   └── claude.ts                # Claude API
│   │   ├── integrations/
│   │   │   ├── slack.ts                 # Slack API
│   │   │   └── outlook.ts              # Microsoft Graph API
│   │   └── encryption.ts                # トークン暗号化
│   │
│   ├── inngest/
│   │   ├── client.ts                    # Inngestクライアント初期化
│   │   └── functions/
│   │       └── process-recording.ts     # 録音処理パイプライン
│   │
│   └── types/
│       └── index.ts                     # 型定義
│
├── prisma/
│   ├── schema.prisma                    # DBスキーマ
│   └── migrations/                      # マイグレーション
│
├── public/
│   ├── manifest.json                    # PWA設定
│   ├── sw.js                           # Service Worker
│   └── icons/                          # PWAアイコン
│
├── .env.example                         # 環境変数テンプレート
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 8. 開発フェーズ

### Phase 1: MVP - 録音 + AI要約

**目標:** ブラウザから通話録音を開始し、AI要約を生成・閲覧できる状態

| タスク | 詳細 |
|--------|------|
| Next.js基盤 | プロジェクトセットアップ、NextAuth認証、Prisma + Supabase |
| 録音操作UI | 録音開始ボタン、録音番号表示、録音中ステータス |
| Twilio連携 | サイレント応答TwiML、録音番号の動的割当、Webhook処理 |
| AI処理 | Inngestによる非同期パイプライン (Whisper → Claude) |
| ダッシュボード | 録音一覧、録音詳細（要約・文字起こし・音声再生） |
| PWA対応 | manifest.json、Service Worker、ホーム画面追加 |

### Phase 2: 外部連携 + UX改善

**目標:** Slack・Outlook連携、ワンタップ録音の実装

| タスク | 詳細 |
|--------|------|
| Slack連携 | OAuth認証、Block Kitメッセージ送信、自動送信 |
| Outlook連携 | Microsoft Graph API連携、HTML メール送信 |
| Web Push通知 | 要約完了時のPush通知 |
| tel:リンク最適化 | ワンタップで録音番号に発信 |
| リアルタイム更新 | WebSocket/Supabase Realtimeで録音状態をライブ表示 |

### Phase 3: 収益化・機能拡張

**目標:** 課金システムとチーム機能

| タスク | 詳細 |
|--------|------|
| Stripe決済 | サブスクリプション (Free/Pro/Business) |
| 検索機能 | 過去の通話を全文検索 |
| カスタム要約 | 要約テンプレートのカスタマイズ |
| チーム機能 | チーム内での要約共有 |
| 追加連携 | Microsoft Teams、Google Chat等 |

---

## 9. 料金プラン（案）

| プラン | 月額 | 内容 |
|--------|------|------|
| **Free** | ¥0 | 月5回まで録音、AI要約あり、外部連携なし |
| **Pro** | ¥980 | 無制限録音、全外部連携、90日保存 |
| **Business** | ¥2,980 | Pro全機能 + チーム共有、1年保存、優先サポート |

決済: Stripe Billing (クレジットカード / Apple Pay / Google Pay)

---

## 10. 競合分析

| サービス | 録音方式 | 相手への通知 | AI要約 | 外部連携 | 月額 |
|---------|---------|------------|--------|---------|------|
| **TapeACall** | 3者通話マージ | なし | △ 有料 | × | $10.99 |
| **Rev Call Recorder** | 3者通話マージ | なし | ○ 文字起こし | × | $8/月 |
| **Apple純正 (iOS 18.1+)** | ネイティブ | **あり（強制）** | ○ | × | 無料 |
| **Otter.ai** | VoIPベース | なし | ○ | △ | $16.99 |
| **AI Powered Call** | **3者通話マージ** | **なし** | **○ Claude** | **○ Slack/Outlook** | ¥980 |

**差別化:**
- 競合の多くはネイティブアプリ → 本サービスは**Webアプリで審査不要、即利用可能**
- Apple純正は相手にも録音通知が流れる → 本サービスは**完全サイレント**
- 競合の多くは外部連携が弱い → **Slack/Outlook自動送信**が核心的価値
- 日本語に最適化された**Claude APIによる高品質な要約**

---

## 11. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| Twilioの通話料金 | 中 | 従量課金を料金プランに反映、無料プランの上限設定 |
| 3者通話のキャリア制限 | 中 | 主要キャリア（docomo/au/SoftBank）で動作確認、非対応キャリアの案内 |
| 音声品質の劣化 | 低 | Twilio録音は高品質PCMを使用、影響は最小限 |
| 法的リスク | 中 | 利用規約で録音のユーザー責任を明記、地域別法的要件の表示 |
| データ漏洩 | 高 | 暗号化、最小権限原則、定期セキュリティ監査 |
| AIの要約精度 | 中 | 最新モデル採用、フィードバック機能、要約再生成機能 |
| Twilio番号プール枯渇 | 低 | 番号プール管理、使い回しロジック実装 |
