'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { PlateElement } from 'platejs/react';
import type { PlateElementProps } from 'platejs/react';

export function LinkElement({
    className,
    children,
    ...props
}: PlateElementProps) {
    const { element } = props;

    return (
        <PlateElement
            as="a"
            className={cn(
                'font-medium text-primary underline decoration-primary underline-offset-4',
                className
            )}
            {...props}
            // @ts-expect-error - dynamic props
            href={element.url}
            target={element.target}
            rel="noopener noreferrer"
        >
            {children}
        </PlateElement>
    );
}
