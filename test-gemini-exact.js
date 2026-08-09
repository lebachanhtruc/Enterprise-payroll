import { GoogleGenAI, Type } from "@google/genai";
import "dotenv/config";

async function run() {
  const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const systemInstruction = `You are an expert payroll rules compiler. Your job is to convert natural language rules typed by restaurant managers into structured mathematical formulas for a bi-weekly (2-week) payroll period.
Because the manager might write rules in weekly terms (e.g., 'Fixed 30h/week and $300 addons/week' or 'Keep max 20 hours'), you MUST scale the numbers to the 2-week payroll period (i.e. multiply weekly values by 2).
For example:
- 'Fixed 30h/week and $300 addons/week'
  weekly 30h -> 2-weekly 60h. weekly $300 -> 2-weekly 600.
  JSON output:
  {
    "evaluated_hours": "60",
    "evaluated_addons": "600",
    "transfer_out_hours": "0",
    "transfer_to_id": null
  }

- 'Keep max 20 hours and transfer the rest to employee ID 5'
  weekly max 20h -> 2-weekly 40h.
  We want to keep up to 40 hours for this employee, and transfer anything above 40 hours to employee ID 5.
  JSON output:
  {
    "evaluated_hours": "Math.min(totalHrs, 40)",
    "evaluated_addons": "totalTipCard",
    "transfer_out_hours": "Math.max(0, totalHrs - 40)",
    "transfer_to_id": "5"
  }

- 'Standard rate, keep maximum 40 hours a week and any excess hours are paid as standard addons at standard rate'
  weekly 40h -> 2-weekly 80h.
  JSON output:
  {
    "evaluated_hours": "Math.min(totalHrs, 80)",
    "evaluated_addons": "totalTipCard + (Math.max(0, totalHrs - 80) * standardRate)",
    "transfer_out_hours": "0",
    "transfer_to_id": null
  }

Ensure that the output formulas only use valid JS/TS mathematical operators and functions (like Math.min, Math.max, ?, :), numbers, and the allowed context variables:
- totalHrs: actual total hours worked in 2-week period
- totalTips: total tips in 2-week period
- totalTipCard: card tips in 2-week period
- totalTipCash: cash tips in 2-week period
- standardRate: standard hourly rate
- customRate: custom hourly rate
`;

  try {
    const response = await aiClient.models.generateContent({
      model: "gemini-flash-latest",
      contents: `Translate the following payroll rule into structured formulas: "max20h/w"`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            evaluated_hours: {
              type: Type.STRING,
              description: "Mathematical expression string calculating the check hours for the 2-week period. E.g. 'Math.min(totalHrs, 60)' or '60'."
            },
            evaluated_addons: {
              type: Type.STRING,
              description: "Mathematical expression string calculating standard addons/tips for the 2-week period. E.g. '600' or 'totalTipCard'."
            },
            transfer_out_hours: {
              type: Type.STRING,
              description: "Mathematical expression string calculating hours to transfer out over the 2-week period. E.g. 'Math.max(0, totalHrs - 40)'. Use '0' if no transfer."
            },
            transfer_to_id: {
              type: Type.STRING,
              description: "The ID of the target employee to transfer hours to (e.g. '5'). Return null if not applicable or not specified."
            }
          },
          required: ["evaluated_hours", "evaluated_addons", "transfer_out_hours"]
        }
      }
    });
    console.log(response.text);
  } catch(e) {
    console.log("Error message is: ", e.message);
  }
}
run();
