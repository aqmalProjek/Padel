'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BarChart3,
  Calendar,
  Download,
  DollarSign,
  Coffee,
  Activity,
  CreditCard,
  Banknote,
  QrCode,
  RefreshCw,
  Loader2,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';

interface BookingReport {
  id: string;
  customer_name: string;
  booking_date: string;
  total_price: number;
  payment_status: string;
  payment_method: string;
  courts?: { name: string };
}

interface PosOrderReport {
  id: string;
  order_number: string;
  customer_name: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
}

export default function LaporanPendapatanPage() {
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().setDate(1)).toISOString().split('T')[0] // Default awal bulan ini
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0] // Default hari ini
  );

  // Data State
  const [bookings, setBookings] = useState<BookingReport[]>([]);
  const [posOrders, setPosOrders] = useState<PosOrderReport[]>([]);

  // Fetch Data Laporan
  const fetchReportData = async () => {
    setLoading(true);

    // 1. Fetch Laporan Booking Lapangan (Hanya yang Lunas)
    const { data: bookingData, error } = await supabase
      .from('bookings')
      .select('*, courts(name)')
      .gte('booking_date', startDate)
      .lte('booking_date', endDate)
      // Ambil yang 'paid_cashier' ATAU yang 'paid_dp' DENGAN syarat dp_amount > 0
      .or('payment_status.eq.paid_cashier,and(payment_status.eq.paid_dp,dp_amount.gt.0)');


    console.log('bookingData', bookingData);



    // 2. Fetch Laporan Cafe & Rental
    const { data: posData } = await supabase
      .from('pos_orders')
      .select('*')
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`)
      .eq('payment_status', 'paid');

    if (bookingData) setBookings(bookingData as BookingReport[]);
    if (posData) setPosOrders(posData as PosOrderReport[]);

    setLoading(false);
  };

  useEffect(() => {
    fetchReportData();
  }, [startDate, endDate]);

  // Calculations Omset
  const omsetLapangan = bookings.reduce((acc, b) => acc + Number(b.total_price), 0);
  const omsetCafe = posOrders.reduce((acc, p) => acc + Number(p.total_amount), 0);
  const totalOmsetGabungan = omsetLapangan + omsetCafe;

  // Breakdown Metode Pembayaran
  const cashTotal =
    bookings.filter(b => b.payment_method === 'cash').reduce((acc, b) => acc + Number(b.total_price), 0) +
    posOrders.filter(p => p.payment_method === 'cash').reduce((acc, p) => acc + Number(p.total_amount), 0);

  const qrisTotal =
    bookings.filter(b => b.payment_method === 'qris').reduce((acc, b) => acc + Number(b.total_price), 0) +
    posOrders.filter(p => p.payment_method === 'qris').reduce((acc, p) => acc + Number(p.total_amount), 0);

  const transferTotal =
    bookings.filter(b => b.payment_method === 'transfer').reduce((acc, b) => acc + Number(b.total_price), 0) +
    posOrders.filter(p => p.payment_method === 'transfer').reduce((acc, p) => acc + Number(p.total_amount), 0);

  // Format Rupiah
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // 📄 EXPORT LAPORAN KE PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();

    // Header Laporan
    doc.setFontSize(18);
    doc.text('EKSDI PADEL COURTS & CAFE', 14, 15);
    doc.setFontSize(11);
    doc.text('Laporan Ringkasan Pendapatan Finance', 14, 22);
    doc.setFontSize(9);
    doc.text(`Periode Laporan: ${startDate} s/d ${endDate}`, 14, 28);
    doc.line(14, 32, 196, 32);

    // Ringkasan Finansial
    doc.setFontSize(10);
    doc.text(`Total Omset Lapangan: ${formatRupiah(omsetLapangan)}`, 14, 40);
    doc.text(`Total Omset Cafe & Rental: ${formatRupiah(omsetCafe)}`, 14, 46);
    doc.setFontSize(11);
    doc.text(`TOTAL OMSET GABUNGAN: ${formatRupiah(totalOmsetGabungan)}`, 14, 53);

    // Tabel 1: Breakdown Pembayaran Lapangan
    doc.setFontSize(11);
    doc.text('1. Rincian Pendapatan Lapangan', 14, 65);

    const bookingRows = bookings.map((b, idx) => [
      idx + 1,
      b.booking_date,
      b.customer_name,
      b.courts?.name || 'Lapangan',
      b.payment_method.toUpperCase(),
      formatRupiah(b.total_price),
    ]);

    autoTable(doc, {
      startY: 68,
      head: [['#', 'Tanggal', 'Pemesan', 'Lapangan', 'Metode', 'Total']],
      body: bookingRows,
      theme: 'grid',
      headStyles: { fillColor: [20, 30, 27] },
    });

    // Tabel 2: Breakdown Pembayaran Cafe & Rental
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text('2. Rincian Pendapatan Cafe & Rental', 14, finalY);

    const posRows = posOrders.map((p, idx) => [
      idx + 1,
      p.created_at.slice(0, 10),
      p.order_number,
      p.customer_name,
      p.payment_method.toUpperCase(),
      formatRupiah(p.total_amount),
    ]);

    autoTable(doc, {
      startY: finalY + 3,
      head: [['#', 'Tanggal', 'No. Order', 'Atas Nama', 'Metode', 'Total']],
      body: posRows,
      theme: 'grid',
      headStyles: { fillColor: [20, 30, 27] },
    });

    // Save File PDF
    doc.save(`Laporan_Pendapatan_EksdiPadel_${startDate}_sd_${endDate}.pdf`);
  };

  return (
    <div className="space-y-6">

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#141e1b] p-5 rounded-2xl border border-white/10">
        <div>
          <h1 className="text-lg font-black text-[#ccff00] flex items-center gap-2 uppercase tracking-wide">
            <BarChart3 className="w-5 h-5" />
            Laporan Pendapatan Venue
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Rekap perolehan omset gabungan dari sewa lapangan padel dan penjualan cafe/rental.
          </p>
        </div>

        <button
          onClick={handleExportPDF}
          className="bg-[#ccff00] hover:bg-[#b8e600] text-zinc-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(204,255,0,0.2)] shrink-0"
        >
          <Download className="w-4 h-4 stroke-[2.5]" />
          EXPORT KE PDF
        </button>
      </div>

      {/* FILTER DATE RANGE */}
      <div className="bg-[#141e1b] p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-end gap-3">
        <div className="flex-1 w-full">
          <label className="block text-xs font-semibold text-zinc-400 mb-1">Dari Tanggal</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ccff00]"
          />
        </div>

        <div className="flex-1 w-full">
          <label className="block text-xs font-semibold text-zinc-400 mb-1">Sampai Tanggal</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ccff00]"
          />
        </div>

        <button
          onClick={fetchReportData}
          className="bg-white/10 hover:bg-white/20 text-white font-bold p-2.5 rounded-xl text-xs transition-all shrink-0"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 1. METRIK RINGKASAN FINANSIAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Total Omset Gabungan */}
        <div className="bg-gradient-to-br from-[#ccff00]/20 to-[#141e1b] border border-[#ccff00]/40 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Total Omset Gabungan</span>
            <TrendingUp className="w-5 h-5 text-[#ccff00]" />
          </div>
          <p className="text-2xl font-black text-[#ccff00]">{formatRupiah(totalOmsetGabungan)}</p>
          <p className="text-[10px] text-zinc-400 mt-1">Sewa Lapangan + Sales Cafe</p>
        </div>

        {/* Total Sewa Lapangan */}
        <div className="bg-[#141e1b] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Pendapatan Lapangan</span>
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-xl font-black text-white">{formatRupiah(omsetLapangan)}</p>
          <p className="text-[10px] text-zinc-400 mt-1">{bookings.length} Transaksi Sewa</p>
        </div>

        {/* Total Omset Cafe */}
        <div className="bg-[#141e1b] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Pendapatan Cafe & Rental</span>
            <Coffee className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-xl font-black text-white">{formatRupiah(omsetCafe)}</p>
          <p className="text-[10px] text-zinc-400 mt-1">{posOrders.length} Pesanan Kasir</p>
        </div>

      </div>

      {/* 2. RINCIAN METODE PEMBAYARAN */}
      <div className="grid grid-cols-3 gap-3 bg-[#141e1b] p-4 rounded-2xl border border-white/10 text-center">
        <div>
          <div className="flex items-center justify-center gap-1 text-xs text-zinc-400 mb-1">
            <Banknote className="w-4 h-4 text-emerald-400" /> Tunai (Cash)
          </div>
          <p className="text-sm font-bold text-white">{formatRupiah(cashTotal)}</p>
        </div>

        <div>
          <div className="flex items-center justify-center gap-1 text-xs text-zinc-400 mb-1">
            <QrCode className="w-4 h-4 text-cyan-400" /> QRIS
          </div>
          <p className="text-sm font-bold text-white">{formatRupiah(qrisTotal)}</p>
        </div>

        <div>
          <div className="flex items-center justify-center gap-1 text-xs text-zinc-400 mb-1">
            <CreditCard className="w-4 h-4 text-[#ccff00]" /> Transfer Bank
          </div>
          <p className="text-sm font-bold text-white">{formatRupiah(transferTotal)}</p>
        </div>
      </div>

      {/* 3. TABEL DETAIL TRANSAKSI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Detail Lapangan */}
        <div className="bg-[#141e1b] border border-white/10 rounded-2xl p-4 space-y-3">
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#ccff00]" /> Transaksi Lapangan
          </h3>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {bookings.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">Tidak ada transaksi di rentang tanggal ini.</p>
            ) : (
              bookings.map((b) => (
                <div key={b.id} className="bg-white/5 p-3 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-white">{b.customer_name}</h4>
                    <p className="text-[10px] text-zinc-400">{b.booking_date} • {b.courts?.name}</p>
                  </div>
                  <div className="text-right">
                    <span className="block font-black text-[#ccff00]">{formatRupiah(b.total_price)}</span>
                    <span className="text-[9px] text-zinc-400 uppercase">{b.payment_method}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detail Cafe */}
        <div className="bg-[#141e1b] border border-white/10 rounded-2xl p-4 space-y-3">
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <Coffee className="w-4 h-4 text-amber-400" /> Transaksi Cafe & Rental
          </h3>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {posOrders.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">Tidak ada transaksi di rentang tanggal ini.</p>
            ) : (
              posOrders.map((p) => (
                <div key={p.id} className="bg-white/5 p-3 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-white">{p.customer_name}</h4>
                    <p className="text-[10px] text-zinc-400">{p.created_at.slice(0, 10)} • {p.order_number}</p>
                  </div>
                  <div className="text-right">
                    <span className="block font-black text-amber-400">{formatRupiah(p.total_amount)}</span>
                    <span className="text-[9px] text-zinc-400 uppercase">{p.payment_method}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}