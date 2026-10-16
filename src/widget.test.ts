import { expect, it } from 'vitest';
import { defaults, today } from './domain';
import { createWidgetSnapshot } from './widget';
it('creates a versioned, chronological widget snapshot from app facts', () => { const payload=createWidgetSnapshot({habits:[],completions:[],skips:[],settings:defaults}); expect(payload.version).toBe(1); expect(payload.days).toHaveLength(182); expect(payload.days.at(-1)?.date).toBe(today()); expect(payload.days.every(d=>d.level===-1)).toBe(true); expect(payload.total).toBe(0); });
