import { useState, type FormEvent } from 'react';
import {
  Activity, ArrowUp, Bell, Bike, BookOpen, Code2, Coffee, Dog, Droplets,
  Dumbbell, Flame, Footprints, GraduationCap, Heart, Languages, Leaf,
  Moon, Music, Palette, PenTool, Pill, Plus, Sun, Target, Utensils, Wallet, X
} from 'lucide-react';
import type { Habit, Measurement, Schedule } from './domain';
import Modal from './Modal';

export const icons = {
  sun: Sun,
  book: BookOpen,
  move: Activity,
  code: Code2,
  mind: Leaf,
  water: Droplets,
  fitness: Dumbbell,
  steps: Footprints,
  cycling: Bike,
  sleep: Moon,
  heart: Heart,
  journal: PenTool,
  music: Music,
  food: Utensils,
  finance: Wallet,
  study: GraduationCap,
  language: Languages,
  target: Target,
  meds: Pill,
  pet: Dog,
  coffee: Coffee,
  flame: Flame,
  brush: Palette,
};
export function HabitIcon({ name }: { name: string }) {
  const Icon = icons[name as keyof typeof icons] ?? Sun;
  return <Icon size={20} />;
}

export type HabitValues = Pick<Habit, 'name' | 'group' | 'icon' | 'color' | 'schedule' | 'reminder' | 'goalDate'> & { measurement: Measurement };

export default function HabitEditor({
  habit,
  groups,
  initialGroup,
  initialValues,
  onClose,
  onSave,
}: {
  habit: Habit | 'new';
  groups: string[];
  initialGroup?: string;
  initialValues?: HabitValues;
  onClose: () => void;
  onSave: (value: HabitValues) => Promise<boolean>;
}) {
  const original = habit === 'new' ? null : habit;
  const values = original ?? initialValues;
  const [name, setName] = useState(values?.name ?? '');
  const [icon, setIcon] = useState(values?.icon ?? 'sun');
  const [kind, setKind] = useState<Schedule['kind']>(values?.schedule.kind ?? 'daily');
  const [days, setDays] = useState(values?.schedule.kind === 'weekdays' ? values.schedule.days : [1, 2, 3, 4, 5]);
  const [weeklyTarget, setWeeklyTarget] = useState(values?.schedule.kind === 'weekly' ? values.schedule.target : 1);
  const [weeklyDueDay, setWeeklyDueDay] = useState<number | undefined>(values?.schedule.kind === 'weekly' ? values.schedule.dueDay : undefined);
  const [monthlyTarget, setMonthlyTarget] = useState(values?.schedule.kind === 'monthly' ? values.schedule.target : 1);
  const [monthlyDueDay, setMonthlyDueDay] = useState<number | undefined>(values?.schedule.kind === 'monthly' ? values.schedule.dueDayOfMonth : undefined);
  const [hasGoalDate, setHasGoalDate] = useState(!!values?.goalDate);
  const [goalDate, setGoalDate] = useState(values?.goalDate ?? '');
  const [tracking, setTracking] = useState<Measurement['kind']>(values?.measurement?.kind ?? 'binary');
  const numeric = tracking === 'numeric';
  const [steps, setSteps] = useState(values?.measurement?.kind === 'checklist' ? values.measurement.items : []);
  const [reminder, setReminder] = useState(values?.reminder ?? { enabled: false, time: '20:00' });
  const [target, setTarget] = useState(values?.measurement?.kind === 'numeric' ? String(values.measurement.target) : '8');
  const [unit, setUnit] = useState(values?.measurement?.kind === 'numeric' ? values.measurement.unit : 'glasses');
  const [saving, setSaving] = useState(false);

  const assignedGroup = original ? original.group : initialGroup ?? initialValues?.group;
  const [group, setGroup] = useState(assignedGroup ? `group:${assignedGroup}` : '');
  const [newGroup, setNewGroup] = useState('');

  const valid =
    (!reminder.enabled || /^([01]\d|2[0-3]):[0-5]\d$/.test(reminder.time)) &&
    (tracking !== 'checklist' || (steps.length > 0 && steps.every(step => step.text.trim()))) &&
    name.trim() &&
    (group !== '__new__' || newGroup.trim()) &&
    (!numeric || (Number(target) > 0 && Number(target) <= 1_000_000 && unit.trim())) &&
    (kind !== 'weekdays' || days.length > 0) &&
    (kind !== 'weekly' || (Number.isInteger(weeklyTarget) && weeklyTarget >= 1 && weeklyTarget <= 7)) &&
    (kind !== 'monthly' || (Number.isInteger(monthlyTarget) && monthlyTarget >= 1 && monthlyTarget <= 31));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    try {
      let scheduleObj: Schedule;
      if (kind === 'daily') {
        scheduleObj = { kind: 'daily' };
      } else if (kind === 'weekdays') {
        scheduleObj = { kind: 'weekdays', days: [...days].sort() };
      } else if (kind === 'weekly') {
        scheduleObj = { kind: 'weekly', target: weeklyTarget, dueDay: weeklyDueDay };
      } else {
        scheduleObj = { kind: 'monthly', target: monthlyTarget, dueDayOfMonth: monthlyDueDay };
      }

      const saved = await onSave({
        name: name.trim(),
        group: (group === '__new__' ? newGroup.trim() : group.slice(6)) || undefined,
        icon,
        color: values?.color ?? '#FF8A3D',
        schedule: scheduleObj,
        reminder: { ...reminder, time: reminder.time || '20:00' },
        goalDate: hasGoalDate && goalDate ? goalDate : null,
        measurement:
          tracking === 'checklist'
            ? { kind: 'checklist', items: steps.map(step => ({ ...step, text: step.text.trim() })) }
            : numeric
            ? { kind: 'numeric', target: Number(target), unit: unit.trim() }
            : { kind: 'binary' },
      });
      if (saved) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={original ? 'Edit habit' : 'Add habit'} onClose={onClose}>
      <form onSubmit={submit}>
        <label htmlFor="habit-name">Habit name</label>
        <input
          data-autofocus
          id="habit-name"
          placeholder="e.g. Read books"
          maxLength={80}
          required
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <label htmlFor="habit-group">Group</label>
        <select id="habit-group" value={group} onChange={e => setGroup(e.target.value)}>
          <option value="">Ungrouped</option>
          {[...groups, ...(assignedGroup && !groups.includes(assignedGroup) ? [assignedGroup] : [])].map(name => (
            <option key={name} value={`group:${name}`}>
              {name}{!groups.includes(name) ? ' (new group)' : ''}
            </option>
          ))}
          <option value="__new__">Create a group…</option>
        </select>
        {group === '__new__' && (
          <>
            <label htmlFor="new-group-name">New group name</label>
            <input
              id="new-group-name"
              maxLength={40}
              required
              value={newGroup}
              onChange={e => setNewGroup(e.target.value)}
              placeholder="e.g. Creative work"
            />
          </>
        )}

        <label>Icon</label>
        <div className="icon-options">
          {Object.keys(icons).map(value => (
            <button
              type="button"
              key={value}
              aria-label={value}
              aria-pressed={value === icon}
              className={icon === value ? 'selected' : ''}
              onClick={() => setIcon(value)}
            >
              <HabitIcon name={value} />
            </button>
          ))}
        </div>

        <label htmlFor="habit-type">Track</label>
        <select id="habit-type" value={tracking} onChange={e => setTracking(e.target.value as Measurement['kind'])}>
          <option value="binary">Check-in</option>
          <option value="numeric">Number</option>
          {original && <option value="checklist">Checklist</option>}
        </select>

        {numeric && (
          <div className="form-pair">
            <div>
              <label htmlFor="habit-target">Daily target</label>
              <input
                id="habit-target"
                type="number"
                inputMode="decimal"
                min="0.01"
                max="1000000"
                step="any"
                required
                value={target}
                onChange={e => setTarget(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="habit-unit">Unit</label>
              <input
                id="habit-unit"
                maxLength={24}
                required
                placeholder="glasses"
                value={unit}
                onChange={e => setUnit(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Schedule Selector */}
        <label htmlFor="habit-schedule">Schedule</label>
        <select id="habit-schedule" value={kind} onChange={e => setKind(e.target.value as Schedule['kind'])}>
          <option value="daily">Every day</option>
          <option value="weekdays">Specific weekdays</option>
          <option value="weekly">Weekly once</option>
          <option value="monthly">Monthly once</option>
        </select>

        {kind === 'weekdays' && (
          <div className="weekday-options">
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => (
              <button
                type="button"
                key={day}
                aria-label={day}
                aria-pressed={days.includes(i)}
                className={days.includes(i) ? 'selected' : ''}
                onClick={() => setDays(prev => (prev.includes(i) ? prev.filter(n => n !== i) : [...prev, i]))}
              >
                {day[0]}
              </button>
            ))}
          </div>
        )}

        {kind === 'weekly' && (
          <div className="form-pair">
            <div>
              <label htmlFor="weekly-target">Frequency</label>
              <select id="weekly-target" value={weeklyTarget} onChange={e => setWeeklyTarget(Number(e.target.value))}>
                <option value="1">Weekly once (1x)</option>
                <option value="2">2 times a week</option>
                <option value="3">3 times a week</option>
                <option value="4">4 times a week</option>
                <option value="5">5 times a week</option>
                <option value="6">6 times a week</option>
              </select>
            </div>
            <div>
              <label htmlFor="weekly-due-day">Due Day</label>
              <select
                id="weekly-due-day"
                value={weeklyDueDay ?? ''}
                onChange={e => setWeeklyDueDay(e.target.value === '' ? undefined : Number(e.target.value))}
              >
                <option value="">Flexible (Any day)</option>
                <option value="0">Sunday</option>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
              </select>
            </div>
          </div>
        )}

        {kind === 'monthly' && (
          <div className="form-pair">
            <div>
              <label htmlFor="monthly-target">Frequency</label>
              <select id="monthly-target" value={monthlyTarget} onChange={e => setMonthlyTarget(Number(e.target.value))}>
                <option value="1">Monthly once (1x)</option>
                <option value="2">2 times a month</option>
              </select>
            </div>
            <div>
              <label htmlFor="monthly-due-day">Due Date</label>
              <select
                id="monthly-due-day"
                value={monthlyDueDay ?? ''}
                onChange={e => setMonthlyDueDay(e.target.value === '' ? undefined : Number(e.target.value))}
              >
                <option value="">Flexible (Any day)</option>
                <option value="1">1st of the month</option>
                <option value="15">15th of the month</option>
                {Array.from({ length: 31 }, (_, i) => i + 1)
                  .filter(d => d !== 1 && d !== 15)
                  .map(day => (
                    <option key={day} value={day}>{day}th of the month</option>
                  ))}
              </select>
            </div>
          </div>
        )}

        {/* Goal / Challenge Finish Date */}
        <details className="editor-extra">
          <summary>
            <Target size={15} />
            Challenge finish date <span>{hasGoalDate && goalDate ? goalDate : 'None'}</span>
          </summary>
          <div className="card-heading">
            <label htmlFor="habit-goal-enabled">Set a finish date</label>
            <input
              id="habit-goal-enabled"
              type="checkbox"
              checked={hasGoalDate}
              onChange={e => {
                setHasGoalDate(e.target.checked);
                if (!goalDate) {
                  const in8Weeks = new Date();
                  in8Weeks.setDate(in8Weeks.getDate() + 56);
                  setGoalDate(in8Weeks.toISOString().slice(0, 10));
                }
              }}
            />
          </div>
          {hasGoalDate && (
            <>
              <label htmlFor="habit-goal-date">Goal finish date</label>
              <input
                id="habit-goal-date"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={goalDate}
                onChange={e => setGoalDate(e.target.value)}
              />
              <p className="field-hint">e.g. 8-week challenge. The habit will finish with honors when you reach this date.</p>
            </>
          )}
        </details>

        {original && (
          <section className="editor-extra">
            <div className="card-heading">
              <h3>Checklist</h3>
              {tracking !== 'checklist' && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setTracking('checklist');
                    if (!steps.length) setSteps([{ id: crypto.randomUUID(), text: '' }]);
                  }}
                >
                  <Plus size={14} />Add checklist
                </button>
              )}
            </div>
            {tracking === 'checklist' && (
              <>
                <p className="field-hint">Finish the steps to complete this habit.</p>
                <div className="checklist-editor">
                  {steps.map((step, index) => (
                    <div className="checklist-editor-row" key={step.id}>
                      <input
                        aria-label={`Step ${index + 1}`}
                        maxLength={80}
                        required
                        value={step.text}
                        onChange={e =>
                          setSteps(items =>
                            items.map(item => (item.id === step.id ? { ...item, text: e.target.value } : item))
                          )
                        }
                        placeholder={`Step ${index + 1}`}
                      />
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Move step ${index + 1} up`}
                        disabled={index === 0}
                        onClick={() =>
                          setSteps(items => {
                            const next = [...items];
                            [next[index - 1], next[index]] = [next[index], next[index - 1]];
                            return next;
                          })
                        }
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Remove step ${index + 1}`}
                        onClick={() => setSteps(items => items.filter(item => item.id !== step.id))}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="text-button"
                  disabled={steps.length >= 30}
                  onClick={() => setSteps(items => [...items, { id: crypto.randomUUID(), text: '' }])}
                >
                  <Plus size={14} />Add step
                </button>
              </>
            )}
          </section>
        )}

        <details className="editor-extra">
          <summary>
            <Bell size={15} />
            Reminder <span>{reminder.enabled ? reminder.time : 'Off'}</span>
          </summary>
          <div className="card-heading">
            <label htmlFor="habit-reminder-enabled">Remind me</label>
            <input
              id="habit-reminder-enabled"
              type="checkbox"
              checked={reminder.enabled}
              onChange={e => setReminder(value => ({ ...value, enabled: e.target.checked }))}
            />
          </div>
          <label htmlFor="habit-reminder-time">Time</label>
          <input
            id="habit-reminder-time"
            type="time"
            required={reminder.enabled}
            disabled={!reminder.enabled}
            value={reminder.time}
            onChange={e => setReminder(value => ({ ...value, time: e.target.value }))}
          />
          <p className="field-hint">
            Scheduled days only. Stops reminding once your weekly or monthly quota is met.
          </p>
        </details>

        {original && <p className="field-hint">Schedule and target changes start today. Earlier days keep their history.</p>}

        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button className="primary" disabled={saving || !valid}>
            {saving ? 'Saving…' : original ? 'Save' : 'Add habit'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
