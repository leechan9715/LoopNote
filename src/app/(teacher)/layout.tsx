"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const navigationItems = [
  { href: "/teacher", label: "대시보드", icon: "dashboard" },
  { href: "/teacher/students", label: "학생 관리", icon: "students" },
  { href: "/teacher/reports", label: "클래스 리포트", icon: "reports" },
  { href: "/teacher/settings", label: "설정", icon: "settings" },
];

interface TeacherLayoutProps {
  children: ReactNode;
}

function InfinityLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg className={`${className} text-brand-lime`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 1 0 0-8c-2 0-4 1.33-6 4Z" />
    </svg>
  );
}

function NavIcon({ type, className = "h-5 w-5" }: { type: string; className?: string }) {
  switch (type) {
    case "dashboard":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      );
    case "students":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    case "reports":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case "settings":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function TeacherLayout({ children }: TeacherLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();

  const handleLogoutClick = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const teacherName = user?.user_metadata?.full_name || "김선생";

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex">
      {/* ========================================================================= */}
      {/* DESKTOP SIDEBAR                                                           */}
      {/* ========================================================================= */}
      <aside className="hidden lg:flex flex-col w-72 h-screen bg-brand-teal-dark text-white fixed left-0 top-0 z-30 p-6 border-r border-brand-teal-dark shadow-2xl justify-between">
        <div className="flex flex-col gap-8">
          {/* Logo */}
          <Link
            className="flex items-center gap-3 rounded-2xl p-2 hover:bg-white/5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime"
            href="/teacher"
          >
            <InfinityLogo className="h-9 w-9" />
            <div>
              <span className="block font-black text-white text-xl tracking-wider">
                LoopNote
              </span>
              <span className="block text-[10px] font-black text-brand-lime uppercase tracking-widest mt-0.5">
                TEACHER PORTAL
              </span>
            </div>
          </Link>

          {/* User Profile Summary */}
          <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-4 border border-white/10">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-lime text-brand-teal-dark text-lg font-black shadow-inner">
              {teacherName[0] || "김"}
            </span>
            <div className="min-w-0">
              <span className="block text-sm font-black text-white truncate">{teacherName} 교사</span>
              <span className="block text-[11px] font-bold text-teal-200/70 mt-0.5">서초초등학교 5학년</span>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav aria-label="교사 데스크톱 메뉴" className="mt-2">
            <ul className="flex flex-col gap-2">
              {navigationItems.map((item) => {
                // Active logic: active if exact or subpath matches
                const isActive =
                  item.href === "/teacher"
                    ? pathname === "/teacher" || pathname === "/teacher/"
                    : pathname.startsWith(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      className={[
                        "group flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-extrabold transition relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime",
                        isActive
                          ? "bg-brand-teal text-brand-lime border-l-4 border-brand-lime pl-3 shadow-md shadow-brand-teal-dark/30"
                          : "text-teal-100/70 hover:bg-white/5 hover:text-white border-l-4 border-transparent pl-3",
                      ].join(" ")}
                      href={item.href}
                    >
                      <NavIcon
                        type={item.icon}
                        className={[
                          "h-5 w-5 transition-colors duration-150",
                          isActive ? "text-brand-lime" : "text-teal-200/50 group-hover:text-white",
                        ].join(" ")}
                      />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Sidebar Bottom Card & Logout */}
        <div className="flex flex-col gap-4">
          {/* Quick Info Card: 교사 지원 센터 */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 relative overflow-hidden shadow-inner">
            <div className="relative z-10 flex flex-col gap-1.5">
              <span className="block text-xs font-black text-brand-lime uppercase tracking-wider">
                SUPPORT CENTER
              </span>
              <span className="block text-sm font-black text-white">
                교사 지원 센터
              </span>
              <div className="text-xs font-semibold text-teal-200/90 leading-relaxed space-y-1">
                <p className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold text-brand-lime bg-white/5 border border-white/10 px-1 rounded uppercase tracking-wider">Tel</span>
                  <span>직통 핫라인: 1544-3298</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold text-brand-lime bg-white/5 border border-white/10 px-1 rounded uppercase tracking-wider">Chat</span>
                  <span>1:1 Q&A (24시간 접수)</span>
                </p>
                <p className="text-[10px] text-teal-300/60 mt-1">
                  운영: 평일 09:00 ~ 18:00
                </p>
              </div>
            </div>
            <svg className="absolute right-2 -bottom-4 w-12 h-12 opacity-10 pointer-events-none select-none animate-float text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
          </div>

          {/* Logout Button */}
          <button
            className="flex items-center gap-3 w-full min-h-12 px-4 rounded-xl text-sm font-extrabold text-teal-200/70 hover:bg-rose-500/10 hover:text-rose-200 transition text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            onClick={handleLogoutClick}
            type="button"
          >
            <svg className="h-5 w-5 text-teal-200/50 group-hover:text-rose-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>로그아웃</span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* RESPONSIVE MAIN CONTAINER                                                 */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col lg:ml-72 min-w-0">
        {/* Mobile Header */}
        <header className="sticky top-0 z-20 flex lg:hidden items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur shadow-sm">
          <Link className="flex items-center gap-2" href="/teacher">
            <InfinityLogo className="h-7 w-7" />
            <span className="font-black text-brand-teal text-md tracking-wider">
              LoopNote
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs font-black bg-brand-teal text-white rounded-full px-3 py-1">
              {teacherName} 선생님
            </span>
            <button
              onClick={handleLogoutClick}
              className="text-slate-500 hover:text-rose-600 transition"
              title="로그아웃"
              type="button"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10 pb-28 lg:pb-12 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav
          aria-label="교사 모바일 메뉴"
          className="fixed bottom-0 left-0 w-full z-20 border-t border-slate-200 bg-white px-4 pb-4 pt-3 shadow-[0_-12px_30px_rgba(6,78,82,0.06)] lg:hidden"
        >
          <ul className="grid grid-cols-4 gap-2">
            {navigationItems.map((item) => {
              const isActive =
                item.href === "/teacher"
                  ? pathname === "/teacher" || pathname === "/teacher/"
                  : pathname.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Link
                    aria-label={item.label}
                    className={[
                      "flex min-h-14 flex-col items-center justify-center rounded-xl border px-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-teal/20",
                      isActive
                        ? "border-brand-teal/30 bg-brand-teal/5 text-brand-teal shadow-sm"
                        : "border-transparent text-slate-500 hover:border-slate-100 hover:bg-slate-50",
                    ].join(" ")}
                    href={item.href}
                  >
                    <NavIcon
                      type={item.icon}
                      className={[
                        "h-5 w-5 mb-1 transition-colors duration-150",
                        isActive ? "text-brand-teal" : "text-slate-400",
                      ].join(" ")}
                    />
                    <span className="text-[10px] font-extrabold">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
