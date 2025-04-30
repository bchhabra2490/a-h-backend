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
    
        Transcript: ${transcripts.map((t, index) => `[${index}] ${t.transcript}`).join('\n')}
        
        Provide index of the transcripts that you are using to generate the SOAP note against each note.
        Return the SOAP note in following JSON format:
        [{
            "category": "Subjective",
            "notes": [{
                "content": "SOAP note 1",
                "transcriptIndices": [index1, index2, index3]
            }]
        },
        {
            "category": "Objective",
            "notes": [{
                "content": "SOAP note content",
                "transcriptIndices": [index1, index2, index3]
            }]
        },
        {
            "category": "Assessment",
            "notes": [{
                "content": "SOAP note content",
                "transcriptIndices": [index1, index2, index3]
            }]
        },
        {
            "category": "Plan",
            "notes": [{
                "content": "SOAP note 2",
                "transcriptIndices": [index1, index2, index3]
            }]
        }
        ] Do not include any other text in your response. Give the transcript indices in ascending order.`;

    const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
    });
    return response.choices[0].message.content;
}