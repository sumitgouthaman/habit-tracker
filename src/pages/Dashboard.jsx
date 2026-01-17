import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import { useHabits, getPeriodKey } from '../context/HabitContext';
import { useNavigate } from 'react-router-dom';
import HabitCard from '../components/HabitCard';
import NewHabitForm from '../components/NewHabitForm';
import EditHabitForm from '../components/EditHabitForm';
import HabitDetails from '../components/HabitDetails';
import { format, addDays, subDays, isSameDay } from 'date-fns';
import { Plus, ChevronLeft, ChevronRight, Calendar, ChevronsRight, User } from 'lucide-react';

export default function Dashboard() {
  const { user, loading: authLoading, isGuest } = useAuth();
  const navigate = useNavigate();
  const { habits, loading: habitsLoading } = useHabits();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNewHabitForm, setShowNewHabitForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [selectedHabit, setSelectedHabit] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const dateInputRef = useRef(null);

  const handleDateChange = (e) => {
    if (e.target.value) {
      // Parse "YYYY-MM-DD" manually to ensure local time representation
      const [year, month, day] = e.target.value.split('-').map(Number);
      setCurrentDate(new Date(year, month - 1, day));
    }
  };

  const handlePrevDay = () => setCurrentDate(prev => subDays(prev, 1));
  const handleNextDay = () => setCurrentDate(prev => addDays(prev, 1));
  const isToday = isSameDay(currentDate, new Date());

  const handleSignOut = () => {
    auth.signOut();
  };

  if (authLoading || habitsLoading) {
    return (
      <div className="glass-panel" style={{ margin: '2rem', textAlign: 'center' }}>
        <p>Loading...</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
          Auth: {authLoading ? '...' : 'Done'}, Habits: {habitsLoading ? '...' : 'Done'}
        </p>
      </div>
    );
  }

  // Helper to extract log data for the current view date from the habit's "logs" map
  const getHabitLogForView = (habit) => {
    const key = getPeriodKey(currentDate, habit.type);
    return habit.logs?.[key] || null;
  };

  const dailyHabits = habits.filter(h => h.type === 'daily').sort((a, b) => a.title.localeCompare(b.title));
  const weeklyHabits = habits.filter(h => h.type === 'weekly').sort((a, b) => a.title.localeCompare(b.title));
  const monthlyHabits = habits.filter(h => h.type === 'monthly').sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div style={{ paddingBottom: '100px' }} onClick={() => setShowProfileMenu(false)}>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={(e) => { e.stopPropagation(); handlePrevDay(); }} className="btn-secondary" style={{ padding: '0.4rem', border: 'none' }}>
            <ChevronLeft size={24} />
          </button>

          <div
            className="date-picker-trigger"
            onClick={() => dateInputRef.current?.showPicker?.()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', lineHeight: '1.2', margin: 0 }}>
                {isToday ? 'Today' : format(currentDate, 'MMM do')}
              </h2>
              <Calendar size={16} style={{ opacity: 0.6 }} />
            </div>
            <div style={{ color: 'var(--color-text-dim)', fontSize: '0.8rem' }}>
              {format(currentDate, 'yyyy')} {format(currentDate, 'EEEE')}
            </div>
            {/* Date input - positioned over trigger for iOS compatibility */}
            <input
              type="date"
              ref={dateInputRef}
              style={{
                position: 'absolute',
                opacity: 0,
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 1,
                cursor: 'pointer'
              }}
              value={format(currentDate, 'yyyy-MM-dd')}
              onChange={handleDateChange}
            />
          </div>

          <button onClick={(e) => { e.stopPropagation(); handleNextDay(); }} className="btn-secondary" style={{ padding: '0.4rem', border: 'none' }}>
            <ChevronRight size={24} />
          </button>

          {!isToday && (
            <button
              onClick={() => setCurrentDate(new Date())}
              className="btn-secondary"
              style={{ padding: '0.4rem', border: 'none', marginLeft: '0.2rem' }}
              title="Go to Today"
            >
              <ChevronsRight size={24} />
            </button>
          )}
        </div>

        {/* Profile */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowProfileMenu(!showProfileMenu); }}
            style={{
              width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden',
              border: '1px solid var(--glass-border)', padding: 0, cursor: 'pointer', background: 'transparent'
            }}
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: isGuest ? 'var(--glass-bg)' : 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                {isGuest ? <User size={20} style={{ opacity: 0.7 }} /> : user?.email?.[0].toUpperCase()}
              </div>
            )}
          </button>

          {showProfileMenu && (
            <div style={{
              position: 'absolute',
              top: '110%',
              right: 0,
              background: '#1e293b',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              padding: '0.5rem',
              zIndex: 50,
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              minWidth: '140px'
            }}>
              {isGuest ? (
                <button
                  onClick={() => navigate('/login')}
                  style={{
                    background: 'transparent', border: 'none', color: 'var(--color-primary)',
                    padding: '0.5rem 1rem', width: '100%', textAlign: 'left', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem'
                  }}
                >
                  Sign In
                </button>
              ) : (
                <button
                  onClick={handleSignOut}
                  style={{
                    background: 'transparent', border: 'none', color: '#fca5a5',
                    padding: '0.5rem 1rem', width: '100%', textAlign: 'left', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem'
                  }}
                >
                  Log Out
                </button>
              )}
            </div>
          )}
        </div>
      </header>


      {/* Daily Habits */}
      <section style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', opacity: 0.8 }}>Daily Goals</h3>
        {dailyHabits.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-dim)' }}>
            No daily habits yet.
          </div>
        ) : (
          dailyHabits.map(habit => (
            <HabitCard
              key={`${habit.id} -${format(currentDate, 'yyyy-MM-dd')} `}
              habit={habit}
              log={getHabitLogForView(habit)}
              date={currentDate}
              onEdit={setEditingHabit}
              onClick={() => setSelectedHabit(habit)}
            />
          ))
        )}
      </section>

      {/* Weekly */}
      {
        weeklyHabits.length > 0 && (
          <section style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', opacity: 0.8 }}>Weekly Goals</h3>
            {weeklyHabits.map(habit => (
              <HabitCard
                key={`${habit.id} -${format(currentDate, 'yyyy-MM-dd')} `}
                habit={habit}
                log={getHabitLogForView(habit)}
                date={currentDate}
                onEdit={setEditingHabit}
                onClick={() => setSelectedHabit(habit)}
              />
            ))}
          </section>
        )
      }

      {/* Monthly */}
      {
        monthlyHabits.length > 0 && (
          <section style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', opacity: 0.8 }}>Monthly Goals</h3>
            {monthlyHabits.map(habit => (
              <HabitCard
                key={`${habit.id} -${format(currentDate, 'yyyy-MM-dd')} `}
                habit={habit}
                log={getHabitLogForView(habit)}
                date={currentDate}
                onEdit={setEditingHabit}
                onClick={() => setSelectedHabit(habit)}
              />
            ))}
          </section>
        )
      }

      {/* Floating Action Button */}
      <button
        onClick={() => setShowNewHabitForm(true)}
        style={{
          position: 'fixed',
          bottom: '100px',
          right: '2rem',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--color-primary)',
          color: 'white',
          border: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 40
        }}
      >
        <Plus size={28} />
      </button>

      {
        showNewHabitForm && (
          <NewHabitForm onClose={() => setShowNewHabitForm(false)} />
        )
      }

      {
        editingHabit && (
          <EditHabitForm
            habit={editingHabit}
            log={getHabitLogForView(editingHabit)}
            date={currentDate}
            onClose={() => setEditingHabit(null)}
            onLogUpdate={() => {
              // No-op for local state in this new architecture, 
              // as Firestore listener in HabitContext will auto-update 'habits' prop
              // which re-renders this component.
            }}
          />
        )
      }

      {
        selectedHabit && (
          <HabitDetails
            habit={selectedHabit}
            onClose={() => setSelectedHabit(null)}
            onEdit={(habit) => {
              setSelectedHabit(null);
              setEditingHabit(habit);
            }}
            onDayClick={(date) => {
              setCurrentDate(date);
              setSelectedHabit(null);
            }}
          />
        )
      }
    </div >
  );
}
