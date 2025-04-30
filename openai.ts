import { getTranscriptsForAudioFile } from "./db";
import OpenAI from "openai";
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function generateSOAPNotes(audioFileName: string) {
    const transcripts = await getTranscriptsForAudioFile(audioFileName);
    const prompt = `You are a clinical assistant trained in documenting patient encounters. Given a transcript of a conversation between a healthcare provider and a patient, generate a SOAP note that captures the key points under the following four sections:
            S - Subjective: Patient-reported symptoms, concerns, history.
            O - Objective: Clinician observations, measurements, physical exam findings.
            A - Assessment: Diagnosis or clinical impression.
            P - Plan: Treatment, medications, tests ordered, follow-up plan.

            Keep each section concise, clinically accurate, and professional. Do not invent details—only use information present in the transcript.

        Transcript: ${transcripts.map((t: { transcript: string }) => t.transcript).join('\n')}`;

    const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
    });
    return response.choices[0].message.content;
}