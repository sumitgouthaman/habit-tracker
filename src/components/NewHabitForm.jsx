import { useState } from 'react';
import { createHabit } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import { useHabits } from '../context/HabitContext';
import { X } from 'lucide-react';

export default function NewHabitForm({ onClose }) {
    const { user } = useAuth();
    const { addHabitToState } = useHabits();
    const [title, setTitle] = useState('');
    const [type, setType] = useState('daily');
    const [targetCount, setTargetCount] = useState(1);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || submitting) return;

        setSubmitting(true);
        try {
            const incrementsInput = e.target.elements.increments.value;
            let increments = [];
            if (incrementsInput) {
                increments = incrementsInput.split(',')
                    .map(s => parseInt(s.trim()))
                    .filter(n => !isNaN(n) && n > 0);
            }

            const habitData = {
                title,
                type,
                targetCount: parseInt(targetCount),
                increments,
                frequency: 'everyday'
            };

            const newId = await createHabit(user.uid, habitData);
            addHabitToState({ ...habitData, id: newId, userId: user.uid });
            onClose();
        } catch (err) {
            console.error(err);
            alert("Failed to create habit");
        } finally {
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
                            style={{
                                width: '100%',
                                padding: '0.8rem',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '8px',
                                color: 'white',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Type</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.8rem',
                                    background: 'rgba(0,0,0,0.2)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Target</label>
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
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label htmlFor="increments" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>
                            Custom Increments (optional, comma separated, e.g. 5, 10, 20)
                        </label>
                        <input
                            id="increments"
                            type="text"
                            placeholder="Leave empty for default (+1)"
                            name="increments"
                            style={{
                                width: '100%',
                                padding: '0.8rem',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '8px',
                                color: 'white',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <button type="submit" className="btn" style={{ width: '100%' }} disabled={submitting}>
                        {submitting ? 'Creating...' : 'Create Habit'}
                    </button>
                </form>
            </div>
        </div>
    );
}
