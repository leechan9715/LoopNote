"use client";

import { useEffect, useState, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Typography } from "@/components/common";
import { useAuth } from "@/hooks/useAuth";
import { createBrowserSupabaseClient } from "@/services/supabase";
import { getStudentSummary } from "@/services/data";
import type { StudentSummary } from "@/services/data";

const navigationItems = [
  { href: "/", label: "홈 / 대시보드", icon: "🏠" },
  { href: "/wrong-notes", label: "오답 스캔", icon: "📸" },
  { href: "/missions", label: "미션 목록", icon: "🎯" },
  { href: "/report", label: "학습 리포트", icon: "📊" },
];

interface StudentLayoutProps {
  children: ReactNode;
}

function InfinityLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg className={`${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 1 0 0-8c-2 0-4 1.33-6 4Z" />
    </svg>
  );
}

export default function StudentLayout({ children }: StudentLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user, isAuthenticated } = useAuth();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  
  const [summary, setSummary] = useState<StudentSummary | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  const studentName = user?.user_metadata?.full_name || "지우";
  const studentGrade = "초등 4학년";

  // Fetch student summary dynamically if authenticated
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setSummary(null);
      return;
    }

    let isMounted = true;
    const fetchSummary = async () => {
      try {
        const data = await getStudentSummary(supabase, user.id);
        if (isMounted) {
          setSummary(data);
        }
      } catch (err) {
        console.error("Failed to load student summary in layout:", err);
      }
    };

    void fetchSummary();
    // Refresh periodically or on path change
    const interval = setInterval(fetchSummary, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [supabase, user?.id, isAuthenticated, pathname]);

  // Handle mobile top header collapsible scroll behavior
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > 60 && currentScrollY > lastScrollY) {
        setIsHeaderCollapsed(true);
      } else {
        setIsHeaderCollapsed(false);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const handleLogoutClick = async () => {
    await logout();
    setIsMobileMenuOpen(false);
    router.push("/login");
  };

  const energyLevel = summary?.totalEnergy ?? 84;
  const todayMissionsCompleted = summary?.todayCompletedMissions ?? 0;

  return (
    <section className="min-h-screen bg-[#f8fafc] text-[#0f172a] flex">
      {/* ========================================================================= */}
      {/* DESKTOP FIXED LEFT SIDEBAR                                                */}
      {/* ========================================================================= */}
      <aside className="hidden lg:flex flex-col w-72 h-screen bg-[#064e52] text-white fixed left-0 top-0 z-30 p-6 border-r border-[#00363a] shadow-2xl justify-between">
        <div className="flex flex-col gap-8">
          {/* White/Lime Premium Logo */}
          <Link
            className="flex items-center gap-3 rounded-2xl p-2 hover:bg-white/5 transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b5e61d]"
            href="/"
          >
            <div className="p-2 rounded-xl bg-white/10 flex items-center justify-center">
              <InfinityLogo className="h-7 w-7 text-[#b5e61d]" />
            </div>
            <div>
              <Typography as="span" className="font-extrabold text-white text-lg tracking-wider" variant="h2">
                루프노트
              </Typography>
              <span className="block text-[10px] font-black text-[#b5e61d] uppercase tracking-widest mt-0.5">
                STUDENT PORTAL
              </span>
            </div>
          </Link>

          {/* Student Profile Details */}
          <div className="flex flex-col gap-3 bg-white/5 rounded-2xl p-4 border border-white/10 relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 opacity-5 pointer-events-none">
              <InfinityLogo className="w-24 h-24 text-white" />
            </div>
            
            <div className="flex items-center gap-3 relative z-10">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#b5e61d] text-[#064e52] text-lg font-black shadow-md">
                {studentName[0] || "지"}
              </span>
              <div className="min-w-0">
                <span className="block text-sm font-extrabold text-white truncate">{studentName} 학생</span>
                <span className="block text-xs font-bold text-teal-200/70 mt-0.5">{studentGrade}</span>
              </div>
            </div>

            {/* Energy Level Widget */}
            <div className="mt-2 bg-black/20 rounded-xl p-2.5 border border-white/5">
              <div className="flex justify-between items-center mb-1 text-[11px] font-bold text-teal-100">
                <span className="flex items-center gap-1">⚡ 회복 에너지</span>
                <span className="text-[#b5e61d] font-black">{energyLevel} EP</span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#b5e61d] h-full rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${Math.min(100, (energyLevel / 200) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav aria-label="학생 데스크톱 메뉴" className="mt-2">
            <ul className="flex flex-col gap-1.5">
              {navigationItems.map((item) => {
                const isActive =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      className={[
                        "flex min-h-12 items-center gap-3.5 rounded-2xl px-4 text-sm font-extrabold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b5e61d]",
                        isActive
                          ? "bg-[#0d6e73] text-[#b5e61d] border border-white/10 shadow-md shadow-black/10"
                          : "text-teal-100/70 hover:bg-white/5 hover:text-white",
                      ].join(" ")}
                      href={item.href}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Desktop Sidebar Bottom Widgets & Logout */}
        <div className="flex flex-col gap-4">
          {/* Progress Summary Widget */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 text-6xl opacity-10 pointer-events-none">🌱</div>
            <div className="text-xs font-bold text-teal-200/90 leading-relaxed relative z-10">
              <span className="block text-xs font-black text-[#b5e61d] mb-1">오늘의 학습 현황</span>
              <p className="text-white text-sm font-extrabold mb-2">
                미션 <span className="text-[#b5e61d]">{todayMissionsCompleted}</span>개 회복 완료!
              </p>
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-[#b5e61d] h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (todayMissionsCompleted / 3) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Logout Button */}
          {isAuthenticated && (
            <button
              className="flex items-center gap-3 w-full min-h-11 px-4 rounded-xl text-xs font-extrabold text-teal-200/50 hover:bg-rose-500/10 hover:text-rose-200 transition text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              onClick={handleLogoutClick}
              type="button"
            >
              <span className="text-sm">🚪</span>
              <span>로그아웃</span>
            </button>
          )}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* RESPONSIVE MAIN CONTAINER                                                 */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col lg:ml-72 min-w-0">
        {/* Mobile Collapsible Top Header */}
        <header 
          className={`sticky top-0 z-20 flex lg:hidden items-center justify-between border-b border-slate-200/60 bg-white/95 px-5 py-3.5 backdrop-blur shadow-sm transition-transform duration-300 ${
            isHeaderCollapsed ? "-translate-y-full" : "translate-y-0"
          }`}
        >
          <Link className="flex items-center gap-2" href="/">
            <div className="p-1.5 rounded-lg bg-[#064e52] flex items-center justify-center">
              <InfinityLogo className="h-5 w-5 text-[#b5e61d]" />
            </div>
            <Typography as="span" className="font-extrabold text-[#064e52] text-sm tracking-wider">
              LoopNote
            </Typography>
          </Link>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="text-xs font-extrabold bg-[#064e52]/5 hover:bg-[#064e52]/10 text-[#064e52] rounded-full px-3 py-1.5 transition flex items-center gap-1.5 border border-[#064e52]/10"
            >
              <span>{studentName} 학생</span>
              <span className="text-[10px]">⚡ {energyLevel}</span>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 px-4 py-5 lg:p-8 pb-24 lg:pb-8 max-w-5xl w-full mx-auto">
          {children}
        </main>

        {/* Mobile Collapsible Bottom Navigation Bar */}
        <nav
          aria-label="학생 모바일 메뉴"
          className="fixed bottom-0 left-0 w-full z-20 border-t border-slate-200/60 bg-white px-4 pb-4 pt-2.5 shadow-[0_-10px_25px_rgba(6,78,82,0.06)] lg:hidden"
        >
          <ul className="grid grid-cols-5 gap-1">
            {navigationItems.map((item) => {
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Link
                    aria-label={item.label}
                    className={[
                      "flex min-h-12 flex-col items-center justify-center rounded-xl px-1 text-[10px] font-bold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064e52]/20",
                      isActive
                        ? "bg-[#064e52]/5 text-[#064e52] shadow-sm font-extrabold"
                        : "text-slate-500 hover:bg-slate-50",
                    ].join(" ")}
                    href={item.href}
                  >
                    <span className="text-base mb-1">{item.icon}</span>
                    <span>{item.label.split(" ")[0]}</span>
                  </Link>
                </li>
              );
            })}
            
            {/* Drawer trigger button on bottom bar */}
            <li>
              <button
                aria-label="더보기"
                onClick={() => setIsMobileMenuOpen(true)}
                className="flex min-h-12 w-full flex-col items-center justify-center rounded-xl px-1 text-[10px] font-bold text-slate-500 hover:bg-slate-50 transition duration-200"
              >
                <span className="text-base mb-1">🍔</span>
                <span>더보기</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE BOTTOM NAVIGATION DRAWER                                           */}
      {/* ========================================================================= */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-[#00363a]/40 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Drawer content */}
          <div className="absolute bottom-0 left-0 w-full bg-white rounded-t-3xl border-t border-[#064e52]/10 shadow-[0_-15px_30px_rgba(0,0,0,0.15)] max-h-[85vh] overflow-y-auto flex flex-col p-6 transition-transform duration-300 ease-out transform translate-y-0">
            {/* Handle bar */}
            <div className="w-12 bg-slate-300 h-1.5 rounded-full mx-auto mb-5" onClick={() => setIsMobileMenuOpen(false)} />
            
            {/* Student metadata */}
            <div className="flex items-center gap-4 bg-[#064e52]/5 rounded-2xl p-4 border border-[#064e52]/10 mb-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#b5e61d] text-[#064e52] text-lg font-black shadow-sm">
                {studentName[0] || "지"}
              </span>
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold text-[#064e52] truncate">{studentName} 학생</span>
                <span className="block text-xs font-bold text-slate-500 mt-0.5">{studentGrade}</span>
              </div>
              <div className="bg-[#064e52] text-white rounded-xl px-3 py-2 text-center min-w-20">
                <span className="block text-[9px] font-bold text-teal-200 uppercase tracking-widest leading-none mb-1">ENERGY</span>
                <span className="text-xs font-extrabold text-[#b5e61d]">{energyLevel} EP</span>
              </div>
            </div>

            {/* Menu List */}
            <Typography as="h3" variant="caption" className="text-slate-400 font-extrabold uppercase tracking-wider mb-2.5">
              메뉴 목록
            </Typography>
            <ul className="flex flex-col gap-2 mb-6">
              {navigationItems.map((item) => {
                const isActive =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      className={[
                        "flex min-h-12 items-center gap-3.5 rounded-xl px-4 text-sm font-extrabold transition duration-200",
                        isActive
                          ? "bg-[#064e52] text-[#b5e61d] border border-[#064e52]/15 shadow-sm"
                          : "text-slate-700 hover:bg-slate-50",
                      ].join(" ")}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Widgets & Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                <span className="block text-[10px] font-extrabold text-slate-400 mb-1">오늘 회복 미션</span>
                <span className="text-sm font-black text-slate-800">{todayMissionsCompleted}개 완료</span>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                <span className="block text-[10px] font-extrabold text-slate-400 mb-1">목표 달성률</span>
                <span className="text-sm font-black text-slate-800">{Math.round((todayMissionsCompleted / 3) * 100)}%</span>
              </div>
            </div>

            {/* Logout button */}
            {isAuthenticated ? (
              <button
                className="w-full min-h-12 rounded-xl text-sm font-extrabold text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100 transition text-center mb-2"
                onClick={handleLogoutClick}
                type="button"
              >
                로그아웃
              </button>
            ) : (
              <Link
                className="w-full min-h-12 rounded-xl text-sm font-extrabold text-[#064e52] bg-[#b5e61d] hover:bg-[#b5e61d]/95 transition text-center flex items-center justify-center mb-2"
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                로그인하기
              </Link>
            )}

            <button
              className="w-full min-h-12 rounded-xl text-sm font-extrabold text-slate-500 bg-slate-100 hover:bg-slate-200/80 transition text-center"
              onClick={() => setIsMobileMenuOpen(false)}
              type="button"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
