import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import { experimental_transcribe as transcribe } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { WordTimestamp } from './voice-generation';

export interface FFmpegVideoOptions {
  script: string;
  backgroundVideo: string;
  voiceAudio: string;
  audioDurationInSeconds: number;
  outputPath: string;
  wordTimestamps?: WordTimestamp[]; // Add timing data from ElevenLabs
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
  private static readonly FONT_SIZE = 26;
  private static readonly FONT_FAMILY = 'Arial Black';

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
   * Transcribe voice audio with word-level timestamps using OpenAI Whisper
   */
  private static async transcribeVoiceAudio(audioPath: string): Promise<WordTimestamp[]> {
    try {
      console.log('Transcribing voice audio with word-level timestamps...');
      
      // Read the audio file
      const audioBuffer = await fs.readFile(audioPath);
      
      // Transcribe with word-level timestamps
      const result = await transcribe({
        model: openai.transcription('whisper-1'),
        audio: audioBuffer,
        providerOptions: {
          openai: {
            language: 'en',
            temperature: 0.0, // Use deterministic output
            response_format: 'verbose_json', // Get detailed timestamps
            timestamp_granularities: ['word'], // Request word-level timestamps
          },
        },
      });
      
      // Extract word-level timestamps from the response
      const wordTimestamps: WordTimestamp[] = [];
      
      // Handle word-level timestamps if available
      if (result && typeof result === 'object' && 'words' in result) {
        const words = (result as any).words;
        if (Array.isArray(words)) {
          for (const wordData of words) {
            if (wordData.word && typeof wordData.start === 'number' && typeof wordData.end === 'number') {
              wordTimestamps.push({
                word: wordData.word.trim(),
                startTime: wordData.start,
                endTime: wordData.end,
              });
            }
          }
        }
      }
      
      // If no word-level timestamps, fall back to sentence-level estimation
      if (wordTimestamps.length === 0) {
        console.warn('No word-level timestamps found, creating estimated timestamps from text');
        const text = result.text || '';
        const words = text.split(/\s+/).filter(w => w.trim().length > 0);
        
        // Estimate timing based on average speech rate
        const AVERAGE_WORDS_PER_SECOND = 2.5; // Conservative estimate
        const totalDuration = words.length / AVERAGE_WORDS_PER_SECOND;
        const timePerWord = totalDuration / words.length;
        
        words.forEach((word, index) => {
          wordTimestamps.push({
            word: word.trim(),
            startTime: index * timePerWord,
            endTime: (index + 1) * timePerWord,
          });
        });
      }
      
      console.log(`Extracted ${wordTimestamps.length} word timestamps from audio`);
      console.log('Sample timestamps:', wordTimestamps.slice(0, 10));
      
      return wordTimestamps;
      
    } catch (error) {
      console.error('Failed to transcribe voice audio:', error);
      throw new Error(`Voice transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate captions from voice audio transcription with precise timing
   */
  public static async generateCaptionsFromAudio(voiceAudioPath: string): Promise<CaptionChunk[]> {
    try {
      // Get word-level timestamps from voice audio
      const wordTimestamps = await this.transcribeVoiceAudio(voiceAudioPath);
      
      if (wordTimestamps.length === 0) {
        console.warn('No word timestamps found, falling back to empty captions');
        return [];
      }
      
      // Group words intelligently into caption chunks
      const chunks: CaptionChunk[] = [];
      let currentWordIndex = 0;
      
      while (currentWordIndex < wordTimestamps.length) {
        const remainingWords = wordTimestamps.length - currentWordIndex;
        
        // Get the words for analysis
        const words = wordTimestamps.slice(currentWordIndex).map(wt => wt.word);
        const chunkSize = this.determineIntelligentChunkSize(words, 0, remainingWords);
        
        // Create chunk from word timestamps
        const chunkWordTimestamps = wordTimestamps.slice(currentWordIndex, currentWordIndex + chunkSize);
        const chunkText = chunkWordTimestamps.map(wt => wt.word).join(' ').toUpperCase();
        
        // Use precise timing from transcription (no padding initially)
        const startTime = chunkWordTimestamps[0].startTime;
        const endTime = chunkWordTimestamps[chunkWordTimestamps.length - 1].endTime;
        
        chunks.push({
          text: chunkText,
          startTime: startTime,
          endTime: endTime,
        });
        
        currentWordIndex += chunkSize;
      }
      
      // Post-process to ensure no overlaps and reasonable duration
      const MIN_CAPTION_DURATION = 0.5; // Minimum readable duration
      const MAX_CAPTION_DURATION = 4.0; // Maximum for very long phrases
      const CAPTION_GAP = 0.1; // Gap between captions to ensure clean transitions
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // First, determine the maximum possible end time
        let maxEndTime = chunk.endTime;
        
        // If there's a next caption, ensure we don't overlap with it
        if (i < chunks.length - 1) {
          const nextChunk = chunks[i + 1];
          maxEndTime = Math.min(maxEndTime, nextChunk.startTime - CAPTION_GAP);
        }
        
        // Apply minimum duration if possible
        const currentDuration = maxEndTime - chunk.startTime;
        if (currentDuration < MIN_CAPTION_DURATION) {
          // Try to extend the caption, but don't overlap with next
          const desiredEndTime = chunk.startTime + MIN_CAPTION_DURATION;
          if (i < chunks.length - 1) {
            const nextChunk = chunks[i + 1];
            maxEndTime = Math.min(desiredEndTime, nextChunk.startTime - CAPTION_GAP);
          } else {
            maxEndTime = desiredEndTime;
          }
        }
        
        // Apply maximum duration limit
        if (maxEndTime - chunk.startTime > MAX_CAPTION_DURATION) {
          maxEndTime = chunk.startTime + MAX_CAPTION_DURATION;
        }
        
        // Set the final end time
        chunk.endTime = maxEndTime;
      }
      
      // Final pass: ensure absolutely no overlaps
      for (let i = 0; i < chunks.length - 1; i++) {
        const currentChunk = chunks[i];
        const nextChunk = chunks[i + 1];
        
        // If there's still an overlap, prioritize the next caption
        if (currentChunk.endTime > nextChunk.startTime - CAPTION_GAP) {
          currentChunk.endTime = nextChunk.startTime - CAPTION_GAP;
        }
      }
      
      // Debug logging
      console.log(`Generated ${chunks.length} caption chunks from voice audio transcription (no overlaps):`);
      chunks.forEach((chunk, index) => {
        const duration = chunk.endTime - chunk.startTime;
        console.log(`  ${index + 1}. [${chunk.startTime.toFixed(2)}s - ${chunk.endTime.toFixed(2)}s] (${duration.toFixed(2)}s) "${chunk.text}"`);
      });
      
      return chunks;
      
    } catch (error) {
      console.error('Failed to generate captions from audio:', error);
      throw new Error(`Caption generation from audio failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate captions from ElevenLabs word timestamps with precise timing
   */
  public static generateCaptionsFromElevenLabsTimestamps(wordTimestamps: WordTimestamp[]): CaptionChunk[] {
    try {
      if (wordTimestamps.length === 0) {
        console.warn('No word timestamps provided');
        return [];
      }
      
      console.log(`Generating captions from ${wordTimestamps.length} ElevenLabs word timestamps`);
      
      // Group words intelligently into caption chunks
      const chunks: CaptionChunk[] = [];
      let currentWordIndex = 0;
      
      while (currentWordIndex < wordTimestamps.length) {
        const remainingWords = wordTimestamps.length - currentWordIndex;
        
        // Get the words for analysis
        const words = wordTimestamps.slice(currentWordIndex).map(wt => wt.word);
        const chunkSize = this.determineIntelligentChunkSize(words, 0, remainingWords);
        
        // Create chunk from word timestamps
        const chunkWordTimestamps = wordTimestamps.slice(currentWordIndex, currentWordIndex + chunkSize);
        const chunkText = chunkWordTimestamps.map(wt => wt.word).join(' ').toUpperCase();
        
        // Use precise timing from ElevenLabs (no padding initially)
        const startTime = chunkWordTimestamps[0].startTime;
        const endTime = chunkWordTimestamps[chunkWordTimestamps.length - 1].endTime;
        
        chunks.push({
          text: chunkText,
          startTime: startTime,
          endTime: endTime,
        });
        
        currentWordIndex += chunkSize;
      }
      
      // Post-process to ensure no overlaps and reasonable duration
      const MIN_CAPTION_DURATION = 0.5; // Minimum readable duration
      const MAX_CAPTION_DURATION = 4.0; // Maximum for very long phrases
      const CAPTION_GAP = 0.1; // Gap between captions to ensure clean transitions
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // First, determine the maximum possible end time
        let maxEndTime = chunk.endTime;
        
        // If there's a next caption, ensure we don't overlap with it
        if (i < chunks.length - 1) {
          const nextChunk = chunks[i + 1];
          maxEndTime = Math.min(maxEndTime, nextChunk.startTime - CAPTION_GAP);
        }
        
        // Apply minimum duration if possible
        const currentDuration = maxEndTime - chunk.startTime;
        if (currentDuration < MIN_CAPTION_DURATION) {
          // Try to extend the caption, but don't overlap with next
          const desiredEndTime = chunk.startTime + MIN_CAPTION_DURATION;
          if (i < chunks.length - 1) {
            const nextChunk = chunks[i + 1];
            maxEndTime = Math.min(desiredEndTime, nextChunk.startTime - CAPTION_GAP);
          } else {
            maxEndTime = desiredEndTime;
          }
        }
        
        // Apply maximum duration limit
        if (maxEndTime - chunk.startTime > MAX_CAPTION_DURATION) {
          maxEndTime = chunk.startTime + MAX_CAPTION_DURATION;
        }
        
        // Set the final end time
        chunk.endTime = maxEndTime;
      }
      
      // Final pass: ensure absolutely no overlaps
      for (let i = 0; i < chunks.length - 1; i++) {
        const currentChunk = chunks[i];
        const nextChunk = chunks[i + 1];
        
        // If there's still an overlap, prioritize the next caption
        if (currentChunk.endTime > nextChunk.startTime - CAPTION_GAP) {
          currentChunk.endTime = nextChunk.startTime - CAPTION_GAP;
        }
      }
      
      // Debug logging
      console.log(`Generated ${chunks.length} caption chunks from ElevenLabs word timestamps (no overlaps):`);
      chunks.forEach((chunk, index) => {
        const duration = chunk.endTime - chunk.startTime;
        console.log(`  ${index + 1}. [${chunk.startTime.toFixed(2)}s - ${chunk.endTime.toFixed(2)}s] (${duration.toFixed(2)}s) "${chunk.text}"`);
      });
      
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

    // Generate captions with priority: ElevenLabs timestamps > Audio transcription > Script estimation
    let captions: CaptionChunk[] = [];
    
    if (options.wordTimestamps && options.wordTimestamps.length > 0) {
      // Use precise ElevenLabs word timestamps (best option)
      console.log('Using ElevenLabs word timestamps for caption generation...');
      try {
        captions = this.generateCaptionsFromElevenLabsTimestamps(options.wordTimestamps);
        console.log(`Generated ${captions.length} caption chunks from ElevenLabs word timestamps`);
      } catch (error) {
        console.warn('Failed to generate captions from ElevenLabs timestamps, falling back:', error);
        captions = [];
      }
    }
    
    if (captions.length === 0) {
      // Fallback to audio transcription
      try {
        console.log('Attempting audio transcription for caption generation...');
        captions = await this.generateCaptionsFromAudio(localVoiceAudio);
        console.log(`Generated ${captions.length} caption chunks from voice audio transcription`);
      } catch (error) {
        console.warn('Failed to generate captions from audio, using script-based estimation:', error);
        captions = this.generateCaptions(script, audioDurationInSeconds);
        console.log(`Generated ${captions.length} caption chunks from script (final fallback)`);
      }
    }

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
        
        [with_subs]copy[final_video];
        
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

  /**
   * Test audio-based caption generation
   */
  static async testAudioCaptionGeneration(audioPath: string): Promise<void> {
    console.log('\n=== Testing Audio-Based Caption Generation ===');
    console.log('Audio path:', audioPath);
    
    try {
      const captions = await this.generateCaptionsFromAudio(audioPath);
      console.log('\nGenerated captions from audio transcription:');
      
      captions.forEach((caption, index) => {
        const wordCount = caption.text.split(' ').length;
        const chunkDuration = caption.endTime - caption.startTime;
        const timing = `${caption.startTime.toFixed(2)}s - ${caption.endTime.toFixed(2)}s`;
        console.log(`${index + 1}. [${timing}] (${chunkDuration.toFixed(2)}s, ${wordCount} words) "${caption.text}"`);
      });
      
      // Timing analysis
      const totalCaptionTime = captions.reduce((sum, caption) => sum + (caption.endTime - caption.startTime), 0);
      const lastCaptionEnd = captions.length > 0 ? captions[captions.length - 1].endTime : 0;
      const coverage = lastCaptionEnd > 0 ? (totalCaptionTime / lastCaptionEnd) * 100 : 0;
      console.log(`\nTiming Analysis:`);
      console.log(`- Total caption time: ${totalCaptionTime.toFixed(2)}s`);
      console.log(`- Audio duration: ${lastCaptionEnd.toFixed(2)}s`);
      console.log(`- Coverage: ${coverage.toFixed(1)}% of audio duration`);
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
      
    } catch (error) {
      console.error('Failed to test audio-based caption generation:', error);
    }
  }

  /**
   * Test ElevenLabs timing-based caption generation
   */
  static testElevenLabsCaptionGeneration(wordTimestamps: WordTimestamp[]): void {
    console.log('\n=== Testing ElevenLabs Timing-Based Caption Generation ===');
    console.log(`Input: ${wordTimestamps.length} word timestamps`);
    
    // Log sample input
    console.log('Sample word timestamps:');
    wordTimestamps.slice(0, 10).forEach((wt, i) => {
      console.log(`  ${i + 1}. "${wt.word}" [${wt.startTime.toFixed(2)}s - ${wt.endTime.toFixed(2)}s]`);
    });
    
    try {
      const captions = this.generateCaptionsFromElevenLabsTimestamps(wordTimestamps);
      console.log('\nGenerated captions with ElevenLabs timing:');
      
      captions.forEach((caption, index) => {
        const wordCount = caption.text.split(' ').length;
        const chunkDuration = caption.endTime - caption.startTime;
        const timing = `${caption.startTime.toFixed(2)}s - ${caption.endTime.toFixed(2)}s`;
        console.log(`${index + 1}. [${timing}] (${chunkDuration.toFixed(2)}s, ${wordCount} words) "${caption.text}"`);
      });
      
      // Timing analysis
      const totalCaptionTime = captions.reduce((sum, caption) => sum + (caption.endTime - caption.startTime), 0);
      const lastCaptionEnd = captions.length > 0 ? captions[captions.length - 1].endTime : 0;
      const coverage = lastCaptionEnd > 0 ? (totalCaptionTime / lastCaptionEnd) * 100 : 0;
      console.log(`\nTiming Analysis:`);
      console.log(`- Total caption time: ${totalCaptionTime.toFixed(2)}s`);
      console.log(`- Audio duration: ${lastCaptionEnd.toFixed(2)}s`);
      console.log(`- Coverage: ${coverage.toFixed(1)}% of audio duration`);
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
      
    } catch (error) {
      console.error('Failed to test ElevenLabs caption generation:', error);
    }
  }
} 