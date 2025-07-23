import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import type { WordTimestamp } from './voice-generation';
import crypto from 'crypto';

export interface CaptionCustomization {
  font?: 'calibri' | 'arial' | 'impact' | null;
  textSize?: 'small' | 'medium' | 'large' | null;
  position?: 'top' | 'middle' | 'bottom' | null;
}

export interface FFmpegVideoOptions {
  script: string;
  backgroundVideo: string;
  voiceAudio: string;
  audioDurationInSeconds: number;
  outputPath: string;
  wordTimestamps?: WordTimestamp[]; // Add timing data from ElevenLabs
  captionOptions?: CaptionCustomization; // Add caption customization
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

  // Caption font mappings
  private static readonly CAPTION_FONT_MAP = {
    'calibri': 'Calibri',
    'arial': 'Arial',
    'impact': 'Impact'
  };

  // Caption size mappings (for ASS format)
  private static readonly CAPTION_SIZE_MAP = {
    'small': 80,
    'medium': 100,
    'large': 120
  };

  // Caption position mappings (ASS alignment values)
  private static readonly CAPTION_POSITION_MAP = {
    'top': 8,     // Top center
    'middle': 5,  // Middle center (default)
    'bottom': 2   // Bottom center
  };

  // Caption margin mappings based on position
  private static readonly CAPTION_MARGIN_MAP = {
    'top': 340,    // Top margin positioned between top edge and center
    'middle': 0,   // Middle (no special margin)
    'bottom': 340  // Bottom margin positioned between bottom edge and center
  };

  // Default caption settings when no customization provided
  private static readonly DEFAULT_CAPTION_FONT = 'Impact';
  private static readonly DEFAULT_CAPTION_SIZE = 100;
  private static readonly DEFAULT_CAPTION_POSITION = 5; // Middle center
  private static readonly DEFAULT_CAPTION_MARGIN = 0;
  private static readonly CAPTION_BOLD = 4; // Always bold
  private static readonly CAPTION_OUTLINE = 4; // Medium outline
  private static readonly CAPTION_SHADOW = 1; // Light shadow

  // FFmpeg optimization settings
  private static readonly VIDEO_PRESET = 'veryfast'; // Faster encoding
  private static readonly VIDEO_CRF = 28; // Slightly reduced quality for better speed
  private static readonly AUDIO_BITRATE = '96k'; // Reduced from 128k
  private static readonly THREAD_COUNT = 4; // Use multiple threads

  // Cache settings
  private static readonly CACHE_DIR = path.join(process.cwd(), 'cache', 'background-videos');
  private static readonly CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Get caption styling from customization options
   */
  private static getCaptionStyling(captionOptions?: CaptionCustomization) {
    const font = captionOptions?.font ? 
      this.CAPTION_FONT_MAP[captionOptions.font] : 
      this.DEFAULT_CAPTION_FONT;
    
    const size = captionOptions?.textSize ? 
      this.CAPTION_SIZE_MAP[captionOptions.textSize] : 
      this.DEFAULT_CAPTION_SIZE;
    
    const alignment = captionOptions?.position ? 
      this.CAPTION_POSITION_MAP[captionOptions.position] : 
      this.DEFAULT_CAPTION_POSITION;
    
    const marginV = captionOptions?.position ? 
      this.CAPTION_MARGIN_MAP[captionOptions.position] : 
      this.DEFAULT_CAPTION_MARGIN;

    return { font, size, alignment, marginV };
  }

  /**
   * Initialize cache directory
   */
  private static async initializeCache(): Promise<void> {
    try {
      await fs.mkdir(this.CACHE_DIR, { recursive: true });
    } catch (error) {
      console.warn('Failed to create cache directory:', error);
    }
  }

  /**
   * Get cached file path for a URL
   */
  private static getCacheFilePath(url: string): string {
    const hash = crypto.createHash('md5').update(url).digest('hex');
    return path.join(this.CACHE_DIR, `${hash}.mp4`);
  }

  /**
   * Check if cached file exists and is valid
   */
  private static async isCacheValid(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      const age = Date.now() - stats.mtimeMs;
      return age < this.CACHE_MAX_AGE;
    } catch {
      return false;
    }
  }

  /**
   * Download file from URL to temporary location with caching
   */
  private static async downloadFile(url: string, outputPath: string): Promise<void> {
    // Initialize cache directory
    await this.initializeCache();

    // For background videos, check cache first
    if (outputPath.includes('temp_bg_')) {
      const cacheFilePath = this.getCacheFilePath(url);
      
      // Check if we have a valid cached version
      if (await this.isCacheValid(cacheFilePath)) {
        console.log('Using cached background video');
        await fs.copyFile(cacheFilePath, outputPath);
        return;
      }
    }

    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      const file = require('fs').createWriteStream(outputPath);
      const request = client.get(url, async (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download file: ${response.statusCode}`));
          return;
        }
        
        response.pipe(file);
        file.on('finish', async () => {
          file.close();

          // If this is a background video, cache it
          if (outputPath.includes('temp_bg_')) {
            try {
              const cacheFilePath = this.getCacheFilePath(url);
              await fs.copyFile(outputPath, cacheFilePath);
              console.log('Background video cached successfully');
            } catch (error) {
              console.warn('Failed to cache background video:', error);
            }
          }

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
   * Generate captions from ElevenLabs word timestamps with precise timing - ONE WORD PER CAPTION
   */
  public static generateCaptionsFromElevenLabsTimestamps(wordTimestamps: WordTimestamp[]): CaptionChunk[] {
    try {
      if (wordTimestamps.length === 0) {
        console.warn('No word timestamps provided');
        return [];
      }
      
      console.log(`Generating captions from ${wordTimestamps.length} ElevenLabs word timestamps`);
      
      // Create one caption chunk per word using exact ElevenLabs timing
      const chunks: CaptionChunk[] = [];
      
      for (let i = 0; i < wordTimestamps.length; i++) {
        const wordTimestamp = wordTimestamps[i];
        
        chunks.push({
          text: wordTimestamp.word.toLowerCase(),
          startTime: wordTimestamp.startTime,
          endTime: wordTimestamp.endTime,
        });
      }
      
      // Debug logging
      console.log(`Generated ${chunks.length} caption chunks from ElevenLabs word timestamps (one word per caption):`);
      chunks.slice(0, 10).forEach((chunk, index) => {
        const duration = chunk.endTime - chunk.startTime;
        console.log(`  ${index + 1}. [${chunk.startTime.toFixed(2)}s - ${chunk.endTime.toFixed(2)}s] (${duration.toFixed(2)}s) "${chunk.text}"`);
      });
      if (chunks.length > 10) {
        console.log(`  ... and ${chunks.length - 10} more words`);
      }
      
      return chunks;
      
    } catch (error) {
      console.error('Failed to generate captions from ElevenLabs timestamps:', error);
      throw new Error(`Caption generation from ElevenLabs timestamps failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate word-by-word captions that sync with voice timing (FALLBACK METHOD)
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
    const MIN_CAPTION_DURATION = 2; // Minimum time to show each caption (increased from 2.5)
    const MAX_CAPTION_DURATION = 3; // Maximum time to show each caption (increased from 6.0)
    const CAPTION_EXTENSION_FACTOR = 2.5; // Make captions 150% longer for better readability
    const NO_OVERLAP = true; // Ensure no overlap between captions
    
    // Calculate more realistic speech timing
    const totalWords = words.length;
    const effectiveDuration = durationInSeconds * NATURAL_PAUSE_FACTOR;
    const baseSecondsPerWord = effectiveDuration / totalWords;
    
    console.log(`Caption timing: ${totalWords} words, ${durationInSeconds}s total, ${baseSecondsPerWord.toFixed(2)}s per word`);
    
    // Create intelligent word chunks based on natural language patterns
    const chunks: CaptionChunk[] = [];
    let currentWordIndex = 0;
    let currentTimePosition = 0;
    
    while (currentWordIndex < words.length) {
      // Determine chunk size intelligently based on word patterns
      const remainingWords = words.length - currentWordIndex;
      const chunkSize = this.determineIntelligentChunkSize(words, currentWordIndex, remainingWords);
      
      // Create the chunk
      const chunkWords = words.slice(currentWordIndex, currentWordIndex + chunkSize);
      const chunkText = chunkWords.join(' ').toLowerCase();
      
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
      const CAPTION_GAP = 0.1; // Gap between captions to ensure clean transitions
      
      for (let i = 0; i < chunks.length - 1; i++) {
        const currentChunk = chunks[i];
        const nextChunk = chunks[i + 1];
        
        // Ensure no overlap - adjust current caption's end time to avoid overlap
        if (currentChunk.endTime > nextChunk.startTime - CAPTION_GAP) {
          currentChunk.endTime = nextChunk.startTime - CAPTION_GAP;
          
          // Ensure current caption still has reasonable minimum duration
          const currentDuration = currentChunk.endTime - currentChunk.startTime;
          if (currentDuration < 0.5) { // Reduced minimum for fallback method
            currentChunk.endTime = currentChunk.startTime + 0.5;
            
            // If this causes overlap again, prioritize next caption
            if (currentChunk.endTime > nextChunk.startTime - CAPTION_GAP) {
              currentChunk.endTime = nextChunk.startTime - CAPTION_GAP;
            }
          }
        }
      }
    }
    
    // Debug logging
    console.log(`Generated ${chunks.length} caption chunks with intelligent grouping (no overlap):`);
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
   * Intelligently determine chunk size based on natural language patterns
   */
  private static determineIntelligentChunkSize(words: string[], currentIndex: number, remainingWords: number): number {
    if (remainingWords === 1) {
      return 1;
    }
    
    if (remainingWords === 2) {
      return 2;
    }
    
    // Look at the current word and next few words to make intelligent decisions
    const currentWord = words[currentIndex].toLowerCase();
    const nextWord = currentIndex + 1 < words.length ? words[currentIndex + 1].toLowerCase() : '';
    const thirdWord = currentIndex + 2 < words.length ? words[currentIndex + 2].toLowerCase() : '';
    
    // Define word patterns that should stay together
    const articles = ['a', 'an', 'the'];
    const prepositions = ['in', 'on', 'at', 'by', 'for', 'with', 'to', 'from', 'of', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'among'];
    const conjunctions = ['and', 'but', 'or', 'so', 'yet', 'for', 'nor'];
    const auxiliaryVerbs = ['is', 'are', 'was', 'were', 'am', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'might', 'may', 'can', 'must'];
    const pronouns = ['i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their'];
    
    // Pattern 1: Article + Noun (e.g., "the car", "a house")
    if (articles.includes(currentWord) && remainingWords >= 2) {
      return 2;
    }
    
    // Pattern 2: Preposition + Article + Noun (e.g., "in the house", "on a table")
    if (prepositions.includes(currentWord) && remainingWords >= 3 && articles.includes(nextWord)) {
      return 3;
    }
    
    // Pattern 3: Preposition + Noun (e.g., "in school", "at work")
    if (prepositions.includes(currentWord) && remainingWords >= 2 && !articles.includes(nextWord)) {
      return 2;
    }
    
    // Pattern 4: Auxiliary verb + main verb (e.g., "is running", "can go", "will be")
    if (auxiliaryVerbs.includes(currentWord) && remainingWords >= 2) {
      return 2;
    }
    
    // Pattern 5: Pronoun + verb (e.g., "I am", "you are", "we go")
    if (pronouns.includes(currentWord) && remainingWords >= 2) {
      return 2;
    }
    
    // Pattern 6: Conjunction should not start a chunk (attach to previous or next)
    if (conjunctions.includes(currentWord) && remainingWords >= 2) {
      return 2;
    }
    
    // Pattern 7: Common phrase patterns
    const twoWordPhrases = [
      ['right', 'now'], ['right', 'here'], ['over', 'there'],
      ['last', 'night'], ['next', 'week'], ['this', 'morning'],
      ['every', 'day'], ['all', 'day'], ['so', 'much'],
      ['very', 'much'], ['how', 'much'], ['too', 'much'],
      ['let', 'me'], ['let', 'us'], ['let', 'go'],
      ['come', 'on'], ['go', 'ahead'], ['look', 'out'],
      ['watch', 'out'], ['hold', 'on'], ['wait', 'up']
    ];
    
    for (const [first, second] of twoWordPhrases) {
      if (currentWord === first && nextWord === second) {
        return 2;
      }
    }
    
    // Pattern 8: Three-word phrases
    const threeWordPhrases = [
      ['as', 'well', 'as'], ['in', 'order', 'to'], ['on', 'the', 'other'],
      ['at', 'the', 'same'], ['for', 'the', 'first'], ['in', 'the', 'end'],
      ['all', 'of', 'a'], ['one', 'of', 'the'], ['some', 'of', 'the'],
      ['most', 'of', 'the'], ['none', 'of', 'the']
    ];
    
    for (const [first, second, third] of threeWordPhrases) {
      if (currentWord === first && nextWord === second && thirdWord === third) {
        return 3;
      }
    }
    
    // Pattern 9: Numbers and quantifiers
    const numbers = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'first', 'second', 'third'];
    const quantifiers = ['some', 'many', 'few', 'several', 'all', 'most', 'both', 'each', 'every', 'no', 'any'];
    
    if ((numbers.includes(currentWord) || quantifiers.includes(currentWord)) && remainingWords >= 2) {
      return 2;
    }
    
    // Pattern 10: Adjective + Noun combinations (for descriptive words)
    const commonAdjectives = ['good', 'bad', 'big', 'small', 'new', 'old', 'long', 'short', 'high', 'low', 'hot', 'cold', 'fast', 'slow', 'easy', 'hard', 'light', 'dark', 'clean', 'dirty'];
    
    if (commonAdjectives.includes(currentWord) && remainingWords >= 2) {
      return 2;
    }
    
    // Default: If no pattern matches, prefer 2-word chunks for better flow
    // Only use 1 word if it's a very long word or impactful word
    const longWords = currentWord.length > 8;
    const impactfulWords = ['amazing', 'incredible', 'awesome', 'fantastic', 'wonderful', 'terrible', 'horrible', 'beautiful', 'perfect', 'excellent'];
    
    if (longWords || impactfulWords.includes(currentWord)) {
      return 1;
    }
    
    // Default to 2 words for better readability
    return Math.min(2, remainingWords);
  }

  /**
   * Create ASS subtitle file from captions with customizable styling
   */
  private static async createAssSubtitleFile(captions: CaptionChunk[], outputPath: string, captionOptions?: CaptionCustomization): Promise<string> {
    const styling = this.getCaptionStyling(captionOptions);
    
    // ASS file header with proper resolution and custom styling
    const assHeader = `[Script Info]
Title: Generated Subtitles
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${styling.font},${styling.size},&Hffffff,&Hffffff,&H000000,&H000000,${this.CAPTION_BOLD},0,0,0,100,100,0,0,1,${this.CAPTION_OUTLINE},${this.CAPTION_SHADOW},${styling.alignment},60,60,${styling.marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    // Convert captions to ASS format
    const assEvents = captions.map((caption) => {
      const startTime = this.formatAssTime(caption.startTime);
      const endTime = this.formatAssTime(caption.endTime);
      
      return `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${caption.text}`;
    }).join('\n');

    const assContent = assHeader + assEvents + '\n';

    await fs.writeFile(outputPath, assContent, 'utf8');
    console.log(`Created ASS subtitle file with ${captions.length} captions at: ${outputPath}`);
    console.log(`Caption styling: font=${styling.font}, size=${styling.size}, position=${styling.alignment}, margin=${styling.marginV}`);
    return outputPath;
  }

  /**
   * Format time for ASS format (H:MM:SS.CC)
   */
  private static formatAssTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const centiseconds = Math.floor((seconds % 1) * 100);
    
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
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
    const { script, backgroundVideo, voiceAudio, audioDurationInSeconds, outputPath, wordTimestamps, captionOptions } = options;
    
    console.log('Starting FFmpeg video render with optimized settings...');
    console.log('Options:', { 
      script: script.substring(0, 100) + '...', 
      backgroundVideo: this.isUrl(backgroundVideo) ? 'URL' : backgroundVideo,
      voiceAudio: this.isUrl(voiceAudio) ? 'URL' : voiceAudio,
      audioDurationInSeconds 
    });

    // Debug caption options
    console.log('Caption options received:', wordTimestamps);

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

    // Generate captions with priority: ElevenLabs timestamps > Audio transcription > Script estimation
    let captions: CaptionChunk[] = [];
    
    if (wordTimestamps && wordTimestamps.length > 0) {
      // Use precise ElevenLabs word timestamps (best option)
      console.log('Using ElevenLabs word timestamps for caption generation...');
      try {
        captions = this.generateCaptionsFromElevenLabsTimestamps(wordTimestamps);
        console.log(`Generated ${captions.length} caption chunks from ElevenLabs word timestamps`);
      } catch (error) {
        console.warn('Failed to generate captions from ElevenLabs timestamps, falling back:', error);
        captions = [];
      }
    }

    // Create temporary ASS subtitle file with custom styling
    const assPath = path.join(path.dirname(outputPath), `subtitles_${Date.now()}.ass`);
    await this.createAssSubtitleFile(captions, assPath, captionOptions);

    console.log('Using ASS subtitles (centered)');
    console.log(`ASS path: ${assPath}`);

    // Always ignore background video audio - only use voice audio
    console.log('Background video audio will be ignored - using only voice audio');

    // Build filter complex - always use only voice audio
    const filterComplex = `
      [0:v]scale=${this.VIDEO_WIDTH}:${this.VIDEO_HEIGHT}:force_original_aspect_ratio=decrease,
      pad=${this.VIDEO_WIDTH}:${this.VIDEO_HEIGHT}:(ow-iw)/2:(oh-ih)/2:black,
      fps=${this.FPS}[scaled];
      
      [scaled]ass='${assPath.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'[v];
      
      [1:a]volume=1.0[audio_out]
    `.replace(/\s+/g, ' ').trim();

    // Use stream_loop for more reliable looping
    const ffmpegArgs = [
      '-y', // Overwrite output file
      '-stream_loop', '-1', // Loop the background video indefinitely
      '-i', localBackgroundVideo, // Background video input
      '-i', localVoiceAudio, // Voice audio input
      
      // Thread optimization
      '-threads', this.THREAD_COUNT.toString(),
      
      // Dynamic filter chain based on audio availability
      '-filter_complex', filterComplex,
      
      // Optimized output settings
      '-map', '[v]',
      '-map', '[audio_out]',
      '-c:v', 'libx264',
      '-preset', this.VIDEO_PRESET,
      '-crf', this.VIDEO_CRF.toString(),
      '-r', this.FPS.toString(),
      '-pix_fmt', 'yuv420p',
      '-t', audioDurationInSeconds.toString(),
      '-c:a', 'aac',
      '-b:a', this.AUDIO_BITRATE,
      '-ar', '44100',
      // Additional optimizations
      '-movflags', '+faststart', // Enable fast start for web playback
      '-tune', 'fastdecode', // Optimize for fast decoding
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
        cleanupPromises.push(fs.unlink(assPath).catch(() => {}));
        
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
    return await this.renderVideo(options);
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