'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Coffee, 
  Search, 
  CheckCircle2, 
  Loader2, 
  User, 
  RefreshCw,
  Clock,
  DollarSign,
  AlertCircle
} from 'lucide-react';

interface PosOrder {
  id: string;
  order_number: string;
  customer_name: string;
  total_amount: number;
  payment_status: 'paid' | 'pending' | 'cancelled';
  payment_method: string;
  notes?: string;
  created_at: string;
  pos_order_items?: {
    item_name: string;
    quantity: number;
    price: number;
    subtotal: number;
  }[];
}

export default function KasirCafePage() {
  const [orders, setOrders] = useState<PosOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');

  // Fetch Orders
  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pos_orders')
      .select('*, pos_order_items(*)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data as PosOrder[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();

    // ⚡ Realtime Listener: Langsung bunyi/muncul jika ada pesanan scan dari HP pelanggan
    const channel = supabase
      .channel('pos-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Tandai Pesanan Lunas
  const handleMarkAsPaid = async (orderId: string) => {
    const { error } = await supabase
      .from('pos_orders')
      .update({ payment_status: 'paid' })
      .eq('id', orderId);

    if (!error) {
      fetchOrders();
    } else {
      alert('Gagal mengupdate status: ' + error.message);
    }
  };

  // Format Rupiah
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Filter Orders
  const filteredOrders = orders.filter((o) => {
    const matchesSearch = o.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.order_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.payment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#141e1b] p-5 rounded-2xl border border-white/10">
        <div>
          <h1 className="text-lg font-black text-[#ccff00] flex items-center gap-2 uppercase tracking-wide">
            <Coffee className="w-5 h-5" /> Monitoring Pesanan Cafe & Self-Order
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Pantau pesanan masuk dari QR Meja/Lapangan, lihat rincian item, dan lunasi tagihan.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="bg-white/5 hover:bg-white/10 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-2 border border-white/10"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* SEARCH & FILTER BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-[#141e1b] p-3 rounded-2xl border border-white/10">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari pesanan Asep / No. Meja..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ccff00]"
          />
        </div>

        <div className="flex gap-1.5 shrink-0">
          {[
            { id: 'all', label: 'Semua Status' },
            { id: 'pending', label: 'Belum Lunas (Pending)' },
            { id: 'paid', label: 'Lunas' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id as any)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === st.id
                  ? 'bg-[#ccff00] text-zinc-950'
                  : 'bg-white/5 text-zinc-400 hover:text-white'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* LIST ORDERS GRID */}
      {loading ? (
        <div className="text-center py-16 bg-[#141e1b] rounded-2xl border border-white/10">
          <Loader2 className="w-6 h-6 text-[#ccff00] animate-spin mx-auto mb-2" />
          <p className="text-xs text-zinc-400">Memuat Pesanan...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-[#141e1b] rounded-2xl border border-white/10">
          <Coffee className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-xs text-zinc-400">Belum ada pesanan terdeteksi.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((o) => (
            <div
              key={o.id}
              className={`bg-[#141e1b] border rounded-2xl p-4 flex flex-col justify-between transition-all ${
                o.payment_status === 'pending'
                  ? 'border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                  : 'border-white/10'
              }`}
            >
              <div>
                {/* Header Card Pesanan */}
                <div className="flex justify-between items-start border-b border-white/10 pb-3 mb-3">
                  <div>
                    <span className="text-[10px] text-zinc-500 font-mono block">{o.order_number}</span>
                    <h3 className="text-sm font-black text-white flex items-center gap-1.5 mt-0.5">
                      <User className="w-3.5 h-3.5 text-[#ccff00]" />
                      {o.customer_name}
                    </h3>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      o.payment_status === 'paid'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse'
                    }`}
                  >
                    {o.payment_status === 'paid' ? '● LUNAS' : '○ PENDING'}
                  </span>
                </div>

                {/* Items Detail */}
                <div className="space-y-1.5 mb-3 bg-white/5 p-3 rounded-xl border border-white/5 text-xs">
                  {o.pos_order_items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-zinc-300">
                      <span>{item.item_name} <strong className="text-[#ccff00]">x{item.quantity}</strong></span>
                      <span className="font-semibold text-white">{formatRupiah(item.subtotal)}</span>
                    </div>
                  ))}

                  {o.notes && (
                    <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-amber-400 italic">
                      Catatan: "{o.notes}"
                    </div>
                  )}
                </div>
              </div>

              {/* Total & Action Button */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-400 block">Total Tagihan:</span>
                  <span className="text-base font-black text-[#ccff00]">{formatRupiah(o.total_amount)}</span>
                </div>

                {o.payment_status === 'pending' ? (
                  <button
                    onClick={() => handleMarkAsPaid(o.id)}
                    className="bg-[#ccff00] hover:bg-[#b8e600] text-zinc-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(204,255,0,0.2)]"
                  >
                    <DollarSign className="w-4 h-4" />
                    TANDAI LUNAS
                  </button>
                ) : (
                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Selesai
                  </span>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}