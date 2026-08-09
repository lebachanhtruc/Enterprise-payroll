import React, { createContext, useContext, useState, useEffect } from 'react';

interface TourContextType {
    isActive: boolean;
    currentStep: number;
    startTour: () => void;
    nextStep: () => void;
    prevStep: () => void;
    endTour: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export function TourProvider({ children }: { children: React.ReactNode }) {
    const [isActive, setIsActive] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    // Check localStorage on mount to see if we should auto-start
    useEffect(() => {
        const pendingTour = localStorage.getItem('lime_pending_tour');
        const tourCompleted = localStorage.getItem('lime_tour_completed');
        
        if (pendingTour === 'true' && tourCompleted !== 'true') {
            // Start the tour with a slight delay to allow UI to render
            setTimeout(() => {
                setIsActive(true);
                setCurrentStep(0);
                localStorage.removeItem('lime_pending_tour');
            }, 500);
        }
    }, []);

    const startTour = () => {
        // Ensure we mark it as pending if a page reload happens immediately after (like demo login)
        localStorage.setItem('lime_pending_tour', 'true');
        localStorage.removeItem('lime_tour_completed');
        setIsActive(true);
        setCurrentStep(0);
    };

    const nextStep = () => {
        setCurrentStep((prev) => Math.min(prev + 1, 3)); // Max 4 steps (0-3)
    };

    const prevStep = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 0));
    };

    const endTour = () => {
        setIsActive(false);
        localStorage.setItem('lime_tour_completed', 'true');
        localStorage.removeItem('lime_pending_tour');
    };

    return (
        <TourContext.Provider value={{ isActive, currentStep, startTour, nextStep, prevStep, endTour }}>
            {children}
        </TourContext.Provider>
    );
}

export function useTour() {
    const context = useContext(TourContext);
    if (context === undefined) {
        throw new Error('useTour must be used within a TourProvider');
    }
    return context;
}
