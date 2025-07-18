import ytdl from 'ytdl-core'
import { googleSTTService } from './google-stt'
import { supabase } from './supabase';

const MINECRAFT_VIDEOS = [
  'mp1.mp4',
  'mp2.mp4',
  'mp3.mp4',
  'mp4.mp4',
  'mp5.mp4',
];

// Optimized audio download settings
const AUDIO_QUALITY_OPTIONS: ytdl.downloadOptions = {
  filter: 'audioonly' as ytdl.Filter,
  quality: 'highestaudio',
  // Optimize for speech
  highWaterMark: 1 << 25, // 32MB buffer
  dlChunkSize: 1024 * 1024 * 10, // 10MB chunks
};

export async function urlToAudioBuffer(url: string) {
    if (!ytdl.validateURL(url)) {
        throw new Error('Invalid YouTube URL')
    }

    const audioStream = ytdl(url, AUDIO_QUALITY_OPTIONS)

    // Use a more efficient buffer collection method
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = []
        let totalLength = 0

        audioStream.on('data', (chunk: Buffer) => {
            chunks.push(chunk)
            totalLength += chunk.length
        })

        audioStream.on('end', () => {
            const audioBuffer = Buffer.concat(chunks, totalLength)
            resolve(audioBuffer)
        })

        audioStream.on('error', (err) => {
            reject(err)
        })
    })
}

export async function transcribeAudio(audioBuffer: Buffer) {
    // Ensure Google Cloud Storage bucket exists
    await googleSTTService.ensureBucketExists();
    
    // Use Google Speech-to-Text for transcription
    const result = await googleSTTService.transcribeAudio(audioBuffer, 'en-US');

    return result.text
}

export function getRandomMinecraftVideoUrl() {
  const randomIndex = Math.floor(Math.random() * MINECRAFT_VIDEOS.length);
  const filename = MINECRAFT_VIDEOS[randomIndex];
  const { data } = supabase
    .storage
    .from('background-videos')
    .getPublicUrl(`minecraft parkour/${filename}`);
  return data.publicUrl;
}