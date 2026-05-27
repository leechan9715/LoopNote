import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 antialiased">
      {children}
    </div>
  );
}
