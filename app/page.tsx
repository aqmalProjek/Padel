'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getHourlyRate, CourtPricing } from '@/lib/pricing';
import {
  CalendarCheck,
  Users,
  MessageCircle,
  MapPin,
  ChevronRight,
  Check,
  X,
  Clock,
  User,
  Mail,
  Phone,
  Send,
  Loader2,
  Calendar as CalendarIcon
} from 'lucide-react';

interface Court extends CourtPricing {
  id: string;
  name: string;
  is_active: boolean;
}

interface ExistingBooking {
  court_id: string;
  start_time: string;
  end_time: string;
  payment_status: string;
}

export default function EksdiPadelLinktree() {
  const adminWA = "6289630041079";

  // Helper YYYY-MM-DD
  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // State Modal & Booking
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [durationMinutes, setDurationMinutes] = useState<number>(60); // 60, 120, 180 min
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Database Data State
  const [activeCourts, setActiveCourts] = useState<Court[]>([]);
  const [existingBookings, setExistingBookings] = useState<ExistingBooking[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  // 1. Fetch Lapangan Aktif dari Supabase
  useEffect(() => {
    const fetchCourts = async () => {
      const { data, error } = await supabase
        .from('courts')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (!error && data) {
        setActiveCourts(data as Court[]);
      }
    };
    fetchCourts();
  }, []);

  // 2. Fetch Booking pada Tanggal yang Dipilih
  // 2. Fetch Booking pada Tanggal yang Dipilih (Hanya yang LUNAS atau DP)
  const fetchBookingsForDate = async (dateStr: string) => {
    if (!dateStr) return;
    setLoadingSlots(true);

    const { data, error } = await supabase
      .from('bookings')
      .select('court_id, start_time, end_time, payment_status')
      .eq('booking_date', dateStr)
      .in('payment_status', ['paid_cashier', 'paid_dp']); // 👈 HANYA AMBIL YANG SUDAH DP ATAU LUNAS

    if (!error && data) {
      setExistingBookings(data as ExistingBooking[]);
    } else {
      setExistingBookings([]);
    }
    setLoadingSlots(false);
  };

  useEffect(() => {
    if (selectedDate) {
      fetchBookingsForDate(selectedDate);
    }
  }, [selectedDate]);

  // Helper Waktu
  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // 3. Cari Lapangan Otomatis yang Masih Kosong
  // 3. Cari Lapangan Otomatis yang Masih Kosong (Bebas dari Jadwal Lunas / DP)
  const getAvailableCourtForSlot = (startTimeStr: string, durationMins: number) => {
    if (!activeCourts || activeCourts.length === 0) return null;

    const reqStart = timeToMinutes(startTimeStr);
    const reqEnd = reqStart + durationMins;

    // Pastikan urutan lapangan dari Court 1, Court 2, dst.
    const sortedCourts = [...activeCourts].sort((a, b) => a.name.localeCompare(b.name));

    for (const court of sortedCourts) {
      // Cek apakah ada booking Lunas/DP di lapangan INI pada rentang jam tersebut
      const isCourtLocked = existingBookings.some((b) => {
        // Jika beda lapangan, abaikan
        if (b.court_id !== court.id) return false;

        // Pastikan hanya status Lunas/DP yang mengunci
        const isPaidOrDp = b.payment_status === 'paid_cashier' || b.payment_status === 'paid_dp';
        if (!isPaidOrDp) return false;

        const bStart = timeToMinutes(b.start_time);
        const bEnd = timeToMinutes(b.end_time);

        // Rumus iris jam (Overlap Check)
        return reqStart < bEnd && reqEnd > bStart;
      });

      // Jika lapangan ini TIDAK terkunci oleh Lunas/DP, PAKAI LAPANGAN INI!
      if (!isCourtLocked) {
        return court;
      }
    }

    return null; // Jika SEMUA lapangan terisi jadwal Lunas/DP
  };

  // 4. Generate Date Carousel (30 Hari / 1 Bulan untuk Mobile)
  const generateDateCarouselMobile = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const isoDate = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
      dates.push({ isoDate, dayName, dayNum });
    }
    return dates;
  };

  // 5. Generate Slot Jam (06.00 - 21.00)
  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 6;
    const endHour = 21;

    const now = new Date();
    const isToday = selectedDate === getTodayString();
    const currentHour = now.getHours();

    for (let h = startHour; h <= endHour; h++) {
      const durationHours = durationMinutes / 60;
      if (h + durationHours > endHour + 1) continue; // Melebihi jam tutup

      const timeString = `${String(h).padStart(2, '0')}:00`;
      let isPassed = false;

      if (isToday && h <= currentHour) {
        isPassed = true;
      }

      let availableCourt = null;
      if (!isPassed) {
        availableCourt = getAvailableCourtForSlot(timeString, durationMinutes);
        if (!availableCourt) {
          isPassed = true;
        }
      }

      const refCourt = availableCourt || activeCourts[0];
      let normalPrice = 125000;
      let isDiscounted = false;
      let effectivePrice = 125000;

      if (refCourt) {
        const isS1 = h >= 7 && h < 15;
        normalPrice = isS1 ? Number(refCourt.price_session_1) : Number(refCourt.price_session_2);
        isDiscounted = isS1 ? refCourt.is_discount_session_1 : refCourt.is_discount_session_2;
        effectivePrice = getHourlyRate(timeString, refCourt);
      }

      slots.push({
        time: timeString,
        isPassed,
        normalPrice,
        effectivePrice,
        isDiscounted,
        availableCourt,
      });
    }
    return slots;
  };

  // 🧠 SMART HOUR STATE RETENTION (Cek apakah jam terpilih masih valid)
  useEffect(() => {
    if (!selectedTime) return;

    const [h] = selectedTime.split(':').map(Number);
    const endHour = 21;
    const durationHours = durationMinutes / 60;

    // Jika jam terpilih + durasi melebihi jam tutup, baru reset jam
    if (h + durationHours > endHour + 1) {
      setSelectedTime('');
    } else {
      // Cek ketersediaan slot di durasi baru
      const court = getAvailableCourtForSlot(selectedTime, durationMinutes);
      if (!court) {
        setSelectedTime('');
      }
    }
  }, [durationMinutes, selectedDate]);

  // Helper Hitung Waktu & Total
  const selectedCourt = selectedTime ? getAvailableCourtForSlot(selectedTime, durationMinutes) : null;
  const durationHours = durationMinutes / 60;
  const hourlyRate = (selectedTime && selectedCourt) ? getHourlyRate(selectedTime, selectedCourt) : 0;
  const totalPrice = hourlyRate * durationHours;

  const calculateEndTimeStr = (startTime: string, durationMins: number) => {
    if (!startTime) return '';
    const [h, m] = startTime.split(':').map(Number);
    const totalMinutes = h * 60 + m + durationMins;
    const endH = Math.floor(totalMinutes / 60);
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  };

  const formatK = (val: number) => `${Math.round(val / 1000)}k`;

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  // Submit Booking
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !formData.name || !formData.phone) {
      alert('Mohon pilih jam dan isi Nama & No. HP!');
      return;
    }

    setSubmitting(true);

    // Ambil ulang lapangan kosong terkini
    const assignedCourt = getAvailableCourtForSlot(selectedTime, durationMinutes);

    if (!assignedCourt) {
      alert('Maaf, slot jam ini baru saja terisi oleh pengguna lain. Silakan pilih jam lain.');
      setSubmitting(false);
      return;
    }

    const endTime = calculateEndTimeStr(selectedTime, durationMinutes);
    const formattedStartTime = `${selectedTime}:00`;
    const formattedEndTime = `${endTime}:00`;

    const { error } = await supabase.from('bookings').insert([
      {
        court_id: assignedCourt.id,
        customer_name: formData.name,
        customer_phone: formData.phone,
        customer_email: formData.email || null,
        booking_date: selectedDate,
        start_time: formattedStartTime,
        duration: durationHours,
        end_time: formattedEndTime,
        total_price: totalPrice,
        payment_status: 'pending',
        payment_method: 'cashier',
      },
    ]);

    if (error) {
      alert('Gagal menyimpan booking: ' + error.message);
      setSubmitting(false);
      return;
    }

    const formattedDate = new Date(selectedDate).toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    const message =
      `*NEW BOOKING REQUEST - EKSDI PADEL*
----------------------------------------
👤 *Nama:* ${formData.name}
📱 *No. HP:* ${formData.phone}
📧 *Email:* ${formData.email || '-'}

📅 *Tanggal:* ${formattedDate}
⏰ *Jam Main:* ${selectedTime} - ${endTime} (${durationMinutes} Min)
🎾 *Lapangan:* ${assignedCourt.name}
💰 *Total Tagihan:* ${formatRupiah(totalPrice)}
----------------------------------------
Sistem telah mengalokasikan slot Anda. Mohon konfirmasi via WA ini. Terima kasih!`;

    window.open(`https://wa.me/${adminWA}?text=${encodeURIComponent(message)}`, '_blank');

    setSubmitting(false);
    setIsModalOpen(false);
    fetchBookingsForDate(selectedDate);
  };

  const links = [
    {
      id: 'community',
      title: 'Join Trial Community RSVP',
      subtitle: 'Gabung grup tanding & latihan rutin',
      icon: <Users className="w-5 h-5 text-white" />,
      href: `https://wa.me/${adminWA}?text=Halo%20Admin,%20saya%20mau%20tanya%20info%20Trial%20Community%20Eksdi%20Padel`,
    },
    {
      id: 'admin1',
      title: 'Chat Admin 1 (General Info)',
      subtitle: 'Layanan konsultasi & info sewa raket/alat',
      icon: <MessageCircle className="w-5 h-5 text-emerald-400" />,
      href: `https://wa.me/${adminWA}?text=Halo%20Admin%201,%20ada%20yang%20ingin%20saya%20tanyakan%20seputar%20Eksdi%20Padel`,
    },
    {
      id: 'admin2',
      title: 'Chat Admin 2 (Event & Group)',
      subtitle: 'Khusus reservasi event / turnamen',
      icon: <MessageCircle className="w-5 h-5 text-emerald-400" />,
      href: `https://wa.me/${adminWA}?text=Halo%20Admin%202,%20mau%20tanya%20soal%20event/tournament%20di%20Eksdi%20Padel`,
    },
    {
      id: 'location',
      title: 'Location & Google Maps',
      subtitle: 'Petunjuk arah ke Eksdi Padel Courts',
      icon: <MapPin className="w-5 h-5 text-rose-500" />,
      href: 'https://share.google/BoMBuKVnjijSLVPh6',
    },
  ];

  return (
    <main className="min-h-screen bg-[#0f1715] text-white flex justify-center items-start px-4 py-8 relative overflow-hidden font-sans selection:bg-[#ccff00] selection:text-black">

      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,_rgba(204,255,0,0.08)_0%,_transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="w-full max-w-md flex flex-col items-center relative z-10">

        {/* HEADER PROFILE */}
        <div className="text-center mb-6 w-full">
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-zinc-800 to-zinc-950 border-2 border-[#ccff00] flex items-center justify-center shadow-[0_0_20px_rgba(204,255,0,0.2)]">
              <div className="w-10 h-10 rounded-full border-2 border-dashed border-[#ccff00] flex items-center justify-center">
                <span className="text-[#ccff00] text-[10px] font-black tracking-widest">EKSDI</span>
              </div>
            </div>
            <div className="absolute bottom-0 right-0 bg-[#ccff00] text-zinc-950 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-md">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          </div>

          <h1 className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400 uppercase">
            EKSDI PADEL
          </h1>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            Premium Padel Courts & Community
          </p>

          <div className="flex justify-center gap-3 mt-4">
            <a
              href="https://www.instagram.com/eksdipadelcourts"
              target="_blank"
              rel="noreferrer"
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 hover:border-[#ccff00] hover:text-[#ccff00] transition-all"
              title="Instagram Eksdi Padel"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>

            <a href={`https://wa.me/${adminWA}`} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 hover:border-[#ccff00] hover:text-[#ccff00] transition-all">
              <MessageCircle className="w-4 h-4" />
            </a>
            <a href="https://share.google/BoMBuKVnjijSLVPh6" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 hover:border-[#ccff00] hover:text-[#ccff00] transition-all">
              <MapPin className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="w-full text-left text-[11px] font-bold text-[#ccff00] uppercase tracking-widest my-3 pl-1">
          Quick Action
        </div>

        {/* LINK LIST */}
        <div className="w-full space-y-3.5">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full group relative flex items-center p-4 rounded-2xl border backdrop-blur-md transition-all duration-300 hover:-translate-y-1 shadow-lg bg-gradient-to-r from-[#ccff00]/15 to-transparent border-[#ccff00] hover:shadow-[0_0_25px_rgba(204,255,0,0.25)] text-left"
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mr-4 bg-[#ccff00]">
              <CalendarCheck className="w-5 h-5 text-zinc-950" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-wide group-hover:text-[#ccff00] transition-colors truncate">
                  BOOK COURT NOW
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-[#ccff00] text-zinc-950 uppercase">
                  ONLINE
                </span>
              </div>
              <p className="text-xs text-zinc-400 truncate mt-0.5">Cek jam & langsung reservasi via WA</p>
            </div>

            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-[#ccff00] group-hover:translate-x-1 transition-all ml-2 shrink-0" />
          </button>

          {links.map((item) => (
            <a
              key={item.id}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="group relative flex items-center p-4 rounded-2xl border backdrop-blur-md transition-all duration-300 hover:-translate-y-1 shadow-lg bg-white/5 border-white/10 hover:border-[#ccff00]/50 hover:bg-white/10"
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mr-4 bg-white/5">
                {item.icon}
              </div>

              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold text-white tracking-wide group-hover:text-[#ccff00] transition-colors truncate block">
                  {item.title}
                </span>
                <p className="text-xs text-zinc-400 truncate mt-0.5">{item.subtitle}</p>
              </div>

              <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-[#ccff00] group-hover:translate-x-1 transition-all ml-2 shrink-0" />
            </a>
          ))}
        </div>

        {/* FOOTER */}
        <footer className="mt-10 text-center text-xs text-zinc-500 space-y-1">
          <p>© 2026 Eksdi Padel Courts. All rights reserved.</p>
        </footer>

      </div>

      {/* ------------------ 📱 MODAL RESERVASI LAPANGAN RESPONSIF ------------------ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-sm transition-all animate-fadeIn">
          <div className="w-full max-w-md bg-[#141e1b] border border-white/10 rounded-t-3xl md:rounded-3xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto relative font-sans">

            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-4">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-[#ccff00]" /> Reservasi Lapangan
                </h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">Eksdi Padel • Sesi 1 (07-14) & Sesi 2 (15-21)</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full bg-white/5 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* 1. TANGGAL MAIN: INPUT DATE DI PC / CAROUSEL + TOMBOL LAINNYA DI MOBILE */}
              <div>
                <span className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  1. Pilih Tanggal Main
                </span>

                {/* 💻 DEKSTOP / TAB (Layar Lebar) -> Gunakan Input Date Langsung */}
                <div className="hidden md:block">
                  <input
                    type="date"
                    required
                    min={getTodayString()}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#ccff00]"
                  />
                </div>

                {/* 📱 MOBILE (Layar HP) -> Carousel 30 Hari + Tombol "Tgl Lainnya" */}
                <div className="md:hidden">
                  {!showCustomDatePicker ? (
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none items-center">
                      {generateDateCarouselMobile().map((d) => {
                        const isSelected = selectedDate === d.isoDate;
                        return (
                          <button
                            key={d.isoDate}
                            type="button"
                            onClick={() => setSelectedDate(d.isoDate)}
                            className={`px-3.5 py-2 rounded-2xl border text-center shrink-0 transition-all ${isSelected
                                ? 'bg-[#ccff00] border-[#ccff00] text-zinc-950 font-black shadow-[0_0_15px_rgba(204,255,0,0.25)]'
                                : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20'
                              }`}
                          >
                            <span className="block text-[10px] uppercase font-semibold">{d.dayName}</span>
                            <span className="block text-xs font-bold mt-0.5">{d.dayNum}</span>
                          </button>
                        );
                      })}

                      {/* Tombol Tgl Lainnya di Paling Kanan Mobile */}
                      <button
                        type="button"
                        onClick={() => setShowCustomDatePicker(true)}
                        className="px-3.5 py-2 rounded-2xl border border-white/10 bg-white/5 text-center shrink-0 text-zinc-300 font-bold flex flex-col items-center justify-center"
                      >
                        <CalendarIcon className="w-3.5 h-3.5 text-[#ccff00]" />
                        <span className="text-[10px] mt-0.5 whitespace-nowrap">Tgl Lainnya</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        required
                        min={getTodayString()}
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#ccff00]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCustomDatePicker(false)}
                        className="px-3 py-2 rounded-xl bg-white/10 text-xs font-bold text-zinc-300 shrink-0"
                      >
                        Kembali
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. GRID SLOT JAM & BADGE HARGA (DENGAN CORET DISKON) */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    2. Pilih Jam Mulai
                  </span>
                  {selectedTime && (
                    <span className="text-[10px] font-bold text-[#ccff00] bg-[#ccff00]/10 px-2 py-0.5 rounded-md border border-[#ccff00]/30">
                      {selectedTime} - {calculateEndTimeStr(selectedTime, durationMinutes)}
                    </span>
                  )}
                </div>

                {loadingSlots ? (
                  <div className="text-center py-8 text-xs text-zinc-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#ccff00]" />
                    <span>Mengecek ketersediaan lapangan...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto pr-1">
                    {generateTimeSlots().map((slot) => {
                      const isSelected = selectedTime === slot.time;
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={slot.isPassed}
                          onClick={() => setSelectedTime(slot.time)}
                          className={`p-2 rounded-2xl border text-center flex flex-col items-center justify-center transition-all ${slot.isPassed
                              ? 'bg-white/5 border-transparent text-zinc-600 line-through cursor-not-allowed opacity-40'
                              : isSelected
                                ? 'bg-[#ccff00] border-[#ccff00] text-zinc-950 font-black shadow-[0_0_12px_rgba(204,255,0,0.3)]'
                                : 'bg-white/5 border-white/10 text-zinc-200 hover:border-[#ccff00]/50'
                            }`}
                        >
                          <span className="text-xs font-bold">{slot.time}</span>

                          <div className="mt-0.5 flex flex-col items-center">
                            {slot.isDiscounted ? (
                              <>
                                <span className="text-[8px] line-through text-zinc-500 leading-none">
                                  {formatK(slot.normalPrice)}
                                </span>
                                <span className={`text-[9px] font-extrabold leading-none ${isSelected ? 'text-zinc-950' : 'text-amber-400'}`}>
                                  {formatK(slot.effectivePrice)}
                                </span>
                              </>
                            ) : (
                              <span className={`text-[9px] font-semibold ${isSelected ? 'text-zinc-950' : 'text-zinc-400'}`}>
                                {formatK(slot.effectivePrice)}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. DURATION SELECTOR (60 MIN, 120 MIN, 180 MIN) */}
              <div>
                <span className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  3. Durasi Main
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[60, 120, 180].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={`py-2.5 rounded-2xl border text-xs font-bold transition-all ${durationMinutes === mins
                          ? 'bg-[#ccff00] border-[#ccff00] text-zinc-950 shadow-[0_0_10px_rgba(204,255,0,0.2)]'
                          : 'bg-white/5 border-white/10 text-zinc-300 hover:border-white/20'
                        }`}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. FORM DATA PEMESAN */}
              <div className="space-y-2.5 pt-2 border-t border-white/10">
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Atas Nama Pemesan"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ccff00]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      placeholder="Nomor HP / WA"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ccff00]"
                    />
                  </div>

                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      placeholder="Email (Opsional)"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ccff00]"
                    />
                  </div>
                </div>
              </div>

              {/* 5. SUMMARY ALOKASI LAPANGAN & TOTAL BAYAR */}
              {selectedTime && selectedCourt && (
                <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between text-xs">
                  <div>
                    <span className="block font-bold text-white">{selectedCourt.name} (Otomatis)</span>
                    <span className="text-[10px] text-zinc-400">
                      {selectedTime} - {calculateEndTimeStr(selectedTime, durationMinutes)} ({durationMinutes} min)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 block">Total Estimasi:</span>
                    <span className="text-sm font-black text-[#ccff00]">{formatRupiah(totalPrice)}</span>
                  </div>
                </div>
              )}

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={submitting || !selectedTime}
                className="w-full bg-[#ccff00] hover:bg-[#b8e600] text-zinc-950 font-black py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(204,255,0,0.2)] disabled:opacity-40"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>KIRIM RESERVASI VIA WHATSAPP</span>
                  </>
                )}
              </button>

            </form>

          </div>
        </div>
      )}

    </main>
  );
}