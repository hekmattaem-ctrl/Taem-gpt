import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY;

export const ai = new GoogleGenAI({ apiKey: API_KEY });

export const createChat = (systemInstruction?: string) => {
  return ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: systemInstruction || "You are Taem, a helpful and intelligent AI assistant. You provide concise, accurate, and helpful responses. You use markdown for formatting when appropriate.",
    },
  });
};

export async function generateImage(prompt: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ text: prompt }],
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
}

export async function generateTitle(messages: { role: string, content: string }[]) {
  const prompt = `Based on the following conversation, generate a short, concise title (max 5 words) that summarizes the topic. Return only the title text.
  
  Conversation:
  ${messages.slice(0, 4).map(m => `${m.role}: ${m.content}`).join('\n')}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text?.trim().replace(/^"|"$/g, '') || "New Chat";
  } catch (error) {
    console.error("Error generating title:", error);
    return "New Chat";
  }
}
