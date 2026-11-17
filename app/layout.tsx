import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ConvexClientProvider } from "./convex-client-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rothe — the lesson, signed for all of us",
  description:
    "Rothe (Tshivenda: 'all of us') listens to the teacher and signs the lesson in the learner's own sign language: South African, Nigerian, Kenyan and more.",
  applicationName: "Rothe",
  appleWebApp: { capable: true, title: "Rothe", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0b0d",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-[#0a0b0d] text-white selection:bg-emerald-400/30">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
