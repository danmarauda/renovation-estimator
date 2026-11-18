'use client';

import { AgentAudioVisualizerBar } from './agents-ui/agent-audio-visualizer-bar';
import { AgentTrackToggle } from './agents-ui/agent-track-toggle';
import '../styles/voice-ui.css';

export default function VoiceStatus() {
  return <div className="voice-status"><AgentTrackToggle source="microphone" pressed={false} disabled aria-label="Microphone off. Live calls unavailable." /><span>Microphone off</span><AgentAudioVisualizerBar size="sm" barCount={5} state="disconnected" aria-hidden="true" /></div>;
}
