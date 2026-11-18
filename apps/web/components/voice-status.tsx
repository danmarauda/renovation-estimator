'use client';

import { lazy, Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { MicOff, Phone } from 'lucide-react';
import { Button } from './ui/button';
import { VoiceVisualiser, modes, type VoiceMode } from './voice-visualiser';
import type { StudioExecute } from '../lib/studio-tools';
import type { VoiceDesign } from '../lib/types';
import type { CallCredentials, CallNotice } from './voice-session';
import '../styles/voice-ui.css';

const VoiceSession = lazy(() => import('./voice-session'));
const motionQuery = '(prefers-reduced-motion: reduce)';
const subscribe = (fn: () => void) => { const mq = matchMedia(motionQuery); mq.addEventListener('change', fn); return () => mq.removeEventListener('change', fn); };

type Call = { phase: 'ready' | 'requesting' } | { phase: 'session'; credentials: CallCredentials } | CallNotice;

export default function VoiceStatus({ design, execute, disclosure }: { design: VoiceDesign; execute: StudioExecute; disclosure: string | null }) {
  const [mode, setMode] = useState<VoiceMode>('bar');
  const [call, setCall] = useState<Call>({ phase: 'ready' });
  const statusAction = useRef<HTMLButtonElement>(null);
  const pending = useRef<AbortController | null>(null);
  const reduced = useSyncExternalStore(subscribe, () => matchMedia(motionQuery).matches, () => true);
  useEffect(() => () => { pending.current?.abort(); }, []);
  useEffect(() => {
    if (call.phase !== 'ready' && document.activeElement === document.body) statusAction.current?.focus();
  }, [call.phase]);
  const end = useCallback((notice: CallNotice) => setCall(notice), []);

  function cancel() {
    pending.current?.abort();
    pending.current = null;
    end({ phase: 'ended', message: 'Call cancelled. Your microphone is off.' });
  }

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!disclosure || pending.current || call.phase === 'session') return;
    const form = event.currentTarget, data = new FormData(form), abort = new AbortController();
    pending.current = abort;
    setCall({ phase: 'requesting' });
    try {
      const response = await fetch('/api/voice/token', { method:'POST', headers:{ 'Content-Type':'application/json' }, cache:'no-store', signal:abort.signal, body:JSON.stringify({ access:data.get('access'), consent:data.get('consent') === 'on', disclosure, choices:design.choices, step:design.stepId }) });
      if (abort.signal.aborted) return;
      if (!response.ok) {
        end({ phase: 'error', message: response.status === 403 ? 'Check your studio access code.' : response.status === 429 ? 'The call limit has been reached. Try again later.' : 'Live calls are unavailable. Your microphone is off.' });
        return;
      }
      const token = await response.json();
      if (!abort.signal.aborted) {
        form.reset();
        setCall({ phase: 'session', credentials: { serverUrl:token.server_url, participantToken:token.participant_token } });
      }
    } catch {
      if (!abort.signal.aborted) end({ phase: 'error', message: 'Could not start the call. Your microphone is off.' });
    } finally {
      if (pending.current === abort) pending.current = null;
    }
  }

  const busy = call.phase === 'requesting';
  const notice = call.phase === 'ended' || call.phase === 'error' ? call : null;
  return <div className="voice-console">
    {call.phase === 'session' ? <Suspense fallback={<div className="voice-loading">
      <p role="status">Connecting to the kitchen assistant…</p>
      <Button type="button" variant="outline" onClick={cancel}>Cancel</Button>
    </div>}>
      <VoiceSession execute={execute} credentials={call.credentials} mode={mode} reduced={reduced} onEnd={end} />
    </Suspense> : <>
      <div className="voice-status">
        <span className="voice-status-icon"><MicOff size={18} aria-hidden="true" /></span>
        <div>
          <p className="voice-state-name">{!disclosure ? 'Live calls unavailable' : busy ? 'Connecting…' : notice?.phase === 'ended' ? 'Call ended' : notice ? 'Call failed' : 'Ready to connect'}</p>
          <p className="voice-kicker">Microphone off</p>
        </div>
        <VoiceVisualiser mode={mode} reduced={reduced} state="disconnected" />
      </div>
      {!disclosure && <p className="voice-copy">Your microphone is off and your design has not been sent.</p>}
      <div role="status" className="voice-notice">{busy ? 'Connecting to the kitchen assistant…' : notice?.message}</div>
      {disclosure && <form className="voice-start" onSubmit={start}>
        <label>Studio access code<input type="password" autoComplete="off" name="access" required maxLength={256} disabled={busy} /></label>
        <label><input type="checkbox" name="consent" required disabled={busy} /> Share microphone audio and let the assistant read and adjust this kitchen during the call.</label>
        <div className="voice-call-actions">
          {busy ? <Button key="cancel" ref={statusAction} type="button" variant="outline" onClick={event => { event.preventDefault(); cancel(); }}>Cancel</Button> :
            <Button key="start" ref={statusAction} type="submit"><Phone data-icon="inline-start" aria-hidden="true" />{notice?.phase === 'ended' ? 'Start another call' : notice ? 'Try again' : 'Start call'}</Button>}
        </div>
      </form>}
    </>}
    <details className="voice-settings"><summary>Call settings</summary><label className="voice-mode">Visualiser<select value={mode} onChange={e => setMode(e.target.value as VoiceMode)}>{Object.entries(modes).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label></details>
  </div>;
}
