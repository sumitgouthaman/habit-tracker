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

    // Debounce logic
    useEffect(() => {
        // Don't update if it matches the initial prop value (avoid initial sync trigger)
        if (log && currentValue === log.value) return;
        if (!log && currentValue === 0) return;

        const timer = setTimeout(() => {
            updateLog(user.uid, habit.id, date, currentValue, target, habit.type).catch(err => {
                console.error("Failed to update log:", err);
                // Optional: Rollback on error, but tricky with potential race conditions
            });
        }, 1000); // 1 second debounce

        return () => clearTimeout(timer);
    }, [currentValue, user.uid, habit.id, date, target, habit.type]);

    const handleUpdate = (newValue) => {
        // Prevent going below 0
        if (newValue < 0) newValue = 0;
        setCurrentValue(newValue);
    };

    const progress = Math.min((currentValue / target) * 100, 100);
    const multiplier = currentValue / target;
    const isOverachieved = multiplier > 1;

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
                background: isOverachieved
                    ? 'linear-gradient(90deg, var(--color-success), #fbbf24)'
                    : isCompleted
                        ? 'var(--color-success)'
                        : 'var(--color-primary)',
                transition: 'width 0.5s ease-out',
                boxShadow: isOverachieved ? '0 0 12px rgba(251, 191, 36, 0.6), 0 0 24px rgba(251, 191, 36, 0.3)' : 'none',
                animation: isOverachieved ? 'pulse-glow 2s ease-in-out infinite' : 'none'
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>{habit.title}</h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{habit.type.charAt(0).toUpperCase() + habit.type.slice(1)} • {currentValue} / {target}</span>
                        {isOverachieved && (
                            <span style={{
                                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                color: '#000',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                boxShadow: '0 0 8px rgba(251, 191, 36, 0.4)'
                            }}>
                                {multiplier >= 2 ? `${Math.floor(multiplier)}x` : `${Math.round(multiplier * 100)}%`}
                            </span>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {habit.targetCount === 1 ? (
                        // Case 1: Binary Task (Checkmark)
                        <button
                            onClick={(e) => { e.stopPropagation(); handleUpdate(isCompleted ? 0 : 1); }}
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
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '0.9rem'
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
