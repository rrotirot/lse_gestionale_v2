export function getApiBaseUrl() {
  // Server-side (SSR, Server Components, Route Handlers)
  // Usa il DNS interno del cluster, BACKEND_URL non è mai visibile al browser
  if (typeof window === "undefined") {
    return process.env.BACKEND_URL ?? "http://localhost:5000";
  }

  // Client-side (browser)
  // NEXT_PUBLIC_RSI_API_URL è "" in produzione → URL relativo → Traefik instrada
  // NEXT_PUBLIC_RSI_API_URL è "http://localhost:5000" in sviluppo locale
  // undefined significa che il dev non ha configurato nulla → fallback locale
  const envUrl = process.env.NEXT_PUBLIC_RSI_API_URL;
  if (envUrl !== undefined) {
    return envUrl.trim(); // "" in prod è valido e corretto
  }

  // Override manuale da localStorage (utile solo in sviluppo)
  if (process.env.NODE_ENV !== "production") {
    const savedUrl = window.localStorage.getItem("rsi_api_url")?.trim();
    if (savedUrl) return savedUrl;
  }

  return "http://localhost:5000";
}

export function getStoredAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    window.localStorage.getItem("authToken") ||
    window.sessionStorage.getItem("authToken")
  );
}

export function getStoredRememberMe() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem("rememberMe");
}
