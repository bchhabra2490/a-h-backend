import { AssemblyAI } from "assemblyai";
import dotenv from 'dotenv';

dotenv.config();

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY || '',
});

const keytermsPrompt = [
    // Subjective phrases
    "I’ve been feeling dizzy",
    "Pain started last week",
    "It hurts when I",
    "I feel nauseous",
    "Shortness of breath",
    "Sharp pain in chest",
    "Fever and chills",
    "Trouble sleeping",
    "I’m feeling anxious",
    "Burning sensation",
    "Throbbing headache",
    "Loss of appetite",
    "How long has it lasted?",

    // Objective phrases
    "Blood pressure is elevated",
    "Heart rate normal",
    "Lungs are clear",
    "No signs of infection",
    "Temperature is 101",
    "Skin appears jaundiced",
    "Mild abdominal tenderness",
    "No swelling noted",
    "Reflexes are normal",
    "Eyes are reactive",
    "Mucous membranes moist",

    // Assessment
    "Likely viral infection",
    "Possible UTI",
    "Mild dehydration",
    "Consistent with migraine",
    "No acute distress",
    "Symptoms suggest sinusitis",
    "Could be anxiety-related",
    "Rule out strep",
    "Monitor blood sugar",
    "Chronic back pain",

    // Plan
    "I’ll prescribe antibiotics",
    "Take Tylenol as needed",
    "Refer to specialist",
    "Follow up in one week",
    "Let’s order labs",
    "Increase fluid intake",
    "Start physical therapy",
    "Schedule imaging",
    "Avoid strenuous activity",
    "Try over-the-counter meds",
]

export async function transcribe(fileName: string) {
    // Upload the file to assemblyai    
        const params = {
            audio: fileName,
        }

    // Transcribe the file
    const transcript = await client.transcripts.transcribe({
        audio: fileName,
        keyterms_prompt: keytermsPrompt,
    });
    console.log("Transcript: ", transcript);
    return transcript.text || '';
}