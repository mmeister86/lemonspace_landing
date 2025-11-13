import type { ReactNode } from "react";
import { UserProviderWrapper } from "./components/UserProviderWrapper";
import { QueryProvider } from "./components/QueryProvider";

export default function BuilderLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <UserProviderWrapper>
      <QueryProvider>{children}</QueryProvider>
    </UserProviderWrapper>
  );
}
