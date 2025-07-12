export interface VoiceGenerationOptions {
  text: string;
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
}

export interface VoiceGenerationResult {
  audioBuffer: Buffer;
  durationInSeconds: number;
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
            console.log(`Successfully detected audio duration: ${duration}s`);
            resolve(duration);
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

// Estimate audio duration based on text length (fallback method)
// Average speech rate is approximately 150 words per minute
function estimateAudioDuration(textOrBufferSize: string | number): number {
  if (typeof textOrBufferSize === 'string') {
    const words = textOrBufferSize.trim().split(/\s+/).length;
    const wordsPerMinute = 150; // Average speech rate
    const durationInMinutes = words / wordsPerMinute;
    const durationInSeconds = durationInMinutes * 60;
    
    // Add a small buffer (10%) to account for pauses and variations
    return Math.max(durationInSeconds * 1.1, 10); // Minimum 10 seconds
  } else {
    // Rough estimate based on buffer size (for MP3, approximately 1 minute = 1MB at 128kbps)
    const sizeInMB = textOrBufferSize / (1024 * 1024);
    return Math.max(sizeInMB * 60, 10); // Very rough estimate, minimum 10 seconds
  }
}

export async function generateVoice(options: VoiceGenerationOptions): Promise<VoiceGenerationResult> {
  try {
    const { text } = options;
    
    console.log('Generating voice with Eleven Labs...');
    console.log('Text length:', text.length, 'characters');
    
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
      console.log(`Successfully got actual audio duration: ${actualDuration.toFixed(1)} seconds`);
      
      return {
        audioBuffer,
        durationInSeconds: actualDuration
      };
    } catch (durationError) {
      console.error('Failed to get actual duration, using estimation:', durationError);
      const estimatedDuration = estimateAudioDuration(text);
      console.log(`Using estimated duration: ${estimatedDuration.toFixed(1)} seconds`);
      
      return {
        audioBuffer,
        durationInSeconds: estimatedDuration
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
    
    // Create audio directory if it doesn't exist
    const audioDir = path.join(process.cwd(), 'public', 'audio');
    try {
      await fs.mkdir(audioDir, { recursive: true });
    } catch {
      // Directory might already exist
    }
    
    const filePath = path.join(audioDir, filename);
    await fs.writeFile(filePath, audioBuffer);
    
    // Return public URL
    return `/audio/${filename}`;
  } catch (error) {
    console.error('Error saving voice file:', error);
    throw new Error('Failed to save voice file');
  }
} 