import { VoiceLauncher } from './voice-launcher';

function Icon({ name }: { name: string }) {
  return <svg className="i" aria-hidden="true"><use href={`#i-${name}`} /></svg>;
}

export function KitchenStage({ children }: { children: React.ReactNode }) {
  return <div className="workspace">
    <span id="rail-label" className="rail-label" aria-hidden="true" />
    <section className="stage" id="stage" aria-label="3D kitchen">
      {/* The poster has fixed dimensions and loads before the deferred WebGL engine. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="stage-poster" src="/kitchen-poster.webp" alt="Default kitchen with sage cabinets and a timber island" width="960" height="738" decoding="async" fetchPriority="high" />
      <canvas id="scene" tabIndex={0} aria-label="3D kitchen. Drag, or use the arrow keys, to look around. Plus and minus zoom. Home shows the whole kitchen. Choose parts using the design steps below the kitchen." />
      <p className="stage-fallback" id="fallback" role="status">Loading your 3D kitchen. You can already choose finishes and check your estimate.</p>
      <p className="stage-hint" id="hint"><Icon name="move" /><span>Drag to look around. Click any part to change it.</span></p>
      <div className="tip" id="tip" aria-hidden="true" />
    </section>
    {children}
    <nav className="dock" id="dock" aria-label="Design steps">
      <div className="dock-group" data-steps="first" />
      <VoiceLauncher />
      <div className="dock-group" data-steps="last" />
    </nav>
  </div>;
}

export function StudioViewControls() {
  return <div className="stage-tools" role="group" aria-label="Kitchen view" aria-describedby="fallback">
    <div className="ws-seg time-seg" role="group" aria-label="Time of day">
      <button className="fg-pill" type="button" aria-pressed="true" data-time="day" title="Day" disabled><Icon name="sun" /><span>Day</span></button>
      <button className="fg-pill" type="button" aria-pressed="false" data-time="evening" title="Evening" disabled><Icon name="moon" /><span>Evening</span></button>
    </div>
    <button className="fg-pill tool" type="button" id="autoRotate" aria-pressed="false" title="Auto-rotate" disabled><Icon name="rotate" /><span>Auto-rotate</span></button>
    <button className="fg-pill tool" type="button" id="wholeView" aria-label="View the whole kitchen" title="View the whole kitchen" disabled><Icon name="expand" /><span>Whole kitchen</span></button>
  </div>;
}

export { Icon };
