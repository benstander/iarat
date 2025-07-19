export interface TopicSummary {
  topicTitle: string;
  script: string;
  topicIndex: number;
}

export interface VideoResult {
  success: boolean;
  videoUrl?: string;
  voiceAudioUrl?: string;
  message?: string;
  topicTitle?: string;
  topicIndex?: number;
  error?: string;
}

export interface CaptionOptions {
  font: CaptionFont;
  size: CaptionSize;
  position: CaptionPosition;
}

export type AppState = 'landing' | 'topics' | 'customise' | 'finished'
export type VideoFormat = 'summary' | 'splitscreen' | 'quiz' | null
export type BackgroundVideo = 'minecraft' | 'subway' | 'video' | null
export type VideoStyle = 'brainrot' | 'academic' | 'unhinged' | null
export type CaptionFont = 'Arial Black' | 'Helvetica' | 'Times New Roman' | 'Impact' | 'Comic Sans MS'
export type CaptionSize = 'small' | 'medium' | 'large' | 'extra-large'
export type CaptionPosition = 'top' | 'middle' | 'bottom' 