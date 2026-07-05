import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { images, answers } = await req.json();
    
    const prompt = `Based on these images of a space, and the following Q&A about the environment, generate a final report on the temperature of the given space and estimate the cooling effect.

Q&A:
${answers.map((a: any, i: number) => `Q${i + 1}: ${a.question}\nA: ${a.answer}`).join("\n")}

Respond with ONLY a JSON object containing:
- baseline: an integer representing the baseline ambient temperature in Fahrenheit.
- effective: an integer representing the effective temperature inside this space.
- diff: an integer representing the temperature drop (e.g. -5).
- report: a 2-3 sentence string summarizing the cooling effectiveness and overall analysis of the space.`;

    const parts = [
      { text: prompt },
      ...images.map((img: string) => {
        const base64Data = img.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
        return {
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg"
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

    const report = JSON.parse(response.text || "{}");
    return NextResponse.json({ result: report });
  } catch (error) {
    console.error("Gemini Error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
