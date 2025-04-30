import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { AssemblyAI } from 'assemblyai';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import { transcribe } from './transcription-service';
import { saveTranscriptToDatabase } from './db';
import { generateSOAPNotes } from './openai';
import { clipFile } from './utils';
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Store active file handles for each socket
const activeFiles = new Map<string, string>();
const audioTime = new Map<string, number>();

const AUDIO_DATA_INTERVAL = 5;
const CLIP_INTERVAL = 10;

io.on('connection', async (socket: Socket) => {
  console.log('Client connected:', socket.id);
  
  // Create a unique file for this socket connection
  const fileName = `audio-${socket.id}-${Date.now()}.webm`;
  activeFiles.set(socket.id, fileName);
  audioTime.set(socket.id, 0);  

  socket.on('audio-data', async (data: Buffer) => {
    console.log("Audio data received", data.length);
    const fileName = activeFiles.get(socket.id);

    const currentAudioTime = audioTime.get(socket.id) || 0;
    audioTime.set(socket.id, currentAudioTime + 5);
    
    if (data && fileName) {
      try {
        // Append data to the file
        fs.appendFileSync(fileName, data);
        
        if((currentAudioTime + AUDIO_DATA_INTERVAL) % CLIP_INTERVAL === 0) {
          // Create a new clip
          const startInterval = currentAudioTime - AUDIO_DATA_INTERVAL;
          const endInterval = currentAudioTime + AUDIO_DATA_INTERVAL;
          await processAudioClip(fileName, startInterval, endInterval, socket);
        }
      } catch (error) {
        console.error('Error sending audio data:', error);
      }
    }
  });

  socket.on('stop-recording', async () => {
    console.log("Stopping recording");
    const fileName = activeFiles.get(socket.id);
    if (!fileName) {
      console.error("No file name found");
      return;
    }

    const currentAudioTime = audioTime.get(socket.id) || 0;
    if(currentAudioTime > 0 && currentAudioTime % 5 === 0 && currentAudioTime % CLIP_INTERVAL !== 0) {
      // Save the clip of the rest of the audio

      const extraAudioTime = currentAudioTime % CLIP_INTERVAL;
      const startInterval = currentAudioTime - extraAudioTime;
      const endInterval = currentAudioTime;
      
      await processAudioClip(fileName, startInterval, endInterval, socket);
    }
    // TODO: Upload the complete audio file

    // Generate the SOAP notes from transcripts
    const soapNotes = await generateSOAPNotes(fileName);
    console.log("SOAP notes: ", soapNotes);
    // Send the SOAP notes to the client
    socket.emit('soap-notes', { text: soapNotes });
  });

  socket.on('disconnect', async () => {
    // Clean up the file
    const fileName = activeFiles.get(socket.id);
    if (fileName) {
      activeFiles.delete(socket.id);
    }
    console.log('Client disconnected:', socket.id);
  });
});

async function processAudioClip(fileName: string, startInterval: number, endInterval: number, socket: Socket) {
  const clipFileName = await clipFile(fileName, startInterval, endInterval);
  if (!clipFileName) return;

  try {
    // Get the transcript for the clip
    const transcript = await transcribe(clipFileName);

    // Save the transcript to the database against the interval.
    saveTranscriptToDatabase(fileName, transcript, startInterval, endInterval);
    socket.emit('transcript', { text: transcript, startInterval, endInterval });
  } catch (error) {
    console.error('Error processing clip:', error);
  } finally {
    // Clean up the clip file
    if (fs.existsSync(clipFileName)) {
      fs.unlinkSync(clipFileName);
    }
  }
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 