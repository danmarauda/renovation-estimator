import cfg from '../lib/business.config';
import { KitchenStage } from '../components/kitchen-stage';
import { StudioInspector } from '../components/studio-inspector';
import { ConsultationSheet } from '../components/consultation-sheet';
import { StudioController } from '../components/studio-controller';

export default function StudioPage() {
  const room = cfg.rooms.kitchen;
  return <>
    <main className="app">
      <header className="masthead">
        <div className="brand"><span className="logo" aria-hidden="true">{cfg.business.logoText}</span><span className="brand-txt"><span className="brand-name">{cfg.business.name}</span><span className="ws-cap">{cfg.business.tagline}</span></span></div>
        <div className="intro"><h1 className="ws-loud m title"><span>{room.title}</span>{' '}<em>{room.titleEm}</em></h1><p className="ws-label lede">{room.intro}</p></div>
      </header>
      <KitchenStage />
      <StudioInspector />
    </main>
    <ConsultationSheet />
    <p className="ws-sr" id="live" aria-live="polite" />
    <p className="ws-sr" id="sceneLive" aria-live="polite" />
    <noscript><p>Enable JavaScript to explore finishes and calculate your planning estimate. Prices are indicative AUD allowances, not a quote.</p></noscript>
    <StudioController />
  </>;
}
