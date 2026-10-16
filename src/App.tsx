import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { liveQuery } from 'dexie';
import { Award, Check, Circle, Flame, Grid2X2, Plus, Settings2, Sparkles, Sun, Undo2, WifiOff, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { defaults, groupsFor, key, streaks, today, type Habit, type Vacation, type Settings, type Snapshot } from './domain';
import { parseBackup, repository, type GroupAction, type GroupUndo } from './repository';
import { isAndroid, pinWidget, publishWidget, readDeviceData } from './widget';
import { demoSnapshot } from './demo';
import { allowReminders, checkWebReminders, syncReminders } from './reminders';
import { downloadBlob } from './share';
import ActivityPanel from './ActivityPanel';
import DayCard from './DayCard';
import GroupManager from './GroupManager';
import HabitsList, { habitGroupId } from './HabitsList';
import HabitEditor, { type HabitValues } from './HabitEditor';
import Modal from './Modal';
import SettingsPage from './SettingsPage';
import WidgetPage from './WidgetPage';
import WeeklyReview from './WeeklyReview';
import BadgeShelf, { BadgeCelebration } from './BadgeShelf';
import { badges, type BadgeUnlock } from './badges';
import SpecialDates from './SpecialDates';
import HabitTemplates from './TemplatePicker';
import type { HabitTemplate } from './habitTemplates';
import VacationManager from './VacationManager';

type View = 'today' | 'activity' | 'habits' | 'settings';
type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };
const empty: Snapshot = { habits: [], completions: [], skips: [], notes: [], settings: defaults };
const tabs = [['today', Sun, 'Today'], ['activity', Grid2X2, 'Activity'], ['habits', Circle, 'Habits'], ['settings', Settings2, 'Settings']] as const;
export default function App() {
  const [data, setData] = useState<Snapshot>(empty), [loading, setLoading] = useState(true), [storageError, setStorageError] = useState(false), [view, setView] = useState<View>('today');
  const [demo, setDemo] = useState(false), [selected, setSelected] = useState<string | null>(null), [clock, setClock] = useState(Date.now());
  const [templatesOpen, setTemplatesOpen] = useState(false), [habitPreset, setHabitPreset] = useState<HabitValues | undefined>();
  const [newHabitGroup, setNewHabitGroup] = useState<string | undefined>();
  const [editor, setEditor] = useState<Habit | 'new' | null>(null), [archive, setArchive] = useState<Habit | null>(null), [importData, setImportData] = useState<Snapshot | null>(null);
  const [message, setMessage] = useState(''), [undo, setUndo] = useState<null | (() => Promise<void>)>(null), [busy, setBusy] = useState(false);
  const [messageVersion, setMessageVersion] = useState(0), [unlocks, setUnlocks] = useState<BadgeUnlock[]>([]);
  const [online, setOnline] = useState(navigator.onLine), [install, setInstall] = useState<InstallPrompt | null>(null);
  const lock = useRef(false), fileRef = useRef<HTMLInputElement>(null), dailyRef = useRef<HTMLDivElement>(null), activityRef = useRef<HTMLDivElement>(null);
  const logoTaps = useRef(0);
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();
  const refresh = useCallback(async () => { setData(await readDeviceData()); }, []);
  useEffect(() => { void refresh().catch(() => setStorageError(true)); }, [refresh]);
  useEffect(() => {
    const subscription = liveQuery(() => repository.read()).subscribe({ next: next => { setData(next); setLoading(false); setStorageError(false); }, error: () => { setStorageError(true); setLoading(false); } });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => { setClock(Date.now()); if (isAndroid() && document.visibilityState === 'visible') void refresh().catch(() => setStorageError(true)); }, 30000);
    const wake = () => { setClock(Date.now()); if (document.visibilityState === 'visible') void refresh().catch(() => setStorageError(true)); };
    const connected = () => setOnline(navigator.onLine);
    document.addEventListener('visibilitychange', wake); window.addEventListener('online', connected); window.addEventListener('offline', connected);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', wake); window.removeEventListener('online', connected); window.removeEventListener('offline', connected); };
  }, [refresh]);
  useEffect(() => { const handler = (e: Event) => { e.preventDefault(); setInstall(e as InstallPrompt); }; window.addEventListener('beforeinstallprompt', handler); return () => window.removeEventListener('beforeinstallprompt', handler); }, []);
  useEffect(() => { if (!message) return; const timer = setTimeout(() => { setMessage(''); setUndo(null); }, 8000); return () => clearTimeout(timer); }, [message, messageVersion]);
  const sample = useMemo(() => demo ? demoSnapshot() : null, [demo]);
  const shown = sample ? { ...sample, settings: data.settings } : data, mode = data.settings.mode ?? 'dark';
  const current = today(data.settings.rolloverHour, new Date(clock)), date = selected ?? current;
  const stats = useMemo(() => streaks(shown, current), [shown, current]);
  const active = shown.habits.filter(h => !h.archivedAt).sort((a, b) => a.order - b.order);
  useEffect(() => { document.documentElement.dataset.theme = mode; document.documentElement.dataset.heat = data.settings.theme; document.querySelector('meta[name="theme-color"]')?.setAttribute('content', mode === 'dark' ? '#0B0D12' : '#FBF9F6'); }, [mode, data.settings.theme]);
  useEffect(() => { if (!loading) void publishWidget(data).catch(() => setMessage('Saved. Reopen the app to refresh the widget.')); }, [data, current, loading]);
  useEffect(() => { if (!loading) void syncReminders(data, new Date(clock)).catch(e => setMessage(e instanceof Error ? e.message : 'Could not schedule reminder.')); }, [data, current, loading, Math.floor(clock / 60000)]);
  useEffect(() => { if (!loading) checkWebReminders(data, new Date(clock)); }, [clock, data, loading]);
  const announceBadges = useCallback((fresh: BadgeUnlock[]) => {
    const awards = fresh.filter(b => badges.some(def => def.id === b.id));
    if (awards.length) setUnlocks(queue => [...queue, ...awards.filter(b => !queue.some(q => q.id === b.id))]);
    const fibonacci = fresh.filter(b => b.id.startsWith('fib-')).at(-1);
    if (fibonacci) { setMessage(`A little pattern is growing: ${fibonacci.id.slice(4)} days. ✦`); setMessageVersion(v => v + 1); }
  }, []);
  useEffect(() => { if (!loading && !demo && !storageError) void repository.awardEarned(current).then(announceBadges).catch(() => setMessage('Could not save badges. Reopen the app to retry.')); }, [data, current, loading, demo, storageError, announceBadges]);
  const act = async (work: () => Promise<void>, success = '', undoWork?: () => Promise<void>): Promise<boolean> => {
    if (lock.current) return false;
    if (demo) { setMessage('Exit sample data to make changes.'); return false; }
    lock.current = true; setBusy(true); setUndo(null);
    try {
      await work(); announceBadges(await repository.awardEarned(current)); await refresh();
      if (success) { setMessage(success); setMessageVersion(version => version + 1); }
      if (undoWork) setUndo(() => async () => { await undoWork(); await refresh(); setUndo(null); setMessage('Undone.'); });
      return true;
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not save. Try again.'); setMessageVersion(version => version + 1); return false; }
    finally { lock.current = false; setBusy(false); }
  };
  const previousDay = (habit: Habit) => { const completion = data.completions.find(c => c.id === key(habit.id, date)), skipped = data.skips.some(s => s.id === key(habit.id, date)); return async () => { if (skipped) await repository.setDay(habit.id, date, 'skip'); else await repository.restoreCheckIns([key(habit.id, date)], completion ? [completion] : []); }; };
  const saveState = (habit: Habit, state: 'done' | 'skip' | 'open') => act(() => repository.setDay(habit.id, date, state), state === 'done' ? 'Completed.' : state === 'skip' ? 'Rest day saved.' : 'Check-in cleared.', previousDay(habit));
  const saveValue = (habit: Habit, value: number) => act(() => repository.setValue(habit.id, date, value), 'Progress saved.', previousDay(habit));
  const saveStep = (habit: Habit, stepId: string, checked: boolean) => act(() => repository.setChecklist(habit.id, date, stepId, checked), '', previousDay(habit));
  const saveVacation = (vacation: Vacation) => act(() => repository.addVacation(vacation), 'Vacation saved.');
  const endVacation = (id: string) => act(() => repository.endVacation(id), 'Vacation updated.');
  const saveGroup = (habits: Habit[]) => {
    let previous: Awaited<ReturnType<typeof repository.completeGroup>> | null = null;
    return act(async () => { previous = await repository.completeGroup(habits.map(h => h.id), date); }, 'Group completed.', async () => { if (previous) await repository.restoreCheckIns(previous.ids, previous.rows); });
  };
  const manageGroup = (action: GroupAction) => {
    let previous: GroupUndo | undefined;
    const success = action.kind === 'create' ? 'Group created.' : action.kind === 'rename' ? 'Group renamed.' : action.kind === 'remove' ? 'Group removed. Habits kept.' : 'Group order updated.';
    return act(async () => { previous = await repository.manageGroup(action); }, success, async () => { if (previous) await repository.undoGroup(previous); });
  };
  const saveSettings = (settings: Settings) => act(() => repository.saveSettings(settings));
  const reminder = async (enabled: boolean) => { await act(async () => { if (enabled && !await allowReminders()) throw new Error('Notifications were not allowed.'); const settings = { ...data.settings, reminder: { time: data.settings.reminder?.time ?? '20:00', enabled } }; await repository.saveSettings(settings); }, enabled ? 'Reminder on.' : 'Reminder off.'); };
  const saveHabit = (values: HabitValues) => {
    const original = editor !== 'new' ? editor : null;
    return act(async () => {
      if (values.reminder?.enabled && !await allowReminders()) throw new Error('Notifications were not allowed. Turn off the reminder to save without it.');
      const baseline = original && !original.revisions.length && original.createdAt < current ? [{ from: original.createdAt, schedule: original.schedule, measurement: original.measurement ?? { kind: 'binary' as const } }] : [];
      const revisions = original ? [...baseline, ...original.revisions.filter(r => r.from !== current).map(r => ({ ...r, measurement: r.measurement ?? original.measurement ?? { kind: 'binary' as const } })), { from: current, schedule: values.schedule, measurement: values.measurement }].sort((a, b) => a.from.localeCompare(b.from)) : [{ from: current, schedule: values.schedule, measurement: values.measurement }];
      await repository.saveHabit({ id: original?.id ?? crypto.randomUUID(), ...values, createdAt: original?.createdAt ?? current, archivedAt: null, order: original?.order ?? data.habits.length, revisions });
    }, original ? 'Habit updated.' : 'Habit added.');
  };
  const navigate = (next: View) => { setView(next); setSelected(null); window.scrollTo({ top: 0 }); };
  const openEditor = (habit: Habit | 'new', group?: string) => { if (demo) { setMessage('Exit sample data to manage habits.'); return; } setHabitPreset(undefined); setNewHabitGroup(habit === 'new' ? group : undefined); setEditor(habit); };
  const openTemplates = () => { if (demo) { setMessage('Exit sample data to add habits.'); return; } setTemplatesOpen(true); };
  const useTemplate = (template: HabitTemplate) => { const { name, icon, color, group, schedule, measurement } = template; setHabitPreset({ name, icon, color, group, schedule, measurement }); setNewHabitGroup(undefined); setTemplatesOpen(false); setEditor('new'); };
  const exportBackup = () => { void act(async () => {
    const latest = await repository.read();
    const exportData = { ...latest, badges: latest.badges?.some(b => b.id === 'backup') ? latest.badges : [...(latest.badges ?? []), { id: 'backup', date: current }] };
    downloadBlob(new Blob([JSON.stringify({ version: 4, exportedAt: new Date().toISOString(), data: exportData }, null, 2)], { type: 'application/json' }), `dailycommit-${current}.json`);
    announceBadges(await repository.award('backup', current));
  }, 'Backup downloaded.'); };
  const tapLogo = () => { navigate('today'); logoTaps.current++; if (logoTaps.current >= 7 && !demo) { logoTaps.current = 0; void act(async () => announceBadges(await repository.award('egg', current))); } };
  const installApp = async () => { if (isAndroid()) { setMessage('The Android app is already installed.'); return; } if (!install) { setMessage('Browser menu → Install app or Add to Home Screen.'); return; } try { await install.prompt(); await install.userChoice; setInstall(null); } catch { setMessage('Use your browser’s Install app menu.'); } };
  const selectDay = (day: string) => { setSelected(day); requestAnimationFrame(() => dailyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })); };
  const reorder = (index: number, direction: -1 | 1) => { const positions = active.flatMap((h, i) => h.group === active[index].group ? [i] : []), neighbor = positions[positions.indexOf(index) + direction]; if (neighbor === undefined) return; const next = [...active]; [next[index], next[neighbor]] = [next[neighbor], next[index]]; void act(() => repository.reorder(next)); };
  return <div className="app" data-theme={mode} data-heat={data.settings.theme}>
    <nav className="bottom-nav" aria-label="Main navigation">{tabs.map(([id, Icon, label]) => <button key={id} aria-current={view === id ? 'page' : undefined} className={view === id ? 'active' : ''} onClick={() => navigate(id)}><Icon size={21}/><span>{label}</span></button>)}</nav>
    <main><header className="topbar"><button className="brand" aria-label="DailyCommit home" onClick={tapLogo}><span className="brand-mark"><i/><i/><i/><i/></span>DailyCommit</button>{!online && <span className="offline-status"><WifiOff size={14}/>Offline</span>}</header>
    <div className="content">
      {demo && <div className="demo-banner"><Sparkles size={17}/>Sample data<button onClick={() => setDemo(false)}>Exit <X size={14}/></button></div>}
      {needRefresh && <div className="demo-banner">Update ready<button disabled={!!editor || !!importData} onClick={() => void updateServiceWorker(true)}>Refresh</button></div>}
      {loading ? <div className="empty-state">Loading…</div> : storageError ? <div className="empty-state"><h2>Storage unavailable</h2><p>Allow browser storage, then reopen the app.</p><button className="primary" onClick={() => window.location.reload()}>Reload</button></div> : <>
        <section className="page-heading"><div><h1>{tabs.find(tab => tab[0] === view)?.[2]}</h1>{view === 'today' && <p>{format(parseISO(current), 'EEEE, d MMM')}</p>}</div>{(view === 'today' || view === 'habits') && <button className="primary add-button" aria-label="Add habit" onClick={() => openEditor('new')}><Plus size={20}/><span>Add habit</span></button>}</section>
        {view === 'habits' && <GroupManager groups={groupsFor(shown)} habits={shown.habits} busy={busy} onChange={manageGroup} onTemplates={openTemplates} onCreated={name => requestAnimationFrame(() => document.getElementById(habitGroupId(name))?.scrollIntoView({ behavior: 'smooth', block: 'center' }))}/>}
        {(view === 'today' || view === 'activity') && <>
          {view === 'today' && active.length > 0 && <div className="streak-strip"><span><Flame size={17}/><strong>{stats.current}</strong> day streak</span><span>Best {stats.best}</span>{stats.milestones.length > 0 && <span className="milestone" title={`${stats.milestones.at(-1)} day milestone`}><Award size={16}/>{stats.milestones.at(-1)}</span>}</div>}
          {view === 'activity' && <div ref={activityRef} className="day-anchor"><ActivityPanel data={shown} selected={selected ?? undefined} onSelect={selectDay} expanded onError={setMessage}/></div>}
          <div ref={dailyRef} className="day-anchor">{(view === 'today' || selected !== null) && <DayCard key={date} data={shown} date={date} current={current} busy={busy} onDate={day => setSelected(view === 'activity' ? day : day === current ? null : day)} onAdd={() => openEditor('new')} onGroup={saveGroup} onState={saveState} onValue={saveValue} onStep={saveStep} onVacation={() => navigate('settings')} onNote={note => act(() => repository.saveNote(note), 'Note saved.')}/>}</div>
          {view === 'activity' && <><BadgeShelf data={shown} current={current} onColors={() => setView('settings')} onDate={day => { setSelected(day); requestAnimationFrame(() => activityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }}/><details className="card review-panel"><summary>Weekly review</summary><WeeklyReview data={shown} current={current}/></details></>}
        </>}
        {view === 'habits' && <><HabitsList habits={active} groups={groupsFor(shown)} busy={busy} onAdd={group => openEditor('new', group)} onEdit={habit => openEditor(habit)} onArchive={setArchive} onReorder={reorder}/>
          {shown.habits.some(h => h.archivedAt) && <section className="card manage-card archived-card"><details className="archived"><summary>Archived</summary>{shown.habits.filter(h => h.archivedAt).map(h => <div className="archived-row" key={h.id}><span>{h.name}</span><button className="text-button" disabled={busy} onClick={() => void act(() => repository.saveHabit({ ...h, id: crypto.randomUUID(), createdAt: current, archivedAt: null, order: data.habits.length, revisions: [{ from: current, schedule: h.schedule, measurement: h.measurement }] }), 'Habit resumed.')} aria-label={`Resume ${h.name}`}>Resume</button></div>)}<p className="field-hint">Resuming starts a new habit and preserves the archived history.</p></details></section>}
        </>}
        {view === 'settings' && <SettingsPage settings={data.settings} badges={data.badges ?? []} busy={busy} onSave={saveSettings} onReminder={reminder} onExport={exportBackup} onImport={() => fileRef.current?.click()} onInstall={() => void installApp()} onMessage={setMessage}>
          <VacationManager data={data} current={current} busy={busy} onAdd={saveVacation} onEnd={endVacation}/>
          <SpecialDates settings={data.settings} busy={busy} onSave={saveSettings}/>
          {data.badges?.some(b => b.id === 'ember') && <section className="card settings-card"><h2>Ember glow</h2><button className="mode-toggle" role="switch" aria-label="Heatmap glow" aria-checked={!!data.settings.badgeGlow} onClick={() => void saveSettings({ ...data.settings, badgeGlow: !data.settings.badgeGlow })} disabled={busy}><span>{data.settings.badgeGlow ? 'On' : 'Off'}</span><i className="switch-track"><i/></i></button><p>Unlocked by Ember Mode.</p></section>}
          <WidgetPage data={shown} busy={busy} onSave={saveSettings} onPin={() => { if (!isAndroid()) { setMessage('Install the Android companion to add the widget.'); return; } void pinWidget().then(result => setMessage(result.supported ? 'Confirm the widget in your launcher.' : 'Home screen → Widgets → DailyCommit.')).catch(() => setMessage('Add DailyCommit from your launcher’s Widgets menu.')); }}/>
        </SettingsPage>}
        {!demo && <button className="sample-link" onClick={() => { setSelected(null); setDemo(true); window.scrollTo({ top: 0 }); }}>View sample data</button>}
      </>}
    </div></main>
    <input hidden ref={fileRef} type="file" accept="application/json,.json" onChange={async e => { const file = e.target.files?.[0]; e.target.value = ''; if (!file) return; try { if (file.size > 10_000_000) throw new Error('Backup is too large (maximum 10 MB).'); setImportData(parseBackup(await file.text())); } catch (err) { setMessage(err instanceof Error ? err.message : 'Invalid backup.'); } }}/>
    {message && <div className="toast" role="status"><Check size={18}/><span>{message}</span>{undo && <button disabled={busy} onClick={() => void act(undo)}><Undo2 size={16}/>Undo</button>}<button className="icon-button" aria-label="Dismiss message" onClick={() => { setMessage(''); setUndo(null); }}><X size={16}/></button></div>}
    {!editor && !templatesOpen && !archive && !importData && !demo && unlocks[0] && <BadgeCelebration key={unlocks[0].id} unlock={unlocks[0]} remaining={unlocks.length} onClose={() => setUnlocks(queue => queue.slice(1))}/>}
    {templatesOpen && <HabitTemplates onSelect={useTemplate} onClose={() => setTemplatesOpen(false)}/>}
    {editor && <HabitEditor habit={editor} groups={groupsFor(shown)} initialGroup={newHabitGroup} initialValues={habitPreset} onClose={() => setEditor(null)} onSave={saveHabit}/>}
    {archive && <Modal title="Archive habit?" onClose={() => setArchive(null)}><p>{archive.name} will leave your active list. Its history stays.</p><div className="modal-actions"><button className="secondary" onClick={() => setArchive(null)}>Cancel</button><button className="primary" disabled={busy} onClick={() => void act(() => repository.saveHabit({ ...archive, archivedAt: current }), 'Habit archived.', () => repository.saveHabit(archive)).then(saved => { if (saved) setArchive(null); })}>Archive</button></div></Modal>}
    {importData && <Modal title="Restore backup?" onClose={() => setImportData(null)}><p>Replace local data with {importData.habits.length} habits, {importData.completions.length} check-ins and {importData.notes?.length ?? 0} notes. Earned badges are kept. Export first to keep your current data.</p><div className="modal-actions"><button className="secondary" onClick={exportBackup}>Export current</button><button className="secondary" onClick={() => setImportData(null)}>Cancel</button><button className="primary" disabled={busy} onClick={() => void act(() => repository.restore(importData), 'Backup restored.').then(saved => { if (saved) setImportData(null); })}>Replace & restore</button></div></Modal>}
  </div>;
}
