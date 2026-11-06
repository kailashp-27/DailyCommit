import { useState, type FormEvent } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, LayoutTemplate, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Habit } from './domain';
import type { GroupAction } from './repository';
import { HabitIcon } from './HabitEditor';
import Modal from './Modal';

type Screen = 'create' | { kind: 'rename' | 'remove'; name: string } | null;

type Props = {
  groups: string[];
  habits: Habit[];
  busy: boolean;
  onChange: (action: GroupAction) => Promise<boolean>;
  onTemplates: () => void;
  onAddHabit: (group: string) => void;
  onHabitDetails: (habit: Habit) => void;
};

export default function GroupsPage({
  groups,
  habits,
  busy,
  onChange,
  onTemplates,
  onAddHabit,
  onHabitDetails,
}: Props) {
  const [screen, setScreen] = useState<Screen>(null);
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [saving, setSaving] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const selected = typeof screen === 'object' ? screen?.name : undefined;
  const duplicate = groups.some(group => group.toLowerCase() === name.trim().toLowerCase() && group !== selected);
  const disabled = busy || saving;

  const saveName = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || duplicate || disabled) return;
    setSaving(true);
    try {
      const action: GroupAction = selected
        ? { kind: 'rename', name: selected, next: name.trim() }
        : { kind: 'create', name: name.trim() };
      if (await onChange(action)) {
        setScreen(null);
        setName('');
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selected || disabled) return;
    setSaving(true);
    try {
      if (await onChange({ kind: 'remove', name: selected, destination })) {
        setScreen(null);
      }
    } finally {
      setSaving(false);
    }
  };

  const count = habits.filter(h => h.group === selected).length;
  const activeHabits = habits.filter(h => !h.archivedAt);

  return (
    <div className="groups-page">
      {/* Top Action Bar */}
      <div className="groups-top-bar">
        <button
          type="button"
          className="primary new-group-btn"
          disabled={disabled}
          onClick={() => { setName(''); setScreen('create'); }}
        >
          <Plus size={16} />
          <span>New Group</span>
        </button>

        <button
          type="button"
          className="secondary templates-btn"
          disabled={disabled}
          onClick={onTemplates}
        >
          <LayoutTemplate size={15} />
          <span>Templates</span>
        </button>
      </div>

      {/* Groups List */}
      <div className="groups-cards-list">
        {groups.map((group, index) => {
          const groupHabits = activeHabits.filter(h => h.group === group);
          const isExpanded = openGroups.has(group);
          return (
            <section className="card group-card" key={group}>
              <div className="group-card-header">
                <button
                  type="button"
                  className="group-card-title-btn"
                  aria-expanded={isExpanded}
                  onClick={() => toggleGroup(group)}
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span className="group-title-text">{group}</span>
                  <span className="count-chip">{groupHabits.length}</span>
                </button>

                <div className="group-card-actions">
                  <button
                    className="icon-button"
                    aria-label={`Move ${group} group up`}
                    disabled={disabled || index === 0}
                    onClick={() => void onChange({ kind: 'move', name: group, direction: -1 })}
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Move ${group} group down`}
                    disabled={disabled || index === groups.length - 1}
                    onClick={() => void onChange({ kind: 'move', name: group, direction: 1 })}
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Rename ${group} group`}
                    disabled={disabled}
                    onClick={() => { setName(group); setScreen({ kind: 'rename', name: group }); }}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Remove ${group} group`}
                    disabled={disabled}
                    onClick={() => { setDestination(''); setScreen({ kind: 'remove', name: group }); }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="group-card-body">
                  {groupHabits.length ? (
                    <div className="group-habits-sublist">
                      {groupHabits.map(h => (
                        <div className="group-habit-row" key={h.id}>
                          <span className="habit-icon"><HabitIcon name={h.icon} /></span>
                          <button
                            type="button"
                            className="habit-name"
                            onClick={() => onHabitDetails(h)}
                          >
                            <strong>{h.name}</strong>
                            <small>
                              {h.measurement?.kind === 'numeric'
                                ? `${h.measurement.target} ${h.measurement.unit}`
                                : h.measurement?.kind === 'checklist'
                                ? `${h.measurement.items.length} steps`
                                : 'Check-in'}
                            </small>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="subtle group-empty-note">No habits in this group yet.</p>
                  )}
                  <button
                    type="button"
                    className="text-button add-to-group-btn"
                    disabled={disabled}
                    onClick={() => onAddHabit(group)}
                  >
                    <Plus size={14} /> Add habit to {group}
                  </button>
                </div>
              )}
            </section>
          );
        })}

        {/* Ungrouped Habits Section */}
        {(() => {
          const ungroupedHabits = activeHabits.filter(h => !h.group);
          if (ungroupedHabits.length === 0) return null;
          const isExpanded = openGroups.has('__ungrouped__');
          return (
            <section className="card group-card ungrouped-card">
              <div className="group-card-header">
                <button
                  type="button"
                  className="group-card-title-btn"
                  aria-expanded={isExpanded}
                  onClick={() => toggleGroup('__ungrouped__')}
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span className="group-title-text">Ungrouped Habits</span>
                  <span className="count-chip">{ungroupedHabits.length}</span>
                </button>
              </div>

              {isExpanded && (
                <div className="group-card-body">
                  <div className="group-habits-sublist">
                    {ungroupedHabits.map(h => (
                      <div className="group-habit-row" key={h.id}>
                        <span className="habit-icon"><HabitIcon name={h.icon} /></span>
                        <button
                          type="button"
                          className="habit-name"
                          onClick={() => onHabitDetails(h)}
                        >
                          <strong>{h.name}</strong>
                          <small>
                            {h.measurement?.kind === 'numeric'
                              ? `${h.measurement.target} ${h.measurement.unit}`
                              : h.measurement?.kind === 'checklist'
                              ? `${h.measurement.items.length} steps`
                              : 'Check-in'}
                          </small>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          );
        })()}

        {groups.length === 0 && (
          <div className="empty-state">
            <LayoutTemplate size={32} className="accent-sparkle" />
            <h3>No groups created</h3>
            <p>Create custom groups or use templates to organize your habits into daily routines.</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button className="primary" onClick={() => { setName(''); setScreen('create'); }}>
                <Plus size={16} /> New Group
              </button>
              <button className="secondary" onClick={onTemplates}>
                <LayoutTemplate size={15} /> Templates
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal dialogs */}
      {screen !== null && (
        <Modal
          title={
            screen === 'create'
              ? 'New group'
              : screen.kind === 'rename'
              ? 'Rename group'
              : 'Remove group?'
          }
          onClose={() => { if (!disabled) setScreen(null); }}
        >
          {typeof screen === 'object' && screen.kind === 'remove' ? (
            <>
              <p className="field-hint">
                Remove “{selected}”. {count ? `${count} ${count === 1 ? 'habit moves' : 'habits move'} to the destination you choose. History is preserved.` : 'Your habits and history are kept.'}
              </p>
              <label htmlFor="group-destination">Move habits to</label>
              <select
                id="group-destination"
                value={destination}
                disabled={disabled}
                onChange={e => setDestination(e.target.value)}
              >
                <option value="">Ungrouped</option>
                {groups.filter(group => group !== selected).map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
              <div className="modal-actions">
                <button type="button" className="secondary" disabled={disabled} onClick={() => setScreen(null)}>
                  Cancel
                </button>
                <button type="button" className="primary" disabled={disabled} onClick={() => void remove()}>
                  Remove group
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={saveName}>
              <label htmlFor="group-name">Group Name</label>
              <input
                id="group-name"
                data-autofocus
                maxLength={40}
                required
                disabled={disabled}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Creative work"
              />
              {duplicate && <p className="field-hint" role="alert">This group already exists.</p>}
              <div className="modal-actions">
                <button type="button" className="secondary" disabled={disabled} onClick={() => setScreen(null)}>
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={disabled || !name.trim() || duplicate}>
                  {screen === 'create' ? 'Create' : 'Save'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
