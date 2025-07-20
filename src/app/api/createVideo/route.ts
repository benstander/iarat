import { NextRequest, NextResponse } from 'next/server';
import { FFmpegVideoRenderer } from '@/lib/ffmpeg-renderer';
import { generateVoice, saveVoiceToFile } from '@/lib/voice-generation';
import { getRandomMinecraftVideoUrl, getRandomSubwayVideoUrl, getRandomMegaRampVideoUrl } from '@/lib/processing';
import { validateScriptDuration } from '@/lib/script-generation';
import fs from 'fs/promises';
import path from 'path';
import { generateScriptForTopic } from '@/lib/topic-processing';

export const maxDuration = 300; // 5 minutes for video generation

// Video duration constants
const MAX_VIDEO_DURATION_SECONDS = 60; // Absolute maximum: 1 minute
const FALLBACK_DURATION_SECONDS = 20;  // For text-only videos

// Utility: Replace 'fr' with 'for real' for TTS (standalone word, case-insensitive)
function replaceFrWithForReal(text: string): string {
  // Replace 'fr' as a standalone word (case-insensitive) with 'for real'
  return text.replace(/\bfr\b/gi, 'for real');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { script, summaries, backgroundVideo, voiceEnabled = true, voiceOptions } = body;

    console.log('=== API Request Debug ===');
    console.log('Voice options received in API:', voiceOptions);
    console.log('Background video:', backgroundVideo);

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
        
        try {
          // Generate script now using the user's selected voice style
          let scriptToUse = summary.script;
          
          if (!scriptToUse && summary.content && voiceOptions?.style) {
            console.log(`Generating script for topic "${summary.topicTitle}" with voice style: ${voiceOptions.style}`);
            scriptToUse = await generateScriptForTopic(summary, voiceOptions.style);
          }
          
          if (!scriptToUse) {
            throw new Error(`No script available for topic: ${summary.topicTitle}`);
          }
          
          console.log('Script:', scriptToUse);
          
          const result = await generateSingleVideo({
            script: scriptToUse,
            backgroundVideo: backgroundVideo || 'minecraft',
            voiceEnabled,
            voiceOptions,
            topicTitle: summary.topicTitle,
            topicIndex: summary.topicIndex,
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
        voiceEnabled,
        voiceOptions,
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
  voiceOptions,
  topicTitle,
  topicIndex,
}: {
  script: string;
  backgroundVideo: string;
  voiceEnabled: boolean;
  voiceOptions?: { style: string; character: string };
  topicTitle?: string;
  topicIndex?: number;
}) {
  console.log('Script:', script);
  console.log('Background video:', backgroundVideo);
  console.log('Voice enabled:', voiceEnabled);

  let voiceAudioUrl = '';
  let voiceAudioFilePath = '';
  let audioDurationInSeconds = FALLBACK_DURATION_SECONDS;

  // Log script information for monitoring
  const scriptValidation = validateScriptDuration(script, 120); // Allow up to 2 minutes
  console.log(`Script info: ${scriptValidation.actualWords} words (~${scriptValidation.estimatedDuration.toFixed(1)}s estimated duration)`);
  
  if (scriptValidation.estimatedDuration > 90) {
    console.warn(`Script is quite long (~${scriptValidation.estimatedDuration.toFixed(1)}s), but proceeding to preserve educational content`);
  }

  // Generate voice audio if enabled
  let wordTimestamps: Array<{ word: string; startTime: number; endTime: number }> | undefined;
  if (voiceEnabled) {
    try {
      // Use TTS-specific script for voiceover (replace 'fr' with 'for real')
      const ttsScript = replaceFrWithForReal(script);
      console.log('Generating voice audio...');
      console.log(`TTS Script:`, ttsScript);
      console.log(`Script length: ${ttsScript.length} characters, ${ttsScript.trim().split(/\s+/).length} words`);
      
      const voiceResult = await generateVoice({ 
        text: ttsScript, 
        voiceOptions: voiceOptions 
      });
      const audioFilename = `voice_${Date.now()}_${topicIndex || 'single'}.mp3`;
      const { publicUrl: voiceAudioUrlPublic, filePath: voiceAudioFilePathResult } = await saveVoiceToFile(voiceResult.audioBuffer, audioFilename);
      voiceAudioUrl = voiceAudioUrlPublic;
      voiceAudioFilePath = voiceAudioFilePathResult;
      audioDurationInSeconds = voiceResult.durationInSeconds;
      
      // Capture word timestamps for precise caption timing
      if (voiceResult.wordTimestamps && voiceResult.wordTimestamps.length > 0) {
        wordTimestamps = voiceResult.wordTimestamps;
        console.log(`Captured ${wordTimestamps.length} word timestamps from ElevenLabs`);
      } else {
        console.log('No word timestamps available from ElevenLabs');
      }
      
      console.log('Voice audio saved:', voiceAudioUrl);
      console.log('Audio duration:', audioDurationInSeconds, 'seconds');
      
      // Note: Allowing videos longer than 60 seconds if needed for content completeness
      if (audioDurationInSeconds > 120) {
        console.warn(`Audio duration is very long (${audioDurationInSeconds}s), but proceeding to preserve content`);
      }
      
      // Validate duration is reasonable
      if (audioDurationInSeconds <= 0 || audioDurationInSeconds > 300) {
        console.warn(`Invalid audio duration detected: ${audioDurationInSeconds}s, using fallback`);
        audioDurationInSeconds = FALLBACK_DURATION_SECONDS;
      }
      
    } catch (voiceError) {
      console.error('Voice generation failed with error:', voiceError);
      console.warn('Voice generation failed - creating shorter text-only video');
      voiceAudioFilePath = '';
    }
  } else {
    console.log('Voice generation disabled, using shorter duration for text-only video');
    voiceAudioFilePath = '';
  }

  // Use actual audio duration without artificial caps
  const finalDuration = audioDurationInSeconds;

  // Get background video URL based on selection
  let bgVideoUrl = '';
  if (backgroundVideo === 'minecraft') {
    bgVideoUrl = getRandomMinecraftVideoUrl();
    console.log('Using random minecraft video:', bgVideoUrl);
  } else if (backgroundVideo === 'subway') {
    bgVideoUrl = getRandomSubwayVideoUrl();
    console.log('Using random subway video:', bgVideoUrl);
  } else if (backgroundVideo === 'mega-ramp') {
    bgVideoUrl = getRandomMegaRampVideoUrl();
    console.log('Using random mega-ramp video:', bgVideoUrl);
  } else {
    // Fallback to minecraft if backgroundVideo is not recognized
    bgVideoUrl = getRandomMinecraftVideoUrl();
    console.log('Unknown background video type, falling back to minecraft:', bgVideoUrl);
  }

  // Create output directory
  const outputDir = path.join(process.cwd(), 'public', 'generated-videos');
  try {
    await fs.mkdir(outputDir, { recursive: true });
  } catch {
    // Directory might already exist
  }

  const videoFilename = `video_${Date.now()}_${topicIndex ? `topic${topicIndex}` : 'single'}.mp4`;
  const outputPath = path.join(outputDir, videoFilename);

  console.log(`Starting FFmpeg video render...`);
  console.log(`Video duration: ${finalDuration}s`);

  // Use FFmpeg to render the video
  try {
    await FFmpegVideoRenderer.renderVideoAdvanced({
      script,
      backgroundVideo: bgVideoUrl, // Now always a proper URL
      voiceAudio: voiceAudioFilePath, // Use the full path here!
      audioDurationInSeconds: finalDuration,
      outputPath,
      wordTimestamps, // Pass ElevenLabs word timestamps for precise caption timing
    });
  } catch (renderError) {
    console.error('FFmpeg render failed:', renderError);
    throw new Error(`Video rendering failed: ${renderError instanceof Error ? renderError.message : 'Unknown error'}`);
  }

  let finalVideoUrl = `/generated-videos/${videoFilename}`;

  // No Supabase upload, just return local URL
  console.log('Video generated successfully:', finalVideoUrl);
  console.log(`Final video duration: ${finalDuration}s`);

  return { 
    success: true, 
    videoUrl: finalVideoUrl,
    voiceAudioUrl,
    duration: finalDuration,
    maxDuration: finalDuration,
    message: topicTitle ? `Video for "${topicTitle}" generated successfully (${finalDuration}s)` : `Video generated successfully (${finalDuration}s)`
  };
} 