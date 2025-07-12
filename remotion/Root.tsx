import React from 'react';
import { Composition } from 'remotion';
import { BrainrotVideo, BrainrotVideoProps } from './BrainrotVideo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="BrainrotVideo"
        component={BrainrotVideo as any}
        durationInFrames={1440} // 30 seconds at 30fps - for 30-second videos
        fps={45}
        width={1080}
        height={1920} // Vertical format for TikTok/Shorts
        defaultProps={{
          script: "This is a sample script for a brainrot video that will be displayed as animated captions",
          backgroundVideo: "minecraft",
          voiceAudio: ""
        } as BrainrotVideoProps}
      />
    </>
  );
}; 