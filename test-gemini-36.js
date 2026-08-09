import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

async function run() {
  const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: "Hello",
    });
    console.log(response.text);
  } catch(e) {
    console.error(e);
  }
}
run();
