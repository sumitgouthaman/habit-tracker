import { useState, useMemo } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    addMonths,
    subMonths,
    isSameMonth,
    isSameDay,
    isToday,
    startOfYear,
    endOfYear,
    addYears,
    subYears,
    eachMonthOfInterval,
    eachWeekOfInterval
} from 'date-fns';
import { ChevronLeft, ChevronRight, X, Edit, Check, RotateCcw } from 'lucide-react';
import { getPeriodKey } from '../lib/db';
import { getLogValue } from '../utils/habitUtils';
import { WEEK_STARTS_ON } from '../lib/constants';
import clsx from 'clsx';

export default function HabitDetails({ habit, onClose, onEdit, onDayClick }) {
    const [viewDate, setViewDate] = useState(new Date());

    // --- Navigation Helpers ---
    const handlePrev = () => {
        if (habit.type === 'daily') {
            setViewDate(subMonths(viewDate, 1));
        } else {
            setViewDate(subYears(viewDate, 1));
        }
    };

    const handleNext = () => {
        if (habit.type === 'daily') {
            setViewDate(addMonths(viewDate, 1));
        } else {
            setViewDate(addYears(viewDate, 1));
        }
    };

    const handleToday = () => {
        setViewDate(new Date());
    };

    // --- Data Calculation ---
    // Daily: Calendar Grid
    const calendarDays = useMemo(() => {
        if (habit.type !== 'daily') return [];

        const monthStart = startOfMonth(viewDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: WEEK_STARTS_ON });

        const days = eachDayOfInterval({ start: startDate, end: endDate });

        return days.map(day => {
            const value = getLogValue(habit, day);
            const target = habit.targetCount || 1;
            const isCompleted = value >= target;
            const multiplier = target > 0 ? value / target : 0;

            return {
                date: day,
                isCurrentMonth: isSameMonth(day, monthStart),
                isToday: isToday(day),
                value,
                isCompleted,
                multiplier
            };
        });
    }, [viewDate, habit]);

    // Weekly/Monthly: List/Grid
    const periodItems = useMemo(() => {
        if (habit.type === 'daily') return [];

        const yearStart = startOfYear(viewDate);
        const yearEnd = endOfYear(viewDate);

        let intervals = [];
        let dateFormat = '';
        let displayFormat = '';

        if (habit.type === 'weekly') {
            intervals = eachWeekOfInterval({ start: yearStart, end: yearEnd }, { weekStartsOn: WEEK_STARTS_ON });
            dateFormat = 'weekly';
            displayFormat = 'MMM d'; // Week string
        } else {
            intervals = eachMonthOfInterval({ start: yearStart, end: yearEnd });
            dateFormat = 'monthly';
            displayFormat = 'MMM';
        }

        return intervals.map(date => {
            // Re-use logic from charts/db to get keys
            const key = getPeriodKey(date, dateFormat);
            // Manual lookup since getLogValue might expect Date object but specific handling needed for periods
            // Actually getLogValue handles date objects correctly, let's use it but we need to pass the "date" that represents the period start
            const value = habit.logs?.[key]?.value || 0;
            const target = habit.targetCount || 1;
            const isCompleted = value >= target;

            return {
                date,
                label: format(date, displayFormat),
                value,
                isCompleted,
                key // debug
            };
        });
    }, [viewDate, habit]);


    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            animation: 'fadeIn 0.2s ease-out'
        }} onClick={onClose}>
            <div
                className="glass-panel"
                style={{
                    width: '100%',
                    maxWidth: '500px',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    overflow: 'hidden'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid var(--glass-border)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    background: 'rgba(255,255,255,0.02)'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>{habit.title}</h2>
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)', display: 'flex', gap: '1rem' }}>
                            <span>{habit.type.charAt(0).toUpperCase() + habit.type.slice(1)}</span>
                            <span>Target: {habit.targetCount}</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            className="btn-secondary"
                            onClick={() => onEdit(habit)}
                            title="Edit Habit"
                            style={{ padding: '0.5rem' }}
                        >
                            <Edit size={20} />
                        </button>
                        <button
                            className="btn-secondary"
                            onClick={onClose}
                            title="Close"
                            style={{ padding: '0.5rem' }}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Controls */}
                <div style={{
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <button onClick={handlePrev} className="btn-secondary" style={{ padding: '0.4rem' }}><ChevronLeft size={20} /></button>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                        {habit.type === 'daily' ? format(viewDate, 'MMMM yyyy') : format(viewDate, 'yyyy')}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {!isSameMonth(viewDate, new Date()) && habit.type === 'daily' && (
                            <button onClick={handleToday} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>Today</button>
                        )}
                        <button onClick={handleNext} className="btn-secondary" style={{ padding: '0.4rem' }}><ChevronRight size={20} /></button>
                    </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 0.5rem 1rem 0.5rem' }}>

                    {/* Daily Calendar Grid */}
                    {habit.type === 'daily' && (
                        <div style={{ width: '100%', maxWidth: '100%' }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                                marginBottom: '0.25rem',
                                textAlign: 'center',
                                fontSize: '0.75rem',
                                color: 'var(--color-text-dim)',
                                fontWeight: 600
                            }}>
                                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                                    <div key={i} style={{ padding: '0.25rem 0' }}>{d}</div>
                                ))}
                            </div>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                                gap: '3px'
                            }}>
                                {calendarDays.map((day, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            aspectRatio: '1',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '6px',
                                            background: day.isCompleted
                                                ? 'rgba(34, 197, 94, 0.2)'
                                                : day.value > 0
                                                    ? 'rgba(251, 191, 36, 0.15)' // Partial/Progress
                                                    : 'rgba(255,255,255,0.03)',
                                            border: day.isToday ? '1px solid var(--color-primary)' : '1px solid transparent',
                                            opacity: day.isCurrentMonth ? 1 : 0.3,
                                            position: 'relative',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer',
                                            overflow: 'hidden',
                                            minWidth: 0
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDayClick(day.date);
                                        }}
                                    >
                                        <span style={{ marginBottom: day.value > 0 ? '1px' : '0', lineHeight: 1.1 }}>{format(day.date, 'd')}</span>

                                        {/* Indicators */}
                                        {day.isCompleted && (
                                            day.multiplier >= 2 ? (
                                                <div style={{
                                                    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                                    color: '#000',
                                                    fontSize: '0.6rem',
                                                    fontWeight: 700,
                                                    padding: '1px 3px',
                                                    borderRadius: '3px',
                                                    boxShadow: '0 0 4px rgba(251, 191, 36, 0.4)',
                                                    lineHeight: 1
                                                }}>
                                                    {Math.floor(day.multiplier)}x
                                                </div>
                                            ) : (
                                                <div style={{ color: 'var(--color-success)' }}><Check size={12} strokeWidth={3} /></div>
                                            )
                                        )}
                                        {!day.isCompleted && day.value > 0 && (
                                            <div style={{
                                                fontSize: '0.6rem',
                                                fontWeight: 700,
                                                color: 'var(--color-warning)',
                                                lineHeight: 1
                                            }}>
                                                {day.value}
                                            </div>
                                        )}

                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Weekly/Monthly List */}
                    {habit.type !== 'daily' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.75rem' }}>
                            {periodItems.map((item, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        background: item.isCompleted
                                            ? 'rgba(34, 197, 94, 0.2)'
                                            : item.value > 0
                                                ? 'rgba(251, 191, 36, 0.15)'
                                                : 'rgba(255,255,255,0.03)',
                                        borderRadius: '8px',
                                        padding: '0.75rem 0.5rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: item.isCompleted ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--glass-border)'
                                    }}
                                >
                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '0.25rem' }}>{item.label}</span>
                                    {item.isCompleted ? (
                                        item.value >= (habit.targetCount || 1) * 2 ? (
                                            <div style={{
                                                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                                color: '#000',
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                boxShadow: '0 0 6px rgba(251, 191, 36, 0.4)'
                                            }}>
                                                {Math.floor(item.value / (habit.targetCount || 1))}x
                                            </div>
                                        ) : (
                                            <Check size={20} className="text-success" />
                                        )
                                    ) : (
                                        item.value > 0 ? (
                                            <span style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--color-warning)' }}>
                                                {item.value}
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: '1.1rem', color: 'var(--color-text-dim)', opacity: 0.3 }}>-</span>
                                        )
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
