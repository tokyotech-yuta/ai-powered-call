import { inngest } from "@/lib/inngest";
import { prisma } from "@/lib/prisma";
import { downloadRecording } from "@/lib/twilio";
import { uploadAudio, getAudioBuffer } from "@/lib/s3";
import { transcribeAudio } from "@/lib/ai/whisper";
import { generateSummary } from "@/lib/ai/claude";

export const processRecording = inngest.createFunction(
  { id: "process-recording", retries: 3 },
  { event: "recording/completed" },
  async ({ event, step }) => {
    const { recordingId, recordingSid } = event.data as {
      recordingId: string;
      recordingSid: string;
    };

    // Step 1: 音声ダウンロード & S3保存
    const audioKey = await step.run("download-audio", async () => {
      await prisma.callRecording.update({
        where: { id: recordingId },
        data: { status: "UPLOADING" },
      });

      const audioBuffer = await downloadRecording(recordingSid);
      const key = `recordings/${recordingId}/${Date.now()}.wav`;
      await uploadAudio(key, audioBuffer);

      await prisma.callRecording.update({
        where: { id: recordingId },
        data: { audioS3Key: key },
      });

      return key;
    });

    // Step 2: 文字起こし
    const transcription = await step.run("transcribe", async () => {
      await prisma.callRecording.update({
        where: { id: recordingId },
        data: { status: "TRANSCRIBING" },
      });

      const audioBuffer = await getAudioBuffer(audioKey);
      const result = await transcribeAudio(audioBuffer);

      await prisma.transcription.create({
        data: {
          recordingId,
          fullText: result.fullText,
          language: result.language,
          segments: result.segments,
        },
      });

      return result;
    });

    // Step 3: AI要約
    await step.run("summarize", async () => {
      await prisma.callRecording.update({
        where: { id: recordingId },
        data: { status: "SUMMARIZING" },
      });

      const result = await generateSummary(transcription.fullText);

      await prisma.summary.create({
        data: {
          recordingId,
          summaryText: result.summary,
          keyPoints: result.keyPoints,
          actionItems: result.actionItems,
          topics: result.topics,
          sentiment: result.sentiment,
          aiModel: "claude-sonnet-4-20250514",
        },
      });

      await prisma.callRecording.update({
        where: { id: recordingId },
        data: { status: "COMPLETED" },
      });

      return result;
    });
  }
);
