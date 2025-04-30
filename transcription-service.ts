import { AssemblyAI } from "assemblyai";
import dotenv from 'dotenv';

dotenv.config();

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY || '',
});

export async function transcribe(fileName: string) {
    // Upload the file to assemblyai    
        const params = {
            audio: fileName,
        }

    // Transcribe the file
    const transcript = await client.transcripts.transcribe(params);
    console.log("Transcript: ", transcript);
    return transcript.text || '';
}