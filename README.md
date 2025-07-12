# 🔥 IARAT - AI Brainrot Video Generator

Transform any educational content into viral Gen-Z brainrot videos! Upload PDFs, YouTube links, or text notes and get TikTok-ready videos with AI-generated voice and animated captions.

## ⚡ Recent Optimizations

- **⏱️ 20-30 Second Videos**: Optimized for TikTok attention spans (down from 100+ seconds)
- **🚀 Faster Rendering**: 2x concurrency and optimized Remotion settings
- **☁️ Supabase Storage**: Videos and audio stored in the cloud for better scalability
- **🎯 Shorter Scripts**: Punchy, viral-ready content generation

## 🌟 Features

- **📄 PDF Processing**: Extract text and convert to brainrot scripts
- **🎥 YouTube Transcription**: Turn any YouTube video into brainrot content
- **✍️ Manual Input**: Paste any text for conversion
- **🎙️ AI Voice Generation**: ElevenLabs integration for realistic voice
- **🎬 Video Rendering**: Remotion-powered video creation with animated captions
- **📱 Mobile-Optimized**: 1080x1920 vertical format for TikTok/Instagram

## 🚀 Quick Setup

### 1. Environment Variables
Create `.env.local` in the project root:

```bash
# OpenAI for script generation
OPENAI_API_KEY=your_openai_api_key_here

# ElevenLabs for voice generation
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Supabase for video storage (optional - fallback to local)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 2. Supabase Setup (Optional)
Create two storage buckets in your Supabase project:
- `generated-videos` (public bucket)
- `generated-audio` (public bucket)

### 3. Install & Run
```bash
npm install
npm run dev
```

## 🎯 How It Works

1. **Input**: Upload PDF, YouTube link, or paste text
2. **Script Generation**: ChatGPT converts to Gen-Z brainrot language
3. **Voice Generation**: ElevenLabs creates realistic voice audio
4. **Video Rendering**: Remotion combines voice, captions, and background video
5. **Storage**: Upload to Supabase or store locally
6. **Output**: Download viral-ready TikTok video!

## 🔧 Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Video Generation**: Remotion
- **AI**: OpenAI GPT-4, ElevenLabs
- **Storage**: Supabase (with local fallback)
- **Processing**: PDF-parse, YouTube transcription

## 📱 Example Output

Input: Educational PDF about business strategy
Output: 25-second video with:
- "POV: You thought business strategy was boring but it's literally just corporate rizz..." 
- Animated captions with brainrot styling
- ElevenLabs voice narration
- Subway Surfers or Minecraft parkour background

## 🎨 Customization

- **Background Videos**: Choose between Minecraft or Subway Surfers
- **Voice Settings**: Modify voice parameters in `src/lib/voice-generation.ts`
- **Caption Styling**: Customize animations in `remotion/Captions.tsx`
- **Script Style**: Adjust prompts in API routes for different tones

## 🚨 Performance Notes

- Videos are optimized to 20-30 seconds for faster rendering
- Concurrency set to 2x for better performance
- Supabase storage prevents local disk overflow
- First render downloads Chrome (~85MB) - subsequent renders are faster

## 🎉 Ready to Create Viral Content?

1. Add your API keys
2. Upload some content
3. Watch the magic happen! ✨
