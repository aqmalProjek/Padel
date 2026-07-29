'use client';

import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck, 
  Users, 
  MessageCircle, 
  MapPin, 
  ChevronRight, 
  Check, 
  CameraIcon, 
  X,
  Clock,
  User,
  Mail,
  Phone,
  Calendar as CalendarIcon,
  Send
} from 'lucide-react';

export default function EksdiPadelLinktree() {
  const adminWA = "6289630041079";
  
  // State Modal & Booking
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [duration, setDuration] = useState<number>(1); // default 1 jam
  const [selectedTime, setSelectedTime] = useState<string>('');
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  // Generate 7 Hari ke Depan
  const [availableDates, setAvailableDates] = useState<{ fullDate: string; displayDate: string; dayName: string; isToday: boolean }[]>([]);

  useEffect(() => {
    const dates = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);

      const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });
      const displayDate = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      const fullDate = d.toISOString().split('T')[0];

      dates.push({
        fullDate,
        displayDate,
        dayName,
        isToday: i === 0,
      });
    }

    setAvailableDates(dates);
    if (dates.length > 0) {
      setSelectedDate(dates[0].fullDate); // default pilih hari ini
    }
  }, []);

  // Generate Slot Jam (06:00 - 21:00, interval 30 menit)
  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 6;
    const endHour = 21; // Tutup jam 21:00

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    for (let h = startHour; h < endHour; h++) {
      for (let m of [0, 30]) {
        // Cek jika total waktu + durasi melebihi jam 21:00
        const endCalculatedHour = h + duration + (m === 30 ? 0.5 : 0);
        if (endCalculatedHour > endHour) continue;

        const timeString = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        
        // Cek apakah slot sudah lewat jika tanggal yang dipilih adalah hari ini
        let isPassed = false;
        if (selectedDate === availableDates[0]?.fullDate) {
          if (h < currentHour || (h === currentHour && m <= currentMinute)) {
            isPassed = true;
          }
        }

        slots.push({
          time: timeString,
          isPassed,
        });
      }
    }
    return slots;
  };

  // Helper Menghitung Rentang Jam (misal 08:30 -> 08:30 - 10:30)
  const calculateTimeRange = (startTime: string, durationHours: number) => {
    if (!startTime) return '';
    const [h, m] = startTime.split(':').map(Number);
    const endH = h + Math.floor(durationHours);
    const endM = m + (durationHours % 1 !== 0 ? 30 : 0);
    
    let finalEndH = endH;
    let finalEndM = endM;
    if (finalEndM >= 60) {
      finalEndH += 1;
      finalEndM -= 60;
    }

    const formattedEnd = `${String(finalEndH).padStart(2, '0')}:${String(finalEndM).padStart(2, '0')}`;
    return `${startTime} - ${formattedEnd}`;
  };

  // Reset Pilihan Jam saat Tanggal / Durasi Berubah
  useEffect(() => {
    setSelectedTime('');
  }, [selectedDate, duration]);

  // Submit ke WhatsApp
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !formData.name || !formData.phone) {
      alert('Mohon lengkapi semua data booking!');
      return;
    }

    const timeRange = calculateTimeRange(selectedTime, duration);
    const formattedDate = new Date(selectedDate).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const message = 
`*NEW BOOKING REQUEST - EKSDI PADEL*
----------------------------------------
 *Nama:* ${formData.name}
 *No. HP:* ${formData.phone}
 *Email:* ${formData.email || '-'}

 *Tanggal:* ${formattedDate}
 *Jam Main:* ${timeRange} (${duration} Jam)
----------------------------------------
Mohon konfirmasi ketersediaan lapangan & detail pembayarannya. Terima kasih!`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${adminWA}?text=${encodedMessage}`, '_blank');
    setIsModalOpen(false);
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
            <a href="https://www.instagram.com/eksdipadelcourts" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 hover:border-[#ccff00] hover:text-[#ccff00] transition-all">
              <CameraIcon className="w-4 h-4" />
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
          
          {/* 🎯 TOMBOL BOOKING UTAMA (BUKA MODAL) */}
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

          {/* LINK LAINNYA */}
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
          <p>
            Digital Solution powered by{' '}
            <a href={`https://wa.me/${adminWA}`} target="_blank" rel="noreferrer" className="text-[#ccff00] font-semibold hover:underline">
              NamaKamu Studio
            </a>
          </p>
        </footer>

      </div>

      {/* ------------------ 📱 POP-UP MODAL BOOKING ------------------ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm transition-all animate-fadeIn">
          <div className="w-full max-w-lg bg-[#141e1b] border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto relative">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#ccff00]/10 border border-[#ccff00] flex items-center justify-center">
                  <CalendarCheck className="w-4 h-4 text-[#ccff00]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Reservasi Lapangan</h3>
                  <p className="text-[11px] text-zinc-400">Eksdi Padel Courts • Jam Operasional 06:00 - 21:00</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* 1. Pilih Tanggal (7 Hari) */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 mb-2">
                  <CalendarIcon className="w-3.5 h-3.5 text-[#ccff00]" /> 1. Pilih Tanggal
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {availableDates.map((d) => (
                    <button
                      key={d.fullDate}
                      type="button"
                      onClick={() => setSelectedDate(d.fullDate)}
                      className={`flex-1 min-w-[70px] p-2.5 rounded-xl border text-center transition-all ${
                        selectedDate === d.fullDate
                          ? 'bg-[#ccff00] border-[#ccff00] text-zinc-950 font-bold'
                          : 'bg-white/5 border-white/10 text-zinc-300 hover:border-white/30'
                      }`}
                    >
                      <span className="block text-[10px] uppercase opacity-80">{d.isToday ? 'Hari Ini' : d.dayName}</span>
                      <span className="block text-xs font-bold mt-0.5">{d.displayDate}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Pilih Durasi Main */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 mb-2">
                  <Clock className="w-3.5 h-3.5 text-[#ccff00]" /> 2. Durasi Main
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((hr) => (
                    <button
                      key={hr}
                      type="button"
                      onClick={() => setDuration(hr)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        duration === hr
                          ? 'bg-[#ccff00]/20 border-[#ccff00] text-[#ccff00]'
                          : 'bg-white/5 border-white/10 text-zinc-300 hover:border-white/20'
                      }`}
                    >
                      {hr} Jam
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Pilih Jam Booking */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#ccff00]" /> 3. Pilih Jam Mulai
                  </span>
                  {selectedTime && (
                    <span className="text-[11px] text-[#ccff00] font-bold bg-[#ccff00]/10 px-2 py-0.5 rounded-md border border-[#ccff00]/30">
                      Waktu: {calculateTimeRange(selectedTime, duration)}
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
                  {generateTimeSlots().map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={slot.isPassed}
                      onClick={() => setSelectedTime(slot.time)}
                      className={`p-2 rounded-lg border text-xs font-medium transition-all ${
                        slot.isPassed
                          ? 'bg-white/5 border-transparent text-zinc-600 line-through cursor-not-allowed'
                          : selectedTime === slot.time
                          ? 'bg-[#ccff00] border-[#ccff00] text-zinc-950 font-bold shadow-[0_0_10px_rgba(204,255,0,0.3)]'
                          : 'bg-white/5 border-white/10 text-zinc-200 hover:border-[#ccff00]/50'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Form Data Pemesan */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="Atas Nama Siapa?"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ccff00]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <Phone className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                    <input
                      type="tel"
                      required
                      placeholder="Nomor HP / WA"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ccff00]"
                    />
                  </div>

                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                    <input
                      type="email"
                      placeholder="Email (Opsional)"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ccff00]"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-[#ccff00] hover:bg-[#b8e600] text-zinc-950 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(204,255,0,0.2)] mt-4"
              >
                <Send className="w-4 h-4" />
                KIRIM BOOKING VIA WHATSAPP
              </button>

            </form>

          </div>
        </div>
      )}

    </main>
  );
}