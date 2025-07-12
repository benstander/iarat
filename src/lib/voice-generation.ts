export interface VoiceGenerationOptions {
  text: string;
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
}

export async function generateVoice(options: VoiceGenerationOptions): Promise<Buffer> {
  try {
    const { text } = options;
    
    console.log('Generating voice with Eleven Labs...');
    
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
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    console.log(`Generated voice audio, size: ${audioBuffer.length} bytes`);
    
    return audioBuffer;
  } catch (error) {
    console.error('Error generating voice with Eleven Labs:', error);
    throw new Error('Failed to generate voice audio');
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