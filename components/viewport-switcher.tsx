"use client";

import { Button } from "@/components/ui/button";
import { Monitor, Tablet, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewportSize = "desktop" | "tablet" | "mobile";

interface ViewportSwitcherProps {
  currentViewport: ViewportSize;
  onViewportChange: (viewport: ViewportSize) => void;
  className?: string;
}

const viewportConfig = {
  desktop: {
    icon: Monitor,
    label: "Desktop",
    width: "100%",
    maxWidth: "1200px",
  },
  tablet: {
    icon: Tablet,
    label: "Tablet",
    width: "768px",
    maxWidth: "768px",
  },
  mobile: {
    icon: Smartphone,
    label: "Mobile",
    width: "375px",
    maxWidth: "375px",
  },
};

export function ViewportSwitcher({
  currentViewport,
  onViewportChange,
  className,
}: ViewportSwitcherProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span className="text-sm text-muted-foreground mr-2 hidden sm:inline">
        Viewport:
      </span>
      {Object.entries(viewportConfig).map(([viewport, config]) => {
        const Icon = config.icon;
        const isActive = currentViewport === viewport;

        return (
          <Button
            key={viewport}
            variant={isActive ? "default" : "ghost"}
            size="icon-sm"
            onClick={() => onViewportChange(viewport as ViewportSize)}
            className={cn(
              "h-8 w-8 cursor-pointer",
              isActive && "bg-primary text-primary-foreground"
            )}
            title={`Switch to ${config.label} view`}
            aria-pressed={isActive}
          >
            <Icon className="h-4 w-4" />
            <span className="sr-only">{config.label} viewport</span>
          </Button>
        );
      })}
    </div>
  );
}

export { viewportConfig };
