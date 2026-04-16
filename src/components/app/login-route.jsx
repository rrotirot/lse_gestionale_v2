"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import LoginPage from "@/views/LoginPage";

export default function LoginRoute() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, loading, router]);

  if (!loading && isAuthenticated) {
    return null;
  }

  return <LoginPage />;
}
