"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import AdminDiscordPage from "@/views/AdminDiscordPage";

export default function AdminDiscordRoute() {
  const router = useRouter();
  const { isAuthenticated, loading, user, logout, updateUser, isUserVerified } = useAuth();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    if (!loading) {
      // Se non autenticato, reindirizza al login
      if (!isAuthenticated) {
        console.log("🔐 Non autenticato, reindirizzamento a /login");
        router.replace("/login");
        return;
      }

      // Se non verificato (rank < 4), reindirizza alla home
      if (!isUserVerified()) {
        console.log("⚠️ Utente non verificato, reindirizzamento a /");
        router.replace("/");
        return;
      }

      // Se tutto è ok, mostra la pagina admin
      setHasCheckedAuth(true);
    }
  }, [isAuthenticated, loading, isUserVerified, router]);

  // Durante il caricamento iniziale
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Caricamento autenticazione...</p>
        </div>
      </div>
    );
  }

  // Se non autenticato o non verificato, mostra loader durante reindirizzamento
  if (!hasCheckedAuth || !isAuthenticated || !isUserVerified()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Verifica permessi...</p>
        </div>
      </div>
    );
  }

  // Utente autenticato e verificato - mostra admin
  return (
    <AdminDiscordPage
      user={user}
      onLogout={logout}
      onUpdateUser={updateUser}
      onNavigateToHome={() => router.push("/")}
    />
  );
}

