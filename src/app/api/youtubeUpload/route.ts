import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { experimental_transcribe as transcribe } from 'ai';
import { processTextIntoTopics } from '@/lib/topic-processing';
import youtubedl from 'youtube-dl-exec';
import fs from 'fs/promises';
import path from 'path';

export const maxDuration = 60; // Increased for multiple topic processing

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

      // Download and extract audio
      await youtubedl(youtubeUrl, {
        extractAudio: true,
        audioFormat: 'wav',
        output: path.join(tempDir, '%(title)s.%(ext)s'),
        audioQuality: 0 // Best quality (number, not string)
      });

      // Find the downloaded file (youtube-dl might change the filename)
      const files = await fs.readdir(tempDir);
      const audioFile = files.find(file => file.endsWith('.wav'));
      
      if (!audioFile) {
        throw new Error('Downloaded audio file not found');
      }

      const actualAudioPath = path.join(tempDir, audioFile);
      console.log('Audio download completed:', actualAudioPath);

      // Read the audio file
      const audioBuffer = await fs.readFile(actualAudioPath);

      // Transcribe using OpenAI Whisper
      console.log('Starting transcription...');
      
      const { text } = await transcribe({
        model: openai.transcription('whisper-1'),
        audio: audioBuffer,
      });

      extractedText = text;
      console.log(`Transcription completed. Text length: ${extractedText.length} characters`);

      // Clean up temporary file
      try {
        await fs.unlink(actualAudioPath);
        console.log('Temporary file cleaned up');
      } catch (cleanupError) {
        console.warn('Failed to clean up temporary file:', cleanupError);
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