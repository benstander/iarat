export type VideoFormat = 'summary' | 'splitscreen' | 'quiz' | null
export type BackgroundVideo = 'minecraft' | 'subway' | 'mega-ramp' | null
export type VideoStyle = 'academic' | 'brainrot' | 'unhinged' | null

// Voice types
export type VoiceStyle = 'academic' | 'brainrot' | 'unhinged' | null
export type VoiceCharacter = 'bella' | 'andrew' | 'lebron' | null

// Voice options
export interface VoiceOptions {
  style: VoiceStyle
  character: VoiceCharacter
}

// Topic type
export interface Topic {
  id: string
  title: string
  selected: boolean
}

// Topic summary from API processing
export interface TopicSummary {
  topicTitle: string;
  content: string; // Raw content for this topic
  topicIndex: number;
  script?: string; // Optional script that gets generated later
}

// Customise tab type
export type CustomiseTab = 'video' | 'voice' | 'topics'

export interface AppState {
  currentPage: 'landing' | 'topics' | 'customise' | 'finished'
  currentTab: CustomiseTab
  videoFormat: VideoFormat
  backgroundVideo: BackgroundVideo
  videoStyle: VideoStyle
  voiceOptions: VoiceOptions
  topics: Topic[]
  isProcessing: boolean
} 