import { useEffect, useState } from 'react';
import { Heading } from '../components/UI.jsx';
import { api } from '../services/api.js';

export function Settings({ data }) {
  const [storage, setStorage] = useState('Checking API…');
  useEffect(() => { let active = true; api('/health').then(result => { if (active) setStorage(result.storage); }).catch(() => { if (active) setStorage('API unavailable'); }); return () => { active = false; }; }, []);
  return <><Heading title="Settings" description="Workspace preferences and demo environment details."/><section className="content-grid"><article className="panel settings-card"><div className="panel-title">School workspace</div><p className="panel-subtitle">Storage is configured by the connected API.</p><div className="form-grid settings-fields"><div className="field"><label>School name</label><input value={data.settings.schoolName} readOnly/></div><div className="field"><label>Data storage</label><input value={storage} readOnly/></div></div></article><article className="panel settings-card"><div className="panel-title">Demo data & tracking</div><p className="panel-subtitle settings-copy">Sample records were imported from <code>backend/data/db.json</code>. That JSON file remains available as a backup. The map is illustrative and does not access GPS or represent actual bus locations. ETA and chart values are sample values.</p><span className="demo-badge"><span/> DEMONSTRATION MODE</span></article></section></>;
}

export function Help() {
  return <><Heading title="Help & support" description="Quick guidance for your school transport workspace."/><section className="panel help-panel"><div className="panel-title">Getting started</div><div className="activity-list"><div className="activity-row"><div className="activity-symbol symbol-info">1</div><div className="activity-copy"><b>Choose a dashboard</b><small>Use the selector in the top bar to switch between Admin, Parent and Driver views.</small></div></div><div className="activity-row"><div className="activity-symbol symbol-pickup">2</div><div className="activity-copy"><b>Update a trip</b><small>From Driver view, start a trip and mark student pickups and drop-offs. Each change appears in notifications.</small></div></div><div className="activity-row"><div className="activity-symbol symbol-drop">3</div><div className="activity-copy"><b>Demo location data</b><small>The route drawing is illustrative. This project does not connect to live vehicle GPS.</small></div></div></div></section></>;
}
