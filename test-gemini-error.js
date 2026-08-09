import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

async function run() {
  const aiClient = new GoogleGenAI({ apiKey: "INVALID_KEY" });
  try {
    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: "Hello",
    });
    console.log(response.text);
  } catch(e) {
    console.log("Error message is: ", e.message);
  }
}
run();
