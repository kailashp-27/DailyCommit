import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { Habit } from './domain';
import { HabitIcon } from './HabitEditor';

export const habitGroupId = (group: string) => `habit-group-${encodeURIComponent(group)}`;
export default function HabitsList({ habits, groups, busy, onAdd, onEdit, onArchive, onReorder }: { habits: Habit[]; groups: string[]; busy: boolean; onAdd: (group?: string) => void; onEdit: (habit: Habit) => void; onArchive: (habit: Habit) => void; onReorder: (index: number, direction: -1 | 1) => void }) {
  return <div className="habit-groups-list">{['', ...groups].map(group => {
    const members = habits.filter(h => (h.group ?? '') === group), label = group || 'Ungrouped';
    return <section id={habitGroupId(group)} className="card manage-card" key={group} aria-label={`${label} habits`}>
      <div className="card-heading habit-section-heading"><h2>{label}<span className="count-chip">{members.length}</span></h2><button className="text-button" aria-label={`Add habit to ${label}`} disabled={busy} onClick={() => onAdd(group || undefined)}><Plus size={14}/>Add habit</button></div>
      {members.length ? members.map(habit => {
        const index = habits.indexOf(habit), groupIndex = members.indexOf(habit);
        return <div className="habit-row" key={habit.id}><span className="habit-icon"><HabitIcon name={habit.icon}/></span><button className="habit-name" disabled={busy} onClick={() => onEdit(habit)}><strong>{habit.name}</strong><small>{habit.measurement?.kind === 'numeric' ? `${habit.measurement.target} ${habit.measurement.unit}` : habit.measurement?.kind === 'checklist' ? `${habit.measurement.items.length} steps` : 'Check-in'}{habit.reminder?.enabled ? ` · ${habit.reminder.time}` : ''}</small></button><div className="order-controls"><button className="icon-button" aria-label={`Move ${habit.name} up`} disabled={groupIndex === 0 || busy} onClick={() => onReorder(index, -1)}><ArrowUp size={16}/></button><button className="icon-button" aria-label={`Move ${habit.name} down`} disabled={groupIndex === members.length - 1 || busy} onClick={() => onReorder(index, 1)}><ArrowDown size={16}/></button></div><button className="icon-button" aria-label={`Archive ${habit.name}`} disabled={busy} onClick={() => onArchive(habit)}><Trash2 size={17}/></button></div>;
      }) : <p className="group-empty">{group ? 'No habits in this group.' : 'No ungrouped habits.'}</p>}
    </section>;
  })}</div>;
}
