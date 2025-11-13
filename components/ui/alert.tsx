import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive:
          "text-destructive bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      {...props}
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
    />
  );
}

type AlertTitleProps<T extends React.ElementType = "h5"> = {
  as?: T;
} & Omit<React.ComponentPropsWithoutRef<T>, "as">;

const AlertTitleInner = React.forwardRef<
  HTMLElement,
  AlertTitleProps<React.ElementType>
>(function AlertTitleInner({ as, className, ...props }, ref) {
  const Component = (as || "h5") as React.ElementType;
  return (
    <Component
      {...(props as React.ComponentPropsWithoutRef<React.ElementType>)}
      ref={ref as React.Ref<HTMLElement>}
      data-slot="alert-title"
      className={cn(
        "col-start-2 min-h-4 font-medium tracking-tight",
        className
      )}
    />
  );
});

AlertTitleInner.displayName = "AlertTitle";

const AlertTitle = AlertTitleInner as <T extends React.ElementType = "h5">(
  props: AlertTitleProps<T> & { ref?: React.ComponentPropsWithRef<T>["ref"] }
) => React.ReactElement;

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      {...props}
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className
      )}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
