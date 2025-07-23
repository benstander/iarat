export type VideoFormat = 'fullscreen' | 'splitscreen' | null
export type BackgroundVideoCategory = 'gaming' | 'celebrities' | null
export type GamingVideo = 'minecraft' | 'subway' | 'mega-ramp' | null
export type CelebrityVideo = 'lebron' | 'ronaldo' | 'trump' | 'theo-von' | 'matthew-mc' | 'elon-musk' | null
export type BackgroundVideo = GamingVideo | CelebrityVideo | null
export type VideoStyle = 'academic' | 'brainrot' | 'unhinged' | null

// Background video selection state
export interface BackgroundVideoSelection {
  category: BackgroundVideoCategory
  video: BackgroundVideo
}

// Voice types
export type VoiceStyle = 'academic' | 'brainrot' | 'unhinged' | null
export type VoiceCharacter = 'storyteller' | 'asmr' | 'match celeb' | null
export type VideoDialogue = 'explainer' | 'debater' | 'socratic' | 'narrative' | 'examples' | 'quiz' | null

// Voice options
export interface VoiceOptions {
  style: VoiceStyle
  character: VoiceCharacter
  dialogue: VideoDialogue
}

// Caption types
export type CaptionFont = 'calibri' | 'arial' | 'impact' | null
export type CaptionTextSize = 'small' | 'medium' | 'large' | null
export type CaptionPosition = 'top' | 'middle' | 'bottom' | null

// Caption options
export interface CaptionOptions {
  font: CaptionFont
  textSize: CaptionTextSize
  position: CaptionPosition
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