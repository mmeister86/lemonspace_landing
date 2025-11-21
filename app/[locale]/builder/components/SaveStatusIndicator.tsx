"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useCanvasStore } from "@/lib/stores/canvas-store";

export function SaveStatusIndicator() {
    const saveStatus = useCanvasStore((state) => state.saveStatus);
    const hasUnsavedChanges = useCanvasStore((state) => state.hasUnsavedChanges);

    const [shouldShowSaved, setShouldShowSaved] = React.useState(false);
    const [displayStatus, setDisplayStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error' | 'unsaved'>('idle');

    React.useEffect(() => {
        if (saveStatus === 'saving') {
            setDisplayStatus('saving');
            setShouldShowSaved(false);
        } else if (saveStatus === 'error') {
            setDisplayStatus('error');
        } else if (saveStatus === 'saved') {
            setDisplayStatus('saved');
            setShouldShowSaved(true);
            const timer = setTimeout(() => {
                setShouldShowSaved(false);
            }, 2000);
            return () => clearTimeout(timer);
        } else if (hasUnsavedChanges) {
            setDisplayStatus('unsaved');
        } else {
            // Idle and no changes
            setDisplayStatus('idle');
        }
    }, [saveStatus, hasUnsavedChanges]); // Fixed dependency array

    return (
        <div className="flex items-center h-full overflow-hidden">
            <AnimatePresence mode="wait">
                {displayStatus === 'saving' && (
                    <motion.div
                        key="saving"
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 20, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground px-2"
                    >
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Speichern...</span>
                    </motion.div>
                )}

                {displayStatus === 'error' && (
                    <motion.div
                        key="error"
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 20, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-1.5 text-xs text-destructive px-2"
                    >
                        <AlertCircle className="h-3 w-3" />
                        <span>Fehler</span>
                    </motion.div>
                )}

                {displayStatus === 'saved' && shouldShowSaved && (
                    <motion.div
                        key="saved"
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 20, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground px-2"
                    >
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Gespeichert</span>
                    </motion.div>
                )}

                {displayStatus === 'unsaved' && (
                    <motion.div
                        key="unsaved"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground px-2"
                    >
                        <div className="h-2 w-2 rounded-full bg-yellow-500" />
                        <span>Ungespeichert</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
