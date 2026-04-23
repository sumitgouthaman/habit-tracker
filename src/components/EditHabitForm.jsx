import { useState } from 'react';
import { useHabits } from '../context/HabitContext';
import { X, Trash2, Link } from 'lucide-react';

export default function EditHabitForm({ habit, log, date, onClose, onLogUpdate }) {
    const { updateHabitInState, removeHabitFromState, habits, storage } = useHabits();

    const [title, setTitle] = useState(habit.title);
    const [targetCount, setTargetCount] = useState(habit.targetCount);
    const [incrementsStr, setIncrementsStr] = useState((habit.increments || []).join(', '));
    const [currentValue, setCurrentValue] = useState(log?.value || 0);
    const [submitting, setSubmitting] = useState(false);

    const isDerived = !!habit.derivedFrom;
    const sourceHabit = isDerived ? habits.find(h => h.id === habit.derivedFrom) : null;

    const inputStyle = {
        width: '100%',
        padding: '0.8rem',
        background: 'rgba(0,0,0,0.2)',
        border: '1px solid var(--glass-border)',
        borderRadius: '8px',
        color: 'white',
        outline: 'none'
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || submitting) return;

        setSubmitting(true);
        try {
            const updates = { title, targetCount: parseInt(targetCount) };

            if (!isDerived) {
                let increments = [];
                if (incrementsStr) {
                    increments = incrementsStr.split(',')
                        .map(s => parseInt(s.trim()))
                        .filter(n => !isNaN(n) && n > 0);
                }
                updates.increments = increments;
            }

            await storage.updateHabit(habit.id, updates);
            updateHabitInState(habit.id, updates);

            if (!isDerived) {
                const val = parseInt(currentValue);
                await storage.updateLog(habit.id, date, val, updates.targetCount, habit.type);
                if (onLogUpdate) {
                    onLogUpdate(habit.id, {
                        habitId: habit.id,
                        value: val,
                        completed: val >= updates.targetCount,
                    });
                }
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

                {isDerived && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '1rem',
                        padding: '0.6rem 0.8rem',
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        color: 'var(--color-text-dim)'
                    }}>
                        <Link size={14} />
                        Derived from: <strong style={{ color: 'white' }}>{sourceHabit ? sourceHabit.title : habit.derivedFrom}</strong>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Title</label>
                        <input
                            type="text"
                            required
                            maxLength={50}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            style={inputStyle}
                        />
                    </div>

                    <div style={{ marginBottom: isDerived ? '2rem' : '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                            {isDerived ? 'Derived target' : 'Target Goal'}
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={targetCount}
                            onChange={(e) => setTargetCount(e.target.value)}
                            style={inputStyle}
                        />
                    </div>

                    {!isDerived && (
                        <>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-primary)' }}>Today's Value</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={currentValue}
                                    onChange={(e) => setCurrentValue(e.target.value)}
                                    style={{
                                        ...inputStyle,
                                        background: 'rgba(var(--color-primary-rgb), 0.1)',
                                        border: '1px solid var(--color-primary)',
                                        fontWeight: 'bold',
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>
                                    Custom Increments (e.g. 5, 10)
                                </label>
                                <input
                                    type="text"
                                    value={incrementsStr}
                                    onChange={(e) => setIncrementsStr(e.target.value)}
                                    placeholder="1"
                                    style={inputStyle}
                                />
                            </div>
                        </>
                    )}

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
