'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Activity, Edit3, Loader2, RefreshCw, Save, Tag, Clock } from 'lucide-react';

interface Court {
  id: string;
  name: string;
  price_session_1: number;
  price_session_1_discount: number;
  is_discount_session_1: boolean;
  price_session_2: number;
  price_session_2_discount: number;
  is_discount_session_2: boolean;
  is_active: boolean;
}

export default function MasterLapanganPage() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchCourts = async () => {
    setLoading(true);
    const { data } = await supabase.from('courts').select('*').order('name');
    if (data) setCourts(data as Court[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchCourts();
  }, []);

  const handleUpdateCourt = async (court: Court) => {
    setSavingId(court.id);
    const { error } = await supabase
      .from('courts')
      .update({
        price_session_1: court.price_session_1,
        price_session_1_discount: court.price_session_1_discount,
        is_discount_session_1: court.is_discount_session_1,
        price_session_2: court.price_session_2,
        price_session_2_discount: court.price_session_2_discount,
        is_discount_session_2: court.is_discount_session_2,
      })
      .eq('id', court.id);

    if (!error) {
      alert(`Settingan harga untuk ${court.name} berhasil disimpan!`);
      fetchCourts();
    } else {
      alert('Gagal menyimpan: ' + error.message);
    }
    setSavingId(null);
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-[#141e1b] p-5 rounded-2xl border border-white/10 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-black text-[#ccff00] flex items-center gap-2 uppercase">
            <Activity className="w-5 h-5" /> Master Pengaturan Harga Lapangan
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Atur skema harga Sesi 1 (07.00 - 14.00), Sesi 2 (15.00 - 21.00), dan status diskon aktif. (harga weekend full ke sesi 2)
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 bg-[#141e1b] rounded-2xl border border-white/10">
          <RefreshCw className="w-6 h-6 text-[#ccff00] animate-spin mx-auto mb-2" />
          <p className="text-xs text-zinc-400">Memuat Data Lapangan...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {courts.map((court, idx) => (
            <div key={court.id} className="bg-[#141e1b] border border-white/10 rounded-3xl p-5 space-y-5">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <h3 className="text-base font-black text-white">{court.name}</h3>
                <span className="text-[10px] bg-[#ccff00]/10 text-[#ccff00] font-bold px-2.5 py-1 rounded-full border border-[#ccff00]/30">
                  SESI BERLAPIS
                </span>
              </div>

              {/* SESI 1 SECTION */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#ccff00]" />
                    <span className="text-xs font-bold text-white uppercase">Sesi 1 (07.00 - 14.00)</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={court.is_discount_session_1}
                      onChange={(e) => {
                        const updated = [...courts];
                        updated[idx].is_discount_session_1 = e.target.checked;
                        setCourts(updated);
                      }}
                      className="w-4 h-4 accent-[#ccff00] rounded"
                    />
                    <span className="text-xs text-amber-400 font-bold">Aktifkan Diskon</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-1">Harga Normal (Rp)</label>
                    <input
                      type="number"
                      value={court.price_session_1}
                      onChange={(e) => {
                        const updated = [...courts];
                        updated[idx].price_session_1 = Number(e.target.value);
                        setCourts(updated);
                      }}
                      className="w-full bg-[#0f1715] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-amber-400 mb-1">Harga Diskon (Rp)</label>
                    <input
                      type="number"
                      value={court.price_session_1_discount}
                      onChange={(e) => {
                        const updated = [...courts];
                        updated[idx].price_session_1_discount = Number(e.target.value);
                        setCourts(updated);
                      }}
                      className="w-full bg-[#0f1715] border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-amber-400 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* SESI 2 SECTION */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#ccff00]" />
                    <span className="text-xs font-bold text-white uppercase">Sesi 2 (15.00 - 21.00) / (Harga Weekend)</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={court.is_discount_session_2}
                      onChange={(e) => {
                        const updated = [...courts];
                        updated[idx].is_discount_session_2 = e.target.checked;
                        setCourts(updated);
                      }}
                      className="w-4 h-4 accent-[#ccff00] rounded"
                    />
                    <span className="text-xs text-amber-400 font-bold">Aktifkan Diskon</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-1">Harga Normal (Rp)</label>
                    <input
                      type="number"
                      value={court.price_session_2}
                      onChange={(e) => {
                        const updated = [...courts];
                        updated[idx].price_session_2 = Number(e.target.value);
                        setCourts(updated);
                      }}
                      className="w-full bg-[#0f1715] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-amber-400 mb-1">Harga Diskon (Rp)</label>
                    <input
                      type="number"
                      value={court.price_session_2_discount}
                      onChange={(e) => {
                        const updated = [...courts];
                        updated[idx].price_session_2_discount = Number(e.target.value);
                        setCourts(updated);
                      }}
                      className="w-full bg-[#0f1715] border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-amber-400 font-bold"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleUpdateCourt(court)}
                disabled={savingId === court.id}
                className="w-full bg-[#ccff00] text-zinc-950 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2"
              >
                {savingId === court.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                SIMPAN SETTINGAN HARGA
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}