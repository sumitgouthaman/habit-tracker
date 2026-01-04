import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { getHabitHistory, getPeriodKey } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import { format, subDays, subWeeks, subMonths, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { Check, X } from 'lucide-react';

export default function HabitStatsChart({ habit, range }) { // range: '7d', '30d'
    const { user } = useAuth();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Determine date range and interval based on habit type
                const today = new Date();
                let startDate, endDate = today;
                let allTimePoints = [];
                let dateFmt = 'daily';
                let formatXAxis = (d) => format(d, 'd');
                let formatTooltip = (d) => format(d, 'MMM d');
                let formatShort = (d) => format(d, 'd');
                let formatDayName = (d) => format(d, 'EEE');

                if (habit.type === 'weekly') {
                    // Last 12 weeks
                    startDate = subWeeks(today, 11); // 11 weeks ago + current week = 12 points
                    dateFmt = 'weekly';
                    allTimePoints = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
                    formatXAxis = (d) => format(d, 'MMM d');
                    formatTooltip = (d) => `Week of ${format(d, 'MMM d')}`;
                    formatShort = (d) => format(d, 'd');
                    formatDayName = (d) => format(d, 'EEE');
                } else if (habit.type === 'monthly') {
                    // Last 12 months
                    startDate = subMonths(today, 11);
                    dateFmt = 'monthly';
                    allTimePoints = eachMonthOfInterval({ start: startDate, end: endDate });
                    formatXAxis = (d) => format(d, 'MMM');
                    formatTooltip = (d) => format(d, 'MMMM yyyy');
                    formatShort = (d) => format(d, 'MMM');
                    formatDayName = (d) => format(d, 'MMM');
                } else {
                    // Daily: Last 7 or 30 days
                    const daysToSub = range === '30d' ? 29 : 6;
                    startDate = subDays(today, daysToSub);
                    dateFmt = 'daily';
                    allTimePoints = eachDayOfInterval({ start: startDate, end: endDate });
                    formatXAxis = (d) => format(d, range === '7d' ? 'EEE' : 'dd');
                }

                const startStr = getPeriodKey(startDate, dateFmt);
                const endStr = getPeriodKey(endDate, dateFmt);

                // Fetch logs
                const logs = await getHabitHistory(user.uid, habit.id, startStr, endStr);

                // Create a map of existing logs
                const logMap = {};
                logs.forEach(log => {
                    logMap[log.date] = log.value;
                });

                const chartData = allTimePoints.map(point => {
                    const dateKey = getPeriodKey(point, dateFmt);
                    return {
                        dateStr: formatTooltip(point),
                        shortDate: formatShort(point),
                        dayName: formatDayName(point),
                        date: formatXAxis(point),
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
                    // Use 6 columns for weekly/monthly (12 items = 2 rows), 7 for daily
                    gridTemplateColumns: habit.type === 'daily' && range === '7d'
                        ? 'repeat(7, 1fr)'
                        : (habit.type === 'daily' ? 'repeat(auto-fill, minmax(40px, 1fr))' : 'repeat(6, 1fr)'),
                    gap: '0.8rem',
                    justifyItems: 'center'
                }}>
                    {data.map((day, idx) => {
                        const isDone = day.value >= 1;
                        // Use dayName (Mon) for daily, shortDate (Oct 23) for others
                        const label = habit.type === 'daily' && range === '7d' ? day.dayName : day.shortDate;

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
                                    {habit.type === 'weekly' ? '' : label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Calculate average for non-binary habits
    const average = data.length > 0 ? data.reduce((sum, item) => sum + item.value, 0) / data.length : 0;

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
                    <YAxis
                        hide
                        domain={[0, (dataMax) => Math.max(dataMax, habit.targetCount * 1.1)]}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    {habit.targetCount > 1 && (
                        <>
                            <ReferenceLine
                                y={habit.targetCount}
                                stroke="var(--color-text-dim)"
                                strokeDasharray="3 3"
                                opacity={0.5}
                                label={{ position: 'insideTopRight', value: `Target: ${habit.targetCount}`, fill: 'var(--color-text-dim)', fontSize: 10 }}
                            />
                            <ReferenceLine
                                y={average}
                                stroke="var(--color-secondary)"
                                strokeDasharray="3 3"
                                opacity={0.7}
                                label={{ position: 'insideTopLeft', value: `Avg: ${average.toFixed(1)}`, fill: 'var(--color-secondary)', fontSize: 10 }}
                            />
                        </>
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
