import { useState, type ReactNode, type FormEvent } from 'react';
import { format, parseISO } from 'date-fns';
import { themes, canUseTheme, themeFor } from './themes';
import type { BadgeUnlock } from './badges';
import {
  ArrowDownToLine,
  Bell,
  CheckSquare,
  ChevronDown,
  Download,
  Flame,
  Grid2X2,
  Leaf,
  ListFilter,
  Palette,
  Pencil,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Upload,
  User,
} from 'lucide-react';
import { getPalette, type DayNote, type Mood, type Settings, type TodayViewMode } from './domain';
import { nativeReminders } from './reminders';
import Modal from './Modal';

const moods: [Mood, string, string][] = [
  ['great', '😄', 'Great'],
  ['good', '🙂', 'Good'],
  ['okay', '😐', 'Okay'],
  ['low', '😔', 'Low'],
  ['rough', '😣', 'Rough'],
];

type Props = {
  settings: Settings;
  badges: BadgeUnlock[];
  notes?: DayNote[];
  busy: boolean;
  children?: ReactNode;
  vacationSlot?: ReactNode;
  widgetSlot?: ReactNode;
  emberSlot?: ReactNode;
  onSave: (settings: Settings) => Promise<boolean>;
  onReminder: (enabled: boolean) => Promise<void>;
  onExport: () => void;
  onImport: () => void;
  onInstall: () => void;
  onMessage: (message: string) => void;
  onSelectDay?: (date: string) => void;
  onDeleteNote?: (date: string) => Promise<boolean>;
};

export default function SettingsPage({
  settings,
  badges,
  notes = [],
  busy,
  children,
  vacationSlot,
  widgetSlot,
  emberSlot,
  onSave,
  onReminder,
  onExport,
  onImport,
  onInstall,
  onMessage,
}: Props) {
  const light = settings.mode === 'light';
  const reminder = settings.reminder ?? { enabled: false, time: '20:00' };
  const [profileOpen, setProfileOpen] = useState(false);
  const [nameInput, setNameInput] = useState(settings.userName ?? '');
  const [birthdayInput, setBirthdayInput] = useState(settings.birthday ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const allNotes = [...notes].sort((a, b) => b.date.localeCompare(a.date));

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    setSavingProfile(true);
    try {
      const dates = settings.specialDates ?? [];
      const updatedDates = birthdayInput && !dates.includes(birthdayInput)
        ? [...dates, birthdayInput].sort()
        : dates;
      const success = await onSave({
        ...settings,
        userName: nameInput.trim(),
        birthday: birthdayInput || undefined,
        specialDates: updatedDates,
      });
      if (success) {
        setProfileOpen(false);
        onMessage('Profile updated.');
      }
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="settings-grid">
      {/* 1. Profile Card (Always Open) */}
      <section className="card settings-card profile-card">
        <div className="card-heading">
          <h2><User size={17} /> Profile</h2>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setNameInput(settings.userName ?? '');
              setBirthdayInput(settings.birthday ?? '');
              setProfileOpen(true);
            }}
          >
            <Pencil size={14} /> Edit
          </button>
        </div>
        <div className="profile-summary">
          <div>
            <strong>{settings.userName || 'Anonymous'}</strong>
            <p className="subtle">
              {settings.birthday ? `Birthday: ${settings.birthday}` : 'No special date set'}
            </p>
          </div>
        </div>
      </section>

      {/* 2. Today View Layout Selector (Always Open) */}
      <section className="card settings-card">
        <h2>Today Screen Layout</h2>
        <p className="subtle">Choose how your habits are presented each day.</p>
        <div className="view-mode-selector">
          {([
            ['minimal', CheckSquare, 'Minimal', 'Clean checklist'],
            ['swipe', Sparkles, 'Zen Swipe', 'One-by-one focus'],
            ['grouped', ListFilter, 'Grouped', 'Categorized dashboard'],
          ] as const).map(([mode, Icon, title, desc]) => (
            <button
              key={mode}
              type="button"
              className={`view-mode-btn ${settings.todayViewMode === mode ? 'selected' : ''}`}
              disabled={busy}
              onClick={() => void onSave({ ...settings, todayViewMode: mode as TodayViewMode })}
            >
              <Icon size={18} />
              <strong>{title}</strong>
              <small>{desc}</small>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Appearance Card (Collapsed by default) */}
      <details className="card activity-section-card">
        <summary className="activity-section-summary">
          <div className="activity-section-summary-left">
            <Palette size={16} className="section-icon" />
            <strong>Appearance & Themes</strong>
          </div>
          <ChevronDown size={17} className="activity-section-chevron" />
        </summary>
        <div className="activity-section-body">
          <div className="appearance-control" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '15px' }}>{themeFor(settings.theme).name}</h3>
            <button
              type="button"
              className="mode-toggle"
              role="switch"
              aria-label="Light mode"
              aria-checked={light}
              disabled={busy}
              onClick={() => void onSave({ ...settings, mode: light ? 'dark' : 'light' })}
            >
              <span>{light ? 'Light' : 'Dark'}</span>
              <i className="switch-track"><i /></i>
            </button>
          </div>
          <div className="ember-swatches" aria-label={`${themeFor(settings.theme).name} heatmap color scale`}>
            {getPalette(settings).map(color => <i key={color} style={{ background: color }} />)}
          </div>
          <div className="theme-options" aria-label="App colors">
            {themes.map(theme => {
              const unlocked = canUseTheme(theme.id, badges);
              return (
                <button
                  key={theme.id}
                  type="button"
                  className="theme-option"
                  disabled={busy || !unlocked}
                  aria-pressed={settings.theme === theme.id}
                  onClick={() => void onSave({ ...settings, theme: theme.id })}
                >
                  <span className="theme-dots" aria-hidden="true">
                    {theme[light ? 'light' : 'dark'].slice(1).map(color => <i key={color} style={{ background: color }} />)}
                  </span>
                  <strong>{theme.name}</strong>
                  <small>{unlocked ? (settings.theme === theme.id ? 'Selected' : 'Use color') : `Unlock at ${theme.days} active days`}</small>
                </button>
              );
            })}
          </div>
          <p className="subtle">Color badges unlock in Activity. Earn them once, keep the colors.</p>

          <label htmlFor="rollover">Day starts at</label>
          <select
            id="rollover"
            disabled={busy}
            value={settings.rolloverHour}
            onChange={e => void onSave({ ...settings, rolloverHour: Number(e.target.value) })}
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
            ))}
          </select>
          <p className="subtle">Earlier check-ins count toward the previous day.</p>

          <label htmlFor="week-start">Week starts on</label>
          <select
            id="week-start"
            disabled={busy}
            value={settings.weekStart}
            onChange={e => void onSave({ ...settings, weekStart: Number(e.target.value) as 0 | 1 })}
          >
            <option value="1">Monday</option>
            <option value="0">Sunday</option>
          </select>

          <label htmlFor="streak-grace">Streaks</label>
          <select
            id="streak-grace"
            disabled={busy}
            value={settings.streakGrace ?? 0}
            onChange={e => void onSave({ ...settings, streakGrace: Number(e.target.value) as 0 | 1 })}
          >
            <option value="0">Every scheduled day</option>
            <option value="1">Allow one missed day per week</option>
          </select>
          <p className="subtle">Rest days pause your streak. Partial days stay incomplete.</p>

          <div className="haptics-control" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
            <div>
              <strong style={{ display: 'block', fontSize: '13px', color: 'var(--text)' }}>Tactile Haptics</strong>
              <p className="subtle" style={{ margin: '2px 0 0', fontSize: '12px' }}>Vibrate on habit completions and swipe gestures</p>
            </div>
            <button
              type="button"
              className="mode-toggle"
              role="switch"
              aria-label="Vibration haptics"
              aria-checked={settings.haptics !== false}
              disabled={busy}
              onClick={() => void onSave({ ...settings, haptics: settings.haptics === false })}
            >
              <span>{settings.haptics !== false ? 'On' : 'Off'}</span>
              <i className="switch-track"><i /></i>
            </button>
          </div>
        </div>
      </details>

      {/* 4. All Notes Section (Collapsed by default) */}
      <details className="card activity-section-card">
        <summary className="activity-section-summary">
          <div className="activity-section-summary-left">
            <StickyNote size={16} className="section-icon" />
            <strong>All Notes</strong>
          </div>
          <ChevronDown size={17} className="activity-section-chevron" />
        </summary>
        <div className="activity-section-body">
          {allNotes.length === 0 ? (
            <div className="notes-empty-state">
              <StickyNote size={24} style={{ color: 'var(--text-muted)' }} />
              <h4>No notes written yet</h4>
              <p className="subtle">Daily reflections and notes recorded on any day will appear here.</p>
            </div>
          ) : (
            <div className="all-notes-list compact">
              {allNotes.map(n => {
                const moodObj = moods.find(m => m[0] === n.mood);
                return (
                  <div key={n.date} className="settings-note-compact">
                    <div className="note-compact-header">
                      <span className="note-compact-date">
                        {format(parseISO(n.date), 'EEE, d MMM yyyy')}
                      </span>
                      {moodObj && (
                        <span className="note-compact-mood" title={moodObj[2]}>
                          {moodObj[1]}
                        </span>
                      )}
                    </div>
                    {n.text && <p className="note-compact-text">{n.text}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </details>

      {/* 5. Reminder Card (Collapsed by default) */}
      <details className="card activity-section-card">
        <summary className="activity-section-summary">
          <div className="activity-section-summary-left">
            <Bell size={16} className="section-icon" />
            <strong>Reminder</strong>
            <span className="count-chip">{reminder.enabled ? 'On' : 'Off'}</span>
          </div>
          <ChevronDown size={17} className="activity-section-chevron" />
        </summary>
        <div className="activity-section-body">
          <div className="card-heading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '15px' }}>Daily Reminder</h3>
            <button
              type="button"
              className="mode-toggle"
              role="switch"
              aria-label="Daily reminder"
              aria-checked={reminder.enabled}
              disabled={busy}
              onClick={() => void onReminder(!reminder.enabled)}
            >
              <span>{reminder.enabled ? 'On' : 'Off'}</span>
              <i className="switch-track"><i /></i>
            </button>
          </div>
          <label htmlFor="reminder-time">Time</label>
          <input
            id="reminder-time"
            type="time"
            disabled={busy}
            value={reminder.time}
            onChange={e => {
              if (e.target.value) void onSave({ ...settings, reminder: { ...reminder, time: e.target.value } });
            }}
          />
          <p className="subtle">
            {nativeReminders()
              ? 'Scheduled days only. Mark done or snooze 15 minutes from a notification; actions open DailyCommit to apply. Open the app regularly to refresh reminders.'
              : 'Reminds you while the app is open. Set individual times in each habit. Use Android for reminders when closed.'}
          </p>
        </div>
      </details>

      {/* 6. Vacation Mode (Collapsed by default) */}
      {vacationSlot && (
        <details className="card activity-section-card">
          <summary className="activity-section-summary">
            <div className="activity-section-summary-left">
              <Leaf size={16} className="section-icon" />
              <strong>Vacation Mode</strong>
            </div>
            <ChevronDown size={17} className="activity-section-chevron" />
          </summary>
          <div className="activity-section-body">
            {vacationSlot}
          </div>
        </details>
      )}

      {/* 7. Home Screen Widget (Collapsed by default) */}
      {widgetSlot && (
        <details className="card activity-section-card">
          <summary className="activity-section-summary">
            <div className="activity-section-summary-left">
              <Grid2X2 size={16} className="section-icon" />
              <strong>Home Screen Widget</strong>
            </div>
            <ChevronDown size={17} className="activity-section-chevron" />
          </summary>
          <div className="activity-section-body">
            {widgetSlot}
          </div>
        </details>
      )}

      {/* 8. Backup & Storage (Collapsed by default) */}
      <details className="card activity-section-card">
        <summary className="activity-section-summary">
          <div className="activity-section-summary-left">
            <ArrowDownToLine size={16} className="section-icon" />
            <strong>Backup & Storage</strong>
          </div>
          <ChevronDown size={17} className="activity-section-chevron" />
        </summary>
        <div className="activity-section-body">
          <p style={{ margin: '0 0 14px', fontSize: '13px', color: 'var(--text-2)' }}>
            Export regularly to keep a copy of your habits, completions, and settings.
          </p>
          <div className="backup-actions" style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button type="button" className="secondary" onClick={onExport}><ArrowDownToLine size={18} />Export backup</button>
            <button type="button" className="secondary" disabled={busy} onClick={onImport}><Upload size={18} />Import backup</button>
          </div>
          <button
            type="button"
            className="text-button storage-button"
            onClick={() => {
              if (!navigator.storage?.persist) {
                onMessage('Keep regular backups on this browser.');
                return;
              }
              void navigator.storage
                .persist()
                .then(granted =>
                  onMessage(granted ? 'Storage protected on this device.' : 'Your browser manages storage. Keep regular backups.')
                )
                .catch(() => onMessage('Keep regular backups on this browser.'));
            }}
          >
            <ShieldCheck size={17} />Keep data on device
          </button>
          <hr style={{ margin: '16px 0', borderColor: 'var(--border)' }} />
          <h3 style={{ margin: '0 0 6px', fontSize: '14px' }}>Install</h3>
          <p className="subtle" style={{ margin: '0 0 10px' }}>Add the app to your home screen.</p>
          <button type="button" className="secondary" onClick={onInstall}><Download size={18} />Install app</button>
        </div>
      </details>

      {/* 9. Ember Glow (if unlocked, Collapsed by default) */}
      {emberSlot && (
        <details className="card activity-section-card">
          <summary className="activity-section-summary">
            <div className="activity-section-summary-left">
              <Flame size={16} className="section-icon" />
              <strong>Ember Glow</strong>
            </div>
            <ChevronDown size={17} className="activity-section-chevron" />
          </summary>
          <div className="activity-section-body">
            {emberSlot}
          </div>
        </details>
      )}

      {children}

      {/* Edit Profile Modal */}
      {profileOpen && (
        <Modal title="Edit Profile" onClose={() => setProfileOpen(false)}>
          <form onSubmit={saveProfile}>
            <label htmlFor="edit-name">Your name</label>
            <input
              id="edit-name"
              type="text"
              required
              maxLength={60}
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
            />

            <label htmlFor="edit-birthday">Birthday or milestone</label>
            <input
              id="edit-birthday"
              type="date"
              value={birthdayInput}
              onChange={e => setBirthdayInput(e.target.value)}
            />
            <p className="field-hint">Used for personalized greetings and your Special Release badge.</p>

            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setProfileOpen(false)}>Cancel</button>
              <button type="submit" className="primary" disabled={savingProfile || !nameInput.trim()}>
                {savingProfile ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
