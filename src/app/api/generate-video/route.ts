import { NextRequest, NextResponse } from 'next/server';
import { generateVoice, saveVoiceToFile } from '@/lib/voice-generation';
import path from 'path';
import fs from 'fs/promises';

export const maxDuration = 300; // 5 minutes for video generation

export async function POST(req: NextRequest) {
  try {
    const { script, backgroundVideo, voiceEnabled = true } = await req.json();

    if (!script) {
      return NextResponse.json({ error: 'Script is required' }, { status: 400 });
    }

    console.log('Starting video generation...');
    console.log('Script:', script);
    console.log('Background video:', backgroundVideo);
    console.log('Voice enabled:', voiceEnabled);

    let voiceAudioUrl = '';

    // Generate voice audio if enabled
    if (voiceEnabled) {
      try {
        console.log('Generating voice audio...');
        const audioBuffer = await generateVoice({ text: script });
        const audioFilename = `voice_${Date.now()}.mp3`;
        voiceAudioUrl = await saveVoiceToFile(audioBuffer, audioFilename);
        console.log('Voice audio saved:', voiceAudioUrl);
      } catch (voiceError) {
        console.warn('Voice generation failed, continuing without voice:', voiceError);
        // Continue without voice if it fails
      }
    }

    // For now, we'll use the render command via child_process to avoid bundler issues
    // This approach uses Remotion CLI which is more stable with Next.js
    console.log('Preparing video composition data...');
    
    // Create a temporary props file for the render
    const propsData = {
      script,
      backgroundVideo,
      voiceAudio: voiceAudioUrl ? `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${voiceAudioUrl}` : '',
    };

    const propsDir = path.join(process.cwd(), 'temp');
    try {
      await fs.mkdir(propsDir, { recursive: true });
    } catch {
      // Directory might already exist
    }

    const propsFile = path.join(propsDir, `props_${Date.now()}.json`);
    await fs.writeFile(propsFile, JSON.stringify(propsData));

    // Create output directory
    const outputDir = path.join(process.cwd(), 'public', 'generated-videos');
    try {
      await fs.mkdir(outputDir, { recursive: true });
    } catch {
      // Directory might already exist
    }

    const videoFilename = `video_${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, videoFilename);

    // Use child_process to run remotion render
    const { spawn } = await import('child_process');
    
    console.log('Starting Remotion render...');
    
    const renderPromise = new Promise((resolve, reject) => {
      const remotionProcess = spawn('npx', [
        'remotion', 
        'render', 
        'remotion/index.ts',
        'BrainrotVideo',
        outputPath,
        '--props', propsFile,
        '--concurrency', '2',
        '--jpeg-quality', '80',
        '--crf', '23',
        '--pixel-format', 'yuv420p'
      ], {
        stdio: 'pipe',
        cwd: process.cwd()
      });

      let stdout = '';
      let stderr = '';

      remotionProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log('Remotion stdout:', data.toString());
      });

      remotionProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log('Remotion stderr:', data.toString());
      });

      remotionProcess.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Remotion render failed with code ${code}: ${stderr}`));
        }
      });

      remotionProcess.on('error', (error) => {
        reject(error);
      });
    });

    await renderPromise;

    // Clean up props file
    try {
      await fs.unlink(propsFile);
    } catch {
      // Ignore cleanup errors
    }

    let finalVideoUrl = `/generated-videos/${videoFilename}`;

    // Upload to Supabase if configured
    try {
      const { uploadVideoToSupabase } = await import('@/lib/supabase');
      const videoBuffer = await fs.readFile(outputPath);
      const supabaseResult = await uploadVideoToSupabase(videoBuffer, videoFilename);
      
      if (supabaseResult.success && supabaseResult.url) {
        finalVideoUrl = supabaseResult.url;
        console.log('Video uploaded to Supabase successfully');
        
        // Clean up local file after successful upload
        try {
          await fs.unlink(outputPath);
        } catch {
          // Ignore cleanup errors
        }
      }
    } catch (supabaseError) {
      console.warn('Supabase upload failed, using local storage:', supabaseError);
    }
    
    console.log('Video generated successfully:', finalVideoUrl);

    return NextResponse.json({ 
      success: true, 
      videoUrl: finalVideoUrl,
      voiceAudioUrl,
      message: 'Video generated successfully' 
    });

  } catch (error) {
    console.error('Error generating video:', error);
    return NextResponse.json(
      { error: 'Failed to generate video', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 