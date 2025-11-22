import React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ResizeHandleProps {
    className?: string;
    // onMouseDown is no longer strictly needed if used inside PanelResizeHandle,
    // but we keep it optional for backward compatibility or other uses
    onMouseDown?: (e: React.MouseEvent) => void;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({ onMouseDown, className }) => {
    return (
        <div
            className={cn(
                "flex items-center justify-center h-full w-full group",
                className
            )}
            onMouseDown={onMouseDown}
        >
            <div className={cn(
                "flex items-center justify-center transition-all duration-200",
                "opacity-50 group-hover:opacity-100"
            )}>
                <ChevronLeft className={cn(
                    "w-3 h-3 text-muted-foreground",
                    "opacity-0 -mr-1 transition-all duration-200",
                    "group-hover:opacity-100 group-hover:-translate-x-0.5"
                )} />

                {/* Visual indicator - centered pill shape */}
                <div
                    className={cn(
                        "w-1.5 h-8 rounded-full mx-0.5",
                        "bg-muted-foreground/30",
                        "group-hover:bg-primary group-hover:scale-y-110",
                        "transition-all duration-200"
                    )}
                />

                <ChevronRight className={cn(
                    "w-3 h-3 text-muted-foreground",
                    "opacity-0 -ml-1 transition-all duration-200",
                    "group-hover:opacity-100 group-hover:translate-x-0.5"
                )} />
            </div>
        </div>
    );
};
