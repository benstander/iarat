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

export type AppState = 'landing' | 'topics' | 'customise' | 'finished'
export type VideoFormat = 'summary' | 'splitscreen' | 'quiz' | null
export type BackgroundVideo = 'minecraft' | 'subway' | 'characters' | null
export type VideoStyle = 'brainrot' | 'academic' | 'unhinged' | null 