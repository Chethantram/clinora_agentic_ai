import { fetchApi } from "@/lib/backend-api";

export const DEFAULT_PATIENT_ID = "P001";

export async function agentQuery(
  prompt: string,
  patientId = DEFAULT_PATIENT_ID,
  options?: { allPatients?: boolean }
) {
  const isAllPatients = options?.allPatients === true;
  const body: Record<string, unknown> = {
    prompt,
    allPatients: isAllPatients,
  };
  if (!isAllPatients && patientId) {
    body.patientId = patientId;
  }

  let api: { answer?: string; response?: string; error?: string };
  try {
    api = await fetchApi<{ answer?: string; response?: string; error?: string }>(
      "/api/agent/query",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );
  } catch (e) {
    api = { error: e instanceof Error ? e.message : "Backend unavailable" };
  }

  if (api.answer) return api.answer;
  if (api.response) return api.response;
  if (api.error) return `Backend error: ${api.error}`;
  return "No response returned from backend.";
}

import { BACKEND_URL } from "@/lib/backend-api";

export async function uploadDocument(
  file: File,
  patientId: string
): Promise<string> {
  const formData = new FormData();
  formData.append("document", file);
  formData.append("patientId", patientId);
  formData.append("autoIngest", "true");

  try {
    const res = await fetch(`${BACKEND_URL}/api/agent/ocr`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      return `Upload failed: ${res.statusText}`;
    }

    const data = await res.json();
    if (data.error) {
      return `Error: ${data.error}${data.message ? ` — ${data.message}` : ''}`;
    }
    if (data.success === false) {
      return `⚠️ Document processing failed: ${data.message || data.error || 'Unknown error'}`;
    }

    let resultMsg = "✅ Document processed successfully.\n\n";
    if (data.structured) {
      let lowConfidenceCount = 0;
      const scores = data.structured.confidence_scores || {};
      const threshold = 0.75;
      
      // Calculate how many fields have low confidence
      for (const [key, score] of Object.entries(scores)) {
        if (typeof score === 'number' && score < threshold) {
          lowConfidenceCount++;
        }
      }

      if (lowConfidenceCount > 0) {
        resultMsg += `⚠️ **${lowConfidenceCount} fields require doctor verification.**\n\n`;
      }

      resultMsg += "**Extracted Data:**\n";
      
      // Manually format the data instead of raw JSON.stringify to allow [WARN] injection
      const formatValue = (key: string, val: any) => {
        let strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
        if (scores[key] !== undefined && scores[key] < threshold) {
          return `[WARN]${strVal}[/WARN]`;
        }
        return strVal;
      };

      for (const [key, value] of Object.entries(data.structured)) {
        if (key === 'confidence_scores' || key === 'raw_text') continue;
        
        if (key === 'lab_results' && typeof value === 'object' && value !== null) {
          resultMsg += `- **${key}**:\n`;
          for (const [labKey, labVal] of Object.entries(value)) {
            if (labVal !== null) {
               resultMsg += `  - ${labKey}: ${formatValue(labKey, labVal)}\n`;
            }
          }
        } else if (Array.isArray(value)) {
          if (value.length > 0) {
            resultMsg += `- **${key}**: ${formatValue(key, value.join(', '))}\n`;
          }
        } else if (value !== null && value !== "") {
          resultMsg += `- **${key}**: ${formatValue(key, value)}\n`;
        }
      }
      resultMsg += "\n";
    }

    if (data.ingestion) {
      resultMsg += "**Ingestion Status:**\n";
      resultMsg += data.ingestion.success
        ? "✅ Data was automatically added to the patient's record."
        : `⚠️ Ingestion failed: ${data.ingestion.error || 'Unknown error'}`;
    }

    return resultMsg;
  } catch (e) {
    return `Upload error: ${e instanceof Error ? e.message : "Unknown error"}`;
  }
}
