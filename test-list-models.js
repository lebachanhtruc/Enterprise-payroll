import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

async function run() {
  const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    console.log(data.models.map(m => m.name));
  } catch(e) {
    console.error(e);
  }
}
run();
