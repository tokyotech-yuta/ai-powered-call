import twilio from "twilio";

function getCredentials() {
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID || "",
    authToken: process.env.TWILIO_AUTH_TOKEN || "",
  };
}

function getTwilioClient() {
  const { accountSid, authToken } = getCredentials();
  return twilio(accountSid, authToken);
}

// 電話番号プールから利用可能な番号を取得
let currentIndex = 0;

export function getAvailableNumber(): string {
  const phoneNumberPool = (process.env.TWILIO_PHONE_NUMBER_POOL || "")
    .split(",")
    .filter(Boolean);
  if (phoneNumberPool.length === 0) {
    throw new Error("No phone numbers configured in TWILIO_PHONE_NUMBER_POOL");
  }
  const number = phoneNumberPool[currentIndex % phoneNumberPool.length];
  currentIndex++;
  return number;
}

// サイレント応答用のTwiMLを生成（ビープ音・ガイダンスなし）
export function generateSilentRecordingTwiML(callbackUrl: string): string {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();

  // 無音で即座に録音開始
  response.pause({ length: 0 });
  response.record({
    maxLength: 7200, // 最大2時間
    recordingStatusCallback: callbackUrl,
    recordingStatusCallbackEvent: ["completed"],
    trim: "trim-silence",
  });

  return response.toString();
}

// Twilioの録音URLから音声をダウンロード
export async function downloadRecording(
  recordingSid: string
): Promise<Buffer> {
  const { accountSid, authToken } = getCredentials();
  const client = getTwilioClient();

  const recording = await client.recordings(recordingSid).fetch();

  const mediaUrl = `https://api.twilio.com${recording.uri.replace(".json", ".wav")}`;

  const response = await fetch(mediaUrl, {
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
    },
  });

  return Buffer.from(await response.arrayBuffer());
}

// Twilioのwebhook署名を検証
export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  const { authToken } = getCredentials();
  return twilio.validateRequest(authToken, signature, url, params);
}
