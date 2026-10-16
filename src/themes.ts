export type AppTheme = 'ember' | 'cyan' | 'lime';
export const themes = [
  { id: 'ember', name: 'Ember', accent: { dark: '#FF8A3D', light: '#C2410C' }, days: 0, badge: '', dark: ['#1A1E28','#4A2A17','#8F4A1F','#E27A2B','#FFB65C'], light: ['#EFE9E1','#FBD9B8','#F5A663','#E8721C','#B8470A'] },
  { id: 'cyan', name: 'Cyan', accent: { dark: '#50D8F6', light: '#086782' }, days: 50, badge: 'cyan-unlock', dark: ['#1A1E28','#123743','#176278','#26ABCE','#7DE6FF'], light: ['#EFE9E1','#CEEAF1','#83CDDF','#268CA7','#086782'] },
  { id: 'lime', name: 'Neon Green', accent: { dark: '#B3F45A', light: '#426914' }, days: 100, badge: 'lime-unlock', dark: ['#1A1E28','#293B16','#4A701D','#90C939','#C4F86A'], light: ['#EFE9E1','#DFEBC4','#B6D77C','#6A982A','#426914'] },
] as const;
export const themeFor = (id: string) => themes.find(t => t.id === id) ?? themes[0];
export const canUseTheme = (id: string, badges: readonly { id: string }[]) => { const theme = themeFor(id); return !theme.days || badges.some(b => b.id === theme.badge); };
export const unlockedTheme = (id: string, badges: readonly { id: string }[]): AppTheme => canUseTheme(id, badges) ? themeFor(id).id : 'ember';
