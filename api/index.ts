import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";

// -- STRICT TYPESCRIPT INTERFACES --
interface AuthenticatedRequest extends Request {
  user?: User;
  company_id?: string;
}

interface GenerateRuleBody {
  prompt: string;
}

interface GenerateRuleResponse {
  evaluated_hours: string;
  evaluated_addons: string;
  transfer_out_hours: string;
  transfer_to_id: string | null;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// Lazy initialize Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Global Supabase Admin Client Initialization
let supabaseAdmin: SupabaseClient | null = null;
function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing Supabase configuration. VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
    }
    
    supabaseAdmin = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseAdmin;
}

// Reusable Middleware: Verify Auth and fetch company_id
async function verifyAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: "Missing or invalid authorization header" });
      return;
    }

    const token = authHeader.split(' ')[1];
    const adminClient = getSupabaseAdmin();

    const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
    
    if (authError || !user) {
      res.status(401).json({ error: "Unauthorized: " + (authError?.message || "Invalid token") });
      return;
    }

    // Create a client authenticated as the user to fetch profile to bypass RLS issues
    const userClient = createClient(
      process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "",
      process.env.VITE_SUPABASE_ANON_KEY || "",
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Fetch company_id from profiles
    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    let company_id = profile?.company_id;
    if (!company_id) {
       company_id = user.user_metadata?.company_id;
    }

    if (!company_id) {
       res.status(403).json({ error: "Forbidden: No company_id found for user" });
       return;
    }

    (req as AuthenticatedRequest).user = user;
    (req as AuthenticatedRequest).company_id = company_id;
    next();
  } catch (error) {
    console.error("verifyAuth Error:", error);
    res.status(500).json({ error: "Internal server error during authentication" });
  }
}

// AI Copilot Payroll Rule Generator endpoint
app.post("/api/generate-rule", verifyAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as GenerateRuleBody;
    const prompt = body.prompt;
    
    if (!prompt || typeof prompt !== "string") {
      res.status(400).json({ error: "A prompt string is required." });
      return;
    }

    const ai = getGeminiClient();
    const systemInstruction = `You are an expert payroll rules compiler. Your job is to convert natural language rules typed by restaurant managers into structured mathematical formulas for a bi-weekly (2-week) payroll period. Because the manager might write rules in weekly terms (e.g., 'Fixed 30h/week and $300 addons/week' or 'Keep max 20 hours'), you MUST scale the numbers to the 2-week payroll period (i.e. multiply weekly values by 2). For example: - 'Fixed 30h/week and $300 addons/week'   weekly 30h -> 2-weekly 60h. weekly $300 -> 2-weekly 600.   JSON output:     "evaluated_hours": "60",     "evaluated_addons": "600",     "transfer_out_hours": "0",     "transfer_to_id": null,     "human_explanation": "This rule fixes the hours at 60 and adds $600 for the 2-week period." - 'Keep max 20 hours and transfer the rest to employee ID 5'   weekly max 20h -> 2-weekly 40h.   We want to keep up to 40 hours for this employee, and transfer anything above 40 hours to employee ID 5.   JSON output:     "evaluated_hours": "Math.min(totalHrs, 40)",     "evaluated_addons": "totalTipCard",     "transfer_out_hours": "Math.max(0, totalHrs - 40)",     "transfer_to_id": "5",     "human_explanation": "This rule caps the hours at 40 for the 2-week period and transfers any excess hours to employee #5." - 'Standard rate, keep maximum 40 hours a week and any excess hours are paid as standard addons at standard rate'   weekly 40h -> 2-weekly 80h.   JSON output:     "evaluated_hours": "Math.min(totalHrs, 80)",     "evaluated_addons": "totalTipCard + (Math.max(0, totalHrs - 80) * standardRate)",     "transfer_out_hours": "0",     "transfer_to_id": null,     "human_explanation": "This rule caps the regular hours at 80 for the 2-week period. Any excess hours are converted to a cash bonus using the standard rate." Ensure that the output formulas only use valid JS/TS mathematical operators and functions (like Math.min, Math.max, ?, :), numbers, and the allowed context variables: - totalHrs: actual total hours worked in 2-week period - totalTips: total tips in 2-week period - totalTipCard: card tips in 2-week period - totalTipCash: cash tips in 2-week period - standardRate: standard hourly rate - customRate: custom hourly rate. ALWAYS provide a clear, professional English explanation in 'human_explanation' explaining what the math actually does in business terms.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Translate the following payroll rule into structured formulas and provide a clear English explanation: "${prompt}"`,
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
            },
            human_explanation: {
              type: Type.STRING,
              description: "A clear, professional English explanation of what this rule does in business terms (e.g., 'Caps hours at 80 and transfers excess to employee #5')."
            }
          },
          required: ["evaluated_hours", "evaluated_addons", "transfer_out_hours", "human_explanation"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Failed to generate response from Gemini.");
    }

    const result = JSON.parse(text) as GenerateRuleResponse;
    res.json(result);
  } catch (error: unknown) {
    console.error("Error in /api/generate-rule:", error);
    const msg = error instanceof Error ? error.message : "An error occurred while generating the rule.";
    res.status(500).json({ error: msg });
  }
});

// Zero Tech Debt Ephemeral Sandbox Seeder
app.post("/api/seed-sandbox", verifyAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const company_id = authReq.company_id;
    
    if (!company_id) {
       res.status(403).json({ error: "company_id is missing from auth context" });
       return;
    }
    
    console.log(`Seeding sandbox via RPC for company ${company_id}...`);
    const adminClient = getSupabaseAdmin();
    
    const mockEmployees = [
        // BOH
        { nickname: 'Truc Le', tax_name: 'Ba Chanh Truc Le', custom_rate: 25.00, standard_rate: 25.00, sin: '', address: '', rule: { type: 'FIXED_TOTAL', fixedHrs: 40, fixedTip: 700 } },
        { nickname: 'JP', tax_name: 'Jean-Paul Tremblay', custom_rate: 22.00, standard_rate: 22.00, sin: '', address: '', rule: { type: 'STANDARD_MAX', maxHrs: 44 } },
        { nickname: 'Sophie', tax_name: 'Sophie Dinh', custom_rate: 20.00, standard_rate: 20.00, sin: '', address: '', rule: { type: 'GUARANTEED_MIN_HOURS', guaranteedBaseHrs: 35 } },
        { nickname: 'Luc', tax_name: 'Lucas Fortin', custom_rate: 19.00, standard_rate: 19.00, sin: '', address: '', rule: { type: 'STANDARD_MAX', maxHrs: 40 } },
        { nickname: 'Minh', tax_name: 'Le Minh', custom_rate: 18.00, standard_rate: 18.00, sin: '', address: '', rule: { type: 'STANDARD_MAX', maxHrs: 40 } },
        { nickname: 'Dave', tax_name: 'David Cote', custom_rate: 20.00, standard_rate: 20.00, sin: '', address: '', rule: { type: 'STANDARD_MAX', maxHrs: 40 } },
        { nickname: 'Bella', tax_name: 'Isabella Gagnon', custom_rate: 18.00, standard_rate: 18.00, sin: '', address: '', rule: { type: 'STANDARD_MAX', maxHrs: 40 } },
        { nickname: 'Thomas', tax_name: 'Thomas Bouchard', custom_rate: 18.00, standard_rate: 18.00, sin: '', address: '', rule: { type: 'STANDARD_MAX', maxHrs: 40 } },
        { nickname: 'Khoa', tax_name: 'Tran Dang Khoa', custom_rate: 19.50, standard_rate: 19.50, sin: '', address: '', rule: { type: 'STANDARD_MAX', maxHrs: 40 } },
        { nickname: 'Alex', tax_name: 'Alexandre Roy', custom_rate: 22.00, standard_rate: 22.00, sin: '', address: '', rule: { type: 'STANDARD_MAX', maxHrs: 40 } },
        { nickname: 'Marie', tax_name: 'Marie Pelletier', custom_rate: 18.50, standard_rate: 18.50, sin: '', address: '', rule: { type: 'GUARANTEED_MIN_HOURS', guaranteedBaseHrs: 30 } },
        { nickname: 'Hugo', tax_name: 'Hugo Lavoie', custom_rate: 18.00, standard_rate: 18.00, sin: '', address: '', rule: { type: 'STANDARD_MAX', maxHrs: 40 } },
        // FOH
        { nickname: 'Chloe', tax_name: 'Chloe Dubois', custom_rate: 16.60, standard_rate: 16.60, sin: '', address: '', rule: { type: 'CHECK_PLUS_CASH', fixedCheckHrs: 10, fixedCheckTip: 30 } },
        { nickname: 'Kevin', tax_name: 'Dang Tuan Kiet', custom_rate: 16.60, standard_rate: 16.60, sin: '', address: '', rule: { type: 'COST_ALLOCATION_OUT_PERCENT', maxOwnHrs: 20 } },
        { nickname: 'Hai', tax_name: 'Nguyen Vu Hai', custom_rate: 16.60, standard_rate: 16.60, sin: '', address: '', rule: { type: 'COST_ALLOCATION_IN_PERCENT', hrsPercent: 40, tipPercent: 40 } },
        { nickname: 'Emma', tax_name: 'Emma Roy', custom_rate: 16.60, standard_rate: 16.60, sin: '', address: '', rule: { type: 'COST_ALLOCATION_OUT_FLAT', hrsToGive: 15 } },
        { nickname: 'Liam', tax_name: 'Liam Nguyen', custom_rate: 16.60, standard_rate: 16.60, sin: '', address: '', rule: { type: 'COST_ALLOCATION_IN_FLAT' } },
        { nickname: 'Olivia', tax_name: 'Olivia Martin', custom_rate: 16.60, standard_rate: 16.60, sin: '', address: '', rule: { type: 'COST_ALLOCATION_IN_PERCENT', hrsPercent: 30, tipPercent: 30 } },
        { nickname: 'Noah', tax_name: 'Noah Tremblay', custom_rate: 16.60, standard_rate: 16.60, sin: '', address: '', rule: { type: 'COST_ALLOCATION_IN_PERCENT', hrsPercent: 30, tipPercent: 30 } },
        { nickname: 'Zoe', tax_name: 'Zoe Leblanc', custom_rate: 16.60, standard_rate: 16.60, sin: '', address: '', rule: { type: 'COST_ALLOCATION_IN_FLAT' } }
    ];

    const { error: rpcError } = await adminClient.rpc('fn_seed_sandbox', {
      p_company_id: company_id,
      p_employees: mockEmployees
    });

    if (rpcError) {
        throw new Error(`RPC Seed Error: ${rpcError.message}`);
    }

    console.log("Database seed completed successfully via RPC!");
    res.json({ success: true, company_id: company_id });
  } catch (error: unknown) {
    console.error("Error in /api/seed-sandbox:", error);
    const msg = error instanceof Error ? error.message : "An error occurred while seeding the sandbox.";
    res.status(500).json({ error: msg });
  }
});

// Stateless Explicit Cleanup Cron Endpoint
app.get("/api/debug-env", (req: Request, res: Response): void => {
  const key = process.env.GEMINI_API_KEY || "";
  const maskedKey = key.length > 5 ? key.substring(0, 5) + "..." : "missing or too short";
  res.json({ gemini_key_prefix: maskedKey });
});

app.post("/api/cron/cleanup-sandbox", async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      res.status(401).json({ error: "Unauthorized cron request" });
      return;
    }

    const adminClient = getSupabaseAdmin();
    console.log("Starting stateless explicit sandbox cleanup cron...");

    // Fetch anonymous users
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) {
        throw new Error(`Failed to list users: ${listError.message}`);
    }

    const now = Date.now();
    const TEN_MINUTES_MS = 10 * 60 * 1000;
    
    let cleanedCount = 0;
    for (const user of users) {
       // Filter for anonymous users that are older than 10 minutes
       if (user.is_anonymous && user.created_at) {
          const createdAt = new Date(user.created_at).getTime();
          if (now - createdAt > TEN_MINUTES_MS) {
              console.log(`Cleaning up expired anonymous user: ${user.id}`);
              
              // First fetch company_id from profiles
              const { data: profile } = await adminClient
                .from('profiles')
                .select('company_id')
                .eq('id', user.id)
                .single();
                
              if (profile?.company_id) {
                 // Explicitly prevent orphaned data via ACID transaction
                 const { error: cleanupError } = await adminClient.rpc('fn_cleanup_sandbox', { p_company_id: profile.company_id });
                 if (cleanupError) {
                     console.error(`Failed to cleanup data for company ${profile.company_id}: ${cleanupError.message}`);
                     continue; // Skip deleting user if data cleanup failed to ensure we don't orphan data
                 }
              }
              
              // ONLY AFTER transaction succeeds (or if no company was found), delete the user
              const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
              if (deleteError) {
                 console.error(`Failed to delete user ${user.id}: ${deleteError.message}`);
              } else {
                 cleanedCount++;
              }
          }
       }
    }

    res.json({ success: true, message: `Cleanup complete. Deleted ${cleanedCount} expired sessions.` });
  } catch (error: unknown) {
    console.error("Error in /api/cron/cleanup-sandbox:", error);
    const msg = error instanceof Error ? error.message : "An error occurred during cron cleanup.";
    res.status(500).json({ error: msg });
  }
});

export default app;
