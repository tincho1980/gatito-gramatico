import { GoogleGenAI, Type } from "@google/genai";
import { WordChallenge, WordType } from "../types";

// Helper to parse the enum from string
const parseWordType = (val: string): WordType => {
  switch (val.toLowerCase()) {
    case 'aguda': return WordType.Aguda;
    case 'grave': return WordType.Grave;
    case 'esdrújula': return WordType.Esdrujula;
    case 'sobreesdrújula': return WordType.Sobreesdrujula;
    default: return WordType.Aguda;
  }
};

export const fetchWords = async (targetDifficulty: number = 3): Promise<WordChallenge[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key missing");
    return getFallbackWords();
  }

  const ai = new GoogleGenAI({ apiKey });

  // Determine range based on target difficulty (clamp between 1 and 10)
  const minDiff = Math.max(1, Math.floor(targetDifficulty - 1));
  const maxDiff = Math.min(10, Math.ceil(targetDifficulty + 1));

  const prompt = `
    Genera una lista de 20 palabras en español para un juego de ortografía.
    Mezcla palabras agudas, graves y esdrújulas.
    Algunas deben llevar tilde y otras no.
    
    IMPORTANTE: El nivel de dificultad debe estar entre ${minDiff} y ${maxDiff}.
    Nivel 1 son palabras muy comunes y fáciles (ej: mamá, árbol).
    Nivel 10 son palabras complejas, técnicas o poco comunes (ej: esternocleidomastoideo, fórceps).
    
    Devuelve un JSON con la estructura especificada.
    El campo 'displayWord' debe ser la palabra SIN tilde (ej: 'arbol').
    El campo 'correctWord' debe ser la palabra CON tilde si la lleva (ej: 'árbol').
    El campo 'type' debe ser uno de: 'Aguda', 'Grave', 'Esdrújula'.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              displayWord: { type: Type.STRING },
              correctWord: { type: Type.STRING },
              type: { type: Type.STRING },
              hasTilde: { type: Type.BOOLEAN },
              difficulty: { type: Type.INTEGER },
              explanation: { type: Type.STRING }
            },
            required: ["displayWord", "correctWord", "type", "hasTilde", "difficulty", "explanation"]
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No text returned from AI");

    const data = JSON.parse(jsonText);
    
    // Validate and map
    return data.map((item: any) => ({
      displayWord: item.displayWord,
      correctWord: item.correctWord,
      type: parseWordType(item.type),
      hasTilde: item.hasTilde,
      difficulty: item.difficulty,
      explanation: item.explanation
    }));

  } catch (error) {
    console.error("Error fetching words from Gemini:", error);
    return getFallbackWords();
  }
};

// Fallback in case API fails or key is missing
const getFallbackWords = (): WordChallenge[] => [
  { displayWord: "cancion", correctWord: "canción", type: WordType.Aguda, hasTilde: true, difficulty: 3, explanation: "Aguda terminada en n, s o vocal." },
  { displayWord: "arbol", correctWord: "árbol", type: WordType.Grave, hasTilde: true, difficulty: 4, explanation: "Grave que no termina en n, s o vocal." },
  { displayWord: "casa", correctWord: "casa", type: WordType.Grave, hasTilde: false, difficulty: 1, explanation: "Grave terminada en vocal." },
  { displayWord: "medico", correctWord: "médico", type: WordType.Esdrujula, hasTilde: true, difficulty: 5, explanation: "Esdrújula, siempre lleva tilde." },
  { displayWord: "pared", correctWord: "pared", type: WordType.Aguda, hasTilde: false, difficulty: 2, explanation: "Aguda terminada en d." },
];