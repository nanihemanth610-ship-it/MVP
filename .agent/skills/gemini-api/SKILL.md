---
name: gemini-api
description: Google Gemini API conventions for BillBridge. Use when integrating Gemini models for document understanding, claim extraction, summarization, or other AI features. Never output or store API keys.
---

# Gemini API Skill

> **Official Reference**: https://ai.google.dev/gemini-api/docs

Guidelines for integrating Google Gemini models into BillBridge for document understanding, data extraction, summarization, and conversational features.

> **CRITICAL**: Never output, log, or hardcode the `GEMINI_API_KEY` or any Google API credentials. Reference via environment variables only.

## SDK Setup

### Node.js / TypeScript
```ts
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
```

### Model Selection Guidelines
| Use Case | Recommended Model | Reasoning |
|---|---|---|
| Document extraction (OCR/bills) | `gemini-2.5-flash` | Fast, cost-effective, strong vision |
| Complex reasoning / summarization | `gemini-2.5-pro` | Higher accuracy on nuanced tasks |
| Quick classification / routing | `gemini-2.5-flash` | Low latency, low cost |
| Embedding / semantic search | `text-embedding-004` | Purpose-built for retrieval |

## Structured Output

For claim/bill extraction, always request structured output:

```ts
import { Type } from '@google/genai';

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [
    {
      role: 'user',
      parts: [
        { inlineData: { mimeType: 'application/pdf', data: base64Pdf } },
        { text: 'Extract all line items from this medical bill.' },
      ],
    },
  ],
  config: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        provider_name: { type: Type.STRING },
        date_of_service: { type: Type.STRING },
        line_items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              cpt_code: { type: Type.STRING },
              description: { type: Type.STRING },
              amount: { type: Type.NUMBER },
            },
            required: ['description', 'amount'],
          },
        },
        total_amount: { type: Type.NUMBER },
      },
      required: ['line_items', 'total_amount'],
    },
  },
});
```

## Prompt Engineering

### System Instructions
Set consistent behavior via system instructions:
```ts
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  config: {
    systemInstruction: `You are a medical billing assistant. Extract structured data from 
medical bills and explanation of benefits (EOB) documents. Be precise with dollar amounts 
and CPT codes. If a field is not clearly present in the document, set it to null rather 
than guessing.`,
  },
  contents: userMessage,
});
```

### Best Practices
1. **Be specific** — "Extract the CPT code, description, billed amount, and allowed amount for each line item" beats "Extract the data"
2. **Provide examples** — use few-shot prompting for complex extraction tasks
3. **Set output constraints** — use `responseSchema` or explicit format instructions
4. **Handle ambiguity** — instruct the model to flag uncertain extractions rather than guess
5. **Chunk large documents** — split documents >50 pages and process in batches

## Safety Settings

Configure safety thresholds appropriate for medical/billing content:
```ts
import { HarmCategory, HarmBlockThreshold } from '@google/genai';

const config = {
  safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ],
};
```

- Never set all categories to `BLOCK_NONE` in production
- Medical terms may trigger false positives — test with real documents and adjust thresholds
- Log blocked responses for review (without logging the document content if it contains PHI)

## Multimodal Input

### Images (scanned bills)
```ts
// From file buffer
const imageData = Buffer.from(fileBuffer).toString('base64');
const part = { inlineData: { mimeType: 'image/png', data: imageData } };
```

### PDFs
```ts
// Direct PDF input (supported natively)
const pdfData = Buffer.from(pdfBuffer).toString('base64');
const part = { inlineData: { mimeType: 'application/pdf', data: pdfData } };
```

### File Size Limits
- Inline data: up to 20 MB base64-encoded
- For larger files, use the File API: `await ai.files.upload({ file: filePath })`

## Error Handling

```ts
try {
  const response = await ai.models.generateContent({ model, contents });
  
  // Check for blocked responses
  if (response.candidates?.[0]?.finishReason === 'SAFETY') {
    // Handle safety block — log and return graceful error
  }
  
  // Check for empty responses
  if (!response.text) {
    // Handle empty response — retry or fallback
  }
  
  return JSON.parse(response.text);
} catch (error) {
  if (error.status === 429) {
    // Rate limited — implement exponential backoff
  }
  if (error.status === 400) {
    // Bad request — check input size/format
  }
  throw error;
}
```

## Cost & Performance

- Use `gemini-2.5-flash` for high-volume operations (bill processing pipeline)
- Cache extracted data — don't re-process the same document
- Batch similar requests where possible
- Set `maxOutputTokens` to reasonable limits for the task
- Monitor usage via Google AI Studio dashboard

## PHI / HIPAA Considerations

- **Never log full document content** if it contains Protected Health Information (PHI)
- Redact or hash patient identifiers before logging prompts/responses
- Use Vertex AI with data residency controls for production PHI workloads
- Store extracted data in the database with proper RLS — not in logs or temporary files
- Review Google's data usage policies for the API tier you're using

## Key Rules

1. API key in env var only — never in source code, logs, or client bundles
2. Always validate and parse structured output — don't trust raw JSON strings
3. Handle all error cases: safety blocks, rate limits, empty responses, timeouts
4. Use the cheapest model that meets accuracy requirements
5. Never send unnecessary PHI to the API — extract only what's needed
