import React from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string;
    strokeWidth?: number;
}

const DefaultIcon = ({
    size = 24,
    strokeWidth = 2,
    className,
    children,
    ...props
}: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
    >
        {children}
    </svg>
);

export const LayoutFullIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <rect width="18" height="18" x="3" y="3" rx="2" />
    </DefaultIcon>
);

export const LayoutHalfIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M12 3v18" />
    </DefaultIcon>
);

export const LayoutThirdIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M9 3v18" />
        <path d="M15 3v18" />
    </DefaultIcon>
);

export const LayoutQuarterIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M7.5 3v18" />
        <path d="M12 3v18" />
        <path d="M16.5 3v18" />
    </DefaultIcon>
);

export const LayoutLeftSidebarIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M9 3v18" />
    </DefaultIcon>
);

export const LayoutRightSidebarIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M15 3v18" />
    </DefaultIcon>
);

export const LayoutLeftSidebarQuarterIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M7.5 3v18" />
    </DefaultIcon>
);

export const LayoutRightSidebarQuarterIcon = (props: IconProps) => (
    <DefaultIcon {...props}>
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M16.5 3v18" />
    </DefaultIcon>
);
