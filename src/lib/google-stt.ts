import { SpeechClient } from '@google-cloud/speech';
import { Storage } from '@google-cloud/storage';
import fs from 'fs/promises';
import path from 'path';

export interface WordTimestamp {
  word: string;
  startTime: number;
  endTime: number;
}

export interface TranscriptionResult {
  text: string;
  wordTimestamps?: WordTimestamp[];
  confidence?: number;
}

export class GoogleSTTService {
  private speechClient: SpeechClient;
  private storage: Storage;
  private bucketName: string;

  constructor() {
    // Initialize Google Cloud clients
    this.speechClient = new SpeechClient({
      // Google Cloud will automatically use GOOGLE_APPLICATION_CREDENTIALS environment variable
      // or default service account if running on Google Cloud
    });
    
    this.storage = new Storage({
      // Same authentication as speech client
    });

    // Use environment variable for bucket name or default
    this.bucketName = process.env.GOOGLE_CLOUD_BUCKET || 'recaps-youtube';
  }

  /**
   * Upload audio file to Google Cloud Storage for long-running transcription
   */
  private async uploadToGCS(audioBuffer: Buffer, filename: string): Promise<string> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(filename);
      
      await file.save(audioBuffer, {
        metadata: {
          contentType: 'audio/wav',
        },
      });

      return `gs://${this.bucketName}/${filename}`;
    } catch (error) {
      console.error('Error uploading to GCS:', error);
      throw new Error(`Failed to upload audio to Google Cloud Storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete file from Google Cloud Storage after transcription
   */
  private async deleteFromGCS(filename: string): Promise<void> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(filename);
      await file.delete();
      console.log(`Cleaned up GCS file: ${filename}`);
    } catch (error) {
      console.warn(`Failed to clean up GCS file ${filename}:`, error);
    }
  }

  /**
   * Transcribe short audio files (< 60 seconds) using synchronous recognition
   */
  async transcribeShortAudio(audioBuffer: Buffer, languageCode: string = 'en-US'): Promise<TranscriptionResult> {
    try {
      const audio = {
        content: audioBuffer.toString('base64'),
      };

      const config = {
        encoding: 'LINEAR16' as const, // Correct encoding for WAV files
        sampleRateHertz: 16000, // Match the 16kHz we're sending from FFmpeg optimization
        languageCode: languageCode,
        enableWordTimeOffsets: true,
        enableSpeakerDiarization: false,
        model: 'latest_long',
        useEnhanced: true,
      };

      const request = {
        audio: audio,
        config: config,
      };

      const [response] = await this.speechClient.recognize(request);
      
      if (!response.results || response.results.length === 0) {
        return { text: '', confidence: 0 };
      }

      // Combine all results
      const transcript = response.results
        .map(result => result.alternatives?.[0]?.transcript || '')
        .join(' ')
        .trim();

      // Extract word timestamps
      const wordTimestamps: WordTimestamp[] = [];
      let confidence = 0;
      let confidenceCount = 0;

      for (const result of response.results) {
        const alternative = result.alternatives?.[0];
        if (alternative) {
          if (alternative.confidence) {
            confidence += alternative.confidence;
            confidenceCount++;
          }

          if (alternative.words) {
            for (const wordInfo of alternative.words) {
              if (wordInfo.word && wordInfo.startTime && wordInfo.endTime) {
                wordTimestamps.push({
                  word: wordInfo.word,
                  startTime: (Number(wordInfo.startTime.seconds || 0) + (wordInfo.startTime.nanos || 0) / 1e9),
                  endTime: (Number(wordInfo.endTime.seconds || 0) + (wordInfo.endTime.nanos || 0) / 1e9),
                });
              }
            }
          }
        }
      }

      const averageConfidence = confidenceCount > 0 ? confidence / confidenceCount : 0;

      return {
        text: transcript,
        wordTimestamps: wordTimestamps.length > 0 ? wordTimestamps : undefined,
        confidence: averageConfidence,
      };
    } catch (error) {
      console.error('Error in short audio transcription:', error);
      throw new Error(`Short audio transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Transcribe long audio files (> 60 seconds) using asynchronous long-running recognition
   */
  async transcribeLongAudio(audioBuffer: Buffer, languageCode: string = 'en-US'): Promise<TranscriptionResult> {
    const filename = `transcription_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.wav`;
    
    try {
      console.log('Starting long audio transcription...');
      
      // Upload audio to Google Cloud Storage
      console.log('Uploading audio to Google Cloud Storage...');
      const gcsUri = await this.uploadToGCS(audioBuffer, filename);
      console.log(`Audio uploaded to: ${gcsUri}`);

      // Configure long-running recognition
      const audio = {
        uri: gcsUri,
      };

      const config = {
        encoding: 'LINEAR16' as const, // Correct encoding for WAV files
        sampleRateHertz: 16000, // Match the 16kHz we're sending from FFmpeg optimization
        languageCode: languageCode,
        enableWordTimeOffsets: true,
        enableSpeakerDiarization: false,
        model: 'latest_long',
        useEnhanced: true,
      };

      const request = {
        audio: audio,
        config: config,
      };

      console.log('Starting long-running recognition...');
      
      // Start long-running operation
      const [operation] = await this.speechClient.longRunningRecognize(request);
      
      console.log('Waiting for transcription to complete...');
      console.log('⏳ This may take 3-10 minutes for long videos. Please be patient...');
      
      // Wait for operation to complete
      const [response] = await operation.promise();

        // Clean up GCS file
        await this.deleteFromGCS(filename);

        if (!response.results || response.results.length === 0) {
          return { text: '', confidence: 0 };
        }

        // Combine all results
        const transcript = response.results
          .map(result => result.alternatives?.[0]?.transcript || '')
          .join(' ')
          .trim();

        // Extract word timestamps
        const wordTimestamps: WordTimestamp[] = [];
        let confidence = 0;
        let confidenceCount = 0;

        for (const result of response.results) {
          const alternative = result.alternatives?.[0];
          if (alternative) {
            if (alternative.confidence) {
              confidence += alternative.confidence;
              confidenceCount++;
            }

            if (alternative.words) {
              for (const wordInfo of alternative.words) {
                if (wordInfo.word && wordInfo.startTime && wordInfo.endTime) {
                  wordTimestamps.push({
                    word: wordInfo.word,
                    startTime: (Number(wordInfo.startTime.seconds || 0) + (wordInfo.startTime.nanos || 0) / 1e9),
                    endTime: (Number(wordInfo.endTime.seconds || 0) + (wordInfo.endTime.nanos || 0) / 1e9),
                  });
                }
              }
            }
          }
        }

        const averageConfidence = confidenceCount > 0 ? confidence / confidenceCount : 0;

        console.log(`Transcription result: ${transcript.length} characters, ${wordTimestamps.length} word timestamps`);

        return {
          text: transcript,
          wordTimestamps: wordTimestamps.length > 0 ? wordTimestamps : undefined,
          confidence: averageConfidence,
        };

      } catch (error) {
      console.error('Error in long audio transcription:', error);
      
      // Clean up GCS file in case of error
      try {
        await this.deleteFromGCS(filename);
      } catch (cleanupError) {
        console.warn('Failed to clean up GCS file after error:', cleanupError);
      }
      
      throw new Error(`Long audio transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Auto-detect audio length and choose appropriate transcription method
   */
  async transcribeAudio(audioBuffer: Buffer, languageCode: string = 'en-US'): Promise<TranscriptionResult> {
    // For simplicity, we'll assume most YouTube videos are long-form
    // You could add audio duration detection here if needed
    const estimatedDurationMinutes = audioBuffer.length / (16000 * 2 * 60); // Rough estimate
    
    if (estimatedDurationMinutes > 1) {
      console.log('Using long-running transcription for estimated duration:', estimatedDurationMinutes, 'minutes');
      return this.transcribeLongAudio(audioBuffer, languageCode);
    } else {
      console.log('Using synchronous transcription for short audio');
      return this.transcribeShortAudio(audioBuffer, languageCode);
    }
  }

  /**
   * Create bucket if it doesn't exist
   */
  async ensureBucketExists(): Promise<void> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const [exists] = await bucket.exists();
      
      if (!exists) {
        console.log(`Creating bucket: ${this.bucketName}`);
        await this.storage.createBucket(this.bucketName, {
          location: 'us-central1',
          storageClass: 'STANDARD',
        });
        console.log(`Bucket ${this.bucketName} created successfully`);
      }
    } catch (error) {
      console.error('Error ensuring bucket exists:', error);
      throw new Error(`Failed to create/verify bucket: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export a singleton instance
export const googleSTTService = new GoogleSTTService(); 