import cfg from '../lib/business.config';
import { voiceConfig } from '../lib/voice-activation';
import { KitchenStage } from '../components/kitchen-stage';
import { StudioInspector } from '../components/studio-inspector';
import { ConsultationSheet } from '../components/consultation-sheet';
import { StudioController } from '../components/studio-controller';

export default function StudioPage() {
  return <>
    <main className="app">
      <header className="masthead">
        <div className="brand"><span className="logo" aria-hidden="true">{cfg.business.logoText}</span><span className="brand-txt"><h1 className="brand-name">{cfg.business.name}</h1><span className="ws-cap">{cfg.business.tagline}</span></span></div>
      </header>
      <KitchenStage><StudioController disclosure={voiceConfig()?.disclosure ?? null} /></KitchenStage>
      <StudioInspector />
    </main>
    <ConsultationSheet />
    <p className="ws-sr" id="live" aria-live="polite" />
    <p className="ws-sr" id="sceneLive" aria-live="polite" />
    <noscript><p>Enable JavaScript to explore finishes and calculate your planning estimate. Prices are indicative AUD allowances, not a quote.</p></noscript>
  </>;
}
