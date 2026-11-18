'use client';

import { lazy, Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { AgentTrackToggle } from './agents-ui/agent-track-toggle';
import { VoiceVisualiser, modes, type VoiceMode } from './voice-visualiser';
import type { VoiceDesign } from '../lib/types';
import type { CallCredentials } from './voice-session';
import '../styles/voice-ui.css';

const VoiceSession = lazy(() => import('./voice-session'));
const motionQuery = '(prefers-reduced-motion: reduce)';
const subscribe = (fn: () => void) => { const mq = matchMedia(motionQuery); mq.addEventListener('change', fn); return () => mq.removeEventListener('change', fn); };

import type { StudioExecute } from '../lib/studio-tools';

export default function VoiceStatus({ design, execute, disclosure }: { design: VoiceDesign; execute: StudioExecute; disclosure: string | null }) {
  const [mode, setMode] = useState<VoiceMode>('bar'), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState<CallCredentials | null>(null);
  const pending = useRef<AbortController | null>(null);
  const reduced = useSyncExternalStore(subscribe, () => matchMedia(motionQuery).matches, () => true);
  useEffect(() => () => { pending.current?.abort(); }, []);
  const end = useCallback((notice: string) => { setCredentials(null); setMessage(notice); }, []);
  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!disclosure || pending.current || credentials) return;
    const form = event.currentTarget, data = new FormData(form), abort = new AbortController();
    pending.current = abort; setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/voice/token', { method:'POST', headers:{ 'Content-Type':'application/json' }, cache:'no-store', signal:abort.signal, body:JSON.stringify({ access:data.get('access'), consent:data.get('consent') === 'on', disclosure, choices:design.choices, step:design.stepId }) });
      if (!response.ok) { setMessage(response.status === 403 ? 'Check your studio access code.' : response.status === 429 ? 'The call limit has been reached. Try again later.' : 'Live calls are unavailable. Your microphone is off.'); return; }
      const token = await response.json();
      if (!abort.signal.aborted) { form.reset(); setCredentials({ serverUrl:token.server_url, participantToken:token.participant_token }); }
    } catch { if (!abort.signal.aborted) setMessage('Could not start the call. Your microphone is off.'); }
    finally { pending.current = null; if (!abort.signal.aborted) setBusy(false); }
  }
  return <div className="voice-console">
    {credentials ? <Suspense fallback={<p role="status">Connecting to the kitchen assistant…</p>}><VoiceSession execute={execute} credentials={credentials} mode={mode} reduced={reduced} onEnd={end} /></Suspense> : <>
      <div className="voice-status"><AgentTrackToggle source="microphone" pressed={false} disabled aria-label="Microphone off" /><span>Microphone off</span><VoiceVisualiser mode={mode} reduced={reduced} state="disconnected" />{!disclosure && <button type="button" className="voice-offline-start" disabled>Start call</button>}</div>
      {disclosure && <form className="voice-start" onSubmit={start}>{disclosure && <><label>Studio access code<input type="password" autoComplete="off" name="access" required maxLength={256} /></label><label><input type="checkbox" name="consent" required /> Share microphone audio and let the assistant read and adjust this kitchen during the call.</label></>}
        <button className="ws-btn quiet" type="submit" disabled={!disclosure || busy}>{busy ? 'Connecting…' : 'Start call'}</button>
      </form>}</>}
    <details className="voice-settings"><summary>Call settings</summary><label className="voice-mode">Visualiser<select value={mode} onChange={e => setMode(e.target.value as VoiceMode)}>{Object.entries(modes).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label></details>
    {message && <p role="status">{message}</p>}
  </div>;
}
