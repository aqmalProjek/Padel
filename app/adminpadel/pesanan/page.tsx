'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import jsPDF from 'jspdf';
import { 
  Coffee, 
  Search, 
  CheckCircle2, 
  Loader2, 
  User, 
  RefreshCw,
  Clock,
  DollarSign,
  Printer,
  Receipt,
  Trash2,
  X,
  Coins,
  Banknote,
  QrCode,
  CreditCard
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface PosOrderItem {
  item_name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface PosOrder {
  id: string;
  order_number: string;
  customer_name: string;
  total_amount: number;
  cash_received?: number;
  cash_change?: number;
  payment_status: 'paid' | 'pending' | 'cancelled';
  payment_method: string;
  notes?: string;
  created_at: string;
  pos_order_items?: PosOrderItem[];
}

export default function KasirCafePage() {
  const { role, loading: authLoading } = useAuth();
  console.log('role', role, 'authLoading', authLoading);

  const [orders, setOrders] = useState<PosOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');

  // Modal Pelunasan State
  const [payModalOrder, setPayModalOrder] = useState<PosOrder | null>(null);
  const [selectedPayMethod, setSelectedPayMethod] = useState<'cash' | 'qris' | 'transfer'>('cash');
  const [payCashReceived, setPayCashReceived] = useState<number | ''>('');
  const [submittingPay, setSubmittingPay] = useState(false);

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

    // ⚡ Realtime Listener
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

  // Format Rupiah
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // 📄 PRINT STRUK THERMAL POS CAFE (80mm) DENGAN JSPDF
  const printThermalReceiptWithjsPDF = (order: PosOrder, cashRec?: number, cashChg?: number) => {
    const baseHeight = 135;
    const itemHeight = (order.pos_order_items?.length || 0) * 5;
    const dynamicHeight = baseHeight + itemHeight;

    const doc = new jsPDF({
      unit: 'mm',
      format: [72, dynamicHeight],
    });

    const printedAt = new Date(order.created_at).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const dateFormatted = new Date(order.created_at).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    let y = 8;

    // Header Struk
    doc.setFont('courier', 'bold');
    doc.setFontSize(13);
    doc.text('EKSDI CAFE & RENTAL', 36, y, { align: 'center' });
    
    y += 5;
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.text('Jl. Simpang Nagrog, Tasikmalaya', 36, y, { align: 'center' });
    y += 4;
    doc.text('WA / Telp: 08132314141', 36, y, { align: 'center' });
    y += 4;
    doc.text('=================================', 36, y, { align: 'center' });

    // Info Transaksi
    y += 5;
    doc.setFontSize(9);
    doc.text(`No. Order : ${order.order_number}`, 3, y);
    y += 4.5;
    doc.text(`Tanggal   : ${dateFormatted} ${printedAt}`, 3, y);
    y += 4.5;
    doc.text(`Pemesan   : ${order.customer_name}`, 3, y);
    y += 4;
    doc.text('---------------------------------', 36, y, { align: 'center' });

    // Header Tabel Items
    y += 5;
    doc.setFont('courier', 'bold');
    doc.text('QTY  ITEM                   TOTAL', 3, y);
    y += 4;
    doc.setFont('courier', 'normal');
    doc.text('---------------------------------', 36, y, { align: 'center' });

    y += 5;
    if (order.pos_order_items && order.pos_order_items.length > 0) {
      order.pos_order_items.forEach((item) => {
        const itemName = item.item_name.length > 16 
          ? item.item_name.substring(0, 16) + '..' 
          : item.item_name;
        const qtyStr = `${item.quantity}x`.padEnd(5, ' ');
        const priceStr = formatRupiah(item.subtotal).padStart(12, ' ');

        doc.text(`${qtyStr}${itemName.padEnd(17, ' ')}${priceStr}`, 3, y);
        y += 5;
      });
    }

    y += 1;
    doc.text('---------------------------------', 36, y, { align: 'center' });
    y += 5;

    // Summary Total
    doc.setFont('courier', 'bold');
    doc.setFontSize(10);
    doc.text(`TOTAL BAYAR : ${formatRupiah(order.total_amount)}`, 3, y);
    
    y += 4.5;
    doc.setFont('courier', 'normal');
    doc.setFontSize(9);
    doc.text(`METODE BAYAR: ${(order.payment_method || 'CASH').toUpperCase()}`, 3, y);

    const actualCashReceived = cashRec ?? order.cash_received;
    const actualCashChange = cashChg ?? order.cash_change;

    if (order.payment_method === 'cash' && typeof actualCashReceived === 'number' && actualCashReceived > 0) {
      y += 4.5;
      doc.text(`UANG DITERIMA: ${formatRupiah(actualCashReceived)}`, 3, y);
      y += 4.5;
      doc.text(`KEMBALIAN    : ${formatRupiah(actualCashChange || 0)}`, 3, y);
    }

    y += 4.5;
    doc.text(`STATUS       : ${order.payment_status === 'paid' ? 'LUNAS (PAID)' : 'BELUM LUNAS'}`, 3, y);

    if (order.notes) {
      y += 4.5;
      doc.text(`Catatan     : ${order.notes}`, 3, y);
    }

    // Footer Struk
    y += 6;
    doc.text('=================================', 36, y, { align: 'center' });
    y += 5;
    doc.setFont('courier', 'bold');
    doc.setFontSize(10);
    doc.text('TERIMA KASIH', 36, y, { align: 'center' });
    y += 4.5;
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.text('Selamat Menikmati di Eksdi Padel!', 36, y, { align: 'center' });

    // Auto Print
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };

  // Kalkulasi Kembalian Modal Pelunasan
  const numPayCashReceived = typeof payCashReceived === 'number' ? payCashReceived : 0;
  const payCashChange = payModalOrder && selectedPayMethod === 'cash' 
    ? Math.max(0, numPayCashReceived - payModalOrder.total_amount) 
    : 0;

  // Process Mark As Paid via Modal
  const handleConfirmPayModal = async () => {
    if (!payModalOrder) return;

    if (selectedPayMethod === 'cash' && numPayCashReceived < payModalOrder.total_amount) {
      alert('Uang yang dibayarkan masih kurang!');
      return;
    }

    setSubmittingPay(true);
    const { error } = await supabase
      .from('pos_orders')
      .update({
        payment_status: 'paid',
        payment_method: selectedPayMethod,
        cash_received: selectedPayMethod === 'cash' ? numPayCashReceived : payModalOrder.total_amount,
        cash_change: selectedPayMethod === 'cash' ? payCashChange : 0,
      })
      .eq('id', payModalOrder.id);

    if (!error) {
      printThermalReceiptWithjsPDF(
        { ...payModalOrder, payment_status: 'paid', payment_method: selectedPayMethod },
        selectedPayMethod === 'cash' ? numPayCashReceived : payModalOrder.total_amount,
        selectedPayMethod === 'cash' ? payCashChange : 0
      );

      setPayModalOrder(null);
      setPayCashReceived('');
      fetchOrders();
    } else {
      alert('Gagal mengupdate status: ' + error.message);
    }
    setSubmittingPay(false);
  };

  // 🗑️ Hapus Pesanan
  const handleDeleteOrder = async (order: PosOrder) => {
    if (confirm(`Apakah Anda yakin ingin menghapus pesanan ${order.order_number} (${order.customer_name})?`)) {
      await supabase.from('pos_order_items').delete().eq('order_id', order.id);
      const { error } = await supabase.from('pos_orders').delete().eq('id', order.id);

      if (!error) {
        fetchOrders();
      } else {
        alert('Gagal menghapus pesanan: ' + error.message);
      }
    }
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

              {/* Total & Action Buttons */}
              <div className="pt-3 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Total Tagihan:</span>
                    <span className="text-base font-black text-[#ccff00]">{formatRupiah(o.total_amount)}</span>
                  </div>

                  {o.payment_status === 'pending' ? (
                    <button
                      onClick={() => {
                        setPayModalOrder(o);
                        setSelectedPayMethod('cash');
                        setPayCashReceived('');
                      }}
                      className="bg-[#ccff00] hover:bg-[#b8e600] text-zinc-950 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(204,255,0,0.2)]"
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

                {/* Action Buttons: Cetak Struk & Hapus */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => printThermalReceiptWithjsPDF(o)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#ccff00]" />
                    CETAK STRUK POS
                  </button>
                  {role === 'owner' && (
                    <button
                      onClick={() => handleDeleteOrder(o)}
                      className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl transition-all"
                      title="Hapus Pesanan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* 💵 MODAL PELUNASAN KASIR (BAYAR CAFE & SELF-ORDER) */}
      {payModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#141e1b] border border-white/10 rounded-3xl p-5 shadow-2xl">
            
            <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#ccff00]" />
                Pelunasan Pesanan Cafe
              </h3>
              <button onClick={() => setPayModalOrder(null)} className="p-1 rounded-full bg-white/5 text-zinc-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-xs space-y-1">
                <p className="text-zinc-400">No. Order: <strong className="text-white">{payModalOrder.order_number}</strong></p>
                <p className="text-zinc-400">Pemesan: <strong className="text-white">{payModalOrder.customer_name}</strong></p>
                <p className="text-zinc-400">Total Tagihan: <strong className="text-[#ccff00] text-sm">{formatRupiah(payModalOrder.total_amount)}</strong></p>
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Metode Pembayaran</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'cash', label: 'Tunai', icon: <Banknote className="w-3.5 h-3.5" /> },
                    { id: 'qris', label: 'QRIS', icon: <QrCode className="w-3.5 h-3.5" /> },
                    { id: 'transfer', label: 'Transfer', icon: <CreditCard className="w-3.5 h-3.5" /> },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedPayMethod(m.id as any)}
                      className={`p-2 rounded-xl text-[10px] font-bold flex flex-col items-center gap-1 border transition-all ${
                        selectedPayMethod === m.id
                          ? 'bg-[#ccff00] border-[#ccff00] text-zinc-950'
                          : 'bg-white/5 border-white/10 text-zinc-400'
                      }`}
                    >
                      {m.icon} {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Nominal Tunai & Kembalian */}
              {selectedPayMethod === 'cash' && (
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 space-y-2">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-300 mb-1 flex items-center justify-between">
                      <span>Uang Diterima (Rp)</span>
                      {numPayCashReceived > 0 && numPayCashReceived < payModalOrder.total_amount && (
                        <span className="text-rose-400 text-[9px]">Uang Kurang!</span>
                      )}
                    </label>
                    <div className="relative">
                      <Coins className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                      <input
                        type="number"
                        placeholder="0"
                        value={payCashReceived}
                        onChange={(e) => setPayCashReceived(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-black/40 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-[#ccff00]"
                      />
                    </div>
                  </div>

                  {/* Preset Tombol Pecahan Cepat */}
                  <div className="grid grid-cols-4 gap-1">
                    <button
                      type="button"
                      onClick={() => setPayCashReceived(payModalOrder.total_amount)}
                      className="py-1 bg-white/10 hover:bg-white/20 rounded text-[9px] font-bold text-zinc-300"
                    >
                      Uang Pas
                    </button>
                    {[10000, 20000, 50000, 100000].map((nominal) => (
                      <button
                        key={nominal}
                        type="button"
                        onClick={() => setPayCashReceived(nominal)}
                        className="py-1 bg-white/10 hover:bg-white/20 rounded text-[9px] font-bold text-[#ccff00]"
                      >
                        {nominal / 1000}k
                      </button>
                    ))}
                  </div>

                  {/* Display Kembalian */}
                  <div className="flex justify-between items-center text-xs pt-1 border-t border-white/10 font-bold">
                    <span className="text-zinc-400">Kembalian:</span>
                    <span className={payCashChange >= 0 && numPayCashReceived >= payModalOrder.total_amount ? 'text-emerald-400' : 'text-zinc-500'}>
                      {formatRupiah(payCashChange)}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={handleConfirmPayModal}
                disabled={submittingPay || (selectedPayMethod === 'cash' && numPayCashReceived < payModalOrder.total_amount)}
                className="w-full bg-[#ccff00] text-zinc-950 font-black py-3 rounded-xl text-xs flex items-center justify-center gap-2 mt-4 shadow-[0_0_15px_rgba(204,255,0,0.2)] disabled:opacity-40"
              >
                {submittingPay ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                PROSES & PRINT STRUK (JSPDF)
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}