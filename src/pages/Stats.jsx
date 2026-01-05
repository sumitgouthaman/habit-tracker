import { useState } from 'react';
import { useHabits } from '../context/HabitContext';
import { BarChart2 } from 'lucide-react';
import HabitStatsChart from '../components/HabitStatsChart';
import { calculateStreak, calculateTotal } from '../utils/habitUtils';

export default function Stats() {
    const { habits } = useHabits();
    // We need separate time range state for EACH habit now that multiple can be open.
    // Or simpler: Just one global range switcher? No, user might want different views.
    // Let's make HabitStatsChart handle its own internal range state?
    // Or separate component 'HabitStatsCard' that holds the state.
    // For MVP, let's just default to '7d' and let the chart component handle the switcher?
    // Actually, passing 'range' is fine, but we need state per card.

    const dailyHabits = habits.filter(h => h.type === 'daily').sort((a, b) => a.title.localeCompare(b.title));
    const weeklyHabits = habits.filter(h => h.type === 'weekly').sort((a, b) => a.title.localeCompare(b.title));
    const monthlyHabits = habits.filter(h => h.type === 'monthly').sort((a, b) => a.title.localeCompare(b.title));

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
                                {dailyHabits.map(habit => <HabitStatsCard key={habit.id} habit={habit} />)}
                            </div>
                        </section>
                    )}

                    {weeklyHabits.length > 0 && (
                        <section style={{ marginBottom: '2rem' }}>
                            <h3 style={{ marginBottom: '1rem', opacity: 0.8 }}>Weekly Goals</h3>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {weeklyHabits.map(habit => <HabitStatsCard key={habit.id} habit={habit} />)}
                            </div>
                        </section>
                    )}

                    {monthlyHabits.length > 0 && (
                        <section style={{ marginBottom: '2rem' }}>
                            <h3 style={{ marginBottom: '1rem', opacity: 0.8 }}>Monthly Goals</h3>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {monthlyHabits.map(habit => <HabitStatsCard key={habit.id} habit={habit} />)}
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}

function HabitStatsCard({ habit }) {
    const [timeRange, setTimeRange] = useState('7d');
    // We now show graph for ALL habits (Barcode style for binary)
    const hasGraph = true;

    // Sorting logic was in parent, but mapping unsorted is fine or we sort in parent.
    // The previous code sorted habits. Let's keep that.

    return (
        <div className="glass-panel" style={{ padding: '1.5rem', transition: 'all 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                    <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{habit.title}</h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', textTransform: 'capitalize' }}>
                        {habit.type}
                    </span>
                </div>
                {hasGraph && <BarChart2 size={18} color="var(--color-text-dim)" />}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                        {calculateStreak(habit)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>Current Streak</div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-secondary)' }}>
                        {calculateTotal(habit)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>Total Completed</div>
                </div>
            </div>

            {hasGraph && (
                <div style={{ marginTop: '2rem', animation: 'fadeIn 0.3s' }}>
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
                    <HabitStatsChart habit={habit} range={timeRange} />
                </div>
            )}
        </div>
    );
}
