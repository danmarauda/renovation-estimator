'use client';

import { lazy, Suspense, useEffect, useRef } from 'react';
import { AudioLines, X } from 'lucide-react';
import type { VoiceDesign } from '../lib/types';
import type { StudioExecute } from '../lib/studio-tools';
import cfg from '../lib/business.config';

const VoiceStatus = lazy(() => import('./voice-status'));

export function VoiceDrawer({ design, execute, disclosure, onClose }: { design: VoiceDesign; execute: StudioExecute; disclosure: string | null; onClose: () => void }) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => { title.current?.focus({preventScroll:true}); }, []);
  return <section id="voice-drawer" className="voice-drawer" aria-labelledby="voice-title" onKeyDown={e => { if (e.key === 'Escape' && !e.defaultPrevented) { e.stopPropagation(); onClose(); } }}>
    <header className="voice-header">
      <div className="voice-heading"><AudioLines size={22} aria-hidden="true" /><h2 id="voice-title" ref={title} tabIndex={-1}>Kitchen assistant</h2></div>
      <button type="button" onClick={onClose} className="voice-close" aria-label="Close assistant and end any call"><X size={18} aria-hidden="true" /></button>
    </header>
    <div className="voice-content">
      {disclosure && <p className="voice-copy">{disclosure}</p>}
      <Suspense fallback={<p className="voice-loading" role="status">Loading call controls…</p>}><VoiceStatus design={design} execute={execute} disclosure={disclosure} /></Suspense>
      <div className="voice-shortcuts" role="group" aria-label="Studio shortcuts">
        <button type="button" onClick={() => execute({action:'navigate',step:'size'})}>Measurements</button>
        <button type="button" onClick={() => execute({action:'navigate',step:'summary'})}>Show estimate</button>
      </div>
      <details className="voice-finishes"><summary>Your current design <span>{design.step}</span></summary><dl><div><dt>Pricing allowance</dt><dd>{design.size}</dd></div><div><dt>{cfg.estimate.label}</dt><dd>{design.estimate}</dd></div>{design.finishes.map(line => <div key={line.id}><dt>{line.name}</dt><dd>{line.summary}</dd></div>)}</dl><p className="ws-cap">{cfg.estimate.disclaimer}</p></details>
    </div>
  </section>;
}
