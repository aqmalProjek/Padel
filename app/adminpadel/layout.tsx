'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { 
  Calendar, 
  Coffee, 
  Database, 
  Users, 
  UtensilsCrossed, 
  Activity, 
  BarChart3, 
  LogOut, 
  Menu, 
  X, 
  Loader2,
  ChevronDown
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isLoginPage = pathname === '/adminpadel';

  useEffect(() => {
    const checkUserSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session && !isLoginPage) {
        router.push('/adminpadel');
      } else if (session) {
        setUserEmail(session.user.email ?? 'Admin');
        if (isLoginPage) {
          router.push('/adminpadel/dashboard');
        }
      }
      setLoading(false);
    };

    checkUserSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.push('/adminpadel');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router, isLoginPage]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/adminpadel');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1715] text-white flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#ccff00] animate-spin mb-3" />
        <p className="text-xs text-zinc-400">Memuat Sistem Admin...</p>
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  // Struktur Menu Navigation
  const menuGroups = [
    {
      title: 'KASIR & OPERASIONAL',
      items: [
        {
          label: 'Booking Lapangan',
          icon: <Calendar className="w-4 h-4" />,
          href: '/adminpadel/dashboard',
        },
        {
          label: 'Kasir Cafe & Rental',
          icon: <Coffee className="w-4 h-4" />,
          href: '/adminpadel/kasir-cafe',
        },
      ],
    },
    {
      title: 'MASTER DATA',
      items: [
        {
          label: 'Data Lapangan',
          icon: <Activity className="w-4 h-4" />,
          href: '/adminpadel/master/lapangan',
        },
        {
          label: 'Menu Makanan & Sewa',
          icon: <UtensilsCrossed className="w-4 h-4" />,
          href: '/adminpadel/master/menu',
        },
        {
          label: 'Data Users / Kasir',
          icon: <Users className="w-4 h-4" />,
          href: '/adminpadel/master/users',
        },
      ],
    },
    {
      title: 'LAPORAN & ANALITIK',
      items: [
        {
          label: 'Laporan Pendapatan',
          icon: <BarChart3 className="w-4 h-4" />,
          href: '/adminpadel/laporan',
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#0f1715] text-white flex flex-col lg:flex-row font-sans selection:bg-[#ccff00] selection:text-black">
      
      {/* 📱 TOP BAR MOBILE (Hanya muncul di HP/Tablet) */}
      <div className="lg:hidden bg-[#141e1b] border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#ccff00] text-zinc-950 font-black flex items-center justify-center text-[10px]">
            EKSDI
          </div>
          <span className="text-xs font-bold tracking-wider uppercase">EKSDI PADEL</span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-300"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* 🟢 SIDEBAR (RESPONSIVE) */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 w-64 h-screen bg-[#141e1b] border-r border-white/10 flex flex-col justify-between transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-5 overflow-y-auto">
          {/* Header Brand Sidebar */}
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 rounded-xl bg-[#ccff00] text-zinc-950 font-black flex items-center justify-center text-xs tracking-wider shadow-[0_0_15px_rgba(204,255,0,0.2)]">
              EKSDI
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wider uppercase">EKSDI PADEL</h1>
              <p className="text-[10px] text-[#ccff00] font-bold">POS & Management System</p>
            </div>
          </div>

          {/* Render Kelompok Menu */}
          <div className="space-y-6">
            {menuGroups.map((group, idx) => (
              <div key={idx}>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 px-2">
                  {group.title}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsSidebarOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-[#ccff00] text-zinc-950 shadow-[0_0_15px_rgba(204,255,0,0.2)]'
                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Sidebar (User Logged In & Logout) */}
        <div className="p-4 border-t border-white/10 bg-black/20">
          <div className="flex items-center justify-between">
            <div className="truncate pr-2">
              <p className="text-xs font-bold text-white truncate">{userEmail}</p>
              <p className="text-[10px] text-emerald-400 font-medium">● Online</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* OVERLAY MOBILE (Tutup sidebar jika luar diklik) */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      {/* 📱 AREA KONTEN UTAMA */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>

    </div>
  );
}