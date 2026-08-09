import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

async function run() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite", // The fake model
      contents: "Hello",
    });
    console.log(response.text);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

run();
