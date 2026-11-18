'use client';

import { lazy, Suspense } from 'react';
import type { AgentState, TrackReferenceOrPlaceholder } from '@livekit/components-react';
import cfg from '../lib/business.config';

const Bars = lazy(() => import('./agents-ui/agent-audio-visualizer-bar').then(m => ({ default: m.AgentAudioVisualizerBar })));
const Grid = lazy(() => import('./agents-ui/agent-audio-visualizer-grid').then(m => ({ default: m.AgentAudioVisualizerGrid })));
const Radial = lazy(() => import('./agents-ui/agent-audio-visualizer-radial').then(m => ({ default: m.AgentAudioVisualizerRadial })));
const Wave = lazy(() => import('./agents-ui/agent-audio-visualizer-wave').then(m => ({ default: m.AgentAudioVisualizerWave })));
const Aura = lazy(() => import('./agents-ui/agent-audio-visualizer-aura').then(m => ({ default: m.AgentAudioVisualizerAura })));
export const modes = { bar: 'Bar', grid: 'Grid', radial: 'Radial', wave: 'Wave', aura: 'Aura' } as const;
export type VoiceMode = keyof typeof modes;

export function VoiceVisualiser({ mode, state, track, reduced }: { mode: VoiceMode; state: AgentState; track?: TrackReferenceOrPlaceholder; reduced: boolean }) {
  const shader = mode === 'wave' || mode === 'aura';
  const props = { state, audioTrack: track, size: 'sm' as const, color: cfg.business.brandColor as `#${string}` };
  if (reduced || (shader && (!track || document.querySelector('#stage.is-failed')))) return <p className="voice-visual-note">{modes[mode]} selected. {reduced ? 'Motion is off.' : !track ? 'Starts with live audio.' : 'WebGL is unavailable.'}</p>;
  return <div className="voice-signal" aria-hidden="true"><Suspense fallback={null}>
    {mode === 'bar' ? <Bars {...props} barCount={9} /> : mode === 'grid' ? <Grid {...props} rowCount={5} columnCount={9} /> : mode === 'radial' ? <Radial {...props} radius={16} /> : mode === 'wave' ? <Wave {...props} /> : <Aura {...props} />}
  </Suspense></div>;
}
