import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { AuthProvider } from "@/lib/authContext";
import { Providers } from "./providers";

export const metadata: Metadata = {
  
  description: "ສັງລວມບັນຫາ ກ່ຽວກັບແອັບ Sokxay One Plus",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lo">
      <body>
        <AuthProvider>
          <Providers>
            <AppShell>{children}</AppShell>
          </Providers>
        </AuthProvider>
      </body>
    </html>
  );
}
