import ytdl from 'ytdl-core'
import fs from 'fs'

function downloadAudio(url: String, format: String) {
    if (!ytdl.validateURL(url)) {
        throw new Error('Invalid YouTube URL')
    }
    const video = ytdl(url, {filter: 'audioonly'});

}
