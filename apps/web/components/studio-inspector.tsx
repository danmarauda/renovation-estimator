import { VoiceLauncher } from './voice-launcher';
import cfg from '../lib/business.config';
import { Icon } from './kitchen-stage';

export function StudioInspector() {
  const room = cfg.rooms.kitchen;
  return <aside className="panel" id="panel" aria-label="Options and estimate" aria-busy="true">
    <div className="panel-body" id="inspector">
      <section className="view" id="viewSize" aria-labelledby="sizeLabel" hidden>
        <div className="view-head"><span className="ws-ico"><Icon name="size" /></span><div><h2 className="ws-title" id="sizeLabel" tabIndex={-1}>Kitchen size</h2><p className="ws-cap">Choose the closest floor area to set your allowances.</p></div></div>
        <div className="size-opts" id="sizes" role="radiogroup" aria-labelledby="sizeLabel" aria-describedby="sizeNote" />
        <p className="ws-cap" id="sizeNote">{room.sizeNote}</p>
        <details className="measurements"><summary className="ws-label">3D layout dimensions · mm</summary><dl id="measurements">{room.measurements.map((measurement) => <div key={measurement.name}><dt>{measurement.name}</dt><dd>{measurement.value} mm</dd></div>)}</dl><p className="ws-cap">{room.measurementNote}</p></details>
      </section>
      <section className="view options" id="options" aria-live="off" hidden />
      <section className="view" id="viewSummary" aria-labelledby="bdLabel" hidden>
        <div className="view-head"><span className="ws-ico"><Icon name="summary" /></span><div><h2 className="ws-title" id="bdLabel" tabIndex={-1}>Your estimate</h2><p className="ws-cap" id="bdSize" /></div></div>
        <ul className="breakdown" id="breakdown" />
        <div className="bd-total"><span>Estimated total</span><strong id="bdTotal" /></div>
        <p className="ws-cap">{cfg.estimate.disclaimer}</p>
        <div className="foot ws-cap"><p>{cfg.business.sampleNotice}</p><p>All allowances are in Australian dollars (AUD). Final scope, GST treatment and pricing require confirmation.</p></div>
      </section>
    </div>
    <div className="stepper">
      <button className="ws-btn ghost" type="button" id="stepPrev" hidden><Icon name="chev-l" /><span /></button>
      <button className="ws-btn quiet" type="button" id="stepNext" hidden><span /><Icon name="chev-r" /></button>
    </div>
    <footer className="panel-foot" id="estimate">
      <span className="delta ws-chip ink" id="delta" aria-hidden="true" />
      <div className="est-head"><span className="ws-eyebrow est-live"><i className="live-dot" aria-hidden="true" /><span>{cfg.estimate.label}</span></span><button className="chip-btn" type="button" id="sizeBtn" data-step="size" aria-label="Change kitchen size"><span id="sizeChip" /><Icon name="chev-r" /></button></div>
      <div className="est-row"><p className="est-price" aria-hidden="true"><span className="lo" data-price="lo" /><span className="dash">–</span><span className="hi" data-price="hi" /></p><button className="text-btn" type="button" id="breakdownBtn" data-step="summary">Breakdown<Icon name="chev-r" /></button></div>
      <p className="ws-cap est-note">{cfg.estimate.disclaimer}</p><p className="ws-h cta-lead">{cfg.cta.lead}</p>
      <button className="cta" type="button" data-open-consult><span className="cta-label">{cfg.cta.button}</span><span className="cta-dot" aria-hidden="true"><Icon name="arrow" /></span></button>
      <VoiceLauncher placement="footer" />
    </footer>
  </aside>;
}
