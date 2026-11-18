'use client';

import { lazy, Suspense, useEffect, useRef } from 'react';
import { AudioLines, X } from 'lucide-react';
import type { VoiceDesign } from '../lib/types';
import cfg from '../lib/business.config';

const VoiceStatus = lazy(() => import('./voice-status'));

export function VoiceDrawer({ design, onClose }: { design: VoiceDesign | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !design) return;
    dialog.showModal();
    return () => { dialog.close(); };
  }, [design]);
  return <dialog ref={ref} id="voice-drawer" className="voice-drawer" aria-labelledby="voice-title" aria-describedby="voice-availability" onCancel={(e) => { e.preventDefault(); onClose(); }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    {design && <div className="voice-content">
      <header className="voice-header"><span className="voice-kicker"><AudioLines size={18} aria-hidden="true" /> Kitchen voice assistant</span><button type="button" onClick={onClose} className="voice-close" aria-label="Close voice drawer"><X size={20} aria-hidden="true" /></button></header>
      <h2 id="voice-title" className="ws-display">Talk about this kitchen</h2>
      <p id="voice-availability" className="ws-label">Live calls aren&apos;t available yet. Your microphone is off and your design hasn&apos;t been sent.</p>
      <Suspense fallback={<p className="ws-label">Microphone off</p>}><VoiceStatus /></Suspense>
      <div className="voice-summary"><h3 className="ws-h">Your current design</h3><dl><div><dt>Kitchen size</dt><dd>{design.size}</dd></div><div><dt>Design step</dt><dd>{design.step}</dd></div><div><dt>{cfg.estimate.label}</dt><dd>{design.estimate}</dd></div></dl><p className="ws-cap">{cfg.estimate.disclaimer}</p></div>
      <details className="voice-finishes"><summary>Selected finishes</summary><dl>{design.finishes.map((line) => <div key={line.id}><dt>{line.name}</dt><dd>{line.summary}</dd></div>)}</dl></details>
    </div>}
  </dialog>;
}
