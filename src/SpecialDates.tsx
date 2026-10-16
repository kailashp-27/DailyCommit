import { useState, type FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { badgeDateLabel } from './badges';
import { validDay, type Settings } from './domain';

export default function SpecialDates({ settings, busy, onSave }: { settings: Settings; busy: boolean; onSave: (settings: Settings) => Promise<boolean> }) {
  const [date, setDate] = useState('');
  const dates = settings.specialDates ?? [];
  const submit = async (event: FormEvent) => { event.preventDefault(); if (validDay(date) && !dates.includes(date) && await onSave({ ...settings, specialDates: [...dates, date].sort() })) setDate(''); };
  return <section className="card settings-card"><h2>Special dates</h2><p>A birthday, festival or a day that matters to you. Finish a perfect day to earn Special Release.</p><form onSubmit={event => void submit(event)}><label htmlFor="special-date">Add a date</label><div className="special-date-form"><input id="special-date" type="date" required value={date} onChange={e => setDate(e.target.value)}/><button className="secondary" aria-label="Add special date" disabled={busy || !validDay(date) || dates.includes(date) || dates.length >= 366}><Plus size={18}/></button></div></form>{dates.map(day => <div className="special-date-row" key={day}><span>{badgeDateLabel(day)}</span><button className="icon-button" aria-label={`Remove special date ${day}`} disabled={busy} onClick={() => void onSave({ ...settings, specialDates: dates.filter(d => d !== day) })}><X size={16}/></button></div>)}</section>;
}
