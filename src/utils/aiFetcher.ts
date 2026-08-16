/**
 * Helper to fetch AI response with retry and wait logic.
 * Strictly checks for "status": true from the API JSON response before returning text.
 * Strictly uses the exact endpoints and JSON schemas provided for Claude, GPT Pro, and Qwen.
 */
export async function fetchAiResponseWithWait(
  modeId: 'claude' | 'gptpro' | 'qwen',
  endpoint: string,
  prompt: string,
  maxAttempts = 8
): Promise<string> {
  const url = `${endpoint}${encodeURIComponent(prompt)}`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();

      // Ensure status is true
      const isStatusTrue = data?.status === true || data?.status === 'true';

      if (isStatusTrue) {
        let extracted = '';

        if (modeId === 'claude') {
          // Response schema: { creator, source, status: true, result: "string response" }
          if (typeof data?.result === 'string' && data.result.trim()) {
            extracted = data.result.trim();
          } else if (typeof data?.response === 'string' && data.response.trim()) {
            extracted = data.response.trim();
          }
        } else if (modeId === 'gptpro') {
          // Response schema: { creator, source, status: true, result: { response: "string response" } }
          if (typeof data?.result?.response === 'string' && data.result.response.trim()) {
            extracted = data.result.response.trim();
          } else if (typeof data?.result === 'string' && data.result.trim()) {
            extracted = data.result.trim();
          }
        } else if (modeId === 'qwen') {
          // Response schema: { creator, source, status: true, result: { model, question, response: "string response" } }
          if (typeof data?.result?.response === 'string' && data.result.response.trim()) {
            extracted = data.result.response.trim();
          } else if (typeof data?.result === 'string' && data.result.trim()) {
            extracted = data.result.trim();
          }
        }

        if (extracted && extracted.length > 0) {
          return extracted;
        }
      }

      // If status is false or response not ready, wait 2 seconds before retrying
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (e) {
      console.warn(`Attempt ${attempt} failed for ${modeId}:`, e);
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  return "Maaf, respon AI memerlukan waktu lebih lama dari biasanya. Silahkan coba tanyakan kembali.";
}
