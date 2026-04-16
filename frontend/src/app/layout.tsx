import type { Metadata } from "next";
import "./globals.css";

const themeInitializer = `
  try {
    const savedTheme = localStorage.getItem("singular-platform-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = savedTheme === "dark" || savedTheme === "light"
      ? savedTheme
      : prefersDark
        ? "dark"
        : "light";
    document.documentElement.dataset.theme = theme;
  } catch {}
`;

export const metadata: Metadata = {
  title: "Singular Platform",
  description: "Login demo and trustworthiness workspace."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInitializer }} />
        {children}
      </body>
    </html>
  );
}
