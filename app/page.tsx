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
  Calendar as CalendarIcon,
  HelpCircle,
  ShieldCheck,
  Award,
  Zap,
  Menu,
  Footprints,
  CookieIcon
} from 'lucide-react';
import Image from 'next/image';

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
  const adminWA = "628132314141";

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
  const [selectedCourtId, setSelectedCourtId] = useState<string>('auto'); // 'auto' atau court.id spesifik
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

  // 2. Fetch Booking pada Tanggal yang Dipilih (Hanya yang LUNAS atau DP)
  const fetchBookingsForDate = async (dateStr: string) => {
    if (!dateStr) return;
    setLoadingSlots(true);

    const { data, error } = await supabase
      .from('bookings')
      .select('court_id, start_time, end_time, payment_status')
      .eq('booking_date', dateStr)
      .in('payment_status', ['paid_cashier', 'paid_dp']);

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

  // Cek Apakah Lapangan Spesifik Terkunci / Terisi pada Jam & Durasi Ini
  const isCourtLockedForTime = (courtId: string, startTimeStr: string, durationMins: number) => {
    if (!startTimeStr) return false;
    const reqStart = timeToMinutes(startTimeStr);
    const reqEnd = reqStart + durationMins;

    return existingBookings.some((b) => {
      if (b.court_id !== courtId) return false;
      const isPaidOrDp = b.payment_status === 'paid_cashier' || b.payment_status === 'paid_dp';
      if (!isPaidOrDp) return false;

      const bStart = timeToMinutes(b.start_time);
      const bEnd = timeToMinutes(b.end_time);

      // Rumus Overlap Check
      return reqStart < bEnd && reqEnd > bStart;
    });
  };

  // 3. Cari Lapangan Otomatis yang Masih Kosong (Jika Mode 'auto')
  const getAutoAvailableCourt = (startTimeStr: string, durationMins: number) => {
    if (!activeCourts || activeCourts.length === 0) return null;
    const sortedCourts = [...activeCourts].sort((a, b) => a.name.localeCompare(b.name));

    for (const court of sortedCourts) {
      const locked = isCourtLockedForTime(court.id, startTimeStr, durationMins);
      if (!locked) return court;
    }
    return null; // Semua terisi
  };

  // Mendapatkan Lapangan Terpilih Aktual (Otomatis / Manual)
  const getFinalSelectedCourt = () => {
    if (!selectedTime) return null;

    if (selectedCourtId === 'auto') {
      return getAutoAvailableCourt(selectedTime, durationMinutes);
    } else {
      const court = activeCourts.find((c) => c.id === selectedCourtId);
      if (court && !isCourtLockedForTime(court.id, selectedTime, durationMinutes)) {
        return court;
      }
      return null;
    }
  };

  // 4. Generate Date Carousel (30 Hari untuk Mobile)
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
    const startHour = 7;
    const endHour = 21;

    const now = new Date();
    const isToday = selectedDate === getTodayString();
    const currentHour = now.getHours();

    for (let h = startHour; h <= endHour; h++) {
      const durationHours = durationMinutes / 60;
      if (h + durationHours > endHour + 1) continue;

      const timeString = `${String(h).padStart(2, '0')}:00`;
      let isPassed = false;

      if (isToday && h <= currentHour) {
        isPassed = true;
      }

      // Slot dianggap terisi penuh HANYA jika semua lapangan habis
      let hasAvailableCourt = false;
      if (!isPassed) {
        const court = getAutoAvailableCourt(timeString, durationMinutes);
        if (court) hasAvailableCourt = true;
      }

      if (!hasAvailableCourt && !isToday) {
        isPassed = true;
      }

      const refCourt = activeCourts[0];
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
      });
    }
    return slots;
  };

  // Reset Jam Jika Pilihan Lapangan Manual Ternyata Bentrok
  useEffect(() => {
    if (selectedTime && selectedCourtId !== 'auto') {
      const locked = isCourtLockedForTime(selectedCourtId, selectedTime, durationMinutes);
      if (locked) {
        setSelectedCourtId('auto'); // Kembalikan ke otomatis jika manual bentrok
      }
    }
  }, [selectedTime, durationMinutes, selectedDate, selectedCourtId]);

  // Helper Hitung Waktu & Total
  const finalCourt = getFinalSelectedCourt();
  const durationHours = durationMinutes / 60;
  const hourlyRate = (selectedTime && finalCourt) ? getHourlyRate(selectedTime, finalCourt) : 0;
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

    const assignedCourt = getFinalSelectedCourt();

    if (!assignedCourt) {
      alert('Maaf, lapangan ini baru saja terisi. Silakan pilih lapangan / jam lainnya.');
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
    // {
    //   id: 'community',
    //   title: 'Join Trial Community RSVP',
    //   subtitle: 'Gabung grup tanding & latihan rutin',
    //   icon: <Users className="w-5 h-5 text-white" />,
    //   href: `https://wa.me/${adminWA}?text=Halo%20Admin,%20saya%20mau%20tanya%20info%20Trial%20Community%20Eksdi%20Padel`,
    // },
    {
      id: 'admin1',
      title: 'Chat Admin 1 (Booking & Informasi)',
      subtitle: 'Reservasi jadwal main, sewa raket, & info umum',
      icon: (
        <svg className="w-5 h-5 fill-emerald-400" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.605 1.728zm6.173-3.88c1.554.922 3.31 1.409 5.099 1.41h.005c5.454 0 9.89-4.435 9.893-9.89.001-2.642-1.028-5.126-2.897-6.996-1.868-1.869-4.351-2.898-6.993-2.898-5.454 0-9.89 4.435-9.893 9.89-.001 1.841.503 3.639 1.46 5.2l-.524 1.916 1.85-.482z" />
        </svg>
      ),
      href: `https://wa.me/${adminWA}?text=${encodeURIComponent(
        'Halo Admin Eksdi Padel, saya mau tanya info booking lapangan & sewa raket...'
      )}`,
    },
    {
      id: 'instagram',
      title: 'Instagram @eksdipadel',
      subtitle: 'Cek keseruan event, promo, & update komunitas',
      icon: (
        <svg className="w-5 h-5 fill-pink-400" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ),
      href: 'https://www.instagram.com/eksdipadelcourts',
    },
    {
    id: 'courtside',
    title: 'Booking Courtside',
    subtitle: 'Sewa lapangan & info klub',
    icon: (
      <Image 
        src="/courtside.png" 
        alt="Courtside Logo" 
        width={24} 
        height={24} 
        className="w-6 h-6 object-contain rounded-md"
      />
    ),
    href: 'https://courtside.id/clubs/eksdi-padel',
  },
    {
      id: 'location',
      title: 'Location & Google Maps',
      subtitle: 'Petunjuk arah ke Eksdi Padel Courts',
      icon: <MapPin className="w-5 h-5 text-rose-500" />,
      href: 'https://share.google/BoMBuKVnjijSLVPh6',
    },
    {
      id: 'menu',
      title: 'Menu EKSDI koffie',
      subtitle: '',
      icon: <CookieIcon className="w-5 h-5 text-amber-500" />,
      href: 'https://drive.google.com/drive/folders/1iB1-J2mxS1aZPw3fqEXQB8Ck4fu3JkGt',
    },
  ];

  return (
    <main className="min-h-screen bg-[#0f1715] text-white flex justify-center items-start px-4 py-8 relative overflow-hidden font-sans selection:bg-[#ccff00] selection:text-black">

      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,_rgba(204,255,0,0.08)_0%,_transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="w-full max-w-md flex flex-col items-center relative z-10 space-y-6">

        {/* HEADER PROFILE */}
        <header className="text-center w-full">
          <div className="relative w-24 h-24 mx-auto mb-4">
            {/* Container Lingkaran Foto Logo */}
            <div className="w-full h-full rounded-full bg-[#141e1b] border-2 border-[#ccff00] overflow-hidden shadow-[0_0_20px_rgba(204,255,0,0.2)] flex items-center justify-center p-1">
              <img
                src="/eksdipadel.png"
                alt="Eksdi Padel Logo"
                className="w-full h-full object-contain rounded-full"
              />
            </div>

            {/* Badge Verified Check */}
            <div className="absolute bottom-0 right-0 bg-[#ccff00] text-zinc-950 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-md z-10">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          </div>

          <h1 className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400 uppercase">
            EKSDI PADEL COURTS
          </h1>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            Sewa Lapangan Padel Premium & Komunitas Olahraga Tasikmalaya
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

            <a href={`https://wa.me/${adminWA}`} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 hover:border-[#ccff00] hover:text-[#ccff00] transition-all" title="WhatsApp Eksdi Padel">
              <MessageCircle className="w-4 h-4" />
            </a>
            <a href="https://share.google/BoMBuKVnjijSLVPh6" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 hover:border-[#ccff00] hover:text-[#ccff00] transition-all" title="Google Maps Eksdi Padel">
              <MapPin className="w-4 h-4" />
            </a>
          </div>
        </header>

        {/* LINK LIST & QUICK ACTION */}
        <section className="w-full space-y-3.5">
          <div className="w-full text-left text-[11px] font-bold text-[#ccff00] uppercase tracking-widest pl-1">
            Quick Action
          </div>

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
              <p className="text-xs text-zinc-400 truncate mt-0.5">Cek jam, pilih lapangan & reservasi WA</p>
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
        </section>

        {/* 🌟 SEO KONTEN TERSTRUKTUR & INFORMASI FASILITAS */}
        <section className="w-full bg-[#141e1b] border border-white/10 rounded-2xl p-4 space-y-4 text-left">
          <h2 className="text-xs font-black text-[#ccff00] uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4" /> Mengapa Memilih Eksdi Padel Courts?
          </h2>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 bg-white/5 rounded-xl border border-white/5 space-y-1">
              <Zap className="w-4 h-4 text-amber-400" />
              <div className="font-bold text-white">Lapangan Karpet WPT</div>
              <p className="text-[10px] text-zinc-400">Standar internasional World Padel Tour dengan pencerahan LED terang.</p>
            </div>
            <div className="p-2.5 bg-white/5 rounded-xl border border-white/5 space-y-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <div className="font-bold text-white">Rental Alat Lengkap</div>
              <p className="text-[10px] text-zinc-400">Sewa raket premium & bola resmi langsung di tempat lokasi.</p>
            </div>
          </div>

          {/* Sesi & Tarif Ringkas */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1.5 text-xs">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
              <span>Jadwal Sesi Tarif</span>
              <Clock className="w-3.5 h-3.5 text-[#ccff00]" />
            </div>
            <div className="flex justify-between text-[11px] text-zinc-300">
              <span>Sesi 1 (Pagi - Siang: 07.00 - 14.00)</span>
              <strong className="text-[#ccff00]">Promo Pagi</strong>
            </div>
            <div className="flex justify-between text-[11px] text-zinc-300">
              <span>Sesi 2 (Sore - Malam: 15.00 - 21.00)</span>
              <strong className="text-white">Reguler / Prime</strong>
            </div>
          </div>

          {/* SEO Accordion FAQ */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <h3 className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-[#ccff00]" /> Pertanyaan Sering Diajukan (FAQ)
            </h3>

            <details className="group border border-white/5 bg-white/5 rounded-xl p-2.5 text-[11px] cursor-pointer">
              <summary className="font-bold text-white flex justify-between items-center">
                Apakah bisa sewa raket di lokasi?
                <span className="text-zinc-500 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-zinc-400 mt-1.5 text-[10px] leading-relaxed">
                Tentu! Eksdi Padel menyediakan persewaan raket padel berkualitas tinggi dan penjualan bola resmi di area Kasir Cafe.
              </p>
            </details>

            <details className="group border border-white/5 bg-white/5 rounded-xl p-2.5 text-[11px] cursor-pointer">
              <summary className="font-bold text-white flex justify-between items-center">
                Bagaimana cara konfirmasi booking?
                <span className="text-zinc-500 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-zinc-400 mt-1.5 text-[10px] leading-relaxed">
                Setelah memilih jam dan lapangan di web ini, Anda akan diarahkan ke WhatsApp Admin untuk melunasi pembayaran (DP / Cashier).
              </p>
            </details>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="text-center text-xs text-zinc-500 space-y-1 pb-6">
          <p>© 2026 Eksdi Padel Courts. All rights reserved.</p>
          <p className="text-[10px] text-zinc-600">Tasikmalaya, Jawa Barat, Indonesia</p>
        </footer>

      </div>

      {/* ------------------ 📱 MODAL RESERVASI LAPANGAN RESPONSIF DENGAN PILIHAN LAPANGAN ------------------ */}
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

              {/* 1. TANGGAL MAIN */}
              <div>
                <span className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  1. Pilih Tanggal Main
                </span>

                {/* 💻 DEKSTOP / TAB */}
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

                {/* 📱 MOBILE */}
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

              {/* 2. GRID SLOT JAM */}
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

              {/* 3. DURATION SELECTOR */}
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

              {/* 4. PILIHAN LAPANGAN (OTOMATIS / MANUAL COURT) */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    4. Pilih Lapangan
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    *Pilih Otomatis / Manual
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {/* Pilihan Otomatis */}
                  <button
                    type="button"
                    onClick={() => setSelectedCourtId('auto')}
                    className={`py-2.5 px-2 rounded-2xl border text-center transition-all ${selectedCourtId === 'auto'
                      ? 'bg-[#ccff00] border-[#ccff00] text-zinc-950 font-black shadow-[0_0_10px_rgba(204,255,0,0.2)]'
                      : 'bg-white/5 border-white/10 text-zinc-300 hover:border-white/20'
                      }`}
                  >
                    <span className="text-xs font-bold block">Otomatis</span>
                    <span className="text-[8px] uppercase tracking-wider opacity-80 block">Cari Kosong</span>
                  </button>

                  {/* Pilihan Manual dari Master Lapangan Active */}
                  {activeCourts.map((court) => {
                    const isLocked = selectedTime ? isCourtLockedForTime(court.id, selectedTime, durationMinutes) : false;
                    const isSelected = selectedCourtId === court.id;

                    return (
                      <button
                        key={court.id}
                        type="button"
                        disabled={isLocked}
                        onClick={() => setSelectedCourtId(court.id)}
                        className={`py-2.5 px-2 rounded-2xl border text-center transition-all ${isLocked
                          ? 'bg-white/5 border-transparent text-zinc-600 line-through cursor-not-allowed opacity-40'
                          : isSelected
                            ? 'bg-[#ccff00] border-[#ccff00] text-zinc-950 font-black shadow-[0_0_10px_rgba(204,255,0,0.2)]'
                            : 'bg-white/5 border-white/10 text-zinc-300 hover:border-white/20'
                          }`}
                      >
                        <span className="text-xs font-bold block truncate">{court.name}</span>
                        <span className="text-[8px] uppercase tracking-wider opacity-80 block">
                          {isLocked ? 'Penuh' : 'Tersedia'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. FORM DATA PEMESAN */}
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

              {/* 6. SUMMARY ALOKASI LAPANGAN & TOTAL BAYAR */}
              {selectedTime && finalCourt && (
                <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between text-xs">
                  <div>
                    <span className="block font-bold text-white">
                      {finalCourt.name} {selectedCourtId === 'auto' ? '(Otomatis System)' : '(Pilihan Anda)'}
                    </span>
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
                disabled={submitting || !selectedTime || !finalCourt}
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