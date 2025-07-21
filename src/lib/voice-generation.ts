export interface VoiceGenerationOptions {
  text: string;
  voiceId?: string;
  voiceOptions?: { style: string; character: string; backgroundVideo?: string };
  stability?: number;
  similarityBoost?: number;
  maxDurationSeconds?: number;
}

export interface CharacterTimestamp {
  character: string;
  startTime: number;
  endTime: number;
}

export interface WordTimestamp {
  word: string;
  startTime: number;
  endTime: number;
}

export interface VoiceGenerationResult {
  audioBuffer: Buffer;
  durationInSeconds: number;
  wordCount: number;
  estimatedDuration: number;
  actualDuration: number;
  characterTimestamps?: CharacterTimestamp[];
  wordTimestamps?: WordTimestamp[];
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

// Voice character mapping to ElevenLabs voice IDs
const VOICE_CHARACTER_MAP = {
  'storyteller': 'hfgNmTYYctMgJ7E2s6Vx', // Shaun
  'asmr': 'RBknfnzK8KHNwv44gIrh', // James Whitmore 
  'trump': 'Tw2LVqLUUWkxqrCfFOpw', // Cole 
  'lebron': '5F6a8n4ijdCrImoXgxM9',  // Mark 
  'matthew mcconaughey': 'Mu5jxyqZOLIGltFpfalg', // Matthew 
  'theo von': 'LNV6ahDtkAOqwn1X3R7a', // Elijah Boone
  'ronaldo': 'IP2syKL31S2JthzSSfZH', // Ivan Rodriguez
  'elon musk': 'XLghPxSVv9YaNtcIwfbt', // Kyle
};

// Map background video celebrity selections to voice character names
const BACKGROUND_VIDEO_TO_VOICE_CHARACTER_MAP = {
  'lebron': 'lebron',
  'ronaldo': 'ronaldo', 
  'trump': 'trump',
  'theo-von': 'theo von',
  'matthew-mc': 'matthew mcconaughey',
  'elon-musk': 'elon musk',
};

// Function to get voice character from background video selection
export function getVoiceCharacterFromBackgroundVideo(backgroundVideo?: string): string | null {
  if (!backgroundVideo) return null;
  return BACKGROUND_VIDEO_TO_VOICE_CHARACTER_MAP[backgroundVideo as keyof typeof BACKGROUND_VIDEO_TO_VOICE_CHARACTER_MAP] || null;
}

// Function to get voice ID from character
function getVoiceIdFromCharacter(character?: string): string {
  if (!character) return VOICE_CHARACTER_MAP.storyteller; // Default to storyteller
  return VOICE_CHARACTER_MAP[character as keyof typeof VOICE_CHARACTER_MAP] || VOICE_CHARACTER_MAP.storyteller;
}

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
} {
  const words = text.trim().split(/\s+/);
  const wordCount = words.length;
  const estimatedDuration = wordCount / ELEVENLABS_SPEAKING_RATE.WORDS_PER_SECOND;
  const maxWords = Math.floor(maxDurationSeconds * ELEVENLABS_SPEAKING_RATE.WORDS_PER_SECOND * 0.9); // 10% buffer
  
  const isValid = estimatedDuration <= maxDurationSeconds;
  
  return {
    isValid,
    wordCount,
    estimatedDuration,
    maxWords
  };
}

/**
 * Convert character-level timestamps to word-level timestamps
 */
function convertCharacterTimestampsToWords(
  text: string, 
  characterTimestamps: CharacterTimestamp[]
): WordTimestamp[] {
  const words: WordTimestamp[] = [];
  const textChars = text.split('');
  
  let currentWord = '';
  let wordStartIndex = -1;
  
  for (let i = 0; i < textChars.length; i++) {
    const char = textChars[i];
    
    if (char.match(/\s/)) {
      // End of word
      if (currentWord.trim().length > 0 && wordStartIndex >= 0) {
        const wordEndIndex = i - 1;
        const startTime = characterTimestamps[wordStartIndex]?.startTime || 0;
        const endTime = characterTimestamps[wordEndIndex]?.endTime || 0;
        
        words.push({
          word: currentWord.trim(),
          startTime,
          endTime,
        });
      }
      
      currentWord = '';
      wordStartIndex = -1;
    } else {
      // Building a word
      if (currentWord === '') {
        wordStartIndex = i;
      }
      currentWord += char;
    }
  }
  
  // Handle the last word if text doesn't end with whitespace
  if (currentWord.trim().length > 0 && wordStartIndex >= 0) {
    const wordEndIndex = textChars.length - 1;
    const startTime = characterTimestamps[wordStartIndex]?.startTime || 0;
    const endTime = characterTimestamps[wordEndIndex]?.endTime || 0;
    
    words.push({
      word: currentWord.trim(),
      startTime,
      endTime,
    });
  }
  
  console.log(`Converted ${characterTimestamps.length} character timestamps to ${words.length} word timestamps`);
  return words;
}

export async function generateVoice(options: VoiceGenerationOptions): Promise<VoiceGenerationResult> {
  try {
    const { text } = options;
    let maxDurationSeconds = options.maxDurationSeconds || 120; // Default to 2 minutes instead of 60
    
    // Allow longer durations for educational content completeness
    if (maxDurationSeconds > 300) {
      console.warn(`Very long duration requested (${maxDurationSeconds}s), capping to 5 minutes for safety`);
      maxDurationSeconds = 300;
    }
    
    console.log('Generating voice with Eleven Labs (with timing data)...');
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
    
    if (!validation.isValid) {
      console.warn(`Voice generation proceeding with ${validation.wordCount} words (~${validation.estimatedDuration.toFixed(1)}s)`);
    }
    
    const finalWordCount = text.trim().split(/\s+/).length;
    const estimatedDuration = finalWordCount / ELEVENLABS_SPEAKING_RATE.WORDS_PER_SECOND;
    
    // Handle "match celeb" character selection
    let effectiveCharacter = options.voiceOptions?.character;
    if (effectiveCharacter === 'match celeb') {
      // Look for backgroundVideo in the options or try to extract from voiceOptions
      const backgroundVideoFromOptions = (options.voiceOptions as { style: string; character: string; backgroundVideo?: string })?.backgroundVideo;
      if (backgroundVideoFromOptions) {
        const matchedCharacter = getVoiceCharacterFromBackgroundVideo(backgroundVideoFromOptions);
        if (matchedCharacter) {
          effectiveCharacter = matchedCharacter;
          console.log(`Match celeb selected: Using voice character "${effectiveCharacter}" for background video "${backgroundVideoFromOptions}"`);
        } else {
          console.log(`Match celeb selected but no matching voice found for background video "${backgroundVideoFromOptions}", falling back to storyteller`);
          effectiveCharacter = 'storyteller';
        }
      } else {
        console.log('Match celeb selected but no background video provided, falling back to storyteller');
        effectiveCharacter = 'storyteller';
      }
    }
    
    // Get voice ID from effective character
    const voiceId = getVoiceIdFromCharacter(effectiveCharacter);
    
    // Make API call to ElevenLabs with timing data
    console.log('Calling ElevenLabs with-timestamps endpoint...');
    console.log(`Using voice ID: ${voiceId} for character: ${effectiveCharacter || 'storyteller'}`);
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
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

    console.log('Voice generation with timing successful, processing response...');
    const responseData = await response.json();
    
    // Extract audio and timing data
    const audioBase64 = responseData.audio_base64;
    const alignment = responseData.alignment;
    
    if (!audioBase64) {
      throw new Error('No audio data received from ElevenLabs');
    }
    
    // Convert base64 audio to buffer
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    console.log('Audio buffer size:', audioBuffer.length, 'bytes');
    
    // Process character timestamps if available
    let characterTimestamps: CharacterTimestamp[] = [];
    let wordTimestamps: WordTimestamp[] = [];
    
    if (alignment && alignment.characters && alignment.character_start_times_seconds && alignment.character_end_times_seconds) {
      console.log('Processing character-level timing data...');
      
      const characters = alignment.characters;
      const startTimes = alignment.character_start_times_seconds;
      const endTimes = alignment.character_end_times_seconds;
      
      // Create character timestamps
      for (let i = 0; i < characters.length; i++) {
        characterTimestamps.push({
          character: characters[i],
          startTime: startTimes[i],
          endTime: endTimes[i],
        });
      }
      
      console.log(`Processed ${characterTimestamps.length} character timestamps`);
      
      // Convert to word timestamps
      wordTimestamps = convertCharacterTimestampsToWords(text, characterTimestamps);
      console.log(`Generated ${wordTimestamps.length} word timestamps`);
      
      // Log sample word timestamps
      console.log('Sample word timestamps:');
      wordTimestamps.slice(0, 10).forEach((wt, i) => {
        console.log(`  ${i + 1}. "${wt.word}" [${wt.startTime.toFixed(2)}s - ${wt.endTime.toFixed(2)}s]`);
      });
    } else {
      console.warn('No timing data received from ElevenLabs, timing features will be limited');
    }
    
    // Get actual audio duration
    console.log('Getting actual audio duration...');
    try {
      const actualDuration = await getActualAudioDuration(audioBuffer);
      console.log(`Voice generation completed:`);
      console.log(`  - Word count: ${finalWordCount}`);
      console.log(`  - Estimated duration: ${estimatedDuration.toFixed(1)}s`);
      console.log(`  - Actual duration: ${actualDuration.toFixed(1)}s`);
      console.log(`  - Duration accuracy: ${((actualDuration / estimatedDuration) * 100).toFixed(1)}%`);
      console.log(`  - Character timestamps: ${characterTimestamps.length}`);
      console.log(`  - Word timestamps: ${wordTimestamps.length}`);
      
      return {
        audioBuffer,
        durationInSeconds: actualDuration,
        wordCount: finalWordCount,
        estimatedDuration: estimatedDuration,
        actualDuration: actualDuration,
        characterTimestamps: characterTimestamps.length > 0 ? characterTimestamps : undefined,
        wordTimestamps: wordTimestamps.length > 0 ? wordTimestamps : undefined,
      };
    } catch (durationError) {
      console.error('Failed to get actual duration, using estimation:', durationError);
      const fallbackDuration = estimatedDuration; // Use full estimated duration
      console.log(`Using estimated duration: ${fallbackDuration.toFixed(1)}s`);
      
      return {
        audioBuffer,
        durationInSeconds: fallbackDuration,
        wordCount: finalWordCount,
        estimatedDuration: estimatedDuration,
        actualDuration: fallbackDuration,
        characterTimestamps: characterTimestamps.length > 0 ? characterTimestamps : undefined,
        wordTimestamps: wordTimestamps.length > 0 ? wordTimestamps : undefined,
      };
    }
  } catch (error) {
    console.error('Error in generateVoice:', error);
    throw error;
  }
}

export async function saveVoiceToFile(audioBuffer: Buffer, filename: string): Promise<{ publicUrl: string, filePath: string }> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const outputDir = path.join(process.cwd(), 'public', 'generated-videos');
    await fs.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, filename);
    await fs.writeFile(outputPath, audioBuffer);
    const publicUrl = `/generated-videos/${filename}`;
    console.log('Voice saved locally:', publicUrl);
    return { publicUrl, filePath: outputPath };
  } catch (error) {
    console.error('Error saving voice file:', error);
    throw error;
  }
}