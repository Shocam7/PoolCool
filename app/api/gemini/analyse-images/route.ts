import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { images } = await req.json();
    
    // images should be base64 strings
    const prompt = `Analyze these images of a space and generate 3 questions that would help decide the temperature of the given space and its cooling effectiveness. Return ONLY a JSON array of strings representing the questions.`;
    
    const parts = [
      { text: prompt },
      ...images.map((img: string) => {
        const base64Data = img.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
        return {
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg" // assume jpeg for simplicity, or we can pass it
          }
        }
      })
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: parts,
      config: {
        responseMimeType: "application/json"
      }
    });

    const questions = JSON.parse(response.text || "[]");
    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Gemini Error:", error);
    return NextResponse.json({ error: "Failed to generate questions" }, { status: 500 });
  }
}
