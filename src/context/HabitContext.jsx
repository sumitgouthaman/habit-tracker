import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { getUserHabits, subscribeToHabits } from "../lib/db";

const HabitContext = createContext();

export function HabitProvider({ children }) {
    const { user } = useAuth();
    const [habits, setHabits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let unsubscribe;

        if (user) {
            setLoading(true);
            try {
                unsubscribe = subscribeToHabits(user.uid, (data) => {
                    setHabits(data);
                    setLoading(false);
                });
            } catch (err) {
                console.error("Error subscribing to habits:", err);
                setError(err.message);
                setLoading(false);
            }
        } else {
            setHabits([]);
            setLoading(false);
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user]);

    // Legacy helpers - kept for compatibility but effectively no-ops for state 
    // since the subscription handles updates.
    // Ideally components should just write to DB and let subscription update state.
    const addHabitToState = () => { };
    const removeHabitFromState = () => { };
    const updateHabitInState = () => { };

    const value = {
        habits,
        loading,
        error,
        refreshHabits: () => { }, // No-op
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
