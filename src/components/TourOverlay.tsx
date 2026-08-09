import React, { useEffect, useState } from 'react';
import { useTour } from '../contexts/TourContext';
import { ChevronRight, ChevronLeft, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const TOUR_STEPS = [
    {
        step: 0,
        id: 'step-1',
        title: 'Welcome to the Sandbox',
        content: 'See your restaurant’s payroll health at a glance – messy POS data turned into clear insights.'
    },
    {
        step: 1,
        id: 'step-2',
        title: 'The Magic of AI',
        content: 'Write rules in plain English. Our engine compiles them into precise math automatically.'
    },
    {
        step: 2,
        id: 'step-3',
        title: '1-Click Processing',
        content: 'Apply your rules to hours + tips instantly – no more Excel hell.'
    },
    {
        step: 3,
        id: 'step-4',
        title: 'Export & Sync',
        content: 'Generate clean CSVs ready for any major payroll provider in seconds.'
    }
];

export default function TourOverlay() {
    const { isActive, currentStep, nextStep, prevStep, endTour } = useTour();
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        if (!isActive) return;

        const updatePosition = () => {
            const stepData = TOUR_STEPS[currentStep];
            const el = document.querySelector(`[data-tour="${stepData.id}"]`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => {
                    const rect = el.getBoundingClientRect();
                    setTargetRect(rect);
                }, 300);
            } else {
                setTargetRect(null);
            }
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, { passive: true });
        
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition);
        };
    }, [isActive, currentStep]);

    const stepData = TOUR_STEPS[currentStep];
    const isLastStep = currentStep === TOUR_STEPS.length - 1;

    let popoverStyle: React.CSSProperties = {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
    };

    if (targetRect) {
        const popoverWidth = 320;
        const popoverHeight = 200;
        
        let top = targetRect.bottom + 20;
        let left = targetRect.left + (targetRect.width / 2) - (popoverWidth / 2);

        // Handle bottom overflow
        if (top + popoverHeight > window.innerHeight - 20) {
            top = targetRect.top - popoverHeight - 20;
        }
        
        // Handle top overflow fallback
        if (top < 20) top = 20;

        // Handle left/right overflow
        if (left < 20) left = 20;
        else if (left + popoverWidth > window.innerWidth - 20) {
            left = window.innerWidth - popoverWidth - 20;
        }

        popoverStyle = { top, left };
    }

    return (
        <AnimatePresence>
            {isActive && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="fixed inset-0 z-[99999] pointer-events-none"
                >
                    {/* Backdrop and Highlight */}
                    {targetRect ? (
                        <>
                            {/* Static dark backdrop with cutout */}
                            <div 
                                className="absolute rounded-lg transition-all duration-300 pointer-events-auto"
                                style={{
                                    top: targetRect.top - 8,
                                    left: targetRect.left - 8,
                                    width: targetRect.width + 16,
                                    height: targetRect.height + 16,
                                    boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.85)',
                                }}
                            />
                            {/* Glowing pulsing ring */}
                            <motion.div 
                                animate={{ scale: [1, 1.02, 1], opacity: [0.6, 1, 0.6] }}
                                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                                className="absolute border-[4px] border-emerald-400 rounded-lg pointer-events-none"
                                style={{
                                    top: targetRect.top - 8,
                                    left: targetRect.left - 8,
                                    width: targetRect.width + 16,
                                    height: targetRect.height + 16,
                                    boxShadow: '0 0 20px rgba(52, 211, 153, 0.6), inset 0 0 15px rgba(52, 211, 153, 0.3)',
                                }}
                            />
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-slate-900/85 pointer-events-auto" />
                    )}

                    {/* Popover Card */}
                    <div 
                        className="absolute w-[320px] bg-white rounded-2xl shadow-2xl p-5 pointer-events-auto transition-all duration-300 flex flex-col gap-3"
                        style={popoverStyle}
                    >
                        <button onClick={endTour} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={18} />
                        </button>

                        <div className="text-xs font-black text-emerald-600 tracking-wider uppercase">
                            Step {currentStep + 1} of 4
                        </div>
                        
                        <h3 className="text-lg font-black text-slate-900">{stepData.title}</h3>
                        <p className="text-sm text-slate-600 leading-relaxed font-medium">
                            {stepData.content}
                        </p>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                            <button 
                                onClick={endTour}
                                className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                Skip Tour
                            </button>
                            <div className="flex items-center gap-2">
                                {currentStep > 0 && (
                                    <button 
                                        onClick={prevStep}
                                        className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                )}
                                <button 
                                    onClick={isLastStep ? endTour : nextStep}
                                    className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-black rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-sm shadow-emerald-600/20"
                                >
                                    {isLastStep ? (
                                        <>Finish <Check size={16} /></>
                                    ) : (
                                        <>Next <ChevronRight size={16} /></>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
