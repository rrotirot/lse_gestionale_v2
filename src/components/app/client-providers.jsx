"use client";

import ErrorBoundary from "@/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";
import { MembersProvider } from "@/context/MembersContext";
import { EventsProvider } from "@/context/EventsContext";

export default function ClientProviders({ children }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MembersProvider>
          <EventsProvider>{children}</EventsProvider>
        </MembersProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
