"use client";

import { UserProvider } from "@/lib/contexts/user-context";

export function UserProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <UserProvider>{children}</UserProvider>;
}


