import { useState, useMemo } from 'react';
import { useHabits } from '../context/HabitContext';
import { ChevronRight } from 'lucide-react';
import HabitStatsChart from '../components/HabitStatsChart';
import HabitDetailedStats from '../components/HabitDetailedStats';
import { calculateStreak, calculateTotal, getEffectiveLogs, sortHabitsWithDerivedBelow } from '../utils/habitUtils';

export default function Stats() {
    const { habits } = useHabits();
    const [selectedHabit, setSelectedHabit] = useState(null);

    const dailyHabits = sortHabitsWithDerivedBelow(habits.filter(h => h.type === 'daily'));
    const weeklyHabits = sortHabitsWithDerivedBelow(habits.filter(h => h.type === 'weekly'));
    const monthlyHabits = sortHabitsWithDerivedBelow(habits.filter(h => h.type === 'monthly'));

    return (
        <div style={{ paddingBottom: '100px' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '2rem' }}>Statistics</h2>

            {habits.length === 0 ? (
                <div style={{ color: 'var(--color-text-dim)', textAlign: 'center', marginTop: '4rem' }}>
                    No stats available yet.
                </div>
            ) : (
                <>
                    {dailyHabits.length > 0 && (
                        <section style={{ marginBottom: '2rem' }}>
                            <h3 style={{ marginBottom: '1rem', opacity: 0.8 }}>Daily Goals</h3>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {dailyHabits.map(habit => (
                                    <HabitStatsCard key={habit.id} habit={habit} onSelect={setSelectedHabit} />
                                ))}
                            </div>
                        </section>
                    )}

                    {weeklyHabits.length > 0 && (
                        <section style={{ marginBottom: '2rem' }}>
                            <h3 style={{ marginBottom: '1rem', opacity: 0.8 }}>Weekly Goals</h3>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {weeklyHabits.map(habit => (
                                    <HabitStatsCard key={habit.id} habit={habit} onSelect={setSelectedHabit} />
                                ))}
                            </div>
                        </section>
                    )}

                    {monthlyHabits.length > 0 && (
                        <section style={{ marginBottom: '2rem' }}>
                            <h3 style={{ marginBottom: '1rem', opacity: 0.8 }}>Monthly Goals</h3>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {monthlyHabits.map(habit => (
                                    <HabitStatsCard key={habit.id} habit={habit} onSelect={setSelectedHabit} />
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}

            {selectedHabit && (
                <HabitDetailedStats
                    habit={selectedHabit}
                    onClose={() => setSelectedHabit(null)}
                />
            )}
        </div>
    );
}

function HabitStatsCard({ habit, onSelect }) {
    const { habits } = useHabits();
    const [timeRange, setTimeRange] = useState('7d');

    const displayHabit = useMemo(() => {
        if (!habit.derivedFrom) return habit;
        return { ...habit, logs: getEffectiveLogs(habit, habits) };
    }, [habit, habits]);

    return (
        <div
            className="glass-panel"
            onClick={() => onSelect(habit)}
            style={{
                padding: '1.5rem',
                transition: 'all 0.2s',
                cursor: 'pointer',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                    <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{habit.title}</h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', textTransform: 'capitalize' }}>
                        {habit.type}
                    </span>
                </div>
                <ChevronRight size={18} color="var(--color-text-dim)" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                        {calculateStreak(displayHabit)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>Current Streak</div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-secondary)' }}>
                        {calculateTotal(displayHabit)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>Total Completed</div>
                </div>
            </div>

            <div style={{ marginTop: '2rem', animation: 'fadeIn 0.3s' }} onClick={e => e.stopPropagation()}>
                {habit.type === 'daily' && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        {['7d', '30d'].map(range => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={timeRange === range ? 'btn' : 'btn btn-secondary'}
                                style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem', minWidth: 'auto' }}
                            >
                                {range === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
                            </button>
                        ))}
                    </div>
                )}
                {habit.type === 'weekly' && (
                    <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--color-text-dim)', fontWeight: 500 }}>
                        Last 12 Weeks
                    </div>
                )}
                {habit.type === 'monthly' && (
                    <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--color-text-dim)', fontWeight: 500 }}>
                        Last 12 Months
                    </div>
                )}
                <HabitStatsChart habit={displayHabit} range={timeRange} />
            </div>

            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-dim)', textAlign: 'center', opacity: 0.6 }}>
                Tap for detailed stats
            </div>
        </div>
    );
}
