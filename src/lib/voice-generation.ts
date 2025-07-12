export interface VoiceGenerationOptions {
  text: string;
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
  maxDurationSeconds?: number;
}

export interface VoiceGenerationResult {
  audioBuffer: Buffer;
  durationInSeconds: number;
  wordCount: number;
  estimatedDuration: number;
  actualDuration: number;
}

// ElevenLabs speaking rate constants (aligned with script-generation.ts)
const ELEVENLABS_SPEAKING_RATE = {
  WORDS_PER_MINUTE: 150,     // Conservative estimate for ElevenLabs
  WORDS_PER_SECOND: 2.5,     // 150 WPM / 60 seconds
  CHARACTERS_PER_MINUTE: 750, // Approximate characters per minute
  CHARACTERS_PER_SECOND: 12.5 // 750 CPM / 60 seconds
};

// Maximum duration constants
const MAX_VOICE_DURATION_SECONDS = 60; // 1 minute maximum
const MIN_VOICE_DURATION_SECONDS = 5;  // 5 seconds minimum

// Get actual audio duration from audio buffer using ffprobe
async function getActualAudioDuration(audioBuffer: Buffer): Promise<number> {
  try {
    console.log('Starting ffprobe duration detection...');
    // We'll use ffprobe to get the actual duration
    const { spawn } = await import('child_process');
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');
    
    // Create a temporary file
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `temp_audio_${Date.now()}.mp3`);
    
    console.log(`Writing audio buffer to temp file: ${tempFile}`);
    // Write buffer to temp file
    await fs.writeFile(tempFile, audioBuffer);
    
    console.log('Running ffprobe...');
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-show_entries', 'format=duration',
        '-of', 'csv=p=0',
        tempFile
      ]);

      let output = '';
      let errorOutput = '';
      
      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ffprobe.on('close', async (code) => {
        console.log(`ffprobe finished with code: ${code}`);
        console.log(`ffprobe output: "${output.trim()}"`);
        if (errorOutput) {
          console.log(`ffprobe stderr: "${errorOutput}"`);
        }
        
        // Clean up temp file
        try {
          await fs.unlink(tempFile);
          console.log('Cleaned up temp file');
        } catch (cleanupError) {
          console.warn('Failed to cleanup temp file:', cleanupError);
        }

        if (code === 0) {
          const duration = parseFloat(output.trim());
          console.log(`Parsed duration: ${duration}`);
          if (!isNaN(duration) && duration > 0) {
            // Enforce maximum duration
            const cappedDuration = Math.min(duration, MAX_VOICE_DURATION_SECONDS);
            if (cappedDuration !== duration) {
              console.log(`Duration capped: ${duration}s → ${cappedDuration}s`);
            }
            console.log(`Successfully detected audio duration: ${cappedDuration}s`);
            resolve(cappedDuration);
          } else {
            console.error('Invalid duration output from ffprobe:', output);
            reject(new Error('Invalid duration output from ffprobe'));
          }
        } else {
          console.error(`ffprobe failed with code ${code}, stderr: ${errorOutput}`);
          reject(new Error(`ffprobe failed with code ${code}: ${errorOutput}`));
        }
      });

      ffprobe.on('error', async (error) => {
        console.error('ffprobe spawn error:', error);
        // Clean up temp file
        try {
          await fs.unlink(tempFile);
        } catch {
          // Ignore cleanup errors
        }
        reject(error);
      });
    });
  } catch (error) {
    console.error('Error in getActualAudioDuration:', error);
    // Fallback to estimation if ffprobe fails
    console.log('Falling back to buffer size estimation');
    return estimateAudioDuration(audioBuffer.length);
  }
}

// Estimate audio duration based on text length or buffer size
function estimateAudioDuration(textOrBufferSize: string | number): number {
  if (typeof textOrBufferSize === 'string') {
    // Estimate based on text content
    const text = textOrBufferSize.trim();
    const words = text.split(/\s+/).length;
    const characters = text.length;
    
    // Use both word count and character count for better accuracy
    const wordBasedDuration = words / ELEVENLABS_SPEAKING_RATE.WORDS_PER_SECOND;
    const charBasedDuration = characters / ELEVENLABS_SPEAKING_RATE.CHARACTERS_PER_SECOND;
    
    // Take the average of both estimates
    const averageDuration = (wordBasedDuration + charBasedDuration) / 2;
    
    // Apply constraints
    const cappedDuration = Math.min(averageDuration, MAX_VOICE_DURATION_SECONDS);
    const finalDuration = Math.max(cappedDuration, MIN_VOICE_DURATION_SECONDS);
    
    console.log(`Duration estimation: ${words} words, ${characters} chars → ${finalDuration.toFixed(1)}s`);
    return finalDuration;
  } else {
    // Rough estimate based on buffer size (for MP3, approximately 1 minute = 1MB at 128kbps)
    const sizeInMB = textOrBufferSize / (1024 * 1024);
    const estimatedDuration = sizeInMB * 60;
    
    // Apply constraints
    const cappedDuration = Math.min(estimatedDuration, MAX_VOICE_DURATION_SECONDS);
    const finalDuration = Math.max(cappedDuration, MIN_VOICE_DURATION_SECONDS);
    
    console.log(`Buffer size estimation: ${sizeInMB.toFixed(2)}MB → ${finalDuration.toFixed(1)}s`);
    return finalDuration;
  }
}

/**
 * Validate text length for voice generation
 */
function validateTextForVoice(text: string, maxDurationSeconds: number = MAX_VOICE_DURATION_SECONDS): {
  isValid: boolean;
  wordCount: number;
  estimatedDuration: number;
  maxWords: number;
  trimmedText?: string;
} {
  const words = text.trim().split(/\s+/);
  const wordCount = words.length;
  const estimatedDuration = wordCount / ELEVENLABS_SPEAKING_RATE.WORDS_PER_SECOND;
  const maxWords = Math.floor(maxDurationSeconds * ELEVENLABS_SPEAKING_RATE.WORDS_PER_SECOND * 0.9); // 10% buffer
  
  const isValid = estimatedDuration <= maxDurationSeconds;
  
  const result = {
    isValid,
    wordCount,
    estimatedDuration,
    maxWords
  };
  
  if (!isValid) {
    // Trim text to fit within duration
    const trimmedWords = words.slice(0, maxWords);
    const trimmedText = trimmedWords.join(' ');
    return {
      ...result,
      trimmedText
    };
  }
  
  return result;
}

export async function generateVoice(options: VoiceGenerationOptions): Promise<VoiceGenerationResult> {
  try {
    let { text, maxDurationSeconds = MAX_VOICE_DURATION_SECONDS } = options;
    
    // Enforce absolute maximum
    maxDurationSeconds = Math.min(maxDurationSeconds, MAX_VOICE_DURATION_SECONDS);
    
    console.log('Generating voice with Eleven Labs...');
    console.log(`Text length: ${text.length} characters`);
    console.log(`Word count: ${text.trim().split(/\s+/).length} words`);
    console.log(`Max duration: ${maxDurationSeconds}s`);
    
    // Validate text length
    const validation = validateTextForVoice(text, maxDurationSeconds);
    console.log(`Text validation:`, {
      isValid: validation.isValid,
      wordCount: validation.wordCount,
      estimatedDuration: validation.estimatedDuration.toFixed(1) + 's',
      maxWords: validation.maxWords
    });
    
    if (!validation.isValid && validation.trimmedText) {
      console.warn(`Text is too long for ${maxDurationSeconds}s limit, trimming...`);
      console.warn(`  Original: ${validation.wordCount} words (~${validation.estimatedDuration.toFixed(1)}s)`);
      console.warn(`  Trimmed: ${validation.maxWords} words (~${maxDurationSeconds}s)`);
      text = validation.trimmedText;
    }
    
    const finalWordCount = text.trim().split(/\s+/).length;
    const estimatedDuration = finalWordCount / ELEVENLABS_SPEAKING_RATE.WORDS_PER_SECOND;
    
    // Make direct API call to ElevenLabs
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/pNInz6obpgDQGcFmaJgB`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: options.stability || 0.5,
          similarity_boost: options.similarityBoost || 0.5,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error response:', errorText);
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}: ${errorText}`);
    }

    console.log('Voice generation successful, processing audio...');
    const audioBuffer = Buffer.from(await response.arrayBuffer());
    console.log('Audio buffer size:', audioBuffer.length, 'bytes');
    
    // Get actual audio duration
    console.log('Getting actual audio duration...');
    try {
      const actualDuration = await getActualAudioDuration(audioBuffer);
      console.log(`Voice generation completed:`);
      console.log(`  - Word count: ${finalWordCount}`);
      console.log(`  - Estimated duration: ${estimatedDuration.toFixed(1)}s`);
      console.log(`  - Actual duration: ${actualDuration.toFixed(1)}s`);
      console.log(`  - Duration accuracy: ${((actualDuration / estimatedDuration) * 100).toFixed(1)}%`);
      
      return {
        audioBuffer,
        durationInSeconds: actualDuration,
        wordCount: finalWordCount,
        estimatedDuration: estimatedDuration,
        actualDuration: actualDuration
      };
    } catch (durationError) {
      console.error('Failed to get actual duration, using estimation:', durationError);
      const fallbackDuration = Math.min(estimatedDuration, MAX_VOICE_DURATION_SECONDS);
      console.log(`Using estimated duration: ${fallbackDuration.toFixed(1)}s`);
      
      return {
        audioBuffer,
        durationInSeconds: fallbackDuration,
        wordCount: finalWordCount,
        estimatedDuration: estimatedDuration,
        actualDuration: fallbackDuration
      };
    }
  } catch (error) {
    console.error('Error in generateVoice:', error);
    throw error;
  }
}

export async function saveVoiceToFile(audioBuffer: Buffer, filename: string): Promise<string> {
  try {
    // Try Supabase first, fallback to local storage
    try {
      const { uploadAudioToSupabase } = await import('./supabase');
      const result = await uploadAudioToSupabase(audioBuffer, filename);
      
      if (result.success && result.url) {
        console.log('Voice uploaded to Supabase successfully');
        return result.url;
      }
    } catch (supabaseError) {
      console.warn('Supabase upload failed, falling back to local storage:', supabaseError);
    }
    
    // Fallback to local storage
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const outputDir = path.join(process.cwd(), 'public', 'generated-videos');
    await fs.mkdir(outputDir, { recursive: true });
    
    const outputPath = path.join(outputDir, filename);
    await fs.writeFile(outputPath, audioBuffer);
    
    const localUrl = `/generated-videos/${filename}`;
    console.log('Voice saved locally:', localUrl);
    return localUrl;
  } catch (error) {
    console.error('Error saving voice file:', error);
    throw error;
  }
} 