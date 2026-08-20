'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { getHourlyRate, CourtPricing } from '@/lib/pricing';
import jsPDF from 'jspdf';
import {
  Calendar,
  Clock,
  CheckCircle2,
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
  MessageSquare,
  Printer,
  Send,
  Camera,
  Receipt,
  Mail,
  Calendar as CalendarIcon,
  BellRing,
  Coins,
  ArrowRightLeft,
  SquareActivity,
  Flag
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
  cash_received?: number;
  cash_change?: number;
  payment_status: 'pending' | 'paid_cashier' | 'paid_dp' | 'cancelled';
  payment_method: 'cash' | 'qris' | 'transfer' | 'cashier';
  payment_proof_url?: string;
  created_at: string;
  courts?: {
    name: string;
  };
}

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

export default function DashboardKasirPage() {
  const { role, loading: authLoading } = useAuth();
  console.log('role', role, 'authLoading', authLoading);

  const ownerWA = "628132314141"; // WA Owner untuk Notif Kasir

  // Helper YYYY-MM-DD
  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [searchTerm, setSearchTerm] = useState('');

  // 🎯 State Modal Manual Booking
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualDate, setManualDate] = useState<string>(getTodayString());
  const [manualDurationMins, setManualDurationMins] = useState<number>(60);
  const [manualSelectedTime, setManualSelectedTime] = useState<string>('');
  const [manualExistingBookings, setManualExistingBookings] = useState<ExistingBooking[]>([]);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submittingManual, setSubmittingManual] = useState(false);

  const [manualFormData, setManualFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    payment_status: 'paid_cashier',
    payment_method: 'cash' as 'cash' | 'qris' | 'transfer',
    dp_amount: 50000,
    cash_received: '' as number | '',
  });

  // State Modal Bayar / Pelunasan (Khusus Owner / Kasir)
  const [payModalBooking, setPayModalBooking] = useState<Booking | null>(null);
  const [selectedPayMethod, setSelectedPayMethod] = useState<'cash' | 'qris' | 'transfer'>('cash');
  const [dpInputAmount, setDpInputAmount] = useState<number>(50000);
  const [payCashReceived, setPayCashReceived] = useState<number | ''>('');
  const [isDpProcess, setIsDpProcess] = useState(false);
  const [submittingPay, setSubmittingPay] = useState(false);

  // State Modal Notif Owner & Upload Bukti Foto
  const [notifModalBooking, setNotifModalBooking] = useState<Booking | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // State Baru
  const [blockedDates, setBlockedDates] = useState<{ court_id: string, date: string }[]>([]);
  const [switchCourtModal, setSwitchCourtModal] = useState<Booking | null>(null);
  const [blockCourtModal, setBlockCourtModal] = useState<{ date: string } | null>(null);
  const [submittingSwitch, setSubmittingSwitch] = useState(false);

  const fetchBlockedDates = async (dateStr: string) => {
    const { data } = await supabase
      .from('court_blocks')
      .select('court_id, date')
      .eq('date', dateStr);
    if (data) setBlockedDates(data);
  };

  // Helper Format
  const formatPhoneNumberToWA = (phone: string) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = '62' + cleaned.slice(1);
    return cleaned;
  };

  const handleOpenWA = (phone: string, name: string) => {
    const formattedNum = formatPhoneNumberToWA(phone);
    const text = encodeURIComponent(`Halo Kak ${name}, konfirmasi booking lapangan Eksdi Padel...`);
    window.open(`https://wa.me/${formattedNum}?text=${text}`, '_blank');
  };

  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const formatK = (val: number) => `${Math.round(val / 1000)}k`;

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // 📄 PRINT STRUK THERMAL POS DENGAN JSPDF
  const printThermalReceiptWithjsPDF = (
    bookingData: Booking,
    isDp: boolean,
    dpPaid: number,
    payMethod: string,
    cashReceivedVal?: number,
    cashChangeVal?: number
  ) => {
    const baseHeight = 145;
    const doc = new jsPDF({
      unit: 'mm',
      format: [72, baseHeight],
    });

    const orderNum = `BK-${bookingData.id.slice(0, 6).toUpperCase()}`;

    const now = new Date();
    const printDateFormatted = now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const printTimeFormatted = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const printedAt = `${printDateFormatted} ${printTimeFormatted}`;

    const orderDateFormatted = bookingData.created_at
      ? new Date(bookingData.created_at).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
      : printDateFormatted;

    const playDateFormatted = bookingData.booking_date
      ? new Date(bookingData.booking_date).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
      : bookingData.booking_date;

    let y = 8;

    doc.setFont('courier', 'bold');
    doc.setFontSize(13);
    doc.text('EKSDI PADEL COURTS', 36, y, { align: 'center' });

    y += 5;
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.text('Jl. Simpang Nagrog, Tasikmalaya', 36, y, { align: 'center' });
    y += 4;
    doc.text('Telp / WA: 08132314141', 36, y, { align: 'center' });
    y += 4;
    doc.text('=================================', 36, y, { align: 'center' });

    y += 5;
    doc.setFontSize(8.5);
    doc.text(`No. Order  : ${orderNum}`, 3, y);
    y += 4.5;
    doc.text(`Tgl Order : ${orderDateFormatted}`, 3, y);
    y += 4.5;
    doc.text(`Tgl Cetak : ${printedAt}`, 3, y);
    y += 4.5;
    doc.text(`Pemesan   : ${bookingData.customer_name}`, 3, y);
    y += 4;
    doc.text('---------------------------------', 36, y, { align: 'center' });

    y += 5;
    doc.setFont('courier', 'bold');
    doc.text(`${bookingData.courts?.name || 'Lapangan Padel'}`, 3, y);
    y += 4.5;
    doc.setFont('courier', 'normal');
    doc.text(`Tgl Main  : ${playDateFormatted}`, 3, y);
    y += 4.5;
    doc.text(`Jam Main  : ${bookingData.start_time.slice(0, 5)} - ${bookingData.end_time.slice(0, 5)} (${bookingData.duration} Jam)`, 3, y);
    y += 4;
    doc.text('---------------------------------', 36, y, { align: 'center' });

    y += 5;
    doc.text(`Total Tagihan : ${formatRupiah(bookingData.total_price)}`, 3, y);
    y += 4.5;
    doc.text(`Metode Bayar  : ${payMethod.toUpperCase()}`, 3, y);

    if (payMethod === 'cash' && typeof cashReceivedVal === 'number' && cashReceivedVal > 0) {
      y += 4.5;
      doc.text(`Uang Diterima : ${formatRupiah(cashReceivedVal)}`, 3, y);
      y += 4.5;
      doc.text(`Kembalian     : ${formatRupiah(cashChangeVal || 0)}`, 3, y);
    }

    y += 4.5;
    doc.setFont('courier', 'bold');
    doc.text(`Status Bayar  : ${isDp ? 'DP PAID' : 'LUNAS (PAID)'}`, 3, y);

    if (isDp) {
      y += 4.5;
      doc.setFont('courier', 'normal');
      doc.text(`Nominal DP    : ${formatRupiah(dpPaid)}`, 3, y);
      y += 4.5;
      doc.text(`Sisa Wajib    : ${formatRupiah(bookingData.total_price - dpPaid)}`, 3, y);
    }

    y += 6;
    doc.text('=================================', 36, y, { align: 'center' });
    y += 5;
    doc.setFont('courier', 'bold');
    doc.setFontSize(10);
    doc.text('TERIMA KASIH', 36, y, { align: 'center' });
    y += 4.5;
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.text('Selamat Bermain di Eksdi Padel!', 36, y, { align: 'center' });

    const pdfBlobUrl: any = doc.output('bloburl');

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = pdfBlobUrl;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      try {
        iframe.contentWindow?.print();
      } catch (e) {
        window.open(pdfBlobUrl, '_blank');
      }
    };
  };

  // 1. Fetch Master Lapangan
  const fetchCourts = async () => {
    const { data } = await supabase.from('courts').select('*').eq('is_active', true).order('name', { ascending: true });
    if (data && data.length > 0) {
      setCourts(data as Court[]);
    }
  };

  // Logic: Pindah Lapangan
  const handleSwitchCourt = async (booking: Booking, newCourtId: string) => {
    setSubmittingSwitch(true);
    const { error } = await supabase
      .from('bookings')
      .update({ court_id: newCourtId })
      .eq('id', booking.id);

    if (!error) {
      setSwitchCourtModal(null);
      fetchBookings();
    } else {
      alert("Gagal pindah lapangan: " + error.message);
    }
    setSubmittingSwitch(false);
  };

  const isCourtBlocked = (courtId: string, dateStr: string) => {
    return blockedDates.some(b => b.court_id === courtId && b.date === dateStr);
  };

  // Logic: Toggle Blokir Lapangan
  const toggleBlockCourt = async (courtId: string, dateStr: string) => {
    const blocked = isCourtBlocked(courtId, dateStr);
    if (blocked) {
      await supabase.from('court_blocks').delete().eq('court_id', courtId).eq('date', dateStr);
    } else {
      await supabase.from('court_blocks').insert({ court_id: courtId, date: dateStr });
    }
    fetchBlockedDates(dateStr);
  };

  // 2. Fetch Data Booking Halaman Dashboard
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

  // 3. Fetch Existing Bookings untuk Modal Manual (Hanya DP & LUNAS)
  const fetchManualExistingBookings = async (dateStr: string) => {
    if (!dateStr) return;
    setLoadingSlots(true);

    const { data, error } = await supabase
      .from('bookings')
      .select('court_id, start_time, end_time, payment_status')
      .eq('booking_date', dateStr)
      .in('payment_status', ['paid_cashier', 'paid_dp']);

    if (!error && data) {
      setManualExistingBookings(data as ExistingBooking[]);
    } else {
      setManualExistingBookings([]);
    }
    setLoadingSlots(false);
  };

  useEffect(() => {
    fetchBlockedDates(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    fetchCourts();
  }, []);

  useEffect(() => {
    fetchBookings();

    const channel = supabase
      .channel('dashboard-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchBookings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  useEffect(() => {
    if (isModalOpen && manualDate) {
      fetchManualExistingBookings(manualDate);
    }
  }, [isModalOpen, manualDate]);

  const handleApproveBooking = async (bookingId: string, customerName: string) => {
    if (confirm(`Apakah Anda yakin ingin MENG-ACC booking atas nama ${customerName}? Slot jam ini akan resmi terkunci.`)) {
      const { error } = await supabase
        .from('bookings')
        .update({ payment_status: 'paid_dp' })
        .eq('id', bookingId);

      if (!error) {
        fetchBookings();
        if (manualDate) fetchManualExistingBookings(manualDate);
      } else {
        alert('Gagal meng-ACC booking: ' + error.message);
      }
    }
  };

  // 4. Logic Alokasi Lapangan Otomatis untuk Modal Manual
  const getAvailableCourtForSlot = (startTimeStr: string, durationMins: number) => {
    if (!courts || courts.length === 0) return null;

    const reqStart = timeToMinutes(startTimeStr);
    const reqEnd = reqStart + durationMins;

    const sortedCourts = [...courts].sort((a, b) => a.name.localeCompare(b.name));

    for (const court of sortedCourts) {
      const isCourtLocked = manualExistingBookings.some((b) => {
        if (b.court_id !== court.id) return false;
        const bStart = timeToMinutes(b.start_time);
        const bEnd = timeToMinutes(b.end_time);
        return reqStart < bEnd && reqEnd > bStart;
      });

      if (!isCourtLocked) {
        return court;
      }
    }
    return null;
  };

  // 5. Generate Carousel Mobile (30 Hari)
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

  // 🛠️ HELPER HITUNG HARGA (TERMASUK SABTU & MINGGU MENGGUNAKAN SESI 2)
  const getCalculatedPrice = (timeStr: string, court: Court, dateStr: string) => {
    const dayOfWeek = new Date(dateStr).getDay(); // 0 = Minggu, 6 = Sabtu
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isWeekend) {
      return Number(court.price_session_2);
    }

    return getHourlyRate(timeStr, court);
  };

  // 6. Generate Time Slots Modal Manual
  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 6;
    const endHour = 21;

    const now = new Date();
    const isToday = manualDate === getTodayString();
    
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    const dayOfWeek = new Date(manualDate).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    for (let h = startHour; h <= endHour; h++) {
      const durationHours = manualDurationMins / 60;
      if (h + durationHours > endHour + 1) continue;

      const timeString = `${String(h).padStart(2, '0')}:00`;
      const slotTotalMinutes = h * 60;

      let isTimeOver = false;
      if (isToday && currentTotalMinutes > slotTotalMinutes + 45) {
        isTimeOver = true;
      }

      let availableCourt = getAvailableCourtForSlot(timeString, manualDurationMins);

      let isPassed = false;
      if (isTimeOver) {
        isPassed = true;
      } else {
        if (!availableCourt) {
          const isCurrentActiveSlot = isToday && currentTotalMinutes >= slotTotalMinutes && currentTotalMinutes <= slotTotalMinutes + 45;
          
          if (!isCurrentActiveSlot) {
            isPassed = true;
          }
        }
      }

      const refCourt = availableCourt || courts[0];
      let normalPrice = 125000;
      let isDiscounted = false;
      let effectivePrice = 125000;

      if (refCourt) {
        const isS1 = !isWeekend && (h >= 7 && h < 15);
        normalPrice = isS1 ? Number(refCourt.price_session_1) : Number(refCourt.price_session_2);
        isDiscounted = isS1 ? refCourt.is_discount_session_1 : refCourt.is_discount_session_2;
        effectivePrice = getCalculatedPrice(timeString, refCourt, manualDate);
      }

      slots.push({
        time: timeString,
        isPassed,
        normalPrice,
        effectivePrice,
        isDiscounted,
        availableCourt: availableCourt || courts[0],
      });
    }
    return slots;
  };

  useEffect(() => {
    if (!manualSelectedTime) return;
    const [h] = manualSelectedTime.split(':').map(Number);
    const endHour = 21;
    const durationHours = manualDurationMins / 60;

    if (h + durationHours > endHour + 1) {
      setManualSelectedTime('');
    } else {
      const court = getAvailableCourtForSlot(manualSelectedTime, manualDurationMins);
      if (!court) setManualSelectedTime('');
    }
  }, [manualDurationMins, manualDate]);

  const calculateEndTimeStr = (startTime: string, durationMins: number) => {
    if (!startTime) return '';
    const [h, m] = startTime.split(':').map(Number);
    const totalMinutes = h * 60 + m + durationMins;
    const endH = Math.floor(totalMinutes / 60);
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  };

  const manualSelectedCourt = manualSelectedTime ? getAvailableCourtForSlot(manualSelectedTime, manualDurationMins) : null;
  const manualDurationHours = manualDurationMins / 60;
  const manualHourlyRate = (manualSelectedTime && manualSelectedCourt) ? getCalculatedPrice(manualSelectedTime, manualSelectedCourt, manualDate) : 0;
  const manualTotalPrice = manualHourlyRate * manualDurationHours;

  const numManualCashReceived = typeof manualFormData.cash_received === 'number' ? manualFormData.cash_received : 0;
  const targetManualPayAmount = manualFormData.payment_status === 'paid_dp' ? manualFormData.dp_amount : manualTotalPrice;
  const manualCashChange = manualFormData.payment_method === 'cash' ? Math.max(0, numManualCashReceived - targetManualPayAmount) : 0;

  // Submit Manual Booking (Walk-in)
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDate || !manualSelectedTime || !manualFormData.customer_name || !manualFormData.customer_phone) {
      alert('Mohon pilih jam dan lengkapi Nama serta No. HP!');
      return;
    }

    if (
      manualFormData.payment_method === 'cash' &&
      manualFormData.payment_status !== 'pending' &&
      numManualCashReceived < targetManualPayAmount
    ) {
      alert('Uang yang dibayarkan masih kurang!');
      return;
    }

    setSubmittingManual(true);
    const assignedCourt = getAvailableCourtForSlot(manualSelectedTime, manualDurationMins);

    if (!assignedCourt) {
      alert('Maaf, slot jam ini baru saja terisi. Silakan pilih jam lain.');
      setSubmittingManual(false);
      return;
    }

    const endTime = calculateEndTimeStr(manualSelectedTime, manualDurationMins);
    const formattedStartTime = `${manualSelectedTime}:00`;
    const formattedEndTime = `${endTime}:00`;

    const { error } = await supabase.from('bookings').insert([
      {
        court_id: assignedCourt.id,
        customer_name: manualFormData.customer_name,
        customer_phone: manualFormData.customer_phone,
        customer_email: manualFormData.customer_email || null,
        booking_date: manualDate,
        start_time: formattedStartTime,
        duration: manualDurationHours,
        end_time: formattedEndTime,
        total_price: manualTotalPrice,
        dp_amount: manualFormData.payment_status === 'paid_dp' ? manualFormData.dp_amount : 0,
        cash_received: manualFormData.payment_method === 'cash' ? numManualCashReceived : targetManualPayAmount,
        cash_change: manualFormData.payment_method === 'cash' ? manualCashChange : 0,
        payment_status: manualFormData.payment_status,
        payment_method: manualFormData.payment_method,
      },
    ]);

    if (!error) {
      setIsModalOpen(false);
      setManualSelectedTime('');
      setManualFormData({
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        payment_status: 'paid_cashier',
        payment_method: 'cash',
        dp_amount: 50000,
        cash_received: '',
      });
      fetchBookings();
    } else {
      alert('Gagal menambah booking: ' + error.message);
    }
    setSubmittingManual(false);
  };

  const numPayCashReceived = typeof payCashReceived === 'number' ? payCashReceived : 0;
  const targetPayAmount = payModalBooking
    ? (isDpProcess ? dpInputAmount : payModalBooking.total_price - (payModalBooking.dp_amount || 0))
    : 0;
  const payCashChange = selectedPayMethod === 'cash' ? Math.max(0, numPayCashReceived - targetPayAmount) : 0;

  // 👑 EKSEKUSI PEMBAYARAN KASIR / DP
  const handleConfirmPayment = async () => {
    if (!payModalBooking) return;

    if (selectedPayMethod === 'cash' && numPayCashReceived < targetPayAmount) {
      alert('Uang yang diterima masih kurang dari tagihan!');
      return;
    }

    setSubmittingPay(true);
    const updatePayload = isDpProcess
      ? {
        payment_status: 'paid_dp',
        payment_method: selectedPayMethod,
        dp_amount: dpInputAmount,
        cash_received: selectedPayMethod === 'cash' ? numPayCashReceived : dpInputAmount,
        cash_change: selectedPayMethod === 'cash' ? payCashChange : 0,
      }
      : {
        payment_status: 'paid_cashier',
        payment_method: selectedPayMethod,
        cash_received: selectedPayMethod === 'cash' ? numPayCashReceived : targetPayAmount,
        cash_change: selectedPayMethod === 'cash' ? payCashChange : 0,
      };

    const { error } = await supabase
      .from('bookings')
      .update(updatePayload)
      .eq('id', payModalBooking.id);

    if (!error) {
      printThermalReceiptWithjsPDF(
        payModalBooking,
        isDpProcess,
        dpInputAmount,
        selectedPayMethod,
        selectedPayMethod === 'cash' ? numPayCashReceived : targetPayAmount,
        selectedPayMethod === 'cash' ? payCashChange : 0
      );

      setPayModalBooking(null);
      setPayCashReceived('');
      fetchBookings();
    } else {
      alert('Gagal memproses pembayaran: ' + error.message);
    }
    setSubmittingPay(false);
  };

  // 📲 KASIR REQUEST ACC NOTIFIKASI BAYAR/DP KE OWNER + UPLOAD BUKTI
  const handleSendNotifToOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifModalBooking) return;

    setUploading(true);
    let imageUrl = notifModalBooking.payment_proof_url || '';

    if (selectedFile) {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `proof_${notifModalBooking.id}_${Date.now()}.${fileExt}`;
      const filePath = `proofs/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, selectedFile);

      if (uploadErr) {
        alert('Gagal mengupload bukti foto: ' + uploadErr.message);
        setUploading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(filePath);

      imageUrl = publicUrlData.publicUrl;

      await supabase
        .from('bookings')
        .update({ payment_proof_url: imageUrl })
        .eq('id', notifModalBooking.id);
    }

    const isDp = notifModalBooking.payment_status === 'pending';

    const message =
      `*🔔 NOTIFIKASI KASIR -> OWNER*
----------------------------------------
Halo Boss/Owner, uang pembayaran pemain sudah masuk ke kasir! Mohon bantuannya untuk klik tombol *${isDp ? 'BAYAR DP' : 'BAYAR KASIR'}* di dashboard.

🎾 *Lapangan:* ${notifModalBooking.courts?.name}
👤 *Pemesan:* ${notifModalBooking.customer_name}
📅 *Tanggal:* ${notifModalBooking.booking_date}
⏰ *Jam Main:* ${notifModalBooking.start_time.slice(0, 5)} - ${notifModalBooking.end_time.slice(0, 5)}

💰 *Total Tagihan:* ${formatRupiah(notifModalBooking.total_price)}
${notifModalBooking.payment_status === 'paid_dp' ? `💵 *Sudah DP:* ${formatRupiah(notifModalBooking.dp_amount || 0)}` : ''}

🖼️ *Bukti Transfer/Struk Kasir:* 
${imageUrl ? imageUrl : '(Tidak ada foto lampiran)'}
----------------------------------------
*Eksdi Padel POS System*`;

    window.open(`https://wa.me/${ownerWA}?text=${encodeURIComponent(message)}`, '_blank');

    setUploading(false);
    setNotifModalBooking(null);
    setSelectedFile(null);
  };

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

  const activeBookingsList = bookings.filter((b) => b.payment_status !== 'cancelled');
  const totalTersewa = activeBookingsList.reduce((acc, curr) => acc + curr.duration, 0);
  const totalEstimasiOmset = activeBookingsList.reduce((acc, curr) => acc + Number(curr.total_price), 0);
  const totalLunas = activeBookingsList.filter((b) => b.payment_status === 'paid_cashier').length;

  const filteredBookings = bookings.filter(
    (b) =>
      b.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.customer_phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6 font-sans">

      {/* HEADER & ACTION BUTTON */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#141e1b] p-5 rounded-2xl border border-white/10">
        <div>
          <h1 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-wide">
            <Calendar className="w-5 h-5 text-[#ccff00]" />
            Kasir & Jadwal Lapangan
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Pantau reservasi harian, req konfirmasi ke owner, atau input booking pemain di tempat.
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
              className={`bg-[#141e1b] border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${b.payment_status === 'cancelled' ? 'border-rose-500/20 opacity-50' : 'border-white/10 hover:border-white/20'
                }`}
            >
              {/* Info Lapangan, Jam, Pemesan & WA */}
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

              {/* Rincian Tagihan & Tombol Aksi Pembayaran */}
              <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-white/10 flex-wrap">

                <div className="text-left md:text-right mr-2">
                  <span className="block text-[10px] text-zinc-400">Total Tagihan:</span>
                  <span className="text-sm font-black text-white">{formatRupiah(b.total_price)}</span>
                  {b.payment_status === 'paid_dp' && (
                    <span className="block text-[10px] text-amber-400 font-semibold">
                      Sisa: {formatRupiah(b.total_price - (b.dp_amount || 0))}
                    </span>
                  )}
                </div>

                {/* 🔒 LOGIKA HAK AKSES TOMBOL */}
                {b.payment_status === 'cancelled' ? (
                  <span className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold">
                    Dibatalkan
                  </span>
                ) : role === 'kasir' ? (
                  <div className="flex items-center gap-2">
                    {b.payment_status !== 'paid_cashier' && (
                      <button
                        onClick={() => setNotifModalBooking(b)}
                        className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                      >
                        <BellRing className="w-3.5 h-3.5" />
                        {b.payment_status === 'paid_dp' ? 'NOTIF REQ PELUNASAN' : 'NOTIF REQ BAYAR/DP'}
                      </button>
                    )}

                    {b.payment_status === 'paid_cashier' ? (

                      <button
                        onClick={() => printThermalReceiptWithjsPDF(b, false, 0, b.payment_method, b.cash_received, b.cash_change)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 transition-all"
                        title="Cetak Ulang Struk"
                      >
                        <Printer className="w-4 h-4 text-[#ccff00]" />
                      </button>
                    ) : (null)}

                    <span
                      className={`px-3 py-2 rounded-xl text-xs font-bold border ${b.payment_status === 'paid_cashier'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : b.payment_status === 'paid_dp'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          : 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400'
                        }`}
                    >
                      {b.payment_status === 'paid_cashier'
                        ? `LUNAS (${b.payment_method?.toUpperCase()})`
                        : b.payment_status === 'paid_dp'
                          ? 'DP PAID'
                          : 'PENDING'}
                    </span>

                    {b.payment_status === 'pending' && (
                      <button
                        onClick={() => handleApproveBooking(b.id, b.customer_name)}
                        className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                        title="Setujui booking dan kunci slot jam ini"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        ACC & KUNCI
                      </button>
                    )}

                  </div>
                ) : (
                  <div>
                    {b.payment_status === 'paid_cashier' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => printThermalReceiptWithjsPDF(b, false, 0, b.payment_method, b.cash_received, b.cash_change)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 transition-all"
                          title="Cetak Ulang Struk"
                        >
                          <Printer className="w-4 h-4 text-[#ccff00]" />
                        </button>

                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Lunas ({b.payment_method?.toUpperCase()})
                        </span>

                        <button
                          onClick={() => handleCancelBooking(b.id, b.customer_name)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 transition-all"
                          title="Batalkan Booking"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setPayModalBooking(b);
                            setIsDpProcess(false);
                            setPayCashReceived('');
                          }}
                          className="bg-[#ccff00] hover:bg-[#b8e600] text-zinc-950 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(204,255,0,0.15)]"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          {b.payment_status === 'paid_dp' ? 'Pelunasan' : 'Bayar Kasir'}
                        </button>

                        {b.payment_status === 'pending' && (
                          <>
                            <button
                              onClick={() => {
                                setPayModalBooking(b);
                                setIsDpProcess(true);
                                setPayCashReceived('');
                              }}
                              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 font-bold px-3 py-2 rounded-xl text-xs transition-all"
                            >
                              Bayar DP
                            </button>

                            {b.payment_status === 'pending' && (
                              <button
                                onClick={() => handleApproveBooking(b.id, b.customer_name)}
                                className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                                title="Setujui booking dan kunci slot jam ini"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                ACC & KUNCI
                              </button>
                            )}
                          </>
                        )}

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
                )}

              </div>
            </div>
          ))
        )}
      </div>

      {/* 👑 MODAL CONFIRM PEMBAYARAN & CETAK STRUK */}
      {payModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#141e1b] border border-white/10 rounded-3xl p-5 shadow-2xl">

            <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#ccff00]" />
                Konfirmasi {isDpProcess ? 'Bayar DP' : 'Pelunasan'}
              </h3>
              <button onClick={() => setPayModalBooking(null)} className="p-1 rounded-full bg-white/5 text-zinc-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-xs space-y-1">
                <p className="text-zinc-400">Pemesan: <strong className="text-white">{payModalBooking.customer_name}</strong></p>
                <p className="text-zinc-400">Lapangan: <strong className="text-[#ccff00]">{payModalBooking.courts?.name}</strong></p>
                <p className="text-zinc-400">
                  Tagihan {isDpProcess ? 'DP' : (payModalBooking.payment_status === 'paid_dp' ? 'Sisa Pelunasan' : 'Total')}:{' '}
                  <strong className="text-white">{formatRupiah(targetPayAmount)}</strong>
                </p>
              </div>

              {isDpProcess && (
                <div>
                  <label className="block text-[10px] text-zinc-400 mb-1">Nominal DP Diterima (Rp)</label>
                  <input
                    type="number"
                    value={dpInputAmount}
                    onChange={(e) => setDpInputAmount(Number(e.target.value))}
                    className="w-full bg-[#0f1715] border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-amber-400 font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Metode Pembayaran</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {['cash', 'qris', 'transfer'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedPayMethod(m as any)}
                      className={`p-2 rounded-xl text-[10px] font-bold uppercase transition-all ${selectedPayMethod === m
                        ? 'bg-[#ccff00] text-zinc-950'
                        : 'bg-white/5 text-zinc-400 border border-white/10'
                        }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {selectedPayMethod === 'cash' && (
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 space-y-2">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-300 mb-1 flex items-center justify-between">
                      <span>Uang Diterima (Rp)</span>
                      {numPayCashReceived > 0 && numPayCashReceived < targetPayAmount && (
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

                  <div className="grid grid-cols-4 gap-1">
                    <button
                      type="button"
                      onClick={() => setPayCashReceived(targetPayAmount)}
                      className="py-1 bg-white/10 hover:bg-white/20 rounded text-[9px] font-bold text-zinc-300"
                    >
                      Uang Pas
                    </button>
                    {[50000, 100000, 200000].map((nominal) => (
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

                  <div className="flex justify-between items-center text-xs pt-1 border-t border-white/10 font-bold">
                    <span className="text-zinc-400">Kembalian:</span>
                    <span className={payCashChange >= 0 && numPayCashReceived >= targetPayAmount ? 'text-emerald-400' : 'text-zinc-500'}>
                      {formatRupiah(payCashChange)}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={handleConfirmPayment}
                disabled={submittingPay || (selectedPayMethod === 'cash' && numPayCashReceived < targetPayAmount)}
                className="w-full bg-[#ccff00] text-zinc-950 font-black py-3 rounded-xl text-xs flex items-center justify-center gap-2 mt-4 shadow-[0_0_15px_rgba(204,255,0,0.2)] disabled:opacity-40"
              >
                {submittingPay ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                PROSES & PRINT STRUK (JSPDF)
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 📲 MODAL UPLOAD BUKTI & NOTIF WA OWNER */}
      {notifModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#141e1b] border border-white/10 rounded-3xl p-5 shadow-2xl">

            <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-cyan-400" />
                Notif Pembayaran Masuk ke Owner
              </h3>
              <button onClick={() => setNotifModalBooking(null)} className="p-1 rounded-full bg-white/5 text-zinc-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendNotifToOwner} className="space-y-4">
              <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-xs space-y-1">
                <p className="text-zinc-400">Atas Nama: <strong className="text-white">{notifModalBooking.customer_name}</strong></p>
                <p className="text-zinc-400">Tagihan: <strong className="text-[#ccff00]">{formatRupiah(notifModalBooking.total_price)}</strong></p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Upload Foto Struk / Transfer Masuk
                </label>
                <div className="relative border-2 border-dashed border-white/10 rounded-2xl p-4 text-center hover:border-cyan-400 transition-all bg-white/5">
                  <Camera className="w-6 h-6 text-zinc-500 mx-auto mb-1" />
                  <span className="text-[10px] text-zinc-400 block">
                    {selectedFile ? selectedFile.name : 'Klik untuk foto/upload struk transfer'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-cyan-400 hover:bg-cyan-300 text-zinc-950 font-black py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)]"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                KIRIM REQ CONFIRM KE WA OWNER
              </button>
            </form>

          </div>
        </div>
      )}

      {/* 📱 MODAL INPUT BOOKING MANUAL (WALK-IN) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-sm transition-all animate-fadeIn">
          <div className="w-full max-w-md bg-[#141e1b] border border-white/10 rounded-t-3xl md:rounded-3xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto relative font-sans">

            <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-4">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#ccff00]" /> Input Booking Manual
                </h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">Reservasi Walk-In / Telepon Kasir</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-full bg-white/5 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">

              {/* 1. TANGGAL MAIN */}
              <div>
                <span className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  1. Pilih Tanggal Main
                </span>

                <div className="hidden md:block">
                  <input
                    type="date"
                    required
                    min={getTodayString()}
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#ccff00]"
                  />
                </div>

                <div className="md:hidden">
                  {!showCustomDatePicker ? (
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none items-center">
                      {generateDateCarouselMobile().map((d) => {
                        const isSelected = manualDate === d.isoDate;
                        return (
                          <button
                            key={d.isoDate}
                            type="button"
                            onClick={() => setManualDate(d.isoDate)}
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
                        value={manualDate}
                        onChange={(e) => setManualDate(e.target.value)}
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

              {/* 2. GRID SLOT JAM & BADGE HARGA */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    2. Pilih Jam Mulai
                  </span>
                  {manualSelectedTime && (
                    <span className="text-[10px] font-bold text-[#ccff00] bg-[#ccff00]/10 px-2 py-0.5 rounded-md border border-[#ccff00]/30">
                      {manualSelectedTime} - {calculateEndTimeStr(manualSelectedTime, manualDurationMins)}
                    </span>
                  )}
                </div>

                {loadingSlots ? (
                  <div className="text-center py-8 text-xs text-zinc-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#ccff00]" />
                    <span>Mengecek ketersediaan slot...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-44 overflow-y-auto pr-1">
                    {generateTimeSlots().map((slot) => {
                      const isSelected = manualSelectedTime === slot.time;
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={slot.isPassed}
                          onClick={() => setManualSelectedTime(slot.time)}
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
                      onClick={() => setManualDurationMins(mins)}
                      className={`py-2.5 rounded-2xl border text-xs font-bold transition-all ${manualDurationMins === mins
                        ? 'bg-[#ccff00] border-[#ccff00] text-zinc-950 shadow-[0_0_10px_rgba(204,255,0,0.2)]'
                        : 'bg-white/5 border-white/10 text-zinc-300 hover:border-white/20'
                        }`}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. FORM DATA PEMESAN & PEMBAYARAN */}
              <div className="space-y-2.5 pt-2 border-t border-white/10">
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Nama Pemain / Pemesan"
                    value={manualFormData.customer_name}
                    onChange={(e) => setManualFormData({ ...manualFormData, customer_name: e.target.value })}
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
                      value={manualFormData.customer_phone}
                      onChange={(e) => setManualFormData({ ...manualFormData, customer_phone: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ccff00]"
                    />
                  </div>

                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      placeholder="Email (Opsional)"
                      value={manualFormData.customer_email}
                      onChange={(e) => setManualFormData({ ...manualFormData, customer_email: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ccff00]"
                    />
                  </div>
                </div>

                {/* Status & Metode Bayar Walk-in */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-1">Status Pembayaran</label>
                    <select
                      value={manualFormData.payment_status}
                      onChange={(e) => setManualFormData({ ...manualFormData, payment_status: e.target.value })}
                      className="w-full bg-[#0f1715] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#ccff00]"
                    >
                      <option value="paid_cashier">Lunas di Kasir</option>
                      <option value="paid_dp">Bayar DP Dulu</option>
                      <option value="pending">Belum Bayar (Pending)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-1">Metode Bayar</label>
                    <select
                      value={manualFormData.payment_method}
                      onChange={(e) => setManualFormData({ ...manualFormData, payment_method: e.target.value as any })}
                      className="w-full bg-[#0f1715] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#ccff00]"
                    >
                      <option value="cash">Tunai (Cash)</option>
                      <option value="qris">QRIS</option>
                      <option value="transfer">Transfer Bank</option>
                    </select>
                  </div>
                </div>

                {manualFormData.payment_status === 'paid_dp' && (
                  <div>
                    <label className="block text-[10px] text-amber-400 mb-1">Nominal DP (Rp)</label>
                    <input
                      type="number"
                      step="10000"
                      value={manualFormData.dp_amount}
                      onChange={(e) => setManualFormData({ ...manualFormData, dp_amount: Number(e.target.value) })}
                      className="w-full bg-white/5 border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-amber-400 font-bold"
                    />
                  </div>
                )}

                {/* 💵 INPUT TUNAI & KEMBALIAN APABILA METODE TUNAI & STATUS BUKAN PENDING */}
                {manualFormData.payment_method === 'cash' && manualFormData.payment_status !== 'pending' && (
                  <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-300 mb-1 flex items-center justify-between">
                        <span>Uang Diterima (Rp)</span>
                        {numManualCashReceived > 0 && numManualCashReceived < targetManualPayAmount && (
                          <span className="text-rose-400 text-[9px]">Uang Kurang!</span>
                        )}
                      </label>
                      <div className="relative">
                        <Coins className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                        <input
                          type="number"
                          placeholder="0"
                          value={manualFormData.cash_received}
                          onChange={(e) => setManualFormData({ ...manualFormData, cash_received: e.target.value === '' ? '' : Number(e.target.value) })}
                          className="w-full bg-black/40 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-[#ccff00]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1">
                      <button
                        type="button"
                        onClick={() => setManualFormData({ ...manualFormData, cash_received: targetManualPayAmount })}
                        className="py-1 bg-white/10 hover:bg-white/20 rounded text-[9px] font-bold text-zinc-300"
                      >
                        Uang Pas
                      </button>
                      {[100000, 200000, 500000].map((nominal) => (
                        <button
                          key={nominal}
                          type="button"
                          onClick={() => setManualFormData({ ...manualFormData, cash_received: nominal })}
                          className="py-1 bg-white/10 hover:bg-white/20 rounded text-[9px] font-bold text-[#ccff00]"
                        >
                          {nominal / 1000}k
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-between items-center text-xs pt-1 border-t border-white/10 font-bold">
                      <span className="text-zinc-400">Kembalian:</span>
                      <span className={manualCashChange >= 0 && numManualCashReceived >= targetManualPayAmount ? 'text-emerald-400' : 'text-zinc-500'}>
                        {formatRupiah(manualCashChange)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* SUMMARY ALOKASI & TOTAL */}
              {manualSelectedTime && manualSelectedCourt && (
                <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between text-xs">
                  <div>
                    <span className="block font-bold text-white">{manualSelectedCourt.name} (Otomatis)</span>
                    <span className="text-[10px] text-zinc-400">
                      {manualSelectedTime} - {calculateEndTimeStr(manualSelectedTime, manualDurationMins)} ({manualDurationMins} min)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 block">Total Tagihan:</span>
                    <span className="text-sm font-black text-[#ccff00]">{formatRupiah(manualTotalPrice)}</span>
                  </div>
                </div>
              )}

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={
                  submittingManual ||
                  !manualSelectedTime ||
                  (manualFormData.payment_method === 'cash' && manualFormData.payment_status !== 'pending' && numManualCashReceived < targetManualPayAmount)
                }
                className="w-full bg-[#ccff00] hover:bg-[#b8e600] text-zinc-950 font-black py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(204,255,0,0.2)] disabled:opacity-40"
              >
                {submittingManual ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>SIMPAN BOOKING MANUAL</span>
                  </>
                )}
              </button>

            </form>

          </div>
        </div>
      )}

      {/* 🔁 MODAL GANTI LAPANGAN */}
      {switchCourtModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-[#141e1b] border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4">

            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wide">
                  <ArrowRightLeft className="w-4 h-4 text-[#ccff00]" /> Pindah Lapangan
                </h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  Booking: <strong className="text-white">{switchCourtModal.customer_name}</strong> ({switchCourtModal.start_time.slice(0, 5)} - {switchCourtModal.end_time.slice(0, 5)})
                </p>
              </div>
              <button
                onClick={() => setSwitchCourtModal(null)}
                className="p-1 rounded-full bg-white/5 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                Pilih Lapangan Tujuan:
              </label>

              {courts.map((c) => {
                const isCurrentCourt = switchCourtModal.court_id === c.id;
                const isBlocked = isCourtBlocked(c.id, switchCourtModal.booking_date);

                const reqStart = timeToMinutes(switchCourtModal.start_time);
                const reqEnd = timeToMinutes(switchCourtModal.end_time);

                const isOccupied = bookings.some((b) => {
                  if (b.court_id !== c.id || b.id === switchCourtModal.id || b.payment_status === 'cancelled') {
                    return false;
                  }

                  const bStart = timeToMinutes(b.start_time);
                  const bEnd = timeToMinutes(b.end_time);

                  return reqStart < bEnd && reqEnd > bStart;
                });

                const isDisabled = isCurrentCourt || isBlocked || isOccupied;

                return (
                  <button
                    key={c.id}
                    disabled={isDisabled || submittingSwitch}
                    onClick={() => handleSwitchCourt(switchCourtModal, c.id)}
                    className={`w-full p-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all ${isCurrentCourt
                      ? 'bg-white/5 border-white/5 text-zinc-500 cursor-not-allowed'
                      : isDisabled
                        ? 'bg-rose-500/5 border-rose-500/20 text-rose-400/50 cursor-not-allowed line-through'
                        : 'bg-white/5 border-white/10 text-white hover:border-[#ccff00] hover:bg-[#ccff00]/10'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold">{c.name}</span>
                      {isCurrentCourt && (
                        <span className="text-[9px] bg-white/10 text-zinc-400 px-2 py-0.5 rounded-full font-normal">
                          (Lapangan Saat Ini)
                        </span>
                      )}
                    </div>

                    <div>
                      {isBlocked ? (
                        <span className="text-[9px] font-extrabold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                          DIBLOKIR / NON-AKTIF
                        </span>
                      ) : isOccupied ? (
                        <span className="text-[9px] font-extrabold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          JADWAL TERISI (BENTROK)
                        </span>
                      ) : !isCurrentCourt ? (
                        <span className="text-[9px] font-extrabold text-[#ccff00] bg-[#ccff00]/10 px-2 py-0.5 rounded-md border border-[#ccff00]/20">
                          TERSEDIA
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-white/10 text-[10px] text-zinc-400 text-center">
              *Pilihan lapangan yang bentrok atau diblokir otomatis ter-disable.
            </div>

          </div>
        </div>
      )}

    </div>
  );
}