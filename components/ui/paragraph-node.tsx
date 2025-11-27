"use client";

import * as React from "react";

import type { PlateElementProps } from "platejs/react";

import { PlateElement } from "platejs/react";

import { cn } from "@/lib/utils";

export function ParagraphElement(props: PlateElementProps) {
  const { className, style, element, children, ...rest } = props;
  const indentLevel = (element as { indent?: number })?.indent || 0;

  return (
    <PlateElement
      {...rest}
      element={element}
      className={cn("m-0 px-0 py-1", className)}
      style={{
        ...(style || {}),
        paddingLeft:
          (style as React.CSSProperties | undefined)?.paddingLeft ??
          (indentLevel > 0 ? `${indentLevel * 24}px` : undefined),
      }}
    >
      {children}
    </PlateElement>
  );
}
