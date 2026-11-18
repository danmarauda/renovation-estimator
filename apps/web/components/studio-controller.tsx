'use client';

import { useEffect, useState } from 'react';
import { mountStudio } from '../lib/studio';
import type { VoiceDesign } from '../lib/types';
import { VoiceDrawer } from './voice-drawer';

export function StudioController() {
  const [design, setDesign] = useState<VoiceDesign | null>(null);
  useEffect(() => mountStudio(setDesign), []);
  return <VoiceDrawer design={design} onClose={() => setDesign(null)} />;
}
