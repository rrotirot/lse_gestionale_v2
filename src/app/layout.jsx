import ClientProviders from "@/components/app/client-providers";
import "@/index.css";

const isDevEnv = process.env.NODE_ENV === 'development';

export const metadata = {
  title: isDevEnv ? "GESTIONALE LSE - DEV -" : "GESTIONALE LSE",
  description: "Sistema di gestione membri per Logistic Space Economy",
};

export default function RootLayout({ children }) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="it" className="dark">
      <body className="bg-gray-50 dark:bg-gray-900">
        {isDev && (
          <div className="bg-red-600 text-white text-center py-1 font-bold tracking-widest text-sm relative z-[9999] shadow-md border-b border-red-800">
            ⚠️ DEV VERSION - AMBIENTE DI SVILUPPO (LOCALE) ⚠️
          </div>
        )}
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
