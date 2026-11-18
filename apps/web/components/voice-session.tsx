'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAgent, useSession, useSessionMessages, useVoiceAssistant, type UseSessionReturn } from '@livekit/components-react';
import { TokenSource, RoomEvent, ConnectionState } from 'livekit-client';
import { createRpcReceiver, studioMethod, type StudioExecute } from '../lib/studio-tools';
import { MotionConfig } from 'motion/react';
import { AgentSessionProvider } from './agents-ui/agent-session-provider';
import { AgentControlBar } from './agents-ui/agent-control-bar';
import { AgentChatTranscript } from './agents-ui/agent-chat-transcript';
import { StartAudioButton } from './agents-ui/start-audio-button';
import { VoiceVisualiser, type VoiceMode } from './voice-visualiser';
import { Button } from './ui/button';

export interface CallCredentials { serverUrl: string; participantToken: string }
export type CallNotice = { phase: 'ended' | 'error'; message: string };
const ended = { phase: 'ended', message: 'Call ended. Your microphone is off.' } as const;

function Conversation({ session, mode, reduced, finish }: { session: UseSessionReturn; mode: VoiceMode; reduced: boolean; finish: (notice: CallNotice) => void }) {
  const { messages } = useSessionMessages(session);
  const { state, isConnected } = useAgent();
  const active = session.isConnected && isConnected;
  useEffect(() => { if (state === 'failed') finish({ phase: 'error', message: 'The assistant could not stay connected. The call has ended.' }); }, [state, finish]);
  const { audioTrack } = useVoiceAssistant();
  const [deviceError, setDeviceError] = useState(false);
  const agentLabel = state === 'listening' ? 'Assistant listening' : state === 'thinking' ? 'Assistant thinking' : state === 'speaking' ? 'Assistant speaking' : 'Connected to the kitchen assistant';

  return <MotionConfig reducedMotion="user">
    <div className="voice-status">
      <div role="status"><p className="voice-state-name">{active ? 'Call active' : 'Connecting…'}</p><p className="voice-kicker">{active ? agentLabel : 'Connecting to the kitchen assistant'}</p></div>
      <VoiceVisualiser mode={mode} state={state} track={audioTrack} reduced={reduced} />
    </div>
    <section className="voice-conversation" aria-labelledby="voice-conversation-title">
      <h3 id="voice-conversation-title">Conversation</h3>
      <div className="voice-transcript">
        {messages.length === 0 && state !== 'thinking' ? <p className="voice-copy">{active ? 'Speak or type to start the conversation.' : 'The transcript appears here once the call starts.'}</p> : null}
        <AgentChatTranscript className="voice-messages" messages={messages} agentState={state} role="log" aria-label="Conversation transcript" />
      </div>
    </section>
    {session.isConnected && <StartAudioButton label="Enable call audio" />}
    {deviceError && <p role="alert">Microphone unavailable. Check your device permission or use text.</p>}
    <AgentControlBar className="voice-live-controls" controls={{ microphone:true, chat:true, leave:active, camera:false, screenShare:false }} saveUserChoices={false} isConnected={active} chatMode="always" onDeviceError={() => setDeviceError(true)} onDisconnect={() => finish(ended)} />
    {!active && <div className="voice-call-actions"><Button type="button" variant="outline" onClick={() => finish({ phase: 'ended', message: 'Call cancelled. Your microphone is off.' })}>Cancel</Button></div>}
  </MotionConfig>;
}
export default function VoiceSession({ execute, credentials, mode, reduced, onEnd }: { execute: StudioExecute; credentials: CallCredentials; mode: VoiceMode; reduced: boolean; onEnd: (notice: CallNotice) => void }) {
  const source = useMemo(() => TokenSource.literal(credentials), [credentials]);
  const session = useSession(source, { agentConnectTimeoutMilliseconds: 20000 });
  const latest = useRef(session);
  useEffect(() => { latest.current = session; }, [session]);
  useEffect(() => {
    const { room, start, end } = latest.current, controller = new AbortController();
    // A private, explicitly dispatched two-participant room has one server-attested agent.
    const receive = createRpcReceiver(execute, peer => !controller.signal.aborted && room.state === ConnectionState.Connected && room.remoteParticipants.get(peer)?.isAgent === true);
    room.registerRpcMethod(studioMethod, receive);
    const lost = () => { if (!controller.signal.aborted) onEnd(ended); };
    // Delay by one microtask so Strict Mode's discarded mount never starts a call.
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      try {
        await start({ signal: controller.signal, tracks: { microphone: { enabled: false } } });
        if (controller.signal.aborted) return;
        room.on(RoomEvent.Disconnected, lost);
        await room.localParticipant.setMicrophoneEnabled(true);
        if (controller.signal.aborted) await room.disconnect(true);
      } catch (cause) {
        if (!controller.signal.aborted) onEnd({ phase: 'error', message: cause instanceof Error && cause.name === 'NotAllowedError' ? 'Microphone permission was denied. The call has ended.' : 'Could not connect the kitchen call. Your microphone is off.' });
      }
    });
    return () => { controller.abort(); room.unregisterRpcMethod(studioMethod); room.off(RoomEvent.Disconnected, lost); void end().catch(() => room.disconnect(true)); };
  }, [execute, onEnd]);
  return <AgentSessionProvider session={session}><Conversation session={session} mode={mode} reduced={reduced} finish={onEnd} /></AgentSessionProvider>;
}
