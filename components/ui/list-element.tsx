'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { PlateElement } from 'platejs/react';
import type { PlateElementProps } from 'platejs/react';

export function ListElement({
    className,
    children,
    variant = 'ul',
    ...props
}: PlateElementProps & { variant?: 'ul' | 'ol' }) {
    return (
        <PlateElement
            as={variant}
            className={cn(
                'm-0 ps-6',
                variant === 'ul' && 'list-disc',
                variant === 'ol' && 'list-decimal',
                className
            )}
            {...props}
        >
            {children}
        </PlateElement>
    );
}

export function ListItemElement({
    className,
    children,
    ...props
}: PlateElementProps) {
    return (
        <PlateElement as="li" className={cn('m-0 px-0 py-1', className)} {...props}>
            {children}
        </PlateElement>
    );
}
