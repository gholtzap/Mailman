import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mailman",
  description: "Process and summarize arXiv papers with Claude AI",
  icons: {
    icon: [
      { url: '/mailman-logo.png' },
      { url: '/favicon.png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: '#a51c30',
          colorBackground: '#16181f',
          colorInputBackground: '#0f1117',
          colorInputText: '#e6e8eb',
          colorText: '#e6e8eb',
          colorTextSecondary: '#9ca3af',
          colorTextOnPrimaryBackground: '#e6e8eb',
          colorDanger: '#ef4444',
          colorSuccess: '#10b981',
          colorWarning: '#f59e0b',
          borderRadius: '6px',
          fontFamily: 'var(--font-geist-sans)',
          fontSize: '14px',
        },
        elements: {
          card: 'bg-[#16181f] border border-[rgba(255,255,255,0.08)] shadow-none',
          headerTitle: 'text-[#e6e8eb] text-xl font-semibold',
          headerSubtitle: 'text-[#9ca3af] text-sm',
          socialButtonsBlockButton: 'border border-[rgba(255,255,255,0.08)] bg-[#1c1f28] hover:bg-[#22252e] text-[#e6e8eb] [&>span]:text-[#e6e8eb]',
          socialButtonsBlockButtonText: 'text-[#e6e8eb]',
          formFieldLabel: 'text-[#e6e8eb] text-sm font-medium',
          formFieldInput: 'bg-[#0f1117] border border-[rgba(255,255,255,0.08)] text-[#e6e8eb] focus:border-[#a51c30]',
          formButtonPrimary: 'bg-[#a51c30] hover:bg-[#c42136] text-[#e6e8eb] shadow-none',
          footerActionLink: 'text-[#a51c30] hover:text-[#c42136]',
          identityPreviewText: 'text-[#e6e8eb]',
          identityPreviewEditButton: 'text-[#9ca3af] hover:text-[#e6e8eb]',
          formResendCodeLink: 'text-[#a51c30] hover:text-[#c42136]',
          otpCodeFieldInput: 'border border-[rgba(255,255,255,0.08)] bg-[#0f1117] text-[#e6e8eb]',
          alertText: 'text-[#9ca3af] text-sm',
          dividerLine: 'bg-[rgba(255,255,255,0.08)]',
          dividerText: 'text-[#6b7280]',
        },
      }}
    >
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
