import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { z } from "zod";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10kb" })); // security guardrail

const EMAIL = process.env.OFFICIAL_EMAIL || "missing@chitkara.edu.in";

// ---------- Utility Functions ----------
const fibonacci = (n) => {
  const res = [];
  let a = 0, b = 1;
  for (let i = 0; i < n; i++) {
    res.push(a);
    [a, b] = [b, a + b];
  }
  return res;
};

const isPrime = (n) => {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
};

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
const hcf = (arr) => arr.reduce((a, b) => gcd(a, b));
const lcm2 = (a, b) => (a * b) / gcd(a, b);
const lcm = (arr) => arr.reduce((a, b) => lcm2(a, b));

// ---------- AI (Groq) ----------
async function askGroq(question) {
  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama3-8b-8192",
      messages: [
        { role: "system", content: "Answer in ONE WORD only." },
        { role: "user", content: question }
      ],
      temperature: 0
    })
  });

  if (!resp.ok) throw new Error("AI service error");

  const json = await resp.json();
  return json.choices[0].message.content.trim().split(/\s+/)[0];
}

// ---------- Validation ----------
const bodySchema = z.object({
  fibonacci: z.number().int().positive().optional(),
  prime: z.array(z.number().int()).optional(),
  lcm: z.array(z.number().int().positive()).optional(),
  hcf: z.array(z.number().int().positive()).optional(),
  AI: z.string().min(1).optional()
}).refine(
  (data) => Object.keys(data).length === 1,
  { message: "Exactly one key is required" }
);

// ---------- Routes ----------
app.get("/health", (req, res) => {
  res.status(200).json({
    is_success: true,
    official_email: EMAIL
  });
});

app.post("/bfhl", async (req, res) => {
  try {
    const parsed = bodySchema.parse(req.body);

    let data;

    if (parsed.fibonacci !== undefined) {
      data = fibonacci(parsed.fibonacci);
    } 
    else if (parsed.prime) {
      data = parsed.prime.filter(isPrime);
    } 
    else if (parsed.lcm) {
      data = lcm(parsed.lcm);
    } 
    else if (parsed.hcf) {
      data = hcf(parsed.hcf);
    } 
    else if (parsed.AI) {
      data = await askGroq(parsed.AI);
    }

    res.status(200).json({
      is_success: true,
      official_email: EMAIL,
      data
    });

  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({
        is_success: false,
        official_email: EMAIL,
        error: "Invalid request structure"
      });
    }

    res.status(500).json({
      is_success: false,
      official_email: EMAIL,
      error: "Internal server error"
    });
  }
});

// ---------- Server ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
