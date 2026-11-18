/**
 * Full-stack Express server with Vite middleware integration
 * Provides /api/detect-defect endpoint powered by Gemini Vision API
 */

import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// AI Studio runtime uses Nginx on port 8080 proxying to app on port 3000.
// Avoid binding to port 8080 to prevent EADDRINUSE conflicts with Nginx.
const PORT = (process.env.PORT && process.env.PORT !== '8080') ? Number(process.env.PORT) : 3000;

app.use(express.json({ limit: '25mb' }));

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  try {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn("Failed to initialize GoogleGenAI client:", err);
  }
}

// Defect Detection API endpoint
app.post('/api/detect-defect', async (req: Request, res: Response): Promise<void> => {
  try {
    const { image, fileName, referencePartId } = req.body;

    if (!image) {
      res.status(400).json({ success: false, error: 'No image provided' });
      return;
    }

    if (!aiClient) {
      // If no valid Gemini API key is configured, return signal for client benchmark fallback
      res.status(200).json({
        success: false,
        fallbackToBenchmark: true,
        message: 'Gemini API key not configured or demo mode'
      });
      return;
    }

    // Prepare Base64 data from Data URL
    const match = image.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
    if (!match) {
      res.status(200).json({
        success: false,
        fallbackToBenchmark: true,
        message: 'Image format parsed as SVG or vector, using calibrated edge benchmark'
      });
      return;
    }

    const mimeType = `image/${match[1] === 'jpg' ? 'jpeg' : match[1]}`;
    const base64Data = match[2];

    const prompt = `
You are an expert automotive stamping quality assurance computer vision model for HICOM Engineering Sdn Bhd.
Analyze this stamped automotive sheet metal part image for manufacturing defects.

Check against these 15 standard automotive stamping defect categories:
1. Burr (DEF-01)
2. Missed Cut or Incomplete Cut (DEF-02)
3. Poor Cut Edge Quality (DEF-03)
4. Crack (DEF-04)
5. Splitting or Tearing (DEF-05)
6. Wrinkling (DEF-06)
7. Material Thinning (DEF-07)
8. Springback (DEF-08)
9. Scratches and Galling (DEF-09)
10. Dent, Impression and Die Mark (DEF-10)
11. Warping, Twisting and Distortion (DEF-11)
12. Poor Flatness (DEF-12)
13. Dimensional Inaccuracies (DEF-13)
14. Misaligned Hole or Feature (DEF-14)
15. Part Shift or Feed Shift (DEF-15)

Respond with pure JSON conforming to this schema:
{
  "hasDefect": boolean,
  "status": "OK" | "NG",
  "defectCategory": string (one of the 15 categories, or null if OK),
  "defectCategoryId": string (lowercase slug, e.g. "burr", "crack", "wrinkling", "dent_impression", etc., or null),
  "defectLocation": string (e.g. "Outer trim flange at lower right corner"),
  "defectDescription": string (detailed technical explanation),
  "severityPercentage": number (0 to 100),
  "confidencePercentage": number (80 to 99.9),
  "verdict": "PASS" | "REWORK" | "FAIL",
  "boundingBox": {
    "x": number (percentage 0 to 100 from left),
    "y": number (percentage 0 to 100 from top),
    "width": number (percentage 0 to 100),
    "height": number (percentage 0 to 100),
    "label": string
  }
}
`;

    const response: GenerateContentResponse = await aiClient.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: base64Data
            }
          }
        ]
      },
      config: {
        responseMimeType: 'application/json'
      }
    });

    const responseText = response.text || '';
    // Extract JSON block
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      res.status(200).json({
        success: true,
        aiDetected: true,
        record: parsed
      });
      return;
    }

    res.status(200).json({ success: false, fallbackToBenchmark: true });
  } catch (err: unknown) {
    console.error('Error during AI defect detection:', err);
    res.status(200).json({
      success: false,
      fallbackToBenchmark: true,
      error: err instanceof Error ? err.message : String(err)
    });
  }
});

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HICOM Engineering Stamping Dashboard server running on port ${PORT}`);
  });
}

startServer();
