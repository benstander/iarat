import ytdl from 'ytdl-core'
import { experimental_transcribe as transcribe } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function urlToAudioBuffer(url: string) {
    if (!ytdl.validateURL(url)) {
        throw new Error('Invalid YouTube URL')
    }

    const audioStream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' })

    // Collect audio data chunks into a Buffer
    const chunks: Buffer[] = []
    for await (const chunk of audioStream) {
        chunks.push(chunk)
    }
    const audioBuffer = Buffer.concat(chunks)

    return audioBuffer;
}

export async function transcribeAudio(audioBuffer: Buffer) {
    // Now call experimental_transcribe
    const result = await transcribe({
        model: openai.transcription('whisper-1'),
        audio: audioBuffer,
        providerOptions: { openai: { language: 'en' } },
    })

    return result.text
}