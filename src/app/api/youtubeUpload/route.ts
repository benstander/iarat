import { NextRequest, NextResponse } from 'next/server';
import { processTextIntoTopics } from '@/lib/topic-processing';
import { googleSTTService } from '@/lib/google-stt';
import youtubedl from 'youtube-dl-exec';
import { spawn } from 'child_process';

// Configure youtube-dl-exec with the correct yt-dlp binary path
const ytdl = youtubedl.create('/opt/homebrew/bin/yt-dlp');
import fs from 'fs/promises';
import path from 'path';

export const maxDuration = 600; // Increased for long video processing (up to 10 minutes)

export async function POST(req: NextRequest) {
  try {
    const { youtubeUrl, brainrotStyle = 'engaging and modern', videoStyle = 'brainrot' } = await req.json();

    if (!youtubeUrl) {
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      );
    }

    // Validate YouTube URL
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(youtubeUrl)) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    console.log(`Processing YouTube URL: ${youtubeUrl} (style: ${videoStyle})`);

    // Download audio using youtube-dl
    const tempDir = path.join(process.cwd(), 'temp');
    const audioFilename = `audio_${Date.now()}.wav`;
    const audioPath = path.join(tempDir, audioFilename);

    let extractedText: string;

    try {
      // Ensure temp directory exists
      await fs.mkdir(tempDir, { recursive: true });

      // Download and extract audio (optimized for transcription)
      await ytdl(youtubeUrl, {
        extractAudio: true,
        audioFormat: 'wav',
        output: path.join(tempDir, '%(title)s.%(ext)s'),
        audioQuality: 5, // Lower quality for faster processing (0=best, 9=worst)
        format: 'bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio' // Prefer compressed formats first
      });

      // Find the downloaded file (youtube-dl might change the filename)
      const files = await fs.readdir(tempDir);
      const audioFile = files.find(file => file.endsWith('.wav'));
      
      if (!audioFile) {
        throw new Error('Downloaded audio file not found');
      }

      const actualAudioPath = path.join(tempDir, audioFile);
      console.log('Audio download completed:', actualAudioPath);

      // Optimize audio for fast Google Cloud Storage upload and transcription
      const monoAudioPath = path.join(tempDir, `mono_${audioFile}`);
      console.log('Optimizing audio for fast upload and transcription...');
      await new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
          '-y', '-i', actualAudioPath,
          '-ac', '1',                    // Convert to mono (REQUIRED)
          '-ar', '16000',               // Reduce sample rate to 16kHz (90% size reduction!)
          '-acodec', 'pcm_s16le',       // Use 16-bit PCM encoding (REQUIRED)
          '-ab', '128k',                // Reduce bitrate to 128kbps (faster upload)
          monoAudioPath
        ]);
        ffmpeg.stderr.on('data', data => process.stderr.write(data));
        ffmpeg.on('close', code => {
          if (code === 0) resolve(null);
          else reject(new Error('FFmpeg failed to optimize audio'));
        });
      });
      console.log('Audio optimized for fast upload:', monoAudioPath);

      // Read the mono audio file
      const audioBuffer = await fs.readFile(monoAudioPath);

      // Ensure Google Cloud Storage bucket exists
      await googleSTTService.ensureBucketExists();

      // Transcribe using Google Speech-to-Text
      console.log('Starting transcription with Google STT...');
      
      const transcriptionResult = await googleSTTService.transcribeAudio(audioBuffer, 'en-US');

      extractedText = transcriptionResult.text;
      console.log(`Transcription completed. Text length: ${extractedText.length} characters`);
      if (transcriptionResult.confidence) {
        console.log(`Transcription confidence: ${(transcriptionResult.confidence * 100).toFixed(2)}%`);
      }

      // Clean up temporary files
      try {
        await fs.unlink(actualAudioPath);
        await fs.unlink(monoAudioPath);
        console.log('Temporary files cleaned up');
      } catch (cleanupError) {
        console.warn('Failed to clean up temporary files:', cleanupError);
      }

      if (!extractedText || extractedText.trim().length === 0) {
        return NextResponse.json(
          { error: 'No transcript could be generated from the video' },
          { status: 400 }
        );
      }

    } catch (error) {
      console.error('YouTube processing error:', error);
      
      // Clean up temporary file if it exists
      try {
        await fs.unlink(audioPath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      return NextResponse.json(
        { error: 'Failed to process YouTube video. Please check the URL and try again.' },
        { status: 500 }
      );
    }

    // Process transcript into topics and generate scripts using shared utility
    const summaries = await processTextIntoTopics({
      textContent: extractedText,
      brainrotStyle,
      videoStyle,
      contentType: 'YouTube'
    });

    return NextResponse.json({
      success: true,
      summaries,
      totalTopics: summaries.length,
      message: `Successfully processed YouTube video and created ${summaries.length} topic summaries with ${videoStyle} style`
    });

  } catch (error) {
    console.error('YouTube processing error:', error);
    
    return NextResponse.json(
      { error: 'Failed to process YouTube video' },
      { status: 500 }
    );
  }
} 