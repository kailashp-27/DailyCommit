import { useState, type FormEvent } from 'react';
import { ArrowDown, ArrowUp, LayoutTemplate, Pencil, Plus, Settings2, Trash2 } from 'lucide-react';
import type { Habit } from './domain';
import type { GroupAction } from './repository';
import Modal from './Modal';

type Screen = 'manage' | 'create' | { kind: 'rename' | 'remove'; name: string } | null;
type Props = { groups: string[]; habits: Habit[]; busy: boolean; onChange: (action: GroupAction) => Promise<boolean>; onCreated: (name: string) => void; onTemplates: () => void };
export default function GroupManager({ groups, habits, busy, onChange, onCreated, onTemplates }: Props) {
  const [screen, setScreen] = useState<Screen>(null), [name, setName] = useState(''), [destination, setDestination] = useState(''), [saving, setSaving] = useState(false);
  const selected = typeof screen === 'object' ? screen?.name : undefined;
  const duplicate = groups.some(group => group.toLowerCase() === name.trim().toLowerCase() && group !== selected);
  const disabled = busy || saving;
  const saveName = async (event: FormEvent) => {
    event.preventDefault(); if (!name.trim() || duplicate || disabled) return;
    setSaving(true);
    try {
      const action: GroupAction = selected ? { kind: 'rename', name: selected, next: name.trim() } : { kind: 'create', name: name.trim() };
      if (await onChange(action)) { const created = name.trim(); setScreen(null); setName(''); onCreated(created); }
    } finally { setSaving(false); }
  };
  const remove = async () => {
    if (!selected || disabled) return;
    setSaving(true);
    try { if (await onChange({ kind: 'remove', name: selected, destination })) setScreen('manage'); } finally { setSaving(false); }
  };
  const title = screen === 'manage' ? 'Manage groups' : screen === 'create' ? 'New group' : typeof screen === 'object' && screen?.kind === 'remove' ? 'Remove group?' : 'Rename group';
  const count = habits.filter(h => h.group === selected).length;
  return <><div className="groups-bar"><button className="text-button" disabled={busy} onClick={onTemplates}><LayoutTemplate size={15}/>Templates</button><button className="text-button" disabled={busy} onClick={() => setScreen('manage')}><Settings2 size={15}/>Manage groups</button><button className="text-button" disabled={busy} onClick={() => { setName(''); setScreen('create'); }}><Plus size={15}/>New group</button></div>
    {screen !== null && <Modal key={title} title={title} onClose={() => { if (!disabled) setScreen(null); }}>
      {screen === 'manage' ? <div className="group-manager-list">{groups.length ? groups.map((group, index) => <div className="group-manager-row" key={group}><div><strong>{group}</strong><small>{habits.filter(h => h.group === group && !h.archivedAt).length} active habits</small></div><div className="group-manager-actions"><button className="icon-button" aria-label={`Move ${group} group up`} disabled={disabled || index === 0} onClick={() => void onChange({ kind: 'move', name: group, direction: -1 })}><ArrowUp size={16}/></button><button className="icon-button" aria-label={`Move ${group} group down`} disabled={disabled || index === groups.length - 1} onClick={() => void onChange({ kind: 'move', name: group, direction: 1 })}><ArrowDown size={16}/></button><button className="icon-button" aria-label={`Rename ${group} group`} disabled={disabled} onClick={() => { setName(group); setScreen({ kind: 'rename', name: group }); }}><Pencil size={16}/></button><button className="icon-button" aria-label={`Remove ${group} group`} disabled={disabled} onClick={() => { setDestination(''); setScreen({ kind: 'remove', name: group }); }}><Trash2 size={16}/></button></div></div>) : <p>No groups yet.</p>}<button className="secondary" disabled={disabled} onClick={() => { setName(''); setScreen('create'); }}><Plus size={16}/>New group</button></div>
      : typeof screen === 'object' && screen.kind === 'remove' ? <><p className="field-hint">Remove “{selected}”. {count ? `${count} ${count === 1 ? 'habit moves' : 'habits move'} to the group you choose, including archived habits. Check-ins and notes are kept.` : 'Your habits and history are kept.'}</p><label htmlFor="group-destination">Move habits to</label><select id="group-destination" value={destination} disabled={disabled} onChange={e => setDestination(e.target.value)}><option value="">Ungrouped</option>{groups.filter(group => group !== selected).map(group => <option key={group} value={group}>{group}</option>)}</select><div className="modal-actions"><button className="secondary" disabled={disabled} onClick={() => setScreen('manage')}>Cancel</button><button className="primary" disabled={disabled} onClick={() => void remove()}>Remove group</button></div></>
      : <form onSubmit={event => void saveName(event)}><label htmlFor="group-name">Name</label><input id="group-name" data-autofocus maxLength={40} required disabled={disabled} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Creative work"/>{duplicate && <p className="field-hint" role="alert">This group already exists.</p>}<div className="modal-actions"><button type="button" className="secondary" disabled={disabled} onClick={() => setScreen(null)}>Cancel</button><button className="primary" disabled={disabled || !name.trim() || duplicate}>{screen === 'create' ? 'Create' : 'Save'}</button></div></form>}
    </Modal>}
  </>;
}
