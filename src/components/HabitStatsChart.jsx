import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { getHabitHistory, getPeriodKey } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { Check, X } from 'lucide-react';

export default function HabitStatsChart({ habit, range }) { // range: '7d', '30d'
    const { user } = useAuth();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Determine date range
                const today = new Date();
                const daysToSub = range === '30d' ? 29 : 6;
                const startDate = subDays(today, daysToSub);
                const endDate = today;

                const startStr = getPeriodKey(startDate, 'daily');
                const endStr = getPeriodKey(endDate, 'daily');

                // Fetch logs
                const logs = await getHabitHistory(user.uid, habit.id, startStr, endStr);

                // Create a map of existing logs
                const logMap = {};
                logs.forEach(log => {
                    logMap[log.date] = log.value;
                });

                // Generate full date range (filling gaps with 0)
                const allDays = eachDayOfInterval({ start: startDate, end: endDate });

                const chartData = allDays.map(day => {
                    const dateKey = getPeriodKey(day, 'daily');
                    return {
                        dateStr: format(day, 'MMM d'), // Tooltip friendly
                        shortDate: format(day, 'd'),
                        dayName: format(day, 'EEE'),
                        date: format(day, range === '7d' ? 'EEE' : 'dd'), // Mon vs 01
                        fullDate: dateKey,
                        value: logMap[dateKey] || 0
                    };
                });

                setData(chartData);

            } catch (err) {
                console.error("Failed to load chart data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [habit, range, user]);

    if (loading) {
        return <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-dim)' }}>Loading stats...</div>;
    }

    if (!data || data.length === 0) {
        return <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-dim)' }}>No data found for this period.</div>;
    }

    // --- Render Logic ---
    const isBinary = habit.targetCount === 1;

    if (isBinary) {
        return (
            <div style={{ marginTop: '1rem' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: range === '7d' ? 'repeat(7, 1fr)' : 'repeat(auto-fill, minmax(40px, 1fr))',
                    gap: '0.8rem',
                    justifyItems: 'center'
                }}>
                    {data.map((day, idx) => {
                        const isDone = day.value >= 1;
                        return (
                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }} title={`${day.dateStr}: ${isDone ? 'Completed' : 'Missed'}`}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: isDone ? 'var(--color-success)' : 'rgba(255,255,255,0.05)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: isDone ? 'none' : '1px solid var(--glass-border)',
                                    color: isDone ? '#000' : 'var(--color-text-dim)'
                                }}>
                                    {isDone ? <Check size={16} strokeWidth={3} /> : <X size={14} />}
                                </div>
                                <span style={{ fontSize: '0.7em', color: 'var(--color-text-dim)' }}>
                                    {range === '7d' ? day.dayName : day.shortDate}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div style={{ height: '200px', width: '100%', marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <XAxis
                        dataKey="date"
                        stroke="var(--color-text-dim)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    {habit.targetCount > 1 && (
                        <ReferenceLine y={habit.targetCount} stroke="var(--color-text-dim)" strokeDasharray="3 3" opacity={0.5} />
                    )}
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.value >= habit.targetCount ? 'var(--color-success)' : 'var(--color-primary)'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
