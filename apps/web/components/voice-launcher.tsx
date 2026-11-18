import { AudioLines, ChevronUp } from 'lucide-react';

export function VoiceLauncher() {
  return <button type="button" className="voice-launch" aria-label="Talk about this kitchen" data-open-voice aria-expanded="false" aria-controls="voice-drawer" disabled>
    <AudioLines aria-hidden="true" size={20} /><span>Talk about this kitchen</span><ChevronUp aria-hidden="true" size={16} />
  </button>;
}
