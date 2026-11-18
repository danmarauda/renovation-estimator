import { AudioLines, ChevronUp } from 'lucide-react';

export function VoiceLauncher({ placement }: { placement: 'workspace' | 'footer' }) {
  return <button type="button" className={`voice-launch voice-${placement}`} data-open-voice aria-haspopup="dialog" aria-controls="voice-drawer" disabled>
    <AudioLines aria-hidden="true" size={20} /><span>Talk about this kitchen</span><ChevronUp aria-hidden="true" size={16} />
  </button>;
}
