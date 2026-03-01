import OpenAI from "openai";
import { toFile } from "openai";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export interface TranscriptionResult {
  fullText: string;
  language: string;
  segments: { start: number; end: number; text: string }[];
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  language: string = "ja"
): Promise<TranscriptionResult> {
  const file = await toFile(audioBuffer, "recording.wav", {
    type: "audio/wav",
  });

  const response = await getOpenAI().audio.transcriptions.create({
    file,
    model: "whisper-1",
    language,
    response_format: "verbose_json",
    timestamp_granularities: ["segment"],
  });

  return {
    fullText: response.text,
    language: response.language || language,
    segments: (response.segments || []).map((seg) => ({
      start: seg.start,
      end: seg.end,
      text: seg.text,
    })),
  };
}
