import React from 'react';
import { Composition } from 'remotion';
import { BrainrotVideo, BrainrotVideoProps } from './BrainrotVideo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="BrainrotVideo"
        component={BrainrotVideo as any}
        durationInFrames={1800} // 60 seconds at 30fps - for minute-long videos
        fps={30}
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