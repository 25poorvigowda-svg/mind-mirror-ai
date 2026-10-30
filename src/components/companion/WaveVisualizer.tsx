import React from 'react';

interface WaveVisualizerProps {
  isActive: boolean;
  color?: 'cyan' | 'violet' | 'teal';
  bars?: number;
}

export const WaveVisualizer: React.FC<WaveVisualizerProps> = ({
  isActive,
  color = 'cyan',
  bars = 9,
}) => {
  const barClass =
    color === 'violet'
      ? 'bg-violet-400 shadow-violet-500/50'
      : color === 'teal'
      ? 'bg-teal-400 shadow-teal-500/50'
      : 'bg-cyan-400 shadow-cyan-500/50';

  return (
    <div className="flex items-center justify-center gap-1.5 h-8 px-3">
      {Array.from({ length: bars }).map((_, i) => {
        const heightStyle = isActive
          ? {
              animation: `pulseBar 0.8s ease-in-out infinite ${(i * 0.12) % 0.6}s`,
            }
          : { height: '4px' };

        return (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-200 shadow-sm ${barClass}`}
            style={heightStyle}
          />
        );
      })}
    </div>
  );
};
