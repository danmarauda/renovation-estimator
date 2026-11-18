import { useMemo } from 'react';
import type { AgentState } from '@livekit/components-react';
import { useSequence } from './use-sequence';

export function useAgentAudioVisualizerBarAnimator(state: AgentState | undefined, columns: number, interval: number): number[] {
  const frames = useMemo(() => {
    if (state === 'listening' || state === 'thinking') return [[Math.floor(columns / 2)], [-1]];
    if (state === 'connecting' || state === 'initializing') return Array.from({ length: columns }, (_, i) => [i, columns - 1 - i]);
    if (state === undefined || state === 'speaking') return [Array.from({ length: columns }, (_, i) => i)];
    return [[]];
  }, [state, columns]);
  return useSequence(frames, interval) ?? [];
}
