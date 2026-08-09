import React, { createContext, useContext, useState, useEffect } from 'react';

export type TourType = 'demo' | 'onboarding' | null;

interface TourContextType {
    isActive: boolean;
    currentStep: number;
    tourType: TourType;
    startTour: (type: TourType) => void;
    nextStep: () => void;
    prevStep: () => void;
    endTour: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export function TourProvider({ children }: { children: React.ReactNode }) {
    const [isActive, setIsActive] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [tourType, setTourType] = useState<TourType>(null);

    // Check localStorage on mount to see if we should auto-start
    useEffect(() => {
        const pendingTour = localStorage.getItem('lime_pending_tour'); // stores the tour type 'demo' or 'onboarding'
        const tourCompleted = localStorage.getItem('lime_tour_completed');
        
        if (pendingTour && tourCompleted !== 'true') {
            // Start the tour with a slight delay to allow UI to render
            setTimeout(() => {
                setTourType(pendingTour as TourType);
                setIsActive(true);
                setCurrentStep(0);
                localStorage.removeItem('lime_pending_tour');
            }, 500);
        }
    }, []);

    const startTour = (type: TourType) => {
        // Ensure we mark it as pending if a page reload happens immediately after (like demo login)
        localStorage.setItem('lime_pending_tour', type || 'demo');
        localStorage.removeItem('lime_tour_completed');
        setTourType(type);
        setIsActive(true);
        setCurrentStep(0);
    };

    const nextStep = () => {
        const maxSteps = tourType === 'onboarding' ? 2 : 3;
        setCurrentStep((prev) => Math.min(prev + 1, maxSteps));
    };

    const prevStep = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 0));
    };

    const endTour = () => {
        setIsActive(false);
        localStorage.setItem('lime_tour_completed', 'true');
        localStorage.removeItem('lime_pending_tour');
        setTourType(null);
    };

    return (
        <TourContext.Provider value={{ isActive, currentStep, tourType, startTour, nextStep, prevStep, endTour }}>
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
