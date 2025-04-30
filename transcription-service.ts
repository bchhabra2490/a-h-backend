import { AssemblyAI } from "assemblyai";
import dotenv from 'dotenv';

dotenv.config();

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY || '',
});

const medicalConversationKeywords = [
    "pain", "nausea", "dizzy", "tired", "fever", "chills", "cough", "sore", "itchy", "burning",
    "pressure", "swelling", "numbness", "tingling", "cramping", "headache", "vomiting", "fatigue", "congestion", "discomfort",
    "chest", "head", "back", "stomach", "abdomen", "leg", "arm", "knee", "throat", "ear",
    "eye", "neck", "shoulder", "foot", "hand",
    "check", "examine", "listen", "test", "scan", "refer", "prescribe", "monitor", "evaluate", "diagnose",
    "treat", "schedule", "follow-up", "bloodwork", "imaging",
    "I feel", "hurts", "started", "getting worse", "cant sleep", "not sure", "been happening", "I think", "every day", "off and on",
    "lets check", "looks like", "sounds like", "could be", "Ill order", "recommend", "suggest", "observe",
    "infection", "inflammation", "diabetes", "hypertension", "migraine", "cold", "flu", "allergy", "asthma", "anxiety",
    "depression", "sinusitis", "UTI", "arthritis", "eczema",
    "symptoms", "duration", "chronic", "acute", "mild", "moderate", "severe", "previous", "medications", "dosage",
    "allergies", "history", "better", "worse", "today"
  ];

export async function transcribe(fileName: string) {
    // Upload the file to assemblyai    
        const params = {
            audio: fileName,
        }

    // Transcribe the file
    const transcript = await client.transcripts.transcribe({
        audio: fileName,
        word_boost: medicalConversationKeywords,
    });

    if (transcript.status === "error") {
        console.error("Error transcribing file: ", transcript.error);
        return '';
    }

    console.log("Transcript: ", transcript);
    return transcript.text || '';
}