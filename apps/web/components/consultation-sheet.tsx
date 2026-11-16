import cfg from '../lib/business.config';
import { Icon } from './kitchen-stage';

export function ConsultationSheet() {
  return <dialog className="fg ws-sheet consult" id="consult" aria-labelledby="consultTitle">
    <div className="grab" aria-hidden="true" />
    <button className="ws-icon close" type="button" data-close aria-label="Close"><Icon name="close" /></button>
    <div className="consult-content">
      <h2 className="ws-display" id="consultTitle">{cfg.consultation.title}</h2><p className="ws-label">{cfg.consultation.intro}</p>
      <div className="sheet-est ws-well"><span className="ws-cap">Your planning estimate · AUD</span><strong id="sheetPrice" /></div>
      <p className="ws-cap">{cfg.estimate.disclaimer}</p><p className="ws-label">{cfg.consultation.unavailableMessage}</p>
      <button className="ws-btn dark big" type="button" data-close>Back to my design</button>
    </div>
  </dialog>;
}
