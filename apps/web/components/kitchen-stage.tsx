import { VoiceLauncher } from './voice-launcher';

function Icon({ name }: { name: string }) {
  return <svg className="i" aria-hidden="true"><use href={`#i-${name}`} /></svg>;
}

export function KitchenStage() {
  return <div className="workspace">
    <nav className="dock" id="dock" aria-label="Design steps" />
    <span id="rail-label" className="rail-label" aria-hidden="true" />
    <section className="stage" id="stage" aria-label="3D kitchen">
      {/* The poster has fixed dimensions and loads before the deferred WebGL engine. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="stage-poster" src="/kitchen-poster.webp" alt="Default kitchen with sage cabinets and a timber island" width="960" height="738" decoding="async" fetchPriority="high" />
      <canvas id="scene" tabIndex={0} aria-label="3D kitchen. Drag, or use the arrow keys, to look around. Plus and minus zoom. Home shows the whole kitchen. Choose parts using the design steps on the left." />
      <p className="stage-fallback" id="fallback" role="status">Loading your 3D kitchen. You can already choose finishes and check your estimate.</p>
      <div className="stage-tools" role="group" aria-label="View">
        <div className="ws-seg time-seg" role="group" aria-label="Time of day">
          <button className="fg-pill on" type="button" aria-pressed="true" data-time="day" disabled><Icon name="sun" /><span className="t">Day</span></button>
          <button className="fg-pill" type="button" aria-pressed="false" data-time="evening" disabled><Icon name="moon" /><span className="t">Evening</span></button>
        </div>
        <button className="fg-pill tool" type="button" id="autoRotate" aria-pressed="false" aria-label="Auto-rotate" disabled><Icon name="rotate" /><span className="t">Auto-rotate</span></button>
        <button className="fg-pill tool" type="button" id="wholeView" aria-label="View the whole kitchen" disabled><Icon name="expand" /><span className="t">Whole kitchen</span></button>
      </div>
      <p className="stage-hint" id="hint"><Icon name="move" /><span>Drag to look around. Click any part to change it.</span></p>
      <div className="tip" id="tip" aria-hidden="true" />
    </section>
    <VoiceLauncher placement="workspace" />
  </div>;
}

export { Icon };
