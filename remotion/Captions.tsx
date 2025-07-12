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

  // Split script into shorter phrases for two-line captions
  // Split by common punctuation and conjunctions, then limit words per caption
  const phrases = script
    .split(/[.!?]+|,\s+|\s+and\s+|\s+but\s+|\s+or\s+|\s+so\s+|\s+because\s+/i)
    .filter(s => s.trim().length > 0)
    .flatMap(phrase => {
      // Allow longer phrases for two-line captions (max 12 words per caption)
      const words = phrase.trim().split(/\s+/);
      const chunks = [];
      for (let i = 0; i < words.length; i += 12) {
        chunks.push(words.slice(i, i + 12).join(' '));
      }
      return chunks;
    })
    .filter(chunk => chunk.trim().length > 0);
  
  // Use actual audio duration for better timing
  const framesPerPhrase = Math.floor(durationInFrames / phrases.length);
  const secondsPerPhrase = durationInSeconds / phrases.length;

  // Current phrase index based on actual timing
  const currentPhraseIndex = Math.floor(frame / framesPerPhrase);
  const currentPhrase = phrases[currentPhraseIndex] || '';

  // Animation for current phrase
  const phraseProgress = (frame % framesPerPhrase) / framesPerPhrase;
  const springValue = spring({
    frame: frame % framesPerPhrase,
    fps,
    config: {
      damping: 100,
      stiffness: 200,
      overshootClamping: true,
    },
  });

  // Scale animation - more dramatic for bigger text
  const scale = interpolate(springValue, [0, 1], [0.7, 1.1]);
  const opacity = interpolate(springValue, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px 40px',
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
            fontSize: '60px', // Much bigger - increased from 42px
            fontWeight: '600', // Extra bold
            color: '#ffffff',
            textAlign: 'center',
            fontFamily: 'Arial Black, Arial, sans-serif',
            lineHeight: '1.2',
            maxWidth: `${width * 0.9}px`,
            textShadow: '4px 4px 8px rgba(0, 0, 0, 0.8), -2px -2px 4px rgba(0, 0, 0, 0.5)',
            WebkitTextStroke: '2px #000000', // Black outline for better visibility
            letterSpacing: '1px',
            textTransform: 'uppercase', // Make text more impactful
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            wordBreak: 'break-word',
            hyphens: 'none',
          }}
        >
          {currentPhrase.trim()}
        </div>
      </div>

      {/* Enhanced animated decorative elements */}
      <div
        style={{
          position: 'absolute',
          top: '80px',
          left: '60px',
          fontSize: '40px',
          transform: `rotate(${frame * 3}deg) scale(${1 + Math.sin(frame * 0.1) * 0.2})`,
          filter: 'drop-shadow(0 0 15px #ff00ff)',
        }}
      >
        🔥
      </div>
      
      <div
        style={{
          position: 'absolute',
          top: '80px',
          right: '60px',
          fontSize: '40px',
          transform: `rotate(${-frame * 3}deg) scale(${1 + Math.cos(frame * 0.1) * 0.2})`,
          filter: 'drop-shadow(0 0 15px #00ffff)',
        }}
      >
        ⚡
      </div>
    </AbsoluteFill>
  );
}; 