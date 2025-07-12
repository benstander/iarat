import React from 'react';
import { AbsoluteFill, interpolate, spring, useVideoConfig } from 'remotion';

export interface CaptionsProps {
  script: string;
  frame: number;
  fps: number;
  durationInFrames: number;
  durationInSeconds: number;
}

export const Captions: React.FC<CaptionsProps> = ({ 
  script, 
  frame, 
  fps, 
  durationInFrames,
  durationInSeconds
}) => {
  const { width, height } = useVideoConfig();

  // Split script into sentences/phrases for timed captions
  const sentences = script.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Use actual audio duration for better timing
  const framesPerSentence = Math.floor(durationInFrames / sentences.length);
  const secondsPerSentence = durationInSeconds / sentences.length;

  // Current sentence index based on actual timing
  const currentSentenceIndex = Math.floor(frame / framesPerSentence);
  const currentSentence = sentences[currentSentenceIndex] || '';

  // Animation for current sentence
  const sentenceProgress = (frame % framesPerSentence) / framesPerSentence;
  const springValue = spring({
    frame: frame % framesPerSentence,
    fps,
    config: {
      damping: 100,
      stiffness: 200,
      overshootClamping: true,
    },
  });

  // Scale animation
  const scale = interpolate(springValue, [0, 1], [0.8, 1]);
  const opacity = interpolate(springValue, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px',
      }}
    >
      {/* Main Caption */}
      <div
        style={{
          transform: `scale(${scale})`,
          opacity,
        }}
      >
        <div
          style={{
            fontSize: '42px',
            fontWeight: 'bold',
            color: '#ffffff',
            textAlign: 'center',
            fontFamily: 'Arial, sans-serif',
            lineHeight: '1.2',
            maxWidth: `${width * 0.8}px`,
          }}
        >
          {currentSentence.trim()}
        </div>
      </div>

      {/* Animated decorative elements */}
      <div
        style={{
          position: 'absolute',
          top: '50px',
          left: '50px',
          fontSize: '30px',
          transform: `rotate(${frame * 2}deg)`,
          filter: 'drop-shadow(0 0 10px #ff00ff)',
        }}
      >
        🔥
      </div>
      
      <div
        style={{
          position: 'absolute',
          top: '50px',
          right: '50px',
          fontSize: '30px',
          transform: `rotate(${-frame * 2}deg)`,
          filter: 'drop-shadow(0 0 10px #00ffff)',
        }}
      >
        ⚡
      </div>
    </AbsoluteFill>
  );
}; 