"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Button, Typography } from "@/components/common";
import { useAuth } from "@/hooks/useAuth";
import { getParentChildren, type ParentChildProfile } from "@/services/data";
import { createBrowserSupabaseClient } from "@/services/supabase";

const navigationItems = [
  { href: "/parent", label: "홈 / 성장 리포트", icon: "home" },
  { href: "/parent/children", label: "자녀 관리", icon: "children" },
  { href: "/parent/billing", label: "구독 관리", icon: "billing" },
  { href: "/settings", label: "계정 설정", icon: "settings" },
];

interface ParentLayoutProps {
  children: ReactNode;
}

function NavIcon({ type, className = "h-5 w-5" }: { type: string; className?: string }) {
  switch (type) {
    case "home":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    case "children":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    case "billing":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      );
    case "settings":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case "logout":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      );
    default:
      return null;
  }
}

function InfinityLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg className={`${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 1 0 0-8c-2 0-4 1.33-6 4Z" />
    </svg>
  );
}

export default function ParentLayout({ children }: ParentLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [childrenList, setChildrenList] = useState<ParentChildProfile[]>([]);
  const [isChildrenLoading, setIsChildrenLoading] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  // Default active child is "지우" (초등 4학년)
  const [activeChild, setActiveChild] = useState({
    id: "jiwoo-mock-id",
    name: "지우",
    grade: "초등 4학년",
  });

  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;
    const loadChildren = async () => {
      setIsChildrenLoading(true);
      try {
        const nextChildren = await getParentChildren(supabase, user.id);
        if (isMounted) {
          setChildrenList(nextChildren);
          // If children exist in database, we can update or merge,
          // but we ensure "지우" is present or we have a fully active profile.
          if (nextChildren.length > 0) {
            const firstChild = nextChildren[0];
            // Check if firstChild is named 지우 to retain grade info
            setActiveChild({
              id: firstChild.id,
              name: firstChild.name,
              grade: firstChild.name === "지우" ? "초등 4학년" : "자녀 계정",
            });
          }
        }
      } catch (error) {
        console.error("Failed to load parent sidebar children:", error);
      } finally {
        if (isMounted) {
          setIsChildrenLoading(false);
        }
      }
    };

    void loadChildren();
    return () => {
      isMounted = false;
    };
  }, [supabase, user?.id]);

  const handleLogoutClick = async () => {
    await logout();
    router.push("/login");
  };

  const parentName = user?.user_metadata?.full_name || "김루프";

  // Fallback to "지우" if database returns nothing
  const displayChildren = childrenList.length > 0 
    ? childrenList 
    : [{ id: "jiwoo-mock-id", name: "지우", createdAt: new Date().toISOString() }];

  const handleSelectChild = (child: { id: string; name: string }) => {
    setActiveChild({
      id: child.id,
      name: child.name,
      grade: child.name === "지우" ? "초등 4학년" : "자녀 계정",
    });
    setIsSwitcherOpen(false);
  };

  return (
    <section className="min-h-screen bg-[#f8fafc] text-slate-900 flex">
      {/* ========================================================================= */}
      {/* DESKTOP SIDEBAR (Premium Dark Teal `#064e52` Rebranded)                  */}
      {/* ========================================================================= */}
      <aside className="hidden lg:flex flex-col w-72 h-screen bg-[#064e52] fixed left-0 top-0 z-30 p-6 border-r border-teal-800/40 shadow-xl justify-between text-white">
        <div className="flex flex-col gap-6 overflow-y-auto max-h-[calc(100vh-100px)]">
          
          {/* Logo */}
          <Link
            className="flex items-center gap-3 rounded-2xl p-2 hover:bg-teal-900/50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b5e61d]"
            href="/parent"
          >
            <InfinityLogo className="h-9 w-9 text-[#b5e61d] filter drop-shadow-[0_0_8px_rgba(181,230,29,0.3)]" />
            <div>
              <span className="block font-black text-white text-lg tracking-wider">
                루프노트
              </span>
              <span className="block text-[10px] font-black text-[#b5e61d] uppercase tracking-widest mt-0.5">
                PARENT PORTAL
              </span>
            </div>
          </Link>

          {/* User Profile Summary */}
          <div className="flex items-center gap-3 bg-teal-950/40 rounded-2xl p-3.5 border border-teal-800/50">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#b5e61d] text-teal-950 text-base font-black shadow-inner">
              {parentName[0] || "학"}
            </span>
            <div className="min-w-0">
              <span className="block text-sm font-black text-white truncate">{parentName} 학부모</span>
              <span className="block text-[11px] font-bold text-teal-200/70 mt-0.5">보호자 계정</span>
            </div>
          </div>

          {/* Premium Child Switcher Widget (Image 9 Concept) */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[11px] font-black text-teal-300 uppercase tracking-wider block px-1">
              학습 대상 자녀
            </span>
            
            <div className="relative">
              {/* Active Child Selector Button */}
              <button
                onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                className="w-full flex items-center justify-between bg-teal-950/60 rounded-2xl p-3 border border-teal-800/80 text-left hover:border-teal-700 transition focus:outline-none focus:ring-2 focus:ring-[#b5e61d]/50"
                type="button"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-[#b5e61d] to-emerald-400 text-teal-950 font-black text-sm shadow-md">
                    {activeChild.name[0]}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-black text-white truncate">{activeChild.name}</span>
                    <span className="block text-[10px] font-bold text-[#b5e61d]">{activeChild.grade}</span>
                  </div>
                </div>
                <svg className={`h-4 w-4 text-teal-300 transition-transform duration-200 ${isSwitcherOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isSwitcherOpen && (
                <>
                  {/* Backdrop for closing */}
                  <div className="fixed inset-0 z-40" onClick={() => setIsSwitcherOpen(false)} />
                  
                  <div className="absolute left-0 right-0 mt-2 z-50 rounded-2xl bg-teal-900 border border-teal-700/80 shadow-2xl p-2 flex flex-col gap-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-teal-300 uppercase tracking-wider">
                      자녀 계정 전환
                    </div>
                    
                    {displayChildren.map((child) => {
                      const isSelected = child.name === activeChild.name;
                      return (
                        <button
                          key={child.id}
                          onClick={() => handleSelectChild(child)}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition ${
                            isSelected 
                              ? "bg-teal-950/60 border border-teal-800" 
                              : "hover:bg-teal-800/50"
                          }`}
                          type="button"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                              isSelected ? "bg-[#b5e61d] text-teal-950" : "bg-teal-800 text-teal-200"
                            }`}>
                              {child.name[0]}
                            </div>
                            <div className="min-w-0">
                              <span className="block text-xs font-black text-white truncate">{child.name}</span>
                              <span className="block text-[9px] text-teal-300">
                                {child.name === "지우" ? "초등 4학년" : "자녀 계정"}
                              </span>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="h-2 w-2 rounded-full bg-[#b5e61d] mr-1" />
                          )}
                        </button>
                      );
                    })}

                    <div className="h-px bg-teal-800/80 my-1" />
                    
                    <Link
                      href="/parent/children"
                      onClick={() => setIsSwitcherOpen(false)}
                      className="flex items-center justify-center gap-1.5 py-2 text-xs font-black text-[#b5e61d] hover:bg-teal-800/40 rounded-xl transition"
                    >
                      <span>+ 아이 추가</span>
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* Always visible quick Link to child management below the selector */}
            <Link
              href="/parent/children"
              className="flex items-center justify-center min-h-10 border border-dashed border-teal-700/80 hover:border-teal-500 rounded-2xl text-xs font-black text-[#b5e61d] hover:bg-teal-900/30 transition mt-1"
            >
              + 아이 추가
            </Link>
          </div>

          {/* Navigation Menu */}
          <nav aria-label="학부모 데스크톱 메뉴" className="mt-2">
            <ul className="flex flex-col gap-1.5">
              {navigationItems.map((item) => {
                const isActive =
                  item.href === "/parent" ? pathname === "/parent" : pathname.startsWith(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      className={[
                        "flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b5e61d]",
                        isActive
                          ? "bg-teal-950/80 text-white border-l-4 border-[#b5e61d] pl-3 shadow-md"
                          : "text-teal-100/70 hover:bg-teal-900/40 hover:text-white",
                      ].join(" ")}
                      href={item.href}
                    >
                      <NavIcon type={item.icon} className={`h-5 w-5 ${isActive ? "text-[#b5e61d]" : "text-teal-200/50"}`} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Logout Button */}
        <button
          className="flex items-center gap-3 w-full min-h-12 px-4 rounded-2xl text-sm font-extrabold text-teal-300/80 hover:bg-rose-950/40 hover:text-rose-300 transition text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          onClick={handleLogoutClick}
          type="button"
        >
          <NavIcon type="logout" className="h-5 w-5 text-teal-300/80" />
          <span>로그아웃</span>
        </button>
      </aside>

      {/* ========================================================================= */}
      {/* RESPONSIVE MAIN CONTAINER (Styled background `#f8fafc`)                   */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col lg:ml-72 min-w-0">
        
        {/* Mobile Header (Deep Teal & Lime Rebranded) */}
        <header className="sticky top-0 z-20 flex lg:hidden items-center justify-between border-b border-teal-800/40 bg-[#064e52] px-5 py-4 backdrop-blur shadow-md text-white">
          <Link className="flex items-center gap-2" href="/parent">
            <InfinityLogo className="h-7 w-7 text-[#b5e61d]" />
            <span className="font-black text-white text-md tracking-wider">
              LoopNote Parent
            </span>
          </Link>
          <span className="text-[11px] font-black bg-teal-950/50 border border-teal-700/80 text-[#b5e61d] rounded-full px-3 py-1">
            {activeChild.name} ({activeChild.grade})
          </span>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 px-4 py-6 md:px-8 lg:p-10 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>
    </section>
  );
}
