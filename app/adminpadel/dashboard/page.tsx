'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  DollarSign, 
  User, 
  Phone, 
  RefreshCw,
  Search,
  X,
  Loader2,
  Trash2,
  CreditCard,
  QrCode,
  Banknote,
  MessageSquare
} from 'lucide-react';

interface Booking {
  id: string;
  court_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration: number;
  total_price: number;
  dp_amount?: number;
  payment_status: 'pending' | 'paid_cashier' | 'paid_dp' | 'cancelled';
  payment_method: 'cash' | 'qris' | 'transfer' | 'cashier';
  created_at: string;
  courts?: {
    name: string;
  };
}

interface Court {
  id: string;
  name: string;
  price_per_hour: number;
}

export default function DashboardKasirPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [searchTerm, setSearchTerm] = useState('');

  // State Modal Input Walk-in
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [manualFormData, setManualFormData] = useState({
    court_id: '',
    customer_name: '',
    customer_phone: '',
    start_time: '08:00',
    duration: 1,
    payment_status: 'paid_cashier',
    payment_method: 'cash',
    dp_amount: 50000,
  });

  // State Modal Bayar / Pelunasan
  const [payModalBooking, setPayModalBooking] = useState<Booking | null>(null);
  const [selectedPayMethod, setSelectedPayMethod] = useState<'cash' | 'qris' | 'transfer'>('cash');
  const [dpInputAmount, setDpInputAmount] = useState<number>(50000);
  const [isDpProcess, setIsDpProcess] = useState(false);

  // Helper Convert No HP ke Format WA (0896... -> 62896...)
  const formatPhoneNumberToWA = (phone: string) => {
    let cleaned = phone.replace(/\D/g, ''); // Hapus semua karakter non-angka
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.slice(1);
    }
    return cleaned;
  };

  // Helper Buka Chat WA
  const handleOpenWA = (phone: string, name: string) => {
    const formattedNum = formatPhoneNumberToWA(phone);
    const text = encodeURIComponent(`Halo Kak ${name}, konfirmasi booking lapangan Eksdi Padel...`);
    window.open(`https://wa.me/${formattedNum}?text=${text}`, '_blank');
  };

  // 1. Fetch Master Lapangan
  const fetchCourts = async () => {
    const { data } = await supabase.from('courts').select('id, name, price_per_hour').eq('is_active', true);
    if (data && data.length > 0) {
      setCourts(data as Court[]);
      setManualFormData((prev) => ({ ...prev, court_id: data[0].id }));
    }
  };

  // 2. Fetch Data Booking
  const fetchBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select('*, courts(name)')
      .eq('booking_date', selectedDate)
      .order('start_time', { ascending: true });

    if (!error && data) {
      setBookings(data as Booking[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCourts();
  }, []);

  useEffect(() => {
    fetchBookings();

    const channel = supabase
      .channel('dashboard-bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  // Handle Eksekusi Pembayaran / DP di Kasir
  const handleConfirmPayment = async () => {
    if (!payModalBooking) return;

    setSubmitting(true);
    const updatePayload = isDpProcess
      ? {
          payment_status: 'paid_dp',
          payment_method: selectedPayMethod,
          dp_amount: dpInputAmount,
        }
      : {
          payment_status: 'paid_cashier',
          payment_method: selectedPayMethod,
        };

    const { error } = await supabase
      .from('bookings')
      .update(updatePayload)
      .eq('id', payModalBooking.id);

    if (!error) {
      setPayModalBooking(null);
      fetchBookings();
    } else {
      alert('Gagal memproses pembayaran: ' + error.message);
    }
    setSubmitting(false);
  };

  // Handle Cancel Booking
  const handleCancelBooking = async (id: string, name: string) => {
    if (confirm(`Apakah kamu yakin ingin MEMBATALKAN booking atas nama ${name}?`)) {
      const { error } = await supabase
        .from('bookings')
        .update({ payment_status: 'cancelled' })
        .eq('id', id);

      if (!error) {
        fetchBookings();
      } else {
        alert('Gagal membatalkan booking: ' + error.message);
      }
    }
  };

  // Submit Manual Walk-In
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const selectedCourt = courts.find((c) => c.id === manualFormData.court_id);
    const pricePerHour = selectedCourt ? selectedCourt.price_per_hour : 150000;
    const totalPrice = pricePerHour * manualFormData.duration;

    const [h, m] = manualFormData.start_time.split(':').map(Number);
    const endH = h + manualFormData.duration;
    const endTimeStr = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;

    const { error } = await supabase.from('bookings').insert([
      {
        court_id: manualFormData.court_id,
        customer_name: manualFormData.customer_name,
        customer_phone: manualFormData.customer_phone,
        booking_date: selectedDate,
        start_time: `${manualFormData.start_time}:00`,
        duration: manualFormData.duration,
        end_time: endTimeStr,
        total_price: totalPrice,
        dp_amount: manualFormData.payment_status === 'paid_dp' ? manualFormData.dp_amount : 0,
        payment_status: manualFormData.payment_status,
        payment_method: manualFormData.payment_method,
      },
    ]);

    if (!error) {
      setIsModalOpen(false);
      setManualFormData({
        court_id: courts[0]?.id || '',
        customer_name: '',
        customer_phone: '',
        start_time: '08:00',
        duration: 1,
        payment_status: 'paid_cashier',
        payment_method: 'cash',
        dp_amount: 50000,
      });
      fetchBookings();
    } else {
      alert('Gagal menambah booking: ' + error.message);
    }
    setSubmitting(false);
  };

  // Format Rupiah
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Metrik Harian (Abaikan yang Cancelled)
  const activeBookingsList = bookings.filter((b) => b.payment_status !== 'cancelled');
  const totalTersewa = activeBookingsList.reduce((acc, curr) => acc + curr.duration, 0);
  const totalEstimasiOmset = activeBookingsList.reduce((acc, curr) => acc + Number(curr.total_price), 0);
  const totalLunas = activeBookingsList.filter((b) => b.payment_status === 'paid_cashier').length;

  // Filter Search
  const filteredBookings = bookings.filter(
    (b) =>
      b.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.customer_phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      
      {/* HEADER & ACTION BUTTON */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#141e1b] p-5 rounded-2xl border border-white/10">
        <div>
          <h1 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-wide">
            <Calendar className="w-5 h-5 text-[#ccff00]" />
            Kasir & Jadwal Lapangan
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Pantau reservasi harian, konfirmasi pembayaran, atau input booking pemain di tempat.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#ccff00] hover:bg-[#b8e600] text-zinc-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(204,255,0,0.2)] shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Tambah Booking Manual
        </button>
      </div>

      {/* 1. RINGKASAN METRIK HARIAN */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#141e1b] border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
            <Clock className="w-4 h-4 text-[#ccff00]" /> Total Tersewa
          </div>
          <p className="text-xl font-black text-white">{totalTersewa} <span className="text-xs font-normal text-zinc-400">Jam</span></p>
        </div>

        <div className="bg-[#141e1b] border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Lunas di Kasir
          </div>
          <p className="text-xl font-black text-emerald-400">{totalLunas} <span className="text-xs font-normal text-zinc-400">Booking</span></p>
        </div>

        <div className="bg-[#141e1b] border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
            <DollarSign className="w-4 h-4 text-[#ccff00]" /> Total Estimasi Omset
          </div>
          <p className="text-lg font-black text-[#ccff00]">{formatRupiah(totalEstimasiOmset)}</p>
        </div>

        <div className="bg-[#141e1b] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">Pilih Tanggal Jadwal</span>
            <button onClick={fetchBookings} className="text-zinc-400 hover:text-[#ccff00]">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#ccff00] mt-1"
          />
        </div>
      </div>

      {/* 2. BAR PENCARIAN */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-[#141e1b] p-3 rounded-2xl border border-white/10">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Cari nama pemain / no hp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ccff00]"
          />
        </div>

        <div className="text-xs text-zinc-400 text-right px-2">
          Jadwal untuk: <span className="font-bold text-[#ccff00]">{new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      {/* 3. LIST DAFTAR BOOKING */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider pl-1">
          Daftar Reservasi Lapangan
        </h2>

        {loading ? (
          <div className="text-center py-16 bg-[#141e1b] rounded-2xl border border-white/10">
            <RefreshCw className="w-6 h-6 text-[#ccff00] animate-spin mx-auto mb-2" />
            <p className="text-xs text-zinc-400">Memuat Jadwal Lapangan...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-16 bg-[#141e1b] rounded-2xl border border-white/10">
            <Calendar className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-xs text-zinc-400">Belum ada bookingan untuk tanggal ini.</p>
          </div>
        ) : (
          filteredBookings.map((b) => (
            <div
              key={b.id}
              className={`bg-[#141e1b] border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                b.payment_status === 'cancelled' ? 'border-rose-500/20 opacity-50' : 'border-white/10 hover:border-white/20'
              }`}
            >
              {/* Info Lapangan & Jam */}
              <div className="flex items-start gap-3.5">
                <div className="bg-[#ccff00]/10 border border-[#ccff00]/30 rounded-xl px-3 py-2 text-center shrink-0 min-w-[70px]">
                  <span className="block text-xs font-black text-[#ccff00]">{b.start_time.slice(0, 5)}</span>
                  <span className="block text-[10px] text-zinc-400">{b.duration} Jam</span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{b.customer_name}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/5 border border-white/10 text-[#ccff00]">
                      {b.courts?.name || 'Lapangan'}
                    </span>
                  </div>

                  {/* 🟢 NOMOR WA BISA DIKLIK LANGSUNG */}
                  <button
                    onClick={() => handleOpenWA(b.customer_phone, b.customer_name)}
                    className="text-xs text-zinc-400 hover:text-emerald-400 flex items-center gap-1.5 mt-1 transition-colors group"
                    title="Klik untuk Chat WA"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="underline decoration-dashed">{b.customer_phone}</span>
                  </button>
                </div>
              </div>

              {/* Tagihan & Tombol Aksi */}
              <div className="flex items-center justify-between md:justify-end gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-white/10">
                
                <div className="text-left md:text-right">
                  <span className="block text-[10px] text-zinc-400">Total Tagihan:</span>
                  <span className="text-sm font-black text-white">{formatRupiah(b.total_price)}</span>
                  {b.payment_status === 'paid_dp' && (
                    <span className="block text-[10px] text-amber-400 font-semibold">
                      Sisa: {formatRupiah(b.total_price - (b.dp_amount || 0))}
                    </span>
                  )}
                </div>

                {b.payment_status === 'cancelled' ? (
                  <span className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold">
                    Dibatalkan
                  </span>
                ) : b.payment_status === 'paid_cashier' ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Lunas ({b.payment_method?.toUpperCase()})
                    </span>
                    <button
                      onClick={() => handleCancelBooking(b.id, b.customer_name)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 transition-all"
                      title="Batalkan Booking"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {/* Tombol Pembayaran Kasir */}
                    <button
                      onClick={() => {
                        setPayModalBooking(b);
                        setIsDpProcess(false);
                      }}
                      className="bg-[#ccff00] hover:bg-[#b8e600] text-zinc-950 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(204,255,0,0.15)]"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      {b.payment_status === 'paid_dp' ? 'Pelunasan' : 'Bayar Kasir'}
                    </button>

                    {/* Tombol DP jika belum DP */}
                    {b.payment_status === 'pending' && (
                      <button
                        onClick={() => {
                          setPayModalBooking(b);
                          setIsDpProcess(true);
                        }}
                        className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 font-bold px-3 py-2 rounded-xl text-xs transition-all"
                      >
                        Bayar DP
                      </button>
                    )}

                    {/* Tombol Cancel */}
                    <button
                      onClick={() => handleCancelBooking(b.id, b.customer_name)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-all"
                      title="Batalkan Booking"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

              </div>
            </div>
          ))
        )}
      </div>

      {/* ------------------ 📱 MODAL OPSI PEMBAYARAN KASIR / DP ------------------ */}
      {payModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#141e1b] border border-white/10 rounded-3xl p-6 shadow-2xl relative animate-fadeIn">
            
            <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">
                  {isDpProcess ? 'Konfirmasi Bayar DP' : 'Konfirmasi Pelunasan / Bayar'}
                </h3>
                <p className="text-[11px] text-zinc-400">{payModalBooking.customer_name} • {payModalBooking.courts?.name}</p>
              </div>
              <button onClick={() => setPayModalBooking(null)} className="p-1.5 rounded-full bg-white/5 text-zinc-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Ringkasan Biaya */}
              <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10 text-xs space-y-1.5">
                <div className="flex justify-between text-zinc-400">
                  <span>Total Biaya Main:</span>
                  <span className="font-bold text-white">{formatRupiah(payModalBooking.total_price)}</span>
                </div>
                {payModalBooking.payment_status === 'paid_dp' && (
                  <div className="flex justify-between text-amber-400">
                    <span>Sudah DP:</span>
                    <span className="font-bold">-{formatRupiah(payModalBooking.dp_amount || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#ccff00] font-black text-sm pt-1 border-t border-white/10">
                  <span>{isDpProcess ? 'Nominal DP:' : 'Sisa Wajib Bayar:'}</span>
                  <span>
                    {isDpProcess
                      ? formatRupiah(dpInputAmount)
                      : formatRupiah(payModalBooking.total_price - (payModalBooking.dp_amount || 0))}
                  </span>
                </div>
              </div>

              {/* Input Nominal DP jika Mode DP */}
              {isDpProcess && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Nominal DP (Rp)</label>
                  <input
                    type="number"
                    step="10000"
                    value={dpInputAmount}
                    onChange={(e) => setDpInputAmount(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#ccff00]"
                  />
                </div>
              )}

              {/* Pilih Metode Pembayaran */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">Pilih Metode Pembayaran</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPayMethod('cash')}
                    className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1 text-xs font-bold transition-all ${
                      selectedPayMethod === 'cash'
                        ? 'bg-[#ccff00] border-[#ccff00] text-zinc-950'
                        : 'bg-white/5 border-white/10 text-zinc-300'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    Tunai (Cash)
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPayMethod('qris')}
                    className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1 text-xs font-bold transition-all ${
                      selectedPayMethod === 'qris'
                        ? 'bg-[#ccff00] border-[#ccff00] text-zinc-950'
                        : 'bg-white/5 border-white/10 text-zinc-300'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    QRIS
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPayMethod('transfer')}
                    className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1 text-xs font-bold transition-all ${
                      selectedPayMethod === 'transfer'
                        ? 'bg-[#ccff00] border-[#ccff00] text-zinc-950'
                        : 'bg-white/5 border-white/10 text-zinc-300'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    Transfer
                  </button>
                </div>
              </div>

              {/* Tombol Simpan Pembayaran */}
              <button
                onClick={handleConfirmPayment}
                disabled={submitting}
                className="w-full bg-[#ccff00] hover:bg-[#b8e600] text-zinc-950 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(204,255,0,0.2)] mt-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                TANDAI {isDpProcess ? 'DP DIBAYAR' : 'LUNAS'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ------------------ 📱 MODAL INPUT BOOKING MANUAL (WALK-IN) ------------------ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#141e1b] border border-white/10 rounded-3xl p-6 shadow-2xl relative animate-fadeIn max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#ccff00]" />
                Input Booking Pemain (Walk-in/HP)
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-full bg-white/5 text-zinc-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3.5">
              
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Pilih Lapangan</label>
                <select
                  value={manualFormData.court_id}
                  onChange={(e) => setManualFormData({ ...manualFormData, court_id: e.target.value })}
                  className="w-full bg-[#0f1715] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#ccff00]"
                >
                  {courts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({formatRupiah(c.price_per_hour)}/jam)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Nama Pemain</label>
                <input
                  type="text"
                  required
                  placeholder="Nama Lengkap / Panggilan"
                  value={manualFormData.customer_name}
                  onChange={(e) => setManualFormData({ ...manualFormData, customer_name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ccff00]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Nomor HP / WhatsApp</label>
                <input
                  type="tel"
                  required
                  placeholder="08xxxxxxxxxx"
                  value={manualFormData.customer_phone}
                  onChange={(e) => setManualFormData({ ...manualFormData, customer_phone: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ccff00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    required
                    value={manualFormData.start_time}
                    onChange={(e) => setManualFormData({ ...manualFormData, start_time: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#ccff00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Durasi (Jam)</label>
                  <select
                    value={manualFormData.duration}
                    onChange={(e) => setManualFormData({ ...manualFormData, duration: Number(e.target.value) })}
                    className="w-full bg-[#0f1715] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#ccff00]"
                  >
                    {[1, 2, 3, 4].map((hr) => (
                      <option key={hr} value={hr}>{hr} Jam</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Status Pembayaran</label>
                  <select
                    value={manualFormData.payment_status}
                    onChange={(e) => setManualFormData({ ...manualFormData, payment_status: e.target.value })}
                    className="w-full bg-[#0f1715] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#ccff00]"
                  >
                    <option value="paid_cashier">Lunas di Kasir</option>
                    <option value="paid_dp">Bayar DP dulu</option>
                    <option value="pending">Belum Bayar (Pending)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Metode Bayar</label>
                  <select
                    value={manualFormData.payment_method}
                    onChange={(e) => setManualFormData({ ...manualFormData, payment_method: e.target.value as any })}
                    className="w-full bg-[#0f1715] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#ccff00]"
                  >
                    <option value="cash">Tunai (Cash)</option>
                    <option value="qris">QRIS</option>
                    <option value="transfer">Transfer Bank</option>
                  </select>
                </div>
              </div>

              {manualFormData.payment_status === 'paid_dp' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Nominal DP (Rp)</label>
                  <input
                    type="number"
                    step="10000"
                    value={manualFormData.dp_amount}
                    onChange={(e) => setManualFormData({ ...manualFormData, dp_amount: Number(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#ccff00]"
                  />
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#ccff00] hover:bg-[#b8e600] text-zinc-950 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(204,255,0,0.15)] disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>SIMPAN BOOKING</span>}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}