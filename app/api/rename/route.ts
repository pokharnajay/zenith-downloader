import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: NextRequest) {
  try {
    const { title } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Fallback: just sanitize the title
      const sanitized = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
      return NextResponse.json({ filename: sanitized });
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a file naming assistant.
      User Input: "${title}"

      Task: Create a concise, clean, file-system friendly filename (snake_case) for this video.
      - Remove special characters.
      - Keep it under 50 chars.
      - Do not include the file extension.
      - Output ONLY the filename string.
      `,
    });

    const text = response.text?.trim();
    return NextResponse.json({ filename: text || title.replace(/[^a-zA-Z0-9]/g, '_') });

  } catch (error: any) {
    console.error('Rename error:', error);
    // Fallback on error
    return NextResponse.json({
      filename: 'video_download'
    });
  }
}
