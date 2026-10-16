import type { Measurement, Schedule } from './domain';

export type HabitTemplate = { id: string; name: string; group: string; icon: string; color: string; schedule: Schedule; measurement: Measurement; detail: string };
export const habitTemplates: HabitTemplate[] = [
  { id: 'water', name: 'Drink water', group: 'Morning', icon: 'sun', color: '#FF8A3D', schedule: { kind: 'daily' }, measurement: { kind: 'numeric', target: 8, unit: 'glasses' }, detail: '8 glasses · every day' },
  { id: 'plan', name: 'Plan my day', group: 'Morning', icon: 'sun', color: '#FF8A3D', schedule: { kind: 'daily' }, measurement: { kind: 'binary' }, detail: 'One check-in · every day' },
  { id: 'stretch', name: 'Morning stretch', group: 'Morning', icon: 'move', color: '#FF8A3D', schedule: { kind: 'daily' }, measurement: { kind: 'binary' }, detail: 'One check-in · every day' },
  { id: 'walk', name: 'Go for a walk', group: 'Fitness', icon: 'move', color: '#FF8A3D', schedule: { kind: 'daily' }, measurement: { kind: 'binary' }, detail: 'One check-in · every day' },
  { id: 'exercise', name: 'Exercise', group: 'Fitness', icon: 'move', color: '#FF8A3D', schedule: { kind: 'weekly', target: 3 }, measurement: { kind: 'binary' }, detail: '3 times per week' },
  { id: 'read', name: 'Read 10 pages', group: 'Study', icon: 'book', color: '#FF8A3D', schedule: { kind: 'daily' }, measurement: { kind: 'numeric', target: 10, unit: 'pages' }, detail: '10 pages · every day' },
  { id: 'study', name: 'Study session', group: 'Study', icon: 'book', color: '#FF8A3D', schedule: { kind: 'weekdays', days: [1, 2, 3, 4, 5] }, measurement: { kind: 'binary' }, detail: 'Monday to Friday' },
  { id: 'code', name: 'Practice coding', group: 'Study', icon: 'code', color: '#FF8A3D', schedule: { kind: 'weekly', target: 3 }, measurement: { kind: 'binary' }, detail: '3 times per week' },
  { id: 'journal', name: 'Write in my journal', group: 'Evening', icon: 'mind', color: '#FF8A3D', schedule: { kind: 'daily' }, measurement: { kind: 'binary' }, detail: 'One check-in · every day' },
  { id: 'prepare', name: 'Prepare for tomorrow', group: 'Evening', icon: 'sun', color: '#FF8A3D', schedule: { kind: 'daily' }, measurement: { kind: 'binary' }, detail: 'One check-in · every day' },
];
