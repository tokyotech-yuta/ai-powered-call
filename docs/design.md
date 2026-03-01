# AI Powered Call - 設計書

## 1. プロジェクト概要

### 1.1 プロダクト名
**AI Powered Call**

### 1.2 コンセプト
iPhoneでの通話内容を録音し、AIによる自動要約を生成、Slack・Outlookなどの外部サービスへ送信するiOSアプリケーション。

### 1.3 主要機能
| # | 機能 | 説明 |
|---|------|------|
| 1 | 通話録音 | 電話の通話内容をサーバーサイドで録音 |
| 2 | AI要約 | 録音された音声をAIで文字起こし・要約 |
| 3 | 外部連携 | 要約結果をSlack・Outlook等に送信 |
| 4 | 履歴管理 | 過去の通話録音・要約の閲覧・管理 |

---

## 2. 技術的制約と設計方針

### 2.1 iOSの通話録音に関する制約

**重要: Appleは通話音声ストリームへの直接アクセスAPIを公開していません。**

- `CallKit` は VoIP通話の管理（着信UI表示、通話ブロック等）用であり、音声録音機能は提供しない
- `AVAudioSession` はアプリ内の音声処理用であり、電話回線の音声キャプチャはできない
- iOSのサンドボックス制約により、他アプリ（電話アプリ）の音声にはアクセス不可
- **iOS 18.1以降 (2024年10月〜)**: Appleがネイティブの通話録音・文字起こし機能を電話アプリに搭載。ただしこれはシステムレベルの機能であり、サードパーティ向けのAPIは一切公開されていない。録音はメモアプリに保存され、Apple Intelligenceによるオンデバイス文字起こしが提供される。通話開始時に双方に「この通話は録音されます」と音声通知される

### 2.2 実現方式: 3者通話マージ方式

App Storeで公開されている通話録音アプリ（TapeACall等）が採用している方式を採用する。

```
┌─────────┐     ┌──────────────┐     ┌─────────────┐
│  ユーザー  │────│  電話回線(通話中) │────│   通話相手    │
│ (iPhone)  │    └──────────────┘     └─────────────┘
│           │
│           │     ┌──────────────┐     ┌─────────────┐
│           │────│  電話回線(発信)  │────│  録音サーバー   │
│           │    └──────────────┘     └─────────────┘
│           │
│           │── 3者通話にマージ ──→ 全員の音声が録音サーバーに到達
└─────────┘
```

**録音フロー:**
1. ユーザーが通常の電話をかける（または受ける）
2. アプリから録音サーバーの電話番号に発信する
3. 2つの通話を「3者通話（Conference Call）」にマージする
4. 録音サーバーが全参加者の音声をキャプチャ・録音する
5. 通話終了後、録音ファイルがサーバーに保存される

### 2.3 代替方式の検討

| 方式 | 実現可能性 | App Store審査 | UX | 採用 |
|------|-----------|--------------|-----|------|
| 3者通話マージ | ○ | ○ 実績あり (TapeACall等) | △ マージ操作が必要 | **Phase 1で採用** |
| VoIP通話 (Twilio等) | ○ | ○ 実績あり (RingCentral等) | ○ シームレス | **Phase 2で採用** |
| ハイブリッド（通常通話 + 録音時VoIP） | ○ | ○ | ○ | **将来検討** |
| マイクでスピーカー音を録音 | △ 品質低い | △ | × | 不採用 |
| Jailbreak / Private API | × | × | - | 不採用 |

**採用方針:** Phase 1ではTapeACall等で実績のある3者通話マージ方式で迅速にMVPを構築し、Phase 2以降でVoIPベースの方式を追加してUXを改善する。

---

## 3. システムアーキテクチャ

### 3.1 全体構成図

```
┌──────────────────────────────────────────────────────────┐
│                    クライアント (iOS App)                    │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │
│  │  通話管理   │  │  録音制御   │  │  要約表示   │  │ 外部連携  │  │
│  │  (CallKit) │  │          │  │          │  │ 設定    │  │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘  │
└──────────────────────┬───────────────────────────────────┘
                       │ HTTPS / WebSocket
                       ▼
┌──────────────────────────────────────────────────────────┐
│                    バックエンドサーバー                       │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │
│  │  API      │  │ 録音      │  │  AI処理   │  │ 外部連携  │  │
│  │  Gateway  │  │ サーバー   │  │ パイプライン│  │ サービス  │  │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘  │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │  認証      │  │ ストレージ │  │  DB      │               │
│  │  サービス   │  │ (S3)     │  │(PostgreSQL)│              │
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
| **iOS App** | Swift / SwiftUI | Apple公式、最新UI対応 |
| **通話管理** | CallKit | VoIP通話の検出・管理 |
| **バックエンドAPI** | Node.js (TypeScript) | 非同期処理に強い、エコシステムが豊富 |
| **テレフォニー** | Twilio | 録音サーバーの電話番号提供・通話録音 |
| **音声文字起こし** | OpenAI Whisper API | 高精度の日本語音声認識 |
| **AI要約** | Claude API (Anthropic) | 高品質な日本語要約生成 |
| **データベース** | PostgreSQL | リレーショナルデータ管理 |
| **ファイルストレージ** | AWS S3 | 音声ファイルの安全な保管 |
| **認証** | Firebase Auth | Apple Sign In / Google対応 |
| **インフラ** | AWS (ECS / Lambda) | スケーラブル、コスト効率 |

---

## 4. 詳細設計

### 4.1 iOSアプリ設計

#### 4.1.1 画面構成

```
TabBar
├── 📞 通話 (HomeView)
│   ├── ダイヤルパッド
│   ├── 録音ボタン（通話中に表示）
│   └── 連絡先一覧
│
├── 📋 履歴 (HistoryView)
│   ├── 通話録音一覧
│   │   ├── 日時・相手先
│   │   ├── 要約プレビュー
│   │   └── ステータス（録音中/文字起こし中/完了）
│   └── 通話詳細
│       ├── 音声再生プレーヤー
│       ├── 文字起こし全文
│       ├── AI要約
│       └── 外部送信ボタン
│
├── 🔗 連携 (IntegrationView)
│   ├── Slack連携設定
│   ├── Outlook連携設定
│   └── その他サービス設定
│
└── ⚙️ 設定 (SettingsView)
    ├── アカウント管理
    ├── 録音品質設定
    ├── 自動要約ON/OFF
    ├── 自動送信設定
    ├── プライバシー設定
    └── サブスクリプション管理
```

#### 4.1.2 主要クラス構成

```swift
// MARK: - App Core
AICallApp                    // @main エントリーポイント
AppCoordinator              // 画面遷移管理

// MARK: - 通話管理
CallManager                 // 通話の発信・受信・マージ管理
CallRecordingService        // 録音サーバーへの発信・マージ制御
TwilioCallHandler           // Twilio録音サーバーとの通信

// MARK: - データ管理
CallRecordRepository        // 通話録音データのCRUD
TranscriptionRepository     // 文字起こしデータのCRUD
SummaryRepository           // 要約データのCRUD

// MARK: - ネットワーク
APIClient                   // バックエンドAPIとの通信
AuthService                 // 認証トークン管理

// MARK: - 外部連携
SlackIntegrationService     // Slack API連携
OutlookIntegrationService   // Microsoft Graph API連携
IntegrationManager          // 外部連携の統合管理

// MARK: - ViewModels
HomeViewModel               // 通話画面のVM
HistoryViewModel            // 履歴画面のVM
CallDetailViewModel         // 通話詳細画面のVM
IntegrationViewModel        // 連携設定画面のVM
SettingsViewModel           // 設定画面のVM
```

#### 4.1.3 通話録音フロー（シーケンス図）

```
ユーザー          iOSアプリ         電話回線        録音サーバー(Twilio)    バックエンド
  │                │                │                │                  │
  │── 電話をかける ──→│                │                │                  │
  │                │── 発信 ────────→│                │                  │
  │                │                │── 接続 ────────→│(通話相手)          │
  │                │                │                │                  │
  │── 録音開始タップ →│                │                │                  │
  │                │── 録音セッション作成 ─────────────────────────────────→│
  │                │                │                │                  │
  │                │←── 録音サーバー番号を返却 ────────────────────────────│
  │                │                │                │                  │
  │                │── 録音サーバーに発信→│               │                  │
  │                │                │── 接続 ────────→│                  │
  │                │                │                │── Webhook通知 ──→│
  │                │                │                │                  │
  │                │── 3者通話マージ ─→│                │                  │
  │                │                │═══ 全音声が録音サーバーに流れる ═══│  │
  │                │                │                │── 録音開始 ──────→│
  │                │                │                │                  │
  │── 通話終了 ────→│                │                │                  │
  │                │── 通話切断 ────→│                │                  │
  │                │                │                │── 録音完了 ──────→│
  │                │                │                │                  │
  │                │                │                │     │── 音声ファイル保存 (S3)
  │                │                │                │     │── 文字起こし (Whisper)
  │                │                │                │     │── AI要約 (Claude)
  │                │                │                │     │── 外部連携送信
  │                │                │                │                  │
  │                │←── 要約完了通知 (Push) ──────────────────────────────│
  │                │                │                │                  │
```

### 4.2 バックエンドAPI設計

#### 4.2.1 API エンドポイント一覧

```
Base URL: https://api.aipoweredcall.com/v1

# 認証
POST   /auth/signup                    # ユーザー登録
POST   /auth/login                     # ログイン
POST   /auth/refresh                   # トークンリフレッシュ
DELETE /auth/account                   # アカウント削除

# 録音セッション
POST   /recordings/sessions            # 録音セッション作成（録音サーバー番号取得）
GET    /recordings                     # 録音一覧取得
GET    /recordings/:id                 # 録音詳細取得
DELETE /recordings/:id                 # 録音削除
GET    /recordings/:id/audio           # 音声ファイルダウンロード

# 文字起こし・要約
GET    /recordings/:id/transcription   # 文字起こし取得
POST   /recordings/:id/summarize       # 要約再生成
GET    /recordings/:id/summary         # 要約取得

# 外部連携
GET    /integrations                   # 連携一覧取得
POST   /integrations/slack             # Slack連携設定
POST   /integrations/outlook           # Outlook連携設定
DELETE /integrations/:id               # 連携解除
POST   /recordings/:id/share           # 要約を外部サービスに送信

# Twilio Webhook（内部）
POST   /webhooks/twilio/voice          # 通話開始Webhook
POST   /webhooks/twilio/status         # 通話ステータスWebhook
POST   /webhooks/twilio/recording      # 録音完了Webhook

# ユーザー設定
GET    /settings                       # 設定取得
PUT    /settings                       # 設定更新

# サブスクリプション
GET    /subscriptions/status           # サブスク状態確認
POST   /subscriptions/verify-receipt   # レシート検証
```

#### 4.2.2 主要データモデル

```sql
-- ユーザー
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid    VARCHAR(128) UNIQUE NOT NULL,
    email           VARCHAR(255) NOT NULL,
    display_name    VARCHAR(100),
    plan            VARCHAR(20) DEFAULT 'free',  -- free / pro / business
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- 通話録音
CREATE TABLE call_recordings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    twilio_call_sid VARCHAR(64),
    caller_number   VARCHAR(20),
    callee_number   VARCHAR(20),
    direction       VARCHAR(10),        -- inbound / outbound
    duration_sec    INTEGER,
    audio_url       VARCHAR(512),       -- S3 URL
    status          VARCHAR(20),        -- recording / processing / completed / failed
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- 文字起こし
CREATE TABLE transcriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_id    UUID REFERENCES call_recordings(id) ON DELETE CASCADE,
    full_text       TEXT,
    language        VARCHAR(10) DEFAULT 'ja',
    segments        JSONB,              -- タイムスタンプ付きセグメント
    status          VARCHAR(20),        -- processing / completed / failed
    created_at      TIMESTAMP DEFAULT NOW()
);

-- AI要約
CREATE TABLE summaries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_id    UUID REFERENCES call_recordings(id) ON DELETE CASCADE,
    summary_text    TEXT,
    key_points      JSONB,              -- 重要ポイントのリスト
    action_items    JSONB,              -- アクションアイテムのリスト
    sentiment       VARCHAR(20),        -- positive / neutral / negative
    ai_model        VARCHAR(50),        -- 使用したAIモデル
    created_at      TIMESTAMP DEFAULT NOW()
);

-- 外部連携設定
CREATE TABLE integrations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    service_type    VARCHAR(20),        -- slack / outlook / teams
    access_token    VARCHAR(512),       -- 暗号化して保存
    refresh_token   VARCHAR(512),       -- 暗号化して保存
    channel_id      VARCHAR(100),       -- 送信先チャンネル/メールアドレス
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- 共有履歴
CREATE TABLE share_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_id    UUID REFERENCES call_recordings(id) ON DELETE CASCADE,
    integration_id  UUID REFERENCES integrations(id) ON DELETE CASCADE,
    status          VARCHAR(20),        -- sent / failed
    sent_at         TIMESTAMP DEFAULT NOW()
);
```

### 4.3 AI処理パイプライン

```
┌────────────┐    ┌──────────────┐    ┌────────────────┐    ┌────────────┐
│ 音声ファイル  │───→│  Whisper API  │───→│  Claude API     │───→│  結果保存    │
│ (S3から取得)  │    │  (文字起こし)   │    │  (要約生成)      │    │ (DB + 通知) │
└────────────┘    └──────────────┘    └────────────────┘    └────────────┘
```

#### 4.3.1 AI要約プロンプト設計

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

## 通話の文字起こし
{transcription_text}
```

### 4.4 外部連携設計

#### 4.4.1 Slack連携

```
認証方式: OAuth 2.0 (Slack App)
送信内容: 要約テキスト + アクションアイテム
送信先:   ユーザーが指定したチャンネルまたはDM

メッセージフォーマット (Block Kit):
┌──────────────────────────────────────┐
│ 📞 通話要約 - 2026/03/01 14:30      │
│──────────────────────────────────────│
│ 相手: 田中太郎 (090-XXXX-XXXX)      │
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
│ [🔊 音声を再生]  [📄 全文を表示]       │
└──────────────────────────────────────┘
```

#### 4.4.2 Outlook連携

```
認証方式: OAuth 2.0 (Microsoft Graph API)
送信内容: HTML形式のメール or カレンダーイベントのメモ
送信先:   ユーザーが指定したメールアドレス
```

---

## 5. セキュリティ設計

### 5.1 データ保護

| 項目 | 対策 |
|------|------|
| 通信 | 全API通信はTLS 1.3で暗号化 |
| 音声ファイル | AES-256で暗号化してS3に保存、サーバーサイド暗号化(SSE-S3) |
| トークン | 外部連携のアクセストークンはAES-256で暗号化してDB保存 |
| 認証 | Firebase Auth + JWT、リフレッシュトークンによる自動更新 |
| アクセス制御 | ユーザーは自分のデータのみアクセス可能（Row Level Security） |

### 5.2 プライバシー対応

| 項目 | 対策 |
|------|------|
| 録音同意 | 通話開始時に録音している旨の音声ガイダンスを流す（法的要件）|
| データ削除 | ユーザーがいつでもデータ削除可能（GDPR/個人情報保護法対応） |
| 保存期間 | デフォルト90日で自動削除（設定変更可能） |
| 個人情報マスキング | 要約生成時に電話番号等の個人情報を自動マスク |

### 5.3 App Store審査対応

App Storeの審査ガイドラインに準拠するために以下の対応が必要。

| ガイドライン | 要件 | 対応 |
|-------------|------|------|
| **2.5.14** (録音に関する要件) | 録音時の明示的なユーザー同意と、視覚的/聴覚的な録音インジケーターの表示 | 録音開始時の同意ダイアログ、録音中の常時表示インジケーター |
| **5.1.1** (プライバシー) | プライバシーポリシーの提供、必要最小限のデータ収集 | アプリ内・App Store Connectでのプライバシーポリシー掲載 |
| **5.1.2(i)** (2025年11月更新) | サードパーティAIとのデータ共有の明示的開示と同意取得 | AI文字起こし・要約のデータ送信先を明示し、オプトイン同意を取得 |

### 5.4 法的考慮事項

> **重要:** 通話録音は各国・地域の法律に従う必要がある

| 地域 | 法律 | 要件 |
|------|------|------|
| **日本** | 個人情報保護法 | 通話当事者の一方が同意していれば録音可能（一方当事者同意） |
| **米国** | 州法により異なる | 一部の州（カリフォルニア等）では双方の同意が必要（Two-party consent） |
| **EU** | GDPR + EU AI Act (2026年8月施行) | 明示的同意が必要。AI Act Article 50により、AI音声処理システムの透明性義務あり |

**対応方針:**
- アプリ利用規約で録音機能の説明と同意を取得
- オプションで通話開始時に相手に録音通知を行う音声ガイダンス機能を提供
- 地域設定により適切な法的要件に対応
- EU AI Act準拠: AI処理（文字起こし・要約）の利用を明示的に通知

---

## 6. インフラ構成

### 6.1 AWS構成図

```
┌─────────────────────────────────────────────────────────┐
│  AWS Cloud                                              │
│                                                         │
│  ┌──────────────┐     ┌────────────────┐                │
│  │  CloudFront   │────→│  ALB            │               │
│  │  (CDN)        │     │                │                │
│  └──────────────┘     └───────┬────────┘                │
│                               │                          │
│                     ┌─────────▼──────────┐               │
│                     │  ECS Fargate        │               │
│                     │  (API Server)       │               │
│                     │  - Node.js          │               │
│                     └─────────┬──────────┘               │
│                               │                          │
│          ┌────────────────────┼─────────────────┐        │
│          │                    │                  │        │
│  ┌───────▼──────┐  ┌─────────▼────────┐  ┌─────▼─────┐  │
│  │  RDS          │  │  S3               │  │  SQS      │  │
│  │  (PostgreSQL) │  │  (音声ファイル)     │  │  (非同期)  │  │
│  └──────────────┘  └──────────────────┘  └─────┬─────┘  │
│                                                 │        │
│                                          ┌──────▼──────┐ │
│                                          │  Lambda      │ │
│                                          │ (AI処理)     │ │
│                                          └─────────────┘ │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐                      │
│  │  ElastiCache  │  │  Secrets     │                      │
│  │  (Redis)      │  │  Manager     │                      │
│  └──────────────┘  └──────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

### 6.2 非同期処理フロー

```
通話終了
  │
  ▼
SQS: recording-completed キュー
  │
  ▼
Lambda: download-audio
  │── Twilioから音声ファイルダウンロード
  │── S3に保存
  │── 次キューにメッセージ送信
  ▼
SQS: audio-saved キュー
  │
  ▼
Lambda: transcribe-audio
  │── S3から音声取得
  │── Whisper APIで文字起こし
  │── 結果をDBに保存
  │── 次キューにメッセージ送信
  ▼
SQS: transcription-completed キュー
  │
  ▼
Lambda: generate-summary
  │── 文字起こしテキスト取得
  │── Claude APIで要約生成
  │── 結果をDBに保存
  │── Push通知をユーザーに送信
  │── 自動連携が設定されている場合、外部送信
  ▼
完了
```

---

## 7. プロジェクト構成（ディレクトリ構造）

```
ai-powered-call/
├── docs/
│   └── design.md                    # 本設計書
│
├── ios/                             # iOSアプリ
│   └── AIPoweredCall/
│       ├── App/
│       │   ├── AIPoweredCallApp.swift
│       │   └── AppCoordinator.swift
│       ├── Models/
│       │   ├── CallRecording.swift
│       │   ├── Transcription.swift
│       │   ├── Summary.swift
│       │   └── Integration.swift
│       ├── Views/
│       │   ├── Home/
│       │   │   ├── HomeView.swift
│       │   │   └── DialPadView.swift
│       │   ├── History/
│       │   │   ├── HistoryView.swift
│       │   │   └── CallDetailView.swift
│       │   ├── Integration/
│       │   │   └── IntegrationView.swift
│       │   └── Settings/
│       │       └── SettingsView.swift
│       ├── ViewModels/
│       │   ├── HomeViewModel.swift
│       │   ├── HistoryViewModel.swift
│       │   ├── CallDetailViewModel.swift
│       │   ├── IntegrationViewModel.swift
│       │   └── SettingsViewModel.swift
│       ├── Services/
│       │   ├── CallManager.swift
│       │   ├── CallRecordingService.swift
│       │   ├── APIClient.swift
│       │   ├── AuthService.swift
│       │   ├── SlackIntegrationService.swift
│       │   └── OutlookIntegrationService.swift
│       ├── Utilities/
│       │   ├── Constants.swift
│       │   └── Extensions/
│       └── Resources/
│           └── Assets.xcassets
│
├── backend/                          # バックエンドサーバー
│   ├── src/
│   │   ├── index.ts                 # エントリーポイント
│   │   ├── config/
│   │   │   └── index.ts             # 環境設定
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── recordings.ts
│   │   │   ├── integrations.ts
│   │   │   ├── webhooks.ts
│   │   │   └── settings.ts
│   │   ├── services/
│   │   │   ├── twilio.service.ts    # Twilio連携
│   │   │   ├── whisper.service.ts   # 音声文字起こし
│   │   │   ├── ai-summary.service.ts # AI要約
│   │   │   ├── slack.service.ts     # Slack連携
│   │   │   ├── outlook.service.ts   # Outlook連携
│   │   │   └── storage.service.ts   # S3ストレージ
│   │   ├── models/
│   │   │   ├── user.model.ts
│   │   │   ├── recording.model.ts
│   │   │   ├── transcription.model.ts
│   │   │   ├── summary.model.ts
│   │   │   └── integration.model.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   └── error.middleware.ts
│   │   └── utils/
│   │       └── encryption.ts
│   ├── lambdas/
│   │   ├── download-audio/
│   │   ├── transcribe-audio/
│   │   └── generate-summary/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── infra/                            # インフラ (IaC)
│   ├── terraform/
│   │   ├── main.tf
│   │   ├── ecs.tf
│   │   ├── rds.tf
│   │   ├── s3.tf
│   │   ├── sqs.tf
│   │   ├── lambda.tf
│   │   └── variables.tf
│   └── docker-compose.yml           # ローカル開発用
│
└── README.md
```

---

## 8. 開発フェーズ

### Phase 1: MVP（最小実行可能製品）- 基盤構築

**目標:** 基本的な通話録音とAI要約ができる状態

| タスク | 詳細 |
|--------|------|
| iOSアプリ基盤 | SwiftUI基本画面、Firebase Auth認証 |
| バックエンドAPI | 基本的なCRUD API、認証ミドルウェア |
| Twilio連携 | 録音サーバーの構築、3者通話マージの実装 |
| AI処理 | Whisper文字起こし + Claude要約の基本パイプライン |
| DB/インフラ | PostgreSQL、S3、基本的なAWS構成 |

### Phase 2: 外部連携

**目標:** Slack・Outlook連携が動作する状態

| タスク | 詳細 |
|--------|------|
| Slack連携 | OAuth認証、Block Kitメッセージ送信 |
| Outlook連携 | Microsoft Graph API連携、メール送信 |
| Push通知 | 要約完了時のPush通知 |
| 自動送信 | 通話完了後の自動連携送信 |

### Phase 3: UX改善・機能拡張

**目標:** 製品品質の向上

| タスク | 詳細 |
|--------|------|
| UI/UXブラッシュアップ | デザイン改善、アニメーション |
| 検索機能 | 過去の通話を全文検索 |
| カスタム要約 | 要約テンプレートのカスタマイズ |
| 分析ダッシュボード | 通話頻度・時間の統計 |

### Phase 4: 収益化・スケール

**目標:** ビジネスとしての確立

| タスク | 詳細 |
|--------|------|
| サブスクリプション | App Store IAP実装 |
| チーム機能 | チーム内での要約共有 |
| 追加連携 | Teams、Google Chat等 |
| 多言語対応 | 英語・中国語等 |

---

## 9. 料金プラン（案）

| プラン | 月額 | 内容 |
|--------|------|------|
| **Free** | ¥0 | 月5回まで録音、要約機能あり、外部連携なし |
| **Pro** | ¥980 | 無制限録音、全外部連携、90日保存 |
| **Business** | ¥2,980 | Pro全機能 + チーム共有、1年保存、優先サポート |

---

## 10. 競合分析

| アプリ | 録音方式 | AI要約 | 外部連携 | 月額 | 差別化ポイント |
|--------|---------|--------|---------|------|--------------|
| **TapeACall** | 3者通話マージ | △ 有料オプション | × なし | $10.99 | 最大手、安定動作 |
| **Allo** | VoIPベース | ○ AI文字起こし・要約 | △ 限定的 | 要問合せ | ビジネス電話システム |
| **Quo** | VoIPベース | ○ 自動文字起こし・要約 | △ チーム共有 | 要問合せ | チーム向け |
| **RingCentral** | VoIPベース | ○ | ○ 豊富 | $20+ | エンタープライズ向け |
| **Apple純正 (iOS 18.1+)** | ネイティブ | ○ Apple Intelligence | × なし | 無料 | 標準搭載 |
| **AI Powered Call (本アプリ)** | 3者通話+VoIP | ○ Claude API | ○ Slack/Outlook | ¥980 | **AI要約+外部連携の統合** |

**差別化戦略:**
- Apple純正は録音・文字起こしのみで要約や外部連携がない → **AI要約 + 外部サービス連携**が本アプリの核心的価値
- 競合の多くは外部連携が弱い → **Slack/Outlook等への自動送信**で業務効率化に特化
- 日本語に最適化されたAI要約（Claude API）による高品質な出力

---

## 11. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| Appleの審査でリジェクト | 高 | 3者通話方式で実績のあるアプリを参考にし、ガイドラインを遵守 |
| Twilioの通話料金 | 中 | 従量課金を考慮した料金設定、無料プランの上限設定 |
| 音声品質の劣化 | 中 | 高品質コーデック採用、録音品質の定期モニタリング |
| 法的リスク（録音の合法性） | 高 | 地域別の法的要件に対応、利用規約での免責、録音通知機能の提供 |
| データ漏洩 | 高 | E2E暗号化、SOC2準拠のインフラ、定期的なセキュリティ監査 |
| AIの要約精度 | 中 | 最新モデルの採用、フィードバック機能による継続改善 |
