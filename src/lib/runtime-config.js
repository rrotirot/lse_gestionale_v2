export function getApiBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_RSI_API_URL?.trim();
  if (envUrl) {
    return envUrl;
  }

  if (typeof window !== "undefined") {
    const savedUrl = window.localStorage.getItem("rsi_api_url")?.trim();
    if (savedUrl) {
      return savedUrl;
    }
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
