import { getTranscriptsForAudioFile } from "./db";
import OpenAI from "openai";
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function generateSOAPNotes(audioFileName: string) {
    const transcripts = await getTranscriptsForAudioFile(audioFileName);
    console.log("Transcripts: ", transcripts);
    const prompt = `Generate SOAP notes for the following transcripts: ${transcripts.map((t: { transcript: string }) => t.transcript).join('\n')}`;
    const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
    });
    return response.choices[0].message.content;
}