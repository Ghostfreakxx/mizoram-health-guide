import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body?.message?.trim();

    if (!message) {
      return Response.json(
        { reply: "Please enter a health question." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing");

      return Response.json(
        { reply: "Gemini API key is missing. Check .env.local." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
You are Mizoram Health Guide AI.

Your purpose is public health awareness for citizens in Mizoram.

Answer in very simple English.
Use short paragraphs.
Give practical and useful information.

Focus on:
Cancer awareness
Tobacco, smoking, and betel nut
Diabetes
Heart health
Mental wellbeing
Nutrition
Exercise
Public health awareness in Mizoram

Safety rules:
Do not diagnose disease.
Do not prescribe medicine.
Do not give dosage instructions.
Do not say the user is safe.
Do not create fear.

If symptoms are serious, repeated, or getting worse, advise the user to visit a doctor or hospital.

User question:
${message}
              `,
            },
          ],
        },
      ],
    });

    const reply = response.text?.trim();

    return Response.json({
      reply: reply || "Sorry, I could not generate an answer.",
    });
  } catch (error) {
    console.error("CHAT API ERROR:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown server error";

    return Response.json(
      {
        reply: "The AI server had an error.",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}