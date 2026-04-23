import { useState } from 'react';
import { useHabits } from '../context/HabitContext';
import { X, Link } from 'lucide-react';

import { MAX_HABITS } from '../lib/constants';

const TYPE_ORDER = { daily: 0, weekly: 1, monthly: 2 };

// Types that are valid as the derived type for a given source type
function allowedDerivedTypes(sourceType) {
    if (sourceType === 'daily') return ['daily', 'weekly', 'monthly'];
    if (sourceType === 'weekly') return ['weekly', 'monthly'];
    if (sourceType === 'monthly') return ['monthly'];
    return ['daily', 'weekly', 'monthly'];
}

export default function NewHabitForm({ onClose }) {
    const { addHabitToState, habits, storage } = useHabits();
    const [title, setTitle] = useState('');
    const [type, setType] = useState('daily');
    const [targetCount, setTargetCount] = useState(1);
    const [submitting, setSubmitting] = useState(false);

    // Derived habit state
    const [isDerived, setIsDerived] = useState(false);
    const [sourceHabitId, setSourceHabitId] = useState('');

    const isLimitReached = habits.length >= MAX_HABITS;

    // Non-derived habits eligible as source
    const sourceHabits = habits.filter(h => !h.derivedFrom && !h.archived);

    const sourceHabit = sourceHabits.find(h => h.id === sourceHabitId) || null;

    // When toggling derived mode, reset related state
    const handleDerivedToggle = (checked) => {
        setIsDerived(checked);
        setSourceHabitId('');
        if (!checked) setType('daily');
    };

    // When source habit changes, auto-set a valid type
    const handleSourceChange = (id) => {
        setSourceHabitId(id);
        const src = sourceHabits.find(h => h.id === id);
        if (src) {
            const allowed = allowedDerivedTypes(src.type);
            if (!allowed.includes(type)) setType(allowed[0]);
            // For same-type, default target to source target + 1; for cross-type default to a reasonable value
            if (src.type === type || allowed[0] === src.type) {
                setTargetCount(src.targetCount + 1);
            } else {
                setTargetCount(1);
            }
        }
    };

    const handleTypeChange = (newType) => {
        setType(newType);
        if (sourceHabit && sourceHabit.type === newType) {
            setTargetCount(sourceHabit.targetCount + 1);
        } else {
            setTargetCount(1);
        }
    };

    const isCrossType = isDerived && sourceHabit && sourceHabit.type !== type;

    const getTargetHelperText = () => {
        if (!isDerived) return null;
        if (!sourceHabit) return null;
        if (isCrossType) {
            return `Number of ${sourceHabit.type} completions per ${type} period required`;
        }
        return `Must exceed the source habit's target (${sourceHabit.targetCount})`;
    };

    const validate = () => {
        if (isDerived) {
            if (!sourceHabitId) return 'Please select a source habit.';
            if (!sourceHabit) return 'Source habit not found.';
            if (!allowedDerivedTypes(sourceHabit.type).includes(type)) return 'Invalid type for this source habit.';
            if (sourceHabit.type === type && parseInt(targetCount) <= sourceHabit.targetCount) {
                return `Target must be greater than the source habit's target (${sourceHabit.targetCount}).`;
            }
            if (parseInt(targetCount) < 1) return 'Target must be at least 1.';
        }
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || submitting || isLimitReached) return;

        const validationError = validate();
        if (validationError) {
            alert(validationError);
            return;
        }

        setSubmitting(true);
        try {
            const habitData = {
                title,
                type,
                targetCount: parseInt(targetCount),
                increments: [],
                frequency: 'everyday'
            };

            if (isDerived && sourceHabitId) {
                habitData.derivedFrom = sourceHabitId;
            } else {
                const incrementsInput = e.target.elements.increments?.value || '';
                if (incrementsInput) {
                    habitData.increments = incrementsInput.split(',')
                        .map(s => parseInt(s.trim()))
                        .filter(n => !isNaN(n) && n > 0);
                }
            }

            const newId = await storage.createHabit(habitData);
            addHabitToState({ ...habitData, id: newId, logs: {} });
            onClose();
        } catch (err) {
            console.error(err);
            alert("Failed to create habit");
        } finally {
            setSubmitting(false);
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '0.8rem',
        background: 'rgba(0,0,0,0.2)',
        border: '1px solid var(--glass-border)',
        borderRadius: '8px',
        color: 'white',
        outline: 'none',
        boxSizing: 'border-box'
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
            zIndex: 50,
            padding: '1rem'
        }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', animation: 'fadeIn 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem' }}>New Habit</h2>
                    <button onClick={onClose} style={{ background: 'none', padding: 0, border: 'none', color: 'var(--color-text-dim)' }}>
                        <X />
                    </button>
                </div>

                {isLimitReached && !submitting ? (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.5)',
                        color: '#fca5a5',
                        padding: '1.5rem',
                        borderRadius: '8px',
                        textAlign: 'center',
                        fontSize: '1rem'
                    }}>
                        <p style={{ margin: 0, marginBottom: '0.5rem', fontWeight: 'bold' }}>Limit Reached</p>
                        <p style={{ margin: 0, opacity: 0.9 }}>
                            You have reached the maximum limit of {MAX_HABITS} habits.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Title</label>
                            <input
                                type="text"
                                required
                                autoFocus
                                maxLength={50}
                                placeholder="e.g. Read 30 mins"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                style={inputStyle}
                            />
                        </div>

                        {/* Derived habit toggle */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                <input
                                    type="checkbox"
                                    checked={isDerived}
                                    onChange={(e) => handleDerivedToggle(e.target.checked)}
                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                />
                                <Link size={14} style={{ color: 'var(--color-text-dim)' }} />
                                Derived from another habit
                            </label>
                        </div>

                        {isDerived && (
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Source habit</label>
                                {sourceHabits.length === 0 ? (
                                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', margin: 0 }}>
                                        No eligible source habits. Create a regular habit first.
                                    </p>
                                ) : (
                                    <select
                                        required={isDerived}
                                        value={sourceHabitId}
                                        onChange={(e) => handleSourceChange(e.target.value)}
                                        style={inputStyle}
                                    >
                                        <option value="">Select a habit…</option>
                                        {sourceHabits.map(h => (
                                            <option key={h.id} value={h.id}>
                                                {h.title} ({h.type}, target: {h.targetCount})
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Type</label>
                                <select
                                    value={type}
                                    onChange={(e) => isDerived ? handleTypeChange(e.target.value) : setType(e.target.value)}
                                    style={inputStyle}
                                >
                                    {['daily', 'weekly', 'monthly'].map(t => {
                                        const disabled = isDerived && sourceHabit && !allowedDerivedTypes(sourceHabit.type).includes(t);
                                        return (
                                            <option key={t} value={t} disabled={disabled}>
                                                {t.charAt(0).toUpperCase() + t.slice(1)}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                    {isDerived ? 'Derived target' : 'Target'}
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={targetCount}
                                    onChange={(e) => setTargetCount(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        {getTargetHelperText() && (
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '1rem', marginTop: '-0.5rem' }}>
                                {getTargetHelperText()}
                            </p>
                        )}

                        {!isDerived && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label htmlFor="increments" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>
                                    Custom Increments (optional, comma separated, e.g. 5, 10, 20)
                                </label>
                                <input
                                    id="increments"
                                    type="text"
                                    placeholder="Leave empty for default (+1)"
                                    name="increments"
                                    style={inputStyle}
                                />
                            </div>
                        )}

                        {isDerived && <div style={{ marginBottom: '1.5rem' }} />}

                        <button type="submit" className="btn" style={{ width: '100%' }} disabled={submitting || (isDerived && sourceHabits.length === 0)}>
                            {submitting ? 'Creating...' : 'Create Habit'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
