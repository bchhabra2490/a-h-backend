import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { AssemblyAI, RealtimeTranscriber } from 'assemblyai';
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

const assemblyai = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY || '',
});

// Store active file handles for each socket
const activeFiles = new Map<string, string>();
const audioTime = new Map<string, number>();

const AUDIO_DATA_INTERVAL = 5;
const CLIP_INTERVAL = 10;

io.on('connection', async (socket: Socket) => {
  console.log('Client connected:', socket.id);
  
  let token: string;
  let tokenExpirationTime: number;
  
  const refreshToken = async () => {
    try {
      token = await assemblyai.realtime.createTemporaryToken({ expires_in: 60*60*24 });
      tokenExpirationTime = Date.now() + (60*60*24*1000); // 24 hours in milliseconds
      console.log("New token created, expires in 24 hours");
    } catch (error) {
      console.error("Error creating token:", error);
      throw error;
    }
  };

  await refreshToken();

  const fileName = `audio-${socket.id}-${Date.now()}.webm`;
  activeFiles.set(socket.id, fileName);
  audioTime.set(socket.id, 0);  

  let isTranscriberReady = false;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 3;
  let transcriber: RealtimeTranscriber | null = null;
  let lastAudioTime = 0;
  const MIN_AUDIO_INTERVAL = 100; // Minimum time between audio chunks in ms

  const setupTranscriber = async () => {
    // Check if token needs refresh
    if (Date.now() >= tokenExpirationTime) {
      console.log("Token expired, refreshing...");
      await refreshToken();
    }

    if (transcriber) {
      try {
        await transcriber.close();
      } catch (error) {
        console.error("Error closing existing transcriber:", error);
      }
    }

    transcriber = new RealtimeTranscriber({
      token: token,
      sampleRate: 16000,
    });

    transcriber.connect();

    transcriber.on('open', () => {
      console.log("Transcriber opened successfully");
      isTranscriberReady = true;
      reconnectAttempts = 0;
    });

    transcriber.on('transcript', (transcript) => {
      console.log("Transcript: ", transcript);
      if (transcript.text) {
        socket.emit('transcript', { text: transcript.text });
      }
    });

    transcriber.on('error', (error) => {
      console.error("Transcriber error: ", error);
      isTranscriberReady = false;
      handleReconnection();
    });

    transcriber.on('close', () => {
      console.log("Transcriber disconnected");
      isTranscriberReady = false;
      handleReconnection();
    });
  };

  const handleReconnection = async () => {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
      setTimeout(async () => {
        await setupTranscriber();
      }, 1000 * reconnectAttempts); // Exponential backoff
    } else {
      console.error("Max reconnection attempts reached");
      socket.emit('transcription-error', { message: 'Failed to establish transcription connection' });
    }
  };

  await setupTranscriber();

  socket.on('audio-data', async (data: Buffer) => {
    if (!isTranscriberReady || !transcriber) {
      console.log("Transcriber not ready, skipping audio data");
      return;
    }

    // Rate limiting check
    const now = Date.now();
    if (now - lastAudioTime < MIN_AUDIO_INTERVAL) {
      console.log("Skipping audio chunk - too frequent");
      return;
    }
    lastAudioTime = now;

    try {
      // Validate audio data size
      if (data.length === 0) {
        console.log("Skipping empty audio chunk");
        return;
      }

      if (data.length > 1024 * 1024) { // 1MB limit
        console.log("Audio chunk too large, skipping");
        return;
      }

      console.log("Sending audio data to transcriber", data);

      transcriber.sendAudio(data);
    } catch (error) {
      console.error("Error sending audio:", error);
      isTranscriberReady = false;
      handleReconnection();
    }
  });

  socket.on('stop-recording', async () => {
    console.log("Stopping recording");
    if (transcriber) {
      try {
        await transcriber.close();
      } catch (error) {
        console.error("Error closing transcriber:", error);
      }
    }
  });

  socket.on('disconnect', async () => {
    if (transcriber) {
      try {
        await transcriber.close();
      } catch (error) {
        console.error("Error closing transcriber:", error);
      }
    }
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