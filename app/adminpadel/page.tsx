'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient'; // Sesuaikan path alias projekmu
import { Lock, Mail, KeyRound, Loader2, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    // Fungsi autentikasi bawaan dari Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      setErrorMessage('Email atau Password salah! Periksa kembali.');
      setLoading(false);
    } else if (data.user) {
      // Jika login berhasil, arahkan ke dashboard kasir/admin
      router.push('/adminpadel/dashboard');
    }
  };

  return (
    <main className="min-h-screen bg-[#0f1715] text-white flex items-center justify-center px-4 relative overflow-hidden font-sans">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,_rgba(204,255,0,0.08)_0%,_transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="w-full max-w-sm bg-[#141e1b] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        
        {/* Header Login */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#ccff00]/10 border border-[#ccff00] flex items-center justify-center mx-auto mb-3 shadow-[0_0_15px_rgba(204,255,0,0.15)]">
            <Lock className="w-6 h-6 text-[#ccff00]" />
          </div>
          <h1 className="text-xl font-black tracking-wider text-white uppercase">
            EKSDI PADEL
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Portal Login Admin & Kasir</p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-400 text-xs font-medium animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Login */}
        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* Input Email */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Email Admin
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                placeholder="admin@eksdipadel.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ccff00] transition-colors"
              />
            </div>
          </div>

          {/* Input Password */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ccff00] transition-colors"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[#ccff00] hover:bg-[#b8e600] text-zinc-950 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(204,255,0,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <span>MASUK DASHBOARD</span>
            )}
          </button>
        </form>

        <p className="text-[10px] text-center text-zinc-500 mt-6">
          Sistem Terintegrasi Kasir & Kasir Field • Eksdi Padel
        </p>

      </div>
    </main>
  );
}