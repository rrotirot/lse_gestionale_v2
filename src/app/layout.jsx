import ClientProviders from "@/components/app/client-providers";
import "@/index.css";

export const metadata = {
  title: "GESTIONALE LSE",
  description: "Sistema di gestione membri per Logistic Space Economy",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it" className="dark">
      <body className="bg-gray-50 dark:bg-gray-900">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
