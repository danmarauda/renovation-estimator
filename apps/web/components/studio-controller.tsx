'use client';

import { useEffect } from 'react';
import { mountStudio } from '../lib/studio';

export function StudioController() {
  useEffect(() => mountStudio(), []);
  return null;
}
