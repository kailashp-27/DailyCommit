import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { HabitIcon } from './HabitEditor';
import { habitTemplates, type HabitTemplate } from './habitTemplates';
import Modal from './Modal';

export default function HabitTemplates({ onSelect, onClose }: { onSelect: (template: HabitTemplate) => void; onClose: () => void }) {
  const [category, setCategory] = useState('All');
  const categories = ['All', ...new Set(habitTemplates.map(t => t.group))];
  return <Modal title="Habit templates" onClose={onClose}><p className="field-hint">Pick a starting point. Adjust it before adding.</p><div className="template-categories" role="group" aria-label="Template category">{categories.map(group => <button key={group} aria-pressed={category === group} onClick={() => setCategory(group)}>{group}</button>)}</div><div className="template-list">{habitTemplates.filter(t => category === 'All' || t.group === category).map(template => <button className="template-option" key={template.id} aria-label={`Use ${template.name} template`} onClick={() => onSelect(template)}><span className="habit-icon"><HabitIcon name={template.icon}/></span><span><strong>{template.name}</strong><small>{template.detail}</small><small>{template.group}</small></span><ChevronRight size={16}/></button>)}</div></Modal>;
}
