'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Activity, 
  DollarSign, 
  FileText, 
  AlertCircle,
  Loader2,
  RefreshCw,
  Power
} from 'lucide-react';

interface Court {
  id: string;
  name: string;
  description: string | null;
  price_per_hour: number;
  is_active: boolean;
  created_at?: string;
}

export default function MasterLapanganPage() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // State Edit / Active Item
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_per_hour: 150000,
    is_active: true,
  });

  // Fetch Data Lapangan
  const fetchCourts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('courts')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data) {
      setCourts(data as Court[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCourts();
  }, []);

  // Open Modal Tambah
  const handleOpenCreateModal = () => {
    setSelectedCourt(null);
    setFormData({
      name: '',
      description: '',
      price_per_hour: 150000,
      is_active: true,
    });
    setIsModalOpen(true);
  };

  // Open Modal Edit
  const handleOpenEditModal = (court: Court) => {
    setSelectedCourt(court);
    setFormData({
      name: court.name,
      description: court.description || '',
      price_per_hour: court.price_per_hour,
      is_active: court.is_active,
    });
    setIsModalOpen(true);
  };

  // Save (Create / Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (selectedCourt) {
      // 🔄 Update
      const { error } = await supabase
        .from('courts')
        .update({
          name: formData.name,
          description: formData.description,
          price_per_hour: formData.price_per_hour,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedCourt.id);

      if (!error) {
        setIsModalOpen(false);
        fetchCourts();
      } else {
        alert('Gagal mengupdate lapangan: ' + error.message);
      }
    } else {
      // ➕ Create Baru
      const { error } = await supabase.from('courts').insert([
        {
          name: formData.name,
          description: formData.description,
          price_per_hour: formData.price_per_hour,
          is_active: formData.is_active,
        },
      ]);

      if (!error) {
        setIsModalOpen(false);
        fetchCourts();
      } else {
        alert('Gagal menambah lapangan: ' + error.message);
      }
    }
    setSubmitting(false);
  };

  // Toggle Active / Nonactive
  const handleToggleActive = async (court: Court) => {
    const { error } = await supabase
      .from('courts')
      .update({ is_active: !court.is_active })
      .eq('id', court.id);

    if (!error) {
      fetchCourts();
    }
  };

  // Delete Lapangan
  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Apakah kamu yakin ingin menghapus ${name}?`)) {
      const { error } = await supabase.from('courts').delete().eq('id', id);
      if (!error) {
        fetchCourts();
      } else {
        alert('Gagal menghapus lapangan: ' + error.message);
      }
    }
  };

  // Formatter Rupiah
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#141e1b] p-5 rounded-2xl border border-white/10">
        <div>
          <h1 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-wide">
            <Activity className="w-5 h-5 text-[#ccff00]" />
            Master Data Lapangan
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Kelola daftar unit lapangan padel & penetapan tarif sewa per jam.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="bg-[#ccff00] hover:bg-[#b8e600] text-zinc-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(204,255,0,0.2)] shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Tambah Lapangan
        </button>
      </div>

      {/* GRID DAFTAR LAPANGAN */}
      {loading ? (
        <div className="text-center py-16 bg-[#141e1b] rounded-2xl border border-white/10">
          <RefreshCw className="w-6 h-6 text-[#ccff00] animate-spin mx-auto mb-2" />
          <p className="text-xs text-zinc-400">Memuat Data Lapangan...</p>
        </div>
      ) : courts.length === 0 ? (
        <div className="text-center py-16 bg-[#141e1b] rounded-2xl border border-white/10">
          <Activity className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-xs text-zinc-400">Belum ada lapangan yang terdaftar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courts.map((c) => (
            <div
              key={c.id}
              className={`bg-[#141e1b] border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                c.is_active ? 'border-white/10 hover:border-white/20' : 'border-rose-500/30 opacity-70'
              }`}
            >
              <div>
                {/* Header Card */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      c.is_active
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {c.is_active ? '● Aktif Operasional' : '○ Non-Aktif / Maintanance'}
                  </span>

                  <button
                    onClick={() => handleToggleActive(c)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
                    title={c.is_active ? 'Non-aktifkan Lapangan' : 'Aktifkan Lapangan'}
                  >
                    <Power className={`w-4 h-4 ${c.is_active ? 'text-emerald-400' : 'text-rose-400'}`} />
                  </button>
                </div>

                {/* Nama Lapangan */}
                <h3 className="text-base font-bold text-white mb-1">{c.name}</h3>
                <p className="text-xs text-zinc-400 min-h-[36px] line-clamp-2">
                  {c.description || 'Tidak ada deskripsi lapangan.'}
                </p>

                {/* Harga per Jam */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Tarif Sewa:</span>
                  <span className="text-sm font-black text-[#ccff00]">
                    {formatRupiah(c.price_per_hour)} <span className="text-[10px] font-normal text-zinc-400">/ Jam</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-5 pt-3 border-t border-white/10">
                <button
                  onClick={() => handleOpenEditModal(c)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(c.id, c.name)}
                  className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all"
                  title="Hapus"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ------------------ 📱 MODAL FORM (CREATE / EDIT) ------------------ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#141e1b] border border-white/10 rounded-3xl p-6 shadow-2xl relative animate-fadeIn">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#ccff00]" />
                {selectedCourt ? 'Edit Data Lapangan' : 'Tambah Lapangan Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Nama Lapangan */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Nama Lapangan
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Court 1 - Indoor"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ccff00]"
                />
              </div>

              {/* Harga per Jam */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Harga Sewa per Jam (Rp)
                </label>
                <div className="relative">
                  <span className="text-xs text-zinc-500 absolute left-3.5 top-3 font-bold">Rp</span>
                  <input
                    type="number"
                    required
                    min="0"
                    step="5000"
                    placeholder="150000"
                    value={formData.price_per_hour}
                    onChange={(e) => setFormData({ ...formData, price_per_hour: Number(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ccff00]"
                  />
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Deskripsi / Keterangan (Opsional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Contoh: Lapangan karpet sintetis indoor dengan pencahayaan LED premium."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ccff00] resize-none"
                />
              </div>

              {/* Status Operasional */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 accent-[#ccff00] rounded cursor-pointer"
                />
                <label htmlFor="is_active" className="text-xs text-zinc-300 font-medium cursor-pointer">
                  Status Aktif (Bisa disewa pelanggan di web)
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#ccff00] hover:bg-[#b8e600] text-zinc-950 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(204,255,0,0.15)] disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>SIMPAN LAPANGAN</span>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}