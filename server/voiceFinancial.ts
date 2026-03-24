import type { Request, Response } from "express";

export async function financialVoiceChat(req: Request, res: Response) {
  const { language } = req.body as { language?: string };
  const isEN = language === "en";
  return res.json({
    transcript: "",
    response: isEN
      ? "Voice assistant is temporarily unavailable. Please try again later."
      : "Sesli asistan geçici olarak kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
    intent: "query",
    data: null,
    ttsAudio: null,
    ttsFormat: "mp3",
  });
}

export async function ttsEndpoint(req: Request, res: Response) {
  return res.status(503).json({ error: "TTS service temporarily unavailable" });
}
