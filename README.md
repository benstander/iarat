## IARAT - AI Brainrot Video Generator

This is a [Next.js](https://nextjs.org) project that generates brainrot-style video scripts from various content sources using AI.

## Features

- **PDF Upload & Processing**: Upload lecture notes or documents in PDF format - text extraction and script conversion happens entirely in the backend
- **YouTube Transcription**: Extract transcripts from YouTube videos and convert to engaging scripts
- **Manual Text Input**: Direct text input for custom content conversion
- **AI Script Generation**: Convert content to engaging video scripts using OpenAI via Vercel AI SDK
- **Backend-Only Text Processing**: PDF text never appears in frontend - only final video scripts are shown

## Architecture

- **Frontend**: Next.js 15 with React 19, Tailwind CSS, and Shadcn/ui components
- **Backend**: Next.js API Routes with the following endpoints:
  - `/api/pdf-upload` - PDF processing, text extraction using pdf-parse, and direct script generation
  - `/api/youtube-transcribe` - YouTube video transcription
  - `/api/generate-video-script` - AI script generation using Vercel AI SDK + OpenAI (for YouTube/manual text)
- **AI Integration**: Vercel AI SDK with OpenAI GPT-3.5-turbo for script generation

## Dependencies

Key packages:
- `pdf-parse` - PDF text extraction
- `@ai-sdk/openai` & `ai` - Vercel AI SDK for OpenAI integration  
- `youtube-dl-exec` - YouTube video processing
- `multer` - File upload handling

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
