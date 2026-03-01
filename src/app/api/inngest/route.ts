import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { processRecording } from "@/inngest/functions/process-recording";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processRecording],
});
