// import { NextRequest, NextResponse } from 'next/server';
// import { experimental_transcribe as transcribe } from 'ai';
// import { openai } from '@ai-sdk/openai';
// import youtubedl from 'youtube-dl-exec';
// import fs from 'fs/promises';
// import path from 'path';

// export const maxDuration = 60; // Increase timeout for processing

// export async function POST(req: NextRequest) {
//   try {
//     const { youtubeUrl } = await req.json();

//     if (!youtubeUrl) {
//       return NextResponse.json(
//         { error: 'YouTube URL is required' },
//         { status: 400 }
//       );
//     }

//     // Validate YouTube URL
//     const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
//     if (!youtubeRegex.test(youtubeUrl)) {
//       return NextResponse.json(
//         { error: 'Invalid YouTube URL' },
//         { status: 400 }
//       );
//     }

//     // Create temporary directory for audio files
//     const tempDir = path.join(process.cwd(), 'temp');
//     try {
//       await fs.mkdir(tempDir, { recursive: true });
//     } catch (error) {
//       // Directory might already exist
//     }

//     const audioFileName = `audio_${Date.now()}.mp3`;
//     const audioPath = path.join(tempDir, audioFileName);

//     try {
//       // Extract audio from YouTube video
//       console.log('Extracting audio from YouTube...');
//       const ytdlp = youtubedl.create('/opt/homebrew/bin/yt-dlp');
//       await ytdlp(youtubeUrl, {
//         extractAudio: true,
//         audioFormat: 'mp3',
//         audioQuality: 192,
//         output: audioPath,
//         noPlaylist: true,
//       });

//       // Read the audio file
//       console.log('Reading audio file...');
//       const audioBuffer = await fs.readFile(audioPath);

//       // Transcribe using OpenAI Whisper via AI SDK
//       console.log('Transcribing with Whisper...');
//       const { text: transcript } = await transcribe({
//         model: openai.transcription('whisper-1'),
//         audio: audioBuffer,
//         providerOptions: {
//           openai: {
//             language: 'en', 
//             temperature: 0.2,
//           },
//         },
//       });
//       console.log(transcript);


//       // Clean up the temporary audio file
//       try {
//         await fs.unlink(audioPath);
//       } catch (cleanupError) {
//         console.warn('Failed to clean up audio file:', cleanupError);
//       }

//       return NextResponse.json({
//         transcript,
//         message: 'Successfully transcribed YouTube video',
//       });

//     } catch (processingError) {
//       // Clean up the audio file if it exists
//       try {
//         await fs.unlink(audioPath);
//       } catch (cleanupError) {
//         // Ignore cleanup errors
//       }

//       console.error('Processing error:', processingError);
//       return NextResponse.json(
//         { error: 'Failed to process YouTube video. Please check the URL and try again.' },
//         { status: 500 }
//       );
//     }

//   } catch (error) {
//     console.error('YouTube transcription error:', error);
//     return NextResponse.json(
//       { error: 'Failed to transcribe YouTube video' },
//       { status: 500 }
//     );
//   }
// } 