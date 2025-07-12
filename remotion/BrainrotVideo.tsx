import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Video, Audio, staticFile } from 'remotion';
import { Captions } from './Captions';

export interface BrainrotVideoProps {
  script: string;
  backgroundVideo: string; // Now accepts URLs or 'minecraft'/'subway'
  voiceAudio: string;
}

export const BrainrotVideo: React.FC<BrainrotVideoProps> = ({ 
  script, 
  backgroundVideo, 
  voiceAudio 
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Calculate actual duration in seconds from the video config
  const durationInSeconds = durationInFrames / fps;

  // Determine video source
  let videoSrc: string;
  
  if (backgroundVideo.startsWith('http')) {
    // Direct URL (Supabase or external)
    videoSrc = backgroundVideo;
  } else {
    // Legacy local video system
    const backgroundVideoFiles = {
      minecraft: ['mp1.mp4', 'mp2.mp4', 'mp3.mp4', 'mp4.mp4', 'mp5.mp4'],
      subway: ['ss1.mp4', 'ss2.mp4', 'ss3.mp4', 'ss4.mp4', 'ss5.mp4']
    };

    const videoFiles = backgroundVideoFiles[backgroundVideo as keyof typeof backgroundVideoFiles];
    if (videoFiles) {
      const selectedVideo = videoFiles[Math.floor(Math.random() * videoFiles.length)];
      videoSrc = staticFile(`videos/${backgroundVideo}/${selectedVideo}`);
    } else {
      // Fallback to a default video
      videoSrc = staticFile('videos/minecraft/mp1.mp4');
    }
  }

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {/* Background Video */}
      <Video
        src={videoSrc}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        volume={0.3}
        loop
      />

      {/* Voice Audio */}
      {voiceAudio && (
        <Audio
          src={voiceAudio.startsWith('http') ? voiceAudio : staticFile(voiceAudio.replace('/', ''))}
          volume={1}
          startFrom={0}
        />
      )}

      {/* Captions Overlay */}
      <Captions 
        script={script}
        frame={frame}
        fps={fps}
        durationInFrames={durationInFrames}
        durationInSeconds={durationInSeconds}
      />
    </AbsoluteFill>
  );
}; 