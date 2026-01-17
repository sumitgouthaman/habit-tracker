import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { useAuth } from "./AuthContext";
import { createStorageInterface, getPeriodKey } from "../lib/storage";

const HabitContext = createContext();

export function HabitProvider({ children }) {
    const { user, isGuest } = useAuth();
    const [habits, setHabits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Create storage interface based on user state
    const storage = useMemo(() => {
        return createStorageInterface(user?.uid);
    }, [user?.uid]);

    useEffect(() => {
        let unsubscribe;

        // Only subscribe if user is logged in OR in guest mode
        if (user || isGuest) {
            setLoading(true);
            setError(null);

            try {
                unsubscribe = storage.subscribeToHabits((data) => {
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
    }, [user, isGuest, storage]);

    // Legacy helpers - kept for compatibility but effectively no-ops for state 
    // since the subscription handles updates.
    const addHabitToState = () => { };
    const removeHabitFromState = () => { };
    const updateHabitInState = () => { };

    const value = {
        habits,
        loading,
        error,
        storage, // Expose storage interface for components to use
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

// Re-export getPeriodKey for convenience
export { getPeriodKey };

