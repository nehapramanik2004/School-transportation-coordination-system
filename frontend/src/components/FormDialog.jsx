import { useState } from 'react';
import Icon from './Icon.jsx';

export default function FormDialog({ title, description, fields, submitLabel, initial = {}, onClose, onSubmit }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map(field => [field.name, initial[field.name] ?? field.defaultValue ?? (field.type === 'select' ? field.options?.[0]?.value ?? '' : '')])));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const change = (name, value) => setValues(current => ({ ...current, [name]: value }));
  async function submit(event) {
    event.preventDefault(); setError(''); setSaving(true);
    try { await onSubmit(Object.fromEntries(Object.entries(values).map(([key, value]) => [key, key === 'capacity' ? Number(value) : value]))); onClose(); }
    catch (caught) { setError(caught.message); }
    finally { setSaving(false); }
  }

  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="dialogTitle"><div className="modal-head"><div><h2 id="dialogTitle">{title}</h2><p>{description}</p></div><button type="button" className="modal-close" onClick={onClose} aria-label="Close"> <Icon name="close"/></button></div>
    <form onSubmit={submit}><div className="form-grid">{fields.map(field => <div className={`field ${field.full ? 'full' : ''}`} key={field.name}><label htmlFor={field.name}>{field.label}</label>{field.type === 'select' ? <select id={field.name} value={values[field.name]} onChange={event => change(field.name, event.target.value)} required={field.required !== false}>{field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.type === 'textarea' ? <textarea id={field.name} value={values[field.name]} onChange={event => change(field.name, event.target.value)} placeholder={field.placeholder} required={field.required !== false}/> : <input id={field.name} type={field.type || 'text'} value={values[field.name]} onChange={event => change(field.name, event.target.value)} placeholder={field.placeholder} required={field.required !== false} min={field.min}/>}</div>)}</div>{error && <div className="form-error" role="alert">{error}</div>}<div className="modal-actions"><button type="button" className="button" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? 'Saving…' : submitLabel}</button></div></form>
  </section></div>;
}
