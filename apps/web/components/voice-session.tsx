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

export interface CallCredentials { serverUrl: string; participantToken: string }
function Conversation({ session, mode, reduced, finish }: { session: UseSessionReturn; mode: VoiceMode; reduced: boolean; finish: (message: string) => void }) {
  const { messages } = useSessionMessages(session);
  const { state } = useAgent();
  useEffect(() => { if (state === 'failed') finish('The assistant could not stay connected. The call has ended.'); }, [state, finish]);
  const { audioTrack } = useVoiceAssistant();
  const [chat, setChat] = useState(false), [deviceError, setDeviceError] = useState(false);
  return <MotionConfig reducedMotion="user"><p role="status" className="voice-kicker">Kitchen assistant: {state}</p>
    <VoiceVisualiser mode={mode} state={state} track={audioTrack} reduced={reduced} />
    <StartAudioButton label="Enable call audio" />
    {deviceError && <p role="alert">Microphone unavailable. Check your device permission or use text.</p>}
    {chat && <div className="voice-transcript"><AgentChatTranscript messages={messages} agentState={state} /></div>}
    <AgentControlBar controls={{ microphone:true, chat:true, leave:true, camera:false, screenShare:false }} saveUserChoices={false} isConnected={session.isConnected} isChatOpen={chat} onIsChatOpenChange={setChat} onDeviceError={() => setDeviceError(true)} onDisconnect={() => finish('Call ended. Your microphone is off.')} />
  </MotionConfig>;
}
export default function VoiceSession({ execute, credentials, mode, reduced, onEnd }: { execute: StudioExecute; credentials: CallCredentials; mode: VoiceMode; reduced: boolean; onEnd: (message: string) => void }) {
  const source = useMemo(() => TokenSource.literal(credentials), [credentials]);
  const session = useSession(source, { agentConnectTimeoutMilliseconds: 20000 });
  const latest = useRef(session);
  useEffect(() => { latest.current = session; }, [session]);
  useEffect(() => {
    const { room, start, end } = latest.current, controller = new AbortController();
    // A private, explicitly dispatched two-participant room has one server-attested agent.
    const receive = createRpcReceiver(execute, peer => !controller.signal.aborted && room.state === ConnectionState.Connected && room.remoteParticipants.get(peer)?.isAgent === true);
    room.registerRpcMethod(studioMethod, receive);
    const lost = () => { if (!controller.signal.aborted) onEnd('Call ended. Your microphone is off.'); };
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
        if (!controller.signal.aborted) onEnd(cause instanceof Error && cause.name === 'NotAllowedError' ? 'Microphone permission was denied. The call has ended.' : 'Could not connect the kitchen call. Your microphone is off.');
      }
    });
    return () => { controller.abort(); room.unregisterRpcMethod(studioMethod); room.off(RoomEvent.Disconnected, lost); void end().catch(() => room.disconnect(true)); };
  }, [execute, onEnd]);
  return <AgentSessionProvider session={session}><Conversation session={session} mode={mode} reduced={reduced} finish={onEnd} /></AgentSessionProvider>;
}
