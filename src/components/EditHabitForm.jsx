import { useState } from 'react';
import { useHabits } from '../context/HabitContext';
import { X, Trash2 } from 'lucide-react';

export default function EditHabitForm({ habit, log, date, onClose, onLogUpdate }) {
    const { updateHabitInState, removeHabitFromState, storage } = useHabits();

    const [title, setTitle] = useState(habit.title);
    const [targetCount, setTargetCount] = useState(habit.targetCount);
    // Join increments back to string for editing
    const [incrementsStr, setIncrementsStr] = useState((habit.increments || []).join(', '));

    // Current Progress (Manual Override)
    const [currentValue, setCurrentValue] = useState(log?.value || 0);

    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || submitting) return;

        setSubmitting(true);
        try {
            // 1. Parse Increments
            let increments = [];
            if (incrementsStr) {
                increments = incrementsStr.split(',')
                    .map(s => parseInt(s.trim()))
                    .filter(n => !isNaN(n) && n > 0);
            }

            // 2. Update Habit Definition
            const updates = {
                title,
                targetCount: parseInt(targetCount),
                increments
            };

            await storage.updateHabit(habit.id, updates);
            updateHabitInState(habit.id, updates);

            // 3. Update Current Log (Manual Override)
            // We only update the log if the user actually clicked save.
            // We calculate 'completed' based on the NEW target count.
            const val = parseInt(currentValue);
            await storage.updateLog(habit.id, date, val, updates.targetCount, habit.type);

            // Optimistic update for Dashboard
            if (onLogUpdate) {
                onLogUpdate(habit.id, {
                    habitId: habit.id,
                    value: val,
                    completed: val >= updates.targetCount,
                    // We don't have the full log object here (like date format), but value/completed is what matters for UI
                });
            }

            onClose();
        } catch (err) {
            console.error(err);
            alert("Failed to update habit");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this habit? This cannot be undone.")) return;

        setSubmitting(true);
        try {
            await storage.deleteHabit(habit.id);
            removeHabitFromState(habit.id);
            onClose();
        } catch (err) {
            console.error(err);
            alert("Failed to delete habit");
            setSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            padding: '1rem'
        }}>
            <div className="glass-panel" style={{
                width: '100%',
                maxWidth: '400px',
                animation: 'fadeIn 0.2s',
                maxHeight: '90vh',
                overflowY: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem' }}>Edit Habit</h2>
                    <button onClick={onClose} style={{ background: 'none', padding: 0, border: 'none', color: 'var(--color-text-dim)' }}>
                        <X />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>

                    {/* Title */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Title</label>
                        <input
                            type="text"
                            required
                            maxLength={50}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="input-field"
                            style={{
                                width: '100%',
                                padding: '0.8rem',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '8px',
                                color: 'white',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Target & Current Value */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Target Goal</label>
                            <input
                                type="number"
                                min="1"
                                value={targetCount}
                                onChange={(e) => setTargetCount(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.8rem',
                                    background: 'rgba(0,0,0,0.2)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-primary)' }}>Today's Value</label>
                            <input
                                type="number"
                                min="0"
                                value={currentValue}
                                onChange={(e) => setCurrentValue(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.8rem',
                                    background: 'rgba(var(--color-primary-rgb), 0.1)', // Slight highlight
                                    border: '1px solid var(--color-primary)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>

                    {/* Increments */}
                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>
                            Custom Increments (e.g. 5, 10)
                        </label>
                        <input
                            type="text"
                            value={incrementsStr}
                            onChange={(e) => setIncrementsStr(e.target.value)}
                            placeholder="1"
                            style={{
                                width: '100%',
                                padding: '0.8rem',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '8px',
                                color: 'white',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={submitting}
                            className="btn"
                            style={{
                                background: 'rgba(239, 68, 68, 0.2)',
                                color: '#fca5a5',
                                border: '1px solid rgba(239, 68, 68, 0.5)',
                                padding: '0 1rem'
                            }}
                        >
                            <Trash2 size={20} />
                        </button>
                        <button type="submit" className="btn" style={{ flex: 1 }} disabled={submitting}>
                            {submitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
