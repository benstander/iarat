import ytdl from 'ytdl-core'
import { experimental_transcribe as transcribe } from 'ai'
import { openai } from '@ai-sdk/openai'
import { supabase } from './supabase';

const MINECRAFT_VIDEOS = [
  'mp1.mp4',
  'mp2.mp4',
  'mp3.mp4',
  'mp4.mp4',
  'mp5.mp4',
];

export async function urlToAudioBuffer(url: string) {
    if (!ytdl.validateURL(url)) {
        throw new Error('Invalid YouTube URL')
    }

    const audioStream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' })

    // Collect audio data chunks into a Buffer
    const chunks: Buffer[] = []
    for await (const chunk of audioStream) {
        chunks.push(chunk)
    }
    const audioBuffer = Buffer.concat(chunks)

    return audioBuffer;
}

export async function transcribeAudio(audioBuffer: Buffer) {
    // Now call experimental_transcribe
    const result = await transcribe({
        model: openai.transcription('whisper-1'),
        audio: audioBuffer,
        providerOptions: { openai: { language: 'en' } },
    })

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