import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import https from 'https';
import http from 'http';
import { URL } from 'url';

export interface FFmpegVideoOptions {
  script: string;
  backgroundVideo: string;
  voiceAudio: string;
  audioDurationInSeconds: number;
  outputPath: string;
}

export interface CaptionChunk {
  text: string;
  startTime: number;
  endTime: number;
}

export class FFmpegVideoRenderer {
  private static readonly VIDEO_WIDTH = 1080;
  private static readonly VIDEO_HEIGHT = 1920;
  private static readonly FPS = 30; // Reduced from 45 for better compatibility
  private static readonly FONT_SIZE = 32;
  private static readonly FONT_FAMILY = 'Arial Black';
  private static readonly MAX_WORDS_PER_CAPTION = 3;
  private static readonly MIN_WORDS_PER_CAPTION = 1;
  private static readonly WORDS_PER_MINUTE = 180;

  /**
   * Download file from URL to temporary location
   */
  private static async downloadFile(url: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      const file = require('fs').createWriteStream(outputPath);
      const request = client.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download file: ${response.statusCode}`));
          return;
        }
        
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      });
      
      request.on('error', reject);
      file.on('error', reject);
    });
  }

  /**
   * Check if a path is a URL
   */
  private static isUrl(path: string): boolean {
    try {
      new URL(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate word-by-word captions that sync with voice timing
   */
  public static generateCaptions(script: string, durationInSeconds: number): CaptionChunk[] {
    // Clean and normalize the script
    const cleanScript = script.replace(/\s+/g, ' ').trim();
    
    // Split into individual words
    const words = cleanScript.split(/\s+/).filter(word => word.trim().length > 0);
    
    if (words.length === 0) {
      return [{ text: 'NO TEXT', startTime: 0, endTime: durationInSeconds }];
    }
    
    // Caption timing configuration
    const CAPTION_LEAD_TIME = 0.3; // Show captions 0.3s earlier for reading time
    const NATURAL_PAUSE_FACTOR = 0.85; // Account for natural speech pauses (15% buffer)
    const MIN_CAPTION_DURATION = 3.5; // Minimum time to show each caption (increased from 2.5)
    const MAX_CAPTION_DURATION = 8.0; // Maximum time to show each caption (increased from 6.0)
    const CAPTION_EXTENSION_FACTOR = 2.5; // Make captions 150% longer for better readability
    const NO_OVERLAP = true; // Ensure no overlap between captions
    
    // Calculate more realistic speech timing
    const totalWords = words.length;
    const effectiveDuration = durationInSeconds * NATURAL_PAUSE_FACTOR;
    const baseSecondsPerWord = effectiveDuration / totalWords;
    
    console.log(`Caption timing: ${totalWords} words, ${durationInSeconds}s total, ${baseSecondsPerWord.toFixed(2)}s per word`);
    
    // Create word chunks (1-3 words each)
    const chunks: CaptionChunk[] = [];
    let currentWordIndex = 0;
    let currentTimePosition = 0;
    
    while (currentWordIndex < words.length) {
      // Determine chunk size (1-3 words)
      const remainingWords = words.length - currentWordIndex;
      let chunkSize: number;
      
      if (remainingWords === 1) {
        chunkSize = 1;
      } else if (remainingWords === 2) {
        chunkSize = 2;
      } else {
        // Randomly choose 1-3 words, favoring 2-3 for better flow
        const random = Math.random();
        if (random < 0.2) {
          chunkSize = 1; // 20% chance of single word
        } else if (random < 0.7) {
          chunkSize = 2; // 50% chance of two words
        } else {
          chunkSize = 3; // 30% chance of three words
        }
        
        // Don't exceed remaining words
        chunkSize = Math.min(chunkSize, remainingWords);
      }
      
      // Create the chunk
      const chunkWords = words.slice(currentWordIndex, currentWordIndex + chunkSize);
      const chunkText = chunkWords.join(' ').toUpperCase();
      
      // Calculate timing for this chunk with improvements
      const chunkDuration = chunkSize * baseSecondsPerWord;
      const extendedDuration = chunkDuration * CAPTION_EXTENSION_FACTOR; // Make captions stay longer
      const adjustedDuration = Math.max(MIN_CAPTION_DURATION, Math.min(MAX_CAPTION_DURATION, extendedDuration));
      
      // Apply lead time - show captions earlier
      const startTime = Math.max(0, currentTimePosition - CAPTION_LEAD_TIME);
      const endTime = Math.min(durationInSeconds, currentTimePosition + adjustedDuration - CAPTION_LEAD_TIME);
      
      chunks.push({
        text: chunkText,
        startTime: startTime,
        endTime: endTime
      });
      
      currentWordIndex += chunkSize;
      currentTimePosition += chunkDuration; // Use original duration for position tracking
    }
    
    // Post-process to ensure no overlap between captions
    if (NO_OVERLAP) {
      for (let i = 0; i < chunks.length - 1; i++) {
        const currentChunk = chunks[i];
        const nextChunk = chunks[i + 1];
        
        // Ensure no overlap - if captions overlap, adjust timing
        if (currentChunk.endTime > nextChunk.startTime) {
          // Add small gap between captions for clarity
          const gap = 0.1; // 0.1 second gap between captions
          
          // Prioritize keeping minimum duration - adjust start time of next caption
          const overlap = currentChunk.endTime - nextChunk.startTime;
          nextChunk.startTime = currentChunk.endTime + gap;
          
          // Ensure next caption still has minimum duration
          const nextDuration = nextChunk.endTime - nextChunk.startTime;
          if (nextDuration < MIN_CAPTION_DURATION) {
            nextChunk.endTime = nextChunk.startTime + MIN_CAPTION_DURATION;
          }
        }
      }
    }
    
    // Debug logging
    console.log(`Generated ${chunks.length} caption chunks with extended duration (no overlap):`);
    chunks.forEach((chunk, index) => {
      console.log(`  ${index + 1}. [${chunk.startTime.toFixed(2)}s - ${chunk.endTime.toFixed(2)}s] (${(chunk.endTime - chunk.startTime).toFixed(2)}s) "${chunk.text}"`);
    });
    
    // Log timing statistics
    const totalCaptionTime = chunks.reduce((sum, chunk) => sum + (chunk.endTime - chunk.startTime), 0);
    const averageDuration = totalCaptionTime / chunks.length;
    console.log(`Caption stats: avg duration ${averageDuration.toFixed(2)}s, total time ${totalCaptionTime.toFixed(2)}s`);
    
    return chunks;
  }

  /**
   * Create SRT subtitle file from captions
   */
  private static async createSubtitleFile(captions: CaptionChunk[], outputPath: string): Promise<string> {
    const srtContent = captions.map((caption, index) => {
      const startTime = this.formatTime(caption.startTime);
      const endTime = this.formatTime(caption.endTime);
      
      return `${index + 1}\n${startTime} --> ${endTime}\n${caption.text}\n`;
    }).join('\n');

    await fs.writeFile(outputPath, srtContent, 'utf8');
    console.log(`Created SRT subtitle file with ${captions.length} captions at: ${outputPath}`);
    return outputPath;
  }

  /**
   * Format time for SRT format (HH:MM:SS,mmm)
   */
  private static formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
  }

  /**
   * Render video using FFmpeg with improved reliability
   */
  static async renderVideo(options: FFmpegVideoOptions): Promise<void> {
    const { script, backgroundVideo, voiceAudio, audioDurationInSeconds, outputPath } = options;
    
    console.log('Starting FFmpeg video render...');
    console.log('Options:', { 
      script: script.substring(0, 100) + '...', 
      backgroundVideo: this.isUrl(backgroundVideo) ? 'URL' : backgroundVideo,
      voiceAudio: this.isUrl(voiceAudio) ? 'URL' : voiceAudio,
      audioDurationInSeconds 
    });

    // Handle background video - download if it's a URL
    let localBackgroundVideo = backgroundVideo;
    let tempBackgroundVideo = '';
    
    if (this.isUrl(backgroundVideo)) {
      tempBackgroundVideo = path.join(path.dirname(outputPath), `temp_bg_${Date.now()}.mp4`);
      console.log('Downloading background video from URL...');
      await this.downloadFile(backgroundVideo, tempBackgroundVideo);
      localBackgroundVideo = tempBackgroundVideo;
      console.log('Background video downloaded successfully');
    }

    // Handle voice audio - download if it's a URL
    let localVoiceAudio = voiceAudio;
    let tempVoiceAudio = '';
    
    if (this.isUrl(voiceAudio)) {
      tempVoiceAudio = path.join(path.dirname(outputPath), `temp_voice_${Date.now()}.mp3`);
      console.log('Downloading voice audio from URL...');
      await this.downloadFile(voiceAudio, tempVoiceAudio);
      localVoiceAudio = tempVoiceAudio;
      console.log('Voice audio downloaded successfully');
    }

    // Generate captions
    const captions = this.generateCaptions(script, audioDurationInSeconds);
    console.log(`Generated ${captions.length} caption chunks`);

    // Create temporary subtitle file
    const subtitlePath = path.join(path.dirname(outputPath), `subtitles_${Date.now()}.srt`);
    await this.createSubtitleFile(captions, subtitlePath);

    // Use stream_loop for more reliable looping
    const ffmpegArgs = [
      '-y', // Overwrite output file
      '-stream_loop', '-1', // Loop the background video indefinitely
      '-i', localBackgroundVideo, // Background video input
      '-i', localVoiceAudio, // Voice audio input
      
      // Simplified filter chain for better reliability
      '-filter_complex', `
        [0:v]scale=${this.VIDEO_WIDTH}:${this.VIDEO_HEIGHT}:force_original_aspect_ratio=decrease,
        pad=${this.VIDEO_WIDTH}:${this.VIDEO_HEIGHT}:(ow-iw)/2:(oh-ih)/2:black,
        fps=${this.FPS}[scaled];
        
        [scaled]subtitles=${subtitlePath.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}:force_style='FontName=${this.FONT_FAMILY},FontSize=${this.FONT_SIZE},PrimaryColour=&Hffffff,OutlineColour=&H000000,Outline=3,Shadow=2,Bold=1,Alignment=2,MarginV=100'[with_subs];
        
        [with_subs]drawtext=text='🔥':fontsize=32:fontcolor=white:x=60:y=100:alpha=0.8[emoji1];
        [emoji1]drawtext=text='⚡':fontsize=32:fontcolor=white:x=w-100:y=100:alpha=0.8[final_video];
        
        [1:a]volume=1.0[voice_audio];
        [0:a]volume=0.2[bg_audio];
        [voice_audio][bg_audio]amix=inputs=2:duration=first:dropout_transition=3[audio_out]
      `.replace(/\s+/g, ' ').trim(),
      
      // Output settings
      '-map', '[final_video]',
      '-map', '[audio_out]',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-r', this.FPS.toString(),
      '-pix_fmt', 'yuv420p',
      '-t', audioDurationInSeconds.toString(),
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      outputPath
    ];

    console.log('FFmpeg command:', ['ffmpeg', ...ffmpegArgs].join(' '));

    return new Promise((resolve, reject) => {
      const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
        stdio: 'pipe'
      });

      let stderr = '';

      ffmpegProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log('FFmpeg:', data.toString());
      });

      ffmpegProcess.on('close', async (code) => {
        // Clean up temporary files
        const cleanupPromises = [];
        
        if (tempBackgroundVideo) {
          cleanupPromises.push(fs.unlink(tempBackgroundVideo).catch(() => {}));
        }
        if (tempVoiceAudio) {
          cleanupPromises.push(fs.unlink(tempVoiceAudio).catch(() => {}));
        }
        cleanupPromises.push(fs.unlink(subtitlePath).catch(() => {}));
        
        await Promise.all(cleanupPromises);

        if (code === 0) {
          console.log('FFmpeg render completed successfully');
          resolve();
        } else {
          console.error('FFmpeg failed with error:', stderr);
          reject(new Error(`FFmpeg render failed with code ${code}: ${stderr}`));
        }
      });

      ffmpegProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Render video with enhanced subtitle styling (same as renderVideo but with different name for compatibility)
   */
  static async renderVideoAdvanced(options: FFmpegVideoOptions): Promise<void> {
    return this.renderVideo(options);
  }

  /**
   * Test caption generation with timing analysis
   */
  static testCaptionGeneration(script: string, duration: number): void {
    console.log('\n=== Testing Caption Generation ===');
    console.log('Script:', script);
    console.log('Duration:', duration, 'seconds');
    console.log('Words:', script.split(/\s+/).length);
    
    const captions = this.generateCaptions(script, duration);
    console.log('\nGenerated captions with improved timing:');
    
    captions.forEach((caption, index) => {
      const wordCount = caption.text.split(' ').length;
      const chunkDuration = caption.endTime - caption.startTime;
      const timing = `${caption.startTime.toFixed(2)}s - ${caption.endTime.toFixed(2)}s`;
      console.log(`${index + 1}. [${timing}] (${chunkDuration.toFixed(2)}s, ${wordCount} words) "${caption.text}"`);
    });
    
    // Timing analysis
    const totalCaptionTime = captions.reduce((sum, caption) => sum + (caption.endTime - caption.startTime), 0);
    const coverage = (totalCaptionTime / duration) * 100;
    console.log(`\nTiming Analysis:`);
    console.log(`- Total caption time: ${totalCaptionTime.toFixed(2)}s`);
    console.log(`- Coverage: ${coverage.toFixed(1)}% of video duration`);
    console.log(`- Average caption duration: ${(totalCaptionTime / captions.length).toFixed(2)}s`);
    
    // Check for gaps or overlaps
    let gaps = 0;
    let overlaps = 0;
    for (let i = 0; i < captions.length - 1; i++) {
      const current = captions[i];
      const next = captions[i + 1];
      if (current.endTime < next.startTime) {
        gaps++;
      } else if (current.endTime > next.startTime) {
        overlaps++;
      }
    }
    console.log(`- Gaps between captions: ${gaps}`);
    console.log(`- Overlapping captions: ${overlaps}`);
  }
} 