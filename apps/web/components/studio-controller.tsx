'use client';

import { useEffect, useState } from 'react';
import { mountStudio } from '../lib/studio';
import type { VoiceDesign } from '../lib/types';
import type { StudioExecute } from '../lib/studio-tools';
import { VoiceDrawer } from './voice-drawer';

export function StudioController({ disclosure }: { disclosure: string | null }) {
  const [dock, setDock] = useState<{design: VoiceDesign; execute: StudioExecute} | null>(null);
  useEffect(() => mountStudio(
    (design, execute) => setDock(previous => previous ? null : {design, execute}),
    design => setDock(previous => previous ? {...previous, design} : null),
  ), []);
  const open = !!dock;
  useEffect(() => {
    document.querySelector('[data-open-voice]')?.setAttribute('aria-expanded', String(open));
  }, [open]);
  function close() {
    setDock(null);
    document.querySelector<HTMLButtonElement>('[data-open-voice]')?.focus({preventScroll:true});
  }
  return dock ? <VoiceDrawer {...dock} disclosure={disclosure} onClose={close} /> : null;
}
