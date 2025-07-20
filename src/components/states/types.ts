export type VideoFormat = 'summary' | 'splitscreen' | 'quiz' | null
export type BackgroundVideo = 'minecraft' | 'subway' | 'mega-ramp' | null
export type VideoStyle = 'academic' | 'brainrot' | 'unhinged' | null

// Voice types
export type VoiceStyle = 'academic' | 'brainrot' | 'unhinged' | null
export type VoiceCharacter = 'bella' | 'andrew' | 'lebron' | null

// Caption types
export type CaptionFont = 'Arial' | 'Impact' | 'Bebas Neue'
export type CaptionSize = 'small' | 'medium' | 'large'
export type CaptionPosition = 'top' | 'middle' | 'bottom'

export interface CaptionOptions {
  font: CaptionFont
  size: CaptionSize
  position: CaptionPosition
}

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

// Tab type for navigation
export type CustomiseTab = 'video' | 'voice' | 'captions' | 'topics'

export interface AppState {
  currentPage: 'landing' | 'topics' | 'customise' | 'finished'
  currentTab: CustomiseTab
  videoFormat: VideoFormat
  backgroundVideo: BackgroundVideo
  videoStyle: VideoStyle
  voiceOptions: VoiceOptions
  captionOptions: CaptionOptions
  topics: Topic[]
  isProcessing: boolean
} 