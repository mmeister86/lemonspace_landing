import React from "react";
import { cn } from "@/lib/utils";

interface ResizeHandleProps {
    onMouseDown: (e: React.MouseEvent) => void;
    className?: string;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({ onMouseDown, className }) => {
    return (
        <div
            className={cn(
                // Positioning and size
                "absolute -right-2 top-0 bottom-0 w-4 z-10",
                // Cursor
                "cursor-col-resize",
                // Visual feedback
                "group",
                className
            )}
            onMouseDown={onMouseDown}
        >
            {/* Visual indicator - centered pill shape */}
            <div
                className={cn(
                    "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
                    "w-1.5 h-12 rounded-full",
                    "bg-muted-foreground/30",
                    "group-hover:bg-primary group-hover:scale-110",
                    "transition-all duration-200"
                )}
            />
        </div>
    );
};
