import Anthropic from "@anthropic-ai/sdk";

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export interface SummaryResult {
  summary: string;
  keyPoints: string[];
  actionItems: { task: string; assignee?: string; deadline?: string }[];
  sentiment: string;
  topics: string[];
}

const SUMMARY_PROMPT = `あなたは通話内容を分析するAIアシスタントです。
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
- JSON以外のテキストは出力しないでください`;

export async function generateSummary(
  transcriptionText: string
): Promise<SummaryResult> {
  const response = await getAnthropic().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `${SUMMARY_PROMPT}\n\n## 通話の文字起こし\n${transcriptionText}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const parsed = JSON.parse(text);

  return {
    summary: parsed.summary,
    keyPoints: parsed.key_points || [],
    actionItems: (parsed.action_items || []).map(
      (item: { task: string; assignee?: string; deadline?: string }) => ({
        task: item.task,
        assignee: item.assignee,
        deadline: item.deadline,
      })
    ),
    sentiment: parsed.sentiment || "neutral",
    topics: parsed.topics || [],
  };
}
