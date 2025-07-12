import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role for server operations

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export interface VideoUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function uploadVideoToSupabase(
  videoBuffer: Buffer, 
  filename: string
): Promise<VideoUploadResult> {
  try {
    console.log(`Uploading video to Supabase: ${filename}`);
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('generated-videos')
      .upload(filename, videoBuffer, {
        contentType: 'video/mp4',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from('generated-videos')
      .getPublicUrl(filename);

    console.log('Video uploaded successfully:', publicUrl.publicUrl);
    
    return { 
      success: true, 
      url: publicUrl.publicUrl 
    };

  } catch (error) {
    console.error('Upload error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function uploadAudioToSupabase(
  audioBuffer: Buffer, 
  filename: string
): Promise<VideoUploadResult> {
  try {
    console.log(`Uploading audio to Supabase: ${filename}`);
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('generated-audio')
      .upload(filename, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: false
      });

    if (error) {
      console.error('Supabase audio upload error:', error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from('generated-audio')
      .getPublicUrl(filename);

    console.log('Audio uploaded successfully:', publicUrl.publicUrl);
    
    return { 
      success: true, 
      url: publicUrl.publicUrl 
    };

  } catch (error) {
    console.error('Audio upload error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
} 