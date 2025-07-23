import ytdl from 'ytdl-core'
// import { googleSTTService } from './google-stt'
import { supabase } from './supabase';

const MINECRAFT_VIDEOS = [
  'mp1.mp4',
  'mp2.mp4',
  'mp3.mp4',
  'mp4.mp4',
  'mp5.mp4',
];

const SUBWAY_VIDEOS = [
  'ss1.mp4',
  'ss2.mp4',
  'ss3.mp4',
  'ss4.mp4',
  'ss5.mp4',
];

const MEGA_RAMP_VIDEOS = [
  'gta1.mp4',
  'gta2.mp4',
  'gta3.mp4',
  'gta4.mp4',
  'gta5.mp4',
];

const CELEBRITY_VIDEOS = [
  'ronaldo.mp4',
  'trump.mp4',
  'theo-von.mp4',
  'matthew-mc.mp4',
  'lebron.mp4',
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

// export async function transcribeAudio(audioBuffer: Buffer) {
//     // Ensure Google Cloud Storage bucket exists
//     await googleSTTService.ensureBucketExists();
    
//     // Use Google Speech-to-Text for transcription
//     const result = await googleSTTService.transcribeAudio(audioBuffer, 'en-US');

//     return result.text
// }

export function getRandomMinecraftVideoUrl() {
  const randomIndex = Math.floor(Math.random() * MINECRAFT_VIDEOS.length);
  const filename = MINECRAFT_VIDEOS[randomIndex];
  const { data } = supabase
    .storage
    .from('background-videos')
    .getPublicUrl(`minecraft/${filename}`);
  return data.publicUrl;
}

export function getRandomSubwayVideoUrl() {
  const randomIndex = Math.floor(Math.random() * SUBWAY_VIDEOS.length);
  const filename = SUBWAY_VIDEOS[randomIndex];
  const { data } = supabase
    .storage
    .from('background-videos')
    .getPublicUrl(`subway/${filename}`);
  return data.publicUrl;
}

export function getRandomMegaRampVideoUrl() {
  const randomIndex = Math.floor(Math.random() * MEGA_RAMP_VIDEOS.length);
  const filename = MEGA_RAMP_VIDEOS[randomIndex];
  const { data } = supabase
    .storage
    .from('background-videos')
    .getPublicUrl(`gta/${filename}`);
  return data.publicUrl;
}

// Specific celebrity video functions
export function getLebronVideoUrl() {
  const { data } = supabase
    .storage
    .from('background-videos')
    .getPublicUrl('celebs/lebron.mp4');
  return data.publicUrl;
}

export function getRonaldoVideoUrl() {
  const { data } = supabase
    .storage
    .from('background-videos')
    .getPublicUrl('celebs/ronaldo.mp4');
  return data.publicUrl;
}

export function getTrumpVideoUrl() {
  const { data } = supabase
    .storage
    .from('background-videos')
    .getPublicUrl('celebs/trump.mp4');
  return data.publicUrl;
}

export function getTheoVonVideoUrl() {
  const { data } = supabase
    .storage
    .from('background-videos')
    .getPublicUrl('celebs/theo-von.mp4');
  return data.publicUrl;
}

export function getMatthewMcVideoUrl() {
  const { data } = supabase
    .storage
    .from('background-videos')
    .getPublicUrl('celebs/matthew-mc.mp4');
  return data.publicUrl;
}

export function getElonMuskVideoUrl() {
  const { data } = supabase
    .storage
    .from('background-videos')
    .getPublicUrl('celebs/elon.mp4');
  return data.publicUrl;
}