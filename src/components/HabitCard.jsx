import { Check, Plus, Clock } from 'lucide-react';
import { updateLog } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { format, isSameDay, differenceInHours, differenceInMinutes, endOfDay, isToday } from 'date-fns';
import { EVENING_WARNING_HOUR, DEBOUNCE_DELAY_MS, STREAK_MILESTONES } from '../lib/constants';
import { calculateStreak } from '../utils/habitUtils';
import ConfettiCelebration from './ConfettiCelebration';

export default function HabitCard({ habit, log, date, onEdit, onClick }) {
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
        }, DEBOUNCE_DELAY_MS);

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
    const multiplierLevel = Math.floor(multiplier); // 2, 3, 4, etc.

    // Track multiplier level changes for animation
    const prevMultiplierLevel = useRef(multiplierLevel);
    const [isMultiplierAnimating, setIsMultiplierAnimating] = useState(false);

    useEffect(() => {
        // Trigger animation when multiplier crosses a new integer threshold
        if (multiplierLevel > prevMultiplierLevel.current && multiplierLevel >= 2) {
            setIsMultiplierAnimating(true);
            const timer = setTimeout(() => setIsMultiplierAnimating(false), 600);
            return () => clearTimeout(timer);
        }
        prevMultiplierLevel.current = multiplierLevel;
    }, [multiplierLevel]);

    // Streak milestone celebration (only for daily habits on today)
    const [celebratingMilestone, setCelebratingMilestone] = useState(null);
    const prevWasCompleted = useRef(log?.completed || false);

    useEffect(() => {
        // Only check for milestones on daily habits and for today
        if (habit.type !== 'daily' || !isToday(date)) {
            prevWasCompleted.current = isCompleted;
            return;
        }

        // Check if we just transitioned from incomplete to complete
        const justCompleted = isCompleted && !prevWasCompleted.current;
        prevWasCompleted.current = isCompleted;

        if (justCompleted) {
            // Calculate the new streak assuming today is complete (optimistic UI)
            const newStreak = calculateStreak(habit, true);

            // Check if we hit a milestone
            if (STREAK_MILESTONES.includes(newStreak)) {
                setCelebratingMilestone(newStreak);
            }
        }
    }, [isCompleted, habit, date]);

    // Time remaining warning for incomplete daily habits after 9pm
    const now = new Date();
    const currentHour = now.getHours();
    const isEvening = currentHour >= EVENING_WARNING_HOUR;
    const showTimeWarning = habit.type === 'daily' && !isCompleted && isEvening && isToday(date);

    let hoursRemaining = 0;
    let minutesRemaining = 0;
    if (showTimeWarning) {
        const midnight = endOfDay(now);
        hoursRemaining = differenceInHours(midnight, now);
        minutesRemaining = differenceInMinutes(midnight, now) % 60;
    }

    return (
        <>
            {/* Milestone celebration */}
            {celebratingMilestone && (
                <ConfettiCelebration
                    milestone={celebratingMilestone}
                    onComplete={() => setCelebratingMilestone(null)}
                />
            )}

            <div className={clsx(
                "glass-panel",
                "transition-all duration-300",
                isCompleted ? "border-green-500/30 bg-green-500/10" : "hover:bg-white/5"
            )} onClick={() => onClick && onClick(habit)} style={{
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
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span>{habit.type.charAt(0).toUpperCase() + habit.type.slice(1)} • {currentValue} / {target}</span>
                            {isOverachieved && (
                                <span style={{
                                    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                    color: '#000',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    boxShadow: '0 0 8px rgba(251, 191, 36, 0.4)',
                                    transform: isMultiplierAnimating ? 'scale(1.3)' : 'scale(1)',
                                    transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                    animation: isMultiplierAnimating ? 'badge-pop 0.6s ease-out' : 'none'
                                }}>
                                    {multiplier >= 2 ? `${Math.floor(multiplier)}x` : `${Math.round(multiplier * 100)}%`}
                                </span>
                            )}
                            {showTimeWarning && (
                                <span style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    color: '#f87171',
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    border: '1px solid rgba(239, 68, 68, 0.3)'
                                }}>
                                    <Clock size={10} />
                                    {hoursRemaining > 0 ? `${hoursRemaining}h ${minutesRemaining}m left` : `${minutesRemaining}m left`}
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
        </>
    );
}
