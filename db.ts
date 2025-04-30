// Save to sqlite db
import { Database } from 'sqlite3';

interface Transcript {
  id: number;
  audio_file_name: string;
  start: number;
  end: number;
  transcript: string;
}

const db = new Database('transcripts.db');

db.run('CREATE TABLE IF NOT EXISTS transcripts (id INTEGER PRIMARY KEY AUTOINCREMENT, audio_file_name TEXT, start INTEGER, end INTEGER, transcript TEXT)');

export function saveTranscriptToDatabase(audioFileName: string, transcript: string, start: number, end: number) {
  db.run('INSERT INTO transcripts (audio_file_name, start, end, transcript) VALUES (?, ?, ?, ?)', [audioFileName, start, end, transcript]);
}

export function getTranscriptsForAudioFile(audioFileName: string): Promise<Transcript[]> {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM transcripts WHERE audio_file_name = ?', [audioFileName], (err, rows: Transcript[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}
