import { Check, Plus } from 'lucide-react';
import { updateLog } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { format, isSameDay } from 'date-fns';

export default function HabitCard({ habit, log, date, onEdit }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    // Optimistic UI state
    const [currentValue, setCurrentValue] = useState(log?.value || 0);

    // Sync local state when log prop updates
    useEffect(() => {
        if (log) {
            setCurrentValue(log.value);
        } else {
            setCurrentValue(0);
        }
    }, [log]);

    const target = habit.targetCount || 1;
    const isCompleted = currentValue >= target;

    const handleUpdate = async (newValue) => {
        if (loading) return;

        // Prevent going below 0
        if (newValue < 0) newValue = 0;

        const oldValue = currentValue;
        setCurrentValue(newValue);
        setLoading(true);

        try {
            const isNowCompleted = newValue >= target;
            const wasCompleted = oldValue >= target;

            await updateLog(user.uid, habit.id, date, newValue, target, habit.type);
            // Optimistic stat updates are no longer needed as stats are calculated on-the-fly from logs
            // and the logs update will come back via the realtime listener.
        } catch (error) {
            console.error("Failed to update log:", error);
            setCurrentValue(oldValue); // Rollback
            alert("Error updating habit: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const progress = Math.min((currentValue / target) * 100, 100);

    return (
        <div className={clsx(
            "glass-panel",
            "transition-all duration-300",
            isCompleted ? "border-green-500/30 bg-green-500/10" : "hover:bg-white/5"
        )} onClick={() => onEdit && onEdit(habit)} style={{
            padding: '1.25rem',
            marginBottom: '1rem',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Progress Bar Background */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                height: '4px',
                width: `${progress}%`,
                background: isCompleted ? 'var(--color-success)' : 'var(--color-primary)',
                transition: 'width 0.5s ease-out'
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>{habit.title}</h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                        {habit.type.charAt(0).toUpperCase() + habit.type.slice(1)} • {currentValue} / {target}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {habit.targetCount === 1 ? (
                        // Case 1: Binary Task (Checkmark)
                        <button
                            onClick={(e) => { e.stopPropagation(); handleUpdate(isCompleted ? 0 : 1); }}
                            disabled={loading}
                            style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '50%',
                                border: isCompleted ? '2px solid var(--color-success)' : '2px solid var(--glass-border)',
                                background: isCompleted ? 'var(--color-success)' : 'transparent',
                                color: isCompleted ? '#000' : 'var(--color-text)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: isCompleted ? '0 0 10px rgba(0,255,0,0.2)' : 'none'
                            }}
                        >
                            <Check size={24} strokeWidth={3} />
                        </button>
                    ) : (
                        // Case 2: Count Task (Increments)
                        (habit.increments && habit.increments.length > 0 ? habit.increments : [1]).map((inc, idx) => (
                            <button
                                key={idx}
                                onClick={(e) => { e.stopPropagation(); handleUpdate(currentValue + inc); }}
                                disabled={loading}
                                style={{
                                    minWidth: '40px',
                                    height: '40px',
                                    padding: '0 12px',
                                    borderRadius: '20px',
                                    border: '1px solid var(--glass-border)',
                                    background: 'var(--glass-bg)',
                                    color: 'var(--color-text)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: loading ? 'default' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '0.9rem',
                                    opacity: loading ? 0.5 : 1
                                }}
                            >
                                +{inc}
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
