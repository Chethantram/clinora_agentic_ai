require("dotenv").config();

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// MIME type helper
// ---------------------------------------------------------------------------
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".txt": "text/plain",
  };
  return map[ext] || "application/octet-stream";
}

// ---------------------------------------------------------------------------
// Extract raw text — priority order:
//   1. .txt  → direct read
//   2. images (.png/.jpg/.jpeg) → Tesseract OCR (no API key needed)
//   3. .pdf  → pdf-parse text extraction
//   4. Gemini vision (optional upgrade if quota available)
// ---------------------------------------------------------------------------
async function extractRawText(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const ext = path.extname(filePath).toLowerCase();

  // ── Plain text ──
  if (ext === ".txt") {
    return fs.readFileSync(filePath, "utf8");
  }

  // ── Images → Tesseract in isolated child process (won't crash server) ──
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".tiff"].includes(ext)) {
    try {
      const { fork } = require("child_process");
      const workerPath = path.join(__dirname, "tesseractWorker.js");
      console.log("  → Running Tesseract OCR on image (isolated process)...");

      const text = await new Promise((resolve, reject) => {
        const child = fork(workerPath, [filePath], { silent: true });
        let result = null;
        const timeout = setTimeout(() => {
          child.kill();
          reject(new Error("Tesseract timed out after 60s"));
        }, 60000);

        child.on("message", (msg) => {
          result = msg;
        });

        child.on("exit", (code) => {
          clearTimeout(timeout);
          if (result && result.text) {
            resolve(result.text);
          } else if (result && result.error) {
            reject(new Error(result.error));
          } else {
            reject(new Error(`Tesseract process exited with code ${code}`));
          }
        });

        child.on("error", (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      if (text.trim()) {
        console.log("  ✓ Tesseract extracted", text.length, "chars");
        return text;
      }
    } catch (err) {
      console.warn("  ✗ Tesseract failed:", err.message);
    }

    // Image fallback: try Gemini vision if available
    try {
      const text = await tryGeminiVision(filePath);
      if (text) return text;
    } catch (err) {
      console.warn("  ✗ Gemini image vision also failed:", err.message);
    }

    throw new Error(
      "Failed to extract text from image. The image may be unreadable or corrupted."
    );
  }

  // ── PDFs → pdf-parse ──
  if (ext === ".pdf") {
    try {
      const { PDFParse } = require("pdf-parse");
      const dataBuffer = fs.readFileSync(filePath);
      const parser = new PDFParse({ verbosity: 0, data: new Uint8Array(dataBuffer) });
      await parser.load();
      const result = await parser.getText();
      const text = (typeof result === 'string') ? result : (result?.text || "");
      if (text && text.trim()) {
        console.log("  ✓ pdf-parse extracted", text.length, "chars");
        return text;
      }
    } catch (err) {
      console.warn("  ✗ pdf-parse failed:", err.message);
    }

    // PDF fallback: try Gemini vision if available
    try {
      const text = await tryGeminiVision(filePath);
      if (text) return text;
    } catch (err) {
      console.warn("  ✗ Gemini PDF vision also failed:", err.message);
    }

    throw new Error(
      "Failed to extract text from PDF. The file may be image-based or your Gemini quota may be exhausted. Please try again later."
    );
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

// ---------------------------------------------------------------------------
// Optional Gemini vision (used only as PDF fallback)
// ---------------------------------------------------------------------------
async function tryGeminiVision(filePath) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(key);

  const models = ["gemini-2.0-flash-lite", "gemini-2.0-flash"];

  const fileData = fs.readFileSync(filePath);
  const base64 = fileData.toString("base64");
  const mimeType = getMimeType(filePath);

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType, data: base64 } },
              { text: "Extract ALL text from this document exactly as written. Return only the raw text." },
            ],
          },
        ],
      });

      const text = result.response?.text?.() || "";
      if (text.trim()) {
        console.log(`  ✓ Gemini vision (${modelName}) extracted ${text.length} chars`);
        return text;
      }
    } catch (err) {
      const is429 = err.message?.includes("429");
      console.warn(`  ✗ Gemini ${modelName}: ${is429 ? "quota exhausted" : err.message?.slice(0, 60)}`);
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Heuristic extraction (regex-based, always works, no API needed)
// ---------------------------------------------------------------------------
function heuristicExtract(rawText) {
  const text = rawText || "";
  const compact = text.replace(/\r/g, "");
  const lines = compact.split("\n").map((l) => l.trim()).filter(Boolean);

  const meds = [];
  for (const line of lines) {
    if (/(tablet|tab|capsule|cap|mg|ml|once|twice|daily|bd|od|hs)/i.test(line)) {
      meds.push(line);
    }
  }

  const bpMatch = compact.match(/(?:BP|Blood\s*Pressure)\s*[:\-]?\s*(\d{2,3})\s*\/\s*(\d{2,3})/i);
  const hba1cMatch = compact.match(/HbA1c\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)/i);
  const crMatch = compact.match(/(?:Creatinine|Serum\s*Creatinine)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)/i);
  const egfrMatch = compact.match(/eGFR\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)/i);
  const hbMatch = compact.match(/(?:Haemoglobin|Hemoglobin|Hb)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)/i);

  return {
    patient_name: null,
    symptoms: [],
    medications: meds.slice(0, 20),
    diagnosis: [],
    allergies: [],
    tests_recommended: [],
    clinical_summary: lines.slice(0, 12).join(" "),
    lab_results: {
      BloodPressure: bpMatch ? { systolic: Number(bpMatch[1]), diastolic: Number(bpMatch[2]) } : null,
      HbA1c: hba1cMatch ? Number(hba1cMatch[1]) : null,
      SerumCreatinine: crMatch ? Number(crMatch[1]) : null,
      eGFR: egfrMatch ? Number(egfrMatch[1]) : null,
      Haemoglobin: hbMatch ? Number(hbMatch[1]) : null,
    },
    raw_text: compact.slice(0, 20000),
  };
}

// ---------------------------------------------------------------------------
// LLM structuring — Groq first (reliable), Gemini second (quota-limited)
// ---------------------------------------------------------------------------
const STRUCTURE_PROMPT = `Extract structured clinical data from this OCR text and return ONLY a valid JSON object.
Evaluate the visual clarity, ambiguity, and medical logic to assign a confidence score (0.0 to 1.0) for every extracted field.
Schema:
{
  "patient_name": "string|null",
  "symptoms": ["string"],
  "medications": ["string"],
  "diagnosis": ["string"],
  "allergies": ["string"],
  "tests_recommended": ["string"],
  "clinical_summary": "string",
  "lab_results": {
    "BloodPressure": {"systolic": number, "diastolic": number} | null,
    "HbA1c": number | null,
    "SerumCreatinine": number | null,
    "eGFR": number | null,
    "Haemoglobin": number | null
  },
  "confidence_scores": {
    "patient_name": number,
    "symptoms": number,
    "medications": number,
    "diagnosis": number,
    "allergies": number,
    "tests_recommended": number,
    "clinical_summary": number,
    "BloodPressure": number,
    "HbA1c": number,
    "SerumCreatinine": number,
    "eGFR": number,
    "Haemoglobin": number
  }
}

OCR TEXT:
`;

function parseJsonFromText(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

async function tryGroqStructure(rawText) {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return null;

  try {
    const Groq = require("groq-sdk");
    const client = new Groq({ apiKey: groqKey });

    const chatCompletion = await client.chat.completions.create({
      messages: [
        { role: "system", content: "You are a medical data extractor. Return ONLY valid JSON, no markdown, no explanation." },
        { role: "user", content: STRUCTURE_PROMPT + rawText.slice(0, 25000) },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 4096,
    });

    const text = chatCompletion.choices?.[0]?.message?.content || "";
    const parsed = parseJsonFromText(text);
    if (parsed) {
      console.log("  ✓ Groq structuring succeeded");
      return parsed;
    }
  } catch (err) {
    console.warn("  ✗ Groq structuring failed:", err.message);
  }

  return null;
}

async function tryGeminiStructure(rawText) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(key);

  const models = ["gemini-2.0-flash-lite", "gemini-2.0-flash"];

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: "Extract medical text into strict JSON only.",
      });

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: STRUCTURE_PROMPT + rawText.slice(0, 30000) }] }],
      });

      const text = result.response?.text?.() || "";
      const parsed = parseJsonFromText(text);
      if (parsed) {
        console.log(`  ✓ Gemini structuring (${modelName}) succeeded`);
        return parsed;
      }
    } catch (err) {
      const is429 = err.message?.includes("429");
      console.warn(`  ✗ Gemini structure (${modelName}): ${is429 ? "quota exhausted" : err.message?.slice(0, 60)}`);
    }
  }

  return null;
}

async function llmStructure(rawText) {
  // Groq FIRST — it's reliable and has generous limits
  const groqResult = await tryGroqStructure(rawText);
  if (groqResult) return groqResult;

  // Gemini second — may be quota-limited
  const geminiResult = await tryGeminiStructure(rawText);
  if (geminiResult) return geminiResult;

  // Will fall back to heuristic
  return null;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------
async function processUploadedDocument(filePath, apiKeyOverride, modelOverride) {
  try {
    console.log(`\n📄 Processing document: ${path.basename(filePath)}`);
    const rawText = await extractRawText(filePath);
    if (!rawText || !rawText.trim()) {
      return { success: false, error: "OCR produced empty text" };
    }

    console.log("  Structuring extracted text...");
    const llmOutput = await llmStructure(rawText);
    const structured = llmOutput || heuristicExtract(rawText);

    return {
      success: true,
      source_file: filePath,
      raw_text: rawText.slice(0, 20000),
      structured,
      parser: llmOutput ? "llm_json_extractor" : "heuristic_fallback",
    };
  } catch (error) {
    return {
      success: false,
      error: "OCR agent failed",
      message: error.message,
    };
  }
}

module.exports = { processUploadedDocument };
