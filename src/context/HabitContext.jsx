import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { getUserHabits } from "../lib/db";

const HabitContext = createContext();

export function HabitProvider({ children }) {
    const { user } = useAuth();
    const [habits, setHabits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchHabits = async () => {
        if (!user) {
            setHabits([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const data = await getUserHabits(user.uid);
            setHabits(data);
        } catch (err) {
            console.error("Error fetching habits:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHabits();
    }, [user]);

    // Helper to update local state without refetching
    const addHabitToState = (newHabit) => {
        setHabits(prev => [...prev, newHabit]);
    };

    const removeHabitFromState = (habitId) => {
        setHabits(prev => prev.filter(h => h.id !== habitId));
    };

    const updateHabitInState = (habitId, updates) => {
        setHabits(prev => prev.map(h => h.id === habitId ? { ...h, ...updates } : h));
    };

    const value = {
        habits,
        loading,
        error,
        refreshHabits: fetchHabits,
        addHabitToState,
        removeHabitFromState,
        updateHabitInState
    };

    return (
        <HabitContext.Provider value={value}>
            {children}
        </HabitContext.Provider>
    );
}

export function useHabits() {
    return useContext(HabitContext);
}
