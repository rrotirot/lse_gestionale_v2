"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import AdminDiscordPage from "@/views/AdminDiscordPage";

export default function AdminDiscordRoute() {
  const router = useRouter();
  const { isAuthenticated, loading, user, logout, updateUser, isUserVerified } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.replace("/login");
      } else if (!isUserVerified()) {
        router.replace("/");
      }
    }
  }, [isAuthenticated, loading, isUserVerified, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isUserVerified()) {
    return null;
  }

  return (
    <AdminDiscordPage
      user={user}
      onLogout={logout}
      onUpdateUser={updateUser}
      onNavigateToHome={() => router.push("/")}
    />
  );
}

