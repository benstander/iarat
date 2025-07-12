import { NextRequest, NextResponse } from 'next/server';
import { generateVoice, saveVoiceToFile } from '@/lib/voice-generation';
import { getRandomMinecraftVideoUrl } from '@/lib/processing';
import path from 'path';
import fs from 'fs/promises';

export const maxDuration = 300; // 5 minutes for video generation

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { script, summaries, backgroundVideo, voiceEnabled = true } = body;

    // Handle both single script and multiple summaries
    if (!script && !summaries) {
      return NextResponse.json({ error: 'Script or summaries are required' }, { status: 400 });
    }

    // If summaries are provided, generate videos for each summary
    if (summaries && Array.isArray(summaries)) {
      console.log(`Starting batch video generation for ${summaries.length} summaries...`);
      
      const videoResults = [];
      
      for (let i = 0; i < summaries.length; i++) {
        const summary = summaries[i];
        console.log(`\n=== Generating video ${i + 1}/${summaries.length} ===`);
        console.log('Topic:', summary.topicTitle);
        console.log('Script:', summary.script);
        
        try {
          const result = await generateSingleVideo({
            script: summary.script,
            backgroundVideo: backgroundVideo || 'minecraft',
            voiceEnabled,
            topicTitle: summary.topicTitle,
            topicIndex: summary.topicIndex
          });
          
          videoResults.push({
            ...result,
            topicTitle: summary.topicTitle,
            topicIndex: summary.topicIndex
          });
          
        } catch (error) {
          console.error(`Error generating video for topic ${i + 1}:`, error);
          videoResults.push({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            topicTitle: summary.topicTitle,
            topicIndex: summary.topicIndex
          });
        }
      }
      
      const successfulVideos = videoResults.filter(r => r.success);
      
      return NextResponse.json({
        success: true,
        totalVideos: summaries.length,
        successfulVideos: successfulVideos.length,
        videos: videoResults,
        message: `Generated ${successfulVideos.length}/${summaries.length} videos successfully`
      });
    }

    // Handle single script (existing functionality)
    if (script) {
      console.log('Starting single video generation...');
      const result = await generateSingleVideo({
        script,
        backgroundVideo: backgroundVideo || 'minecraft',
        voiceEnabled
      });
      
      return NextResponse.json(result);
    }

  } catch (error) {
    console.error('Error in video generation API:', error);
    return NextResponse.json(
      { error: 'Failed to generate video(s)', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function generateSingleVideo({
  script,
  backgroundVideo,
  voiceEnabled,
  topicTitle,
  topicIndex
}: {
  script: string;
  backgroundVideo: string;
  voiceEnabled: boolean;
  topicTitle?: string;
  topicIndex?: number;
}) {
  console.log('Script:', script);
  console.log('Background video:', backgroundVideo);
  console.log('Voice enabled:', voiceEnabled);

  let voiceAudioUrl = '';
  let audioDurationInSeconds = 30; // Reduced default fallback to 30 seconds

  // Generate voice audio if enabled
  if (voiceEnabled) {
    try {
      console.log('Generating voice audio...');
      const voiceResult = await generateVoice({ text: script });
      const audioFilename = `voice_${Date.now()}_${topicIndex || 'single'}.mp3`;
      voiceAudioUrl = await saveVoiceToFile(voiceResult.audioBuffer, audioFilename);
      audioDurationInSeconds = voiceResult.durationInSeconds;
      console.log('Voice audio saved:', voiceAudioUrl);
      console.log('Audio duration:', audioDurationInSeconds, 'seconds');
      
      // Validate duration is reasonable
      if (audioDurationInSeconds <= 0 || audioDurationInSeconds > 300) {
        console.warn(`Invalid audio duration detected: ${audioDurationInSeconds}s, using fallback`);
        audioDurationInSeconds = 30;
      }
    } catch (voiceError) {
      console.error('Voice generation failed with error:', voiceError);
      console.warn('Voice generation failed - creating shorter text-only video');
      // For text-only videos when voice fails, use much shorter duration
      audioDurationInSeconds = 12; // 12 seconds for text-only
    }
  } else {
    console.log('Voice generation disabled, using shorter duration for text-only video');
    audioDurationInSeconds = 12; // 12 seconds for intentionally text-only videos
  }

  // Get random minecraft video URL from Supabase
  let bgVideoUrl = '';
  if (backgroundVideo === 'minecraft') {
    bgVideoUrl = getRandomMinecraftVideoUrl();
    console.log('Using random minecraft video:', bgVideoUrl);
  }

  // For now, we'll use the render command via child_process to avoid bundler issues
  // This approach uses Remotion CLI which is more stable with Next.js
  console.log('Preparing video composition data...');
  
  // Create a temporary props file for the render
  const propsData = {
    script,
    backgroundVideo: bgVideoUrl || backgroundVideo,
    voiceAudio: voiceAudioUrl, // voiceAudioUrl is already a complete URL from Supabase
  };

  const propsDir = path.join(process.cwd(), 'temp');
  try {
    await fs.mkdir(propsDir, { recursive: true });
  } catch {
    // Directory might already exist
  }

  const propsFile = path.join(propsDir, `props_${Date.now()}_${topicIndex || 'single'}.json`);
  await fs.writeFile(propsFile, JSON.stringify(propsData));

  // Create output directory
  const outputDir = path.join(process.cwd(), 'public', 'generated-videos');
  try {
    await fs.mkdir(outputDir, { recursive: true });
  } catch {
    // Directory might already exist
  }

  const videoFilename = `video_${Date.now()}_${topicIndex ? `topic${topicIndex}` : 'single'}.mp4`;
  const outputPath = path.join(outputDir, videoFilename);

  // Calculate video duration in frames (30 fps)
  const durationInFrames = Math.ceil(audioDurationInSeconds * 30);
  console.log(`Video duration: ${audioDurationInSeconds}s (${durationInFrames} frames at 30fps)`);

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
      '--duration-in-frames', durationInFrames.toString(),
      '--concurrency', '4', // Increased from 2
      '--jpeg-quality', '60', // Reduced from 80
      '--crf', '28', // Increased from 23 (lower quality, faster render)
      '--pixel-format', 'yuv420p',
      '--every-nth-frame', '2', // Skip every other frame for faster render
      '--disable-web-security', // Can help with external URLs
      '--timeout', '30000' // 30 second timeout per frame
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

  return { 
    success: true, 
    videoUrl: finalVideoUrl,
    voiceAudioUrl,
    message: topicTitle ? `Video for "${topicTitle}" generated successfully` : 'Video generated successfully'
  };
} 