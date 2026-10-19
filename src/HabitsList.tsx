import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Plus, Search, Trash2 } from 'lucide-react';
import type { Habit } from './domain';
import { HabitIcon } from './HabitEditor';
import { filterHabits, type HabitStatus } from './habitFilters';

export const habitGroupId = (group: string) => `habit-group-${encodeURIComponent(group)}`;
export default function HabitsList({ habits, groups, collapsed, busy, onToggle, onAdd, onDetails, onArchive, onResume, onReorder }: { habits: Habit[]; groups: string[]; collapsed: string[]; busy: boolean; onToggle: (group: string) => void; onAdd: (group?: string) => void; onDetails: (habit: Habit) => void; onArchive: (habit: Habit) => void; onResume: (habit: Habit) => void; onReorder: (index: number, direction: -1 | 1) => void }) {
  const [query, setQuery] = useState(''), [status, setStatus] = useState<HabitStatus>('active'), [groupFilter, setGroupFilter] = useState('*');
  const selectedGroup = groupFilter === '*' ? null : decodeURIComponent(groupFilter.slice(2));
  const filtered = filterHabits(habits, query, status, selectedGroup), active = habits.filter(h => !h.archivedAt).sort((a, b) => a.order - b.order);
  const searching = !!query.trim() || status !== 'active' || groupFilter !== '*';
  const visibleGroups = ['', ...groups].filter(group => (selectedGroup === null || group === selectedGroup) && (!searching || filtered.some(h => (h.group ?? '') === group)));
  return <><div className="habit-filters"><label className="habit-search"><Search size={17}/><input aria-label="Search habits" type="search" placeholder="Search habits" value={query} onChange={e => setQuery(e.target.value)}/></label><div><select aria-label="Habit status" value={status} onChange={e => setStatus(e.target.value as HabitStatus)}><option value="active">Active habits</option><option value="archived">Archived habits</option><option value="all">All habits</option></select><select aria-label="Filter by group" value={groupFilter} onChange={e => setGroupFilter(e.target.value)}><option value="*">All groups</option><option value="g:">Ungrouped</option>{groups.map(g => <option key={g} value={`g:${encodeURIComponent(g)}`}>{g}</option>)}</select></div></div>
    {!filtered.length && searching && <p className="filter-empty" role="status">No habits match. Try another search or filter.</p>}
    <div className="habit-groups-list">{visibleGroups.map(group => {
      const members = filtered.filter(h => (h.group ?? '') === group), label = group || 'Ungrouped', hidden = collapsed.includes(group) && !query.trim();
      const listId = `${habitGroupId(group)}-members`;
      return <section id={habitGroupId(group)} className="card manage-card" key={group} aria-label={`${label} habits`}>
        <div className="card-heading habit-section-heading"><h2><button className="group-toggle" aria-expanded={!hidden} aria-controls={listId} aria-label={`${hidden ? 'Expand' : 'Collapse'} ${label} habits`} disabled={busy || !!query.trim()} onClick={() => onToggle(group)}>{hidden ? <ChevronRight size={15}/> : <ChevronDown size={15}/>}<span>{label}</span><span className="count-chip">{members.length}</span></button></h2><button className="text-button" aria-label={`Add habit to ${label}`} disabled={busy} onClick={() => onAdd(group || undefined)}><Plus size={14}/>Add habit</button></div>
        {!hidden && <div id={listId}>{members.length ? members.map(habit => {
          const activeMembers = active.filter(h => (h.group ?? '') === group), groupIndex = activeMembers.indexOf(habit);
          return <div className="habit-row" key={habit.id}><span className="habit-icon"><HabitIcon name={habit.icon}/></span><button className="habit-name" onClick={() => onDetails(habit)} aria-label={`Details for ${habit.name}`}><strong>{habit.name}</strong><small>{habit.archivedAt ? 'Archived' : habit.measurement?.kind === 'numeric' ? `${habit.measurement.target} ${habit.measurement.unit}` : habit.measurement?.kind === 'checklist' ? `${habit.measurement.items.length} steps` : 'Check-in'}{habit.reminder?.enabled && !habit.archivedAt ? ` · ${habit.reminder.time}` : ''}</small></button>{habit.archivedAt ? <button className="text-button" disabled={busy} onClick={() => onResume(habit)}>Resume</button> : <><div className="order-controls"><button className="icon-button" aria-label={`Move ${habit.name} up`} disabled={groupIndex === 0 || busy || searching} onClick={() => onReorder(active.indexOf(habit), -1)}><ArrowUp size={16}/></button><button className="icon-button" aria-label={`Move ${habit.name} down`} disabled={groupIndex === activeMembers.length - 1 || busy || searching} onClick={() => onReorder(active.indexOf(habit), 1)}><ArrowDown size={16}/></button></div><button className="icon-button" aria-label={`Archive ${habit.name}`} disabled={busy} onClick={() => onArchive(habit)}><Trash2 size={17}/></button></>}</div>;
        }) : <p className="group-empty">{group ? 'No habits in this group.' : 'No ungrouped habits.'}</p>}</div>}
      </section>;
    })}</div></>;
}
