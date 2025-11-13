"use client";

import { UserProvider } from "@/app/lib/user-context";

export function UserProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <UserProvider>{children}</UserProvider>;
}


