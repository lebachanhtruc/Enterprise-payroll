import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("API Key:", apiKey);
  const aiClient = new GoogleGenAI({
    apiKey,
  });

  try {
    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: "Hello",
    });
    console.log(response.text);
    console.log(response.text);
  } catch (e: any) {
    console.error("Error:", e.message);
  }
}
test();
