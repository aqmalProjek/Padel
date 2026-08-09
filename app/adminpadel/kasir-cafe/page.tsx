'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import jsPDF from 'jspdf';
import { 
  Coffee, 
  Pizza, 
  Activity, 
  Search, 
  Plus, 
  Minus, 
  ShoppingBag, 
  User, 
  CreditCard, 
  QrCode, 
  Banknote, 
  CheckCircle2, 
  Loader2, 
  Receipt,
  Printer,
  UtensilsCrossed
} from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  category: 'makanan' | 'minuman' | 'sewa_alat';
  price: number;
  stock: number;
  image_url: string | null;
  is_available: boolean;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  subtotal: number;
}

export default function KasirCafePage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'transfer'>('cash');
  const [submitting, setSubmitting] = useState(false);

  // Modal Struk Sukses
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);

  // Fetch Master Menu
  const fetchMenu = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_available', true)
      .gt('stock', 0)
      .order('name', { ascending: true });

    if (data) {
      setMenuItems(data as MenuItem[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  // Format Rupiah
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // 📄 CETAK STRUK THERMAL POS CAFE (80mm) DENGAN JSPDF
  const printThermalReceiptWithjsPDF = (order: any) => {
    const doc = new jsPDF({
      unit: 'mm',
      format: [80, 150], // Ukuran Kertas Thermal Standar Kasir POS (80mm)
    });

    const printedAt = order.date || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // Header Struk
    doc.setFont('courier', 'bold');
    doc.setFontSize(17);
    doc.text('EKSDI CAFE & RENTAL', 40, 8, { align: 'center' });
    
    doc.setFont('courier', 'normal');
    doc.setFontSize(10);
    doc.text('Jl. Padel No. 123, Tasikmalaya', 40, 12, { align: 'center' });
    doc.text('WA / Telp: 089630041079', 40, 15, { align: 'center' });
    doc.text('------------------------------------------', 40, 19, { align: 'center' });

    // Info Transaksi
    doc.setFontSize(10);
    doc.text(`No. Order : ${order.orderNumber}`, 5, 24);
    doc.text(`Tgl / Jam : ${printedAt}`, 5, 28);
    doc.text(`Pemesan   : ${order.customerName}`, 5, 32);
    doc.text('------------------------------------------', 40, 36, { align: 'center' });

    // Header Tabel Items
    doc.setFont('courier', 'bold');
    doc.text('QTY  ITEM                   TOTAL', 5, 40);
    doc.setFont('courier', 'normal');
    doc.text('------------------------------------------', 40, 43, { align: 'center' });

    let yPosition = 48;
    order.items.forEach((item: any) => {
      const itemName = item.menuItem.name.length > 18 
        ? item.menuItem.name.substring(0, 18) + '..' 
        : item.menuItem.name;
      const qtyStr = `${item.quantity}x`.padEnd(5, ' ');
      const priceStr = formatRupiah(item.subtotal).padStart(11, ' ');

      doc.text(`${qtyStr}${itemName.padEnd(20, ' ')}${priceStr}`, 5, yPosition);
      yPosition += 5;
    });

    doc.text('------------------------------------------', 40, yPosition, { align: 'center' });
    yPosition += 5;

    // Summary Total
    doc.setFont('courier', 'bold');
    doc.text(`TOTAL BAYAR : ${formatRupiah(order.totalAmount)}`, 5, yPosition);
    yPosition += 4;
    doc.setFont('courier', 'normal');
    doc.text(`METODE BAYAR: ${order.paymentMethod.toUpperCase()}`, 5, yPosition);
    yPosition += 4;
    doc.text(`STATUS       : LUNAS (PAID)`, 5, yPosition);

    // Footer Struk
    yPosition += 6;
    doc.text('------------------------------------------', 40, yPosition, { align: 'center' });
    yPosition += 4;
    doc.setFont('courier', 'bold');
    doc.text('TERIMA KASIH', 40, yPosition, { align: 'center' });
    yPosition += 4;
    doc.setFont('courier', 'normal');
    doc.setFontSize(10);
    doc.text('Selamat Menikmati di Eksdi Padel!', 40, yPosition, { align: 'center' });

    // Trigger Print Window
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };

  // Tambah Item ke Keranjang
  const handleAddToCart = (item: MenuItem) => {
    setCart((prevCart) => {
      const existing = prevCart.find((c) => c.menuItem.id === item.id);
      if (existing) {
        if (existing.quantity >= item.stock) {
          alert(`Stok ${item.name} tidak mencukupi!`);
          return prevCart;
        }
        return prevCart.map((c) =>
          c.menuItem.id === item.id
            ? { ...c, quantity: c.quantity + 1, subtotal: (c.quantity + 1) * c.menuItem.price }
            : c
        );
      }
      return [...prevCart, { menuItem: item, quantity: 1, subtotal: item.price }];
    });
  };

  // Ubah Qty Keranjang
  const handleUpdateQty = (itemId: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((c) => {
          if (c.menuItem.id === itemId) {
            const newQty = c.quantity + delta;
            if (newQty > c.menuItem.stock) {
              alert(`Stok terbatas! Sisa stok: ${c.menuItem.stock}`);
              return c;
            }
            return newQty > 0
              ? { ...c, quantity: newQty, subtotal: newQty * c.menuItem.price }
              : null;
          }
          return c;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  // Total Belanja
  const totalAmount = cart.reduce((acc, curr) => acc + curr.subtotal, 0);

  // Process Checkout (Bisa Dikelola Seluruh User/Kasir/Owner)
  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Keranjang belanja masih kosong!');
      return;
    }
    if (!customerName) {
      alert('Mohon isi Atas Nama Pemesan!');
      return;
    }

    setSubmitting(true);
    const orderNum = `ORD-${Date.now().toString().slice(-6)}`;

    // 1. Insert Header Order
    const { data: orderData, error: orderError } = await supabase
      .from('pos_orders')
      .insert([
        {
          order_number: orderNum,
          customer_name: customerName,
          total_amount: totalAmount,
          payment_status: 'paid',
          payment_method: paymentMethod,
        },
      ])
      .select()
      .single();

    if (orderError || !orderData) {
      alert('Gagal memproses transaksi: ' + orderError?.message);
      setSubmitting(false);
      return;
    }

    // 2. Insert Items
    const orderItemsPayload = cart.map((c) => ({
      order_id: orderData.id,
      menu_item_id: c.menuItem.id,
      item_name: c.menuItem.name,
      price: c.menuItem.price,
      quantity: c.quantity,
      subtotal: c.subtotal,
    }));

    const { error: itemsError } = await supabase.from('pos_order_items').insert(orderItemsPayload);

    if (!itemsError) {
      const newCompletedOrder = {
        orderNumber: orderNum,
        customerName,
        totalAmount,
        paymentMethod,
        items: [...cart],
        date: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };

      setCompletedOrder(newCompletedOrder);

      // Auto Print Struk saat Transaksi Selesai
      printThermalReceiptWithjsPDF(newCompletedOrder);

      // Reset
      setCart([]);
      setCustomerName('');
      fetchMenu();
    } else {
      alert('Gagal menyimpan detail item pesanan!');
    }

    setSubmitting(false);
  };

  // Filter Items
  const filteredMenu = menuItems.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      
      {/* 🟢 SISI KIRI: KATALOG MENU */}
      <div className="lg:col-span-2 space-y-4">
        
        {/* Header & Filter */}
        <div className="bg-[#141e1b] p-4 rounded-2xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-black text-[#ccff00] uppercase tracking-wide flex items-center gap-2">
              <Coffee className="w-5 h-5" /> Kasir Cafe & Rental Alat
            </h1>
            <span className="text-xs text-zinc-400 font-bold">{menuItems.length} Menu Ready</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {/* Filter Category */}
            <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 shrink-0">
              {[
                { id: 'all', label: 'Semua', icon: <UtensilsCrossed className="w-3.5 h-3.5" /> },
                { id: 'minuman', label: 'Minuman', icon: <Coffee className="w-3.5 h-3.5" /> },
                { id: 'makanan', label: 'Makanan', icon: <Pizza className="w-3.5 h-3.5" /> },
                { id: 'sewa_alat', label: 'Sewa Alat', icon: <Activity className="w-3.5 h-3.5" /> },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                    selectedCategory === cat.id
                      ? 'bg-[#ccff00] text-zinc-950'
                      : 'bg-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari menu / raket..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ccff00]"
              />
            </div>
          </div>
        </div>

        {/* Grid Katalog */}
        {loading ? (
          <div className="text-center py-16 bg-[#141e1b] rounded-2xl border border-white/10">
            <Loader2 className="w-6 h-6 text-[#ccff00] animate-spin mx-auto mb-2" />
            <p className="text-xs text-zinc-400">Memuat Katalog Menu...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredMenu.map((item) => (
              <button
                key={item.id}
                onClick={() => handleAddToCart(item)}
                className="bg-[#141e1b] border border-white/10 hover:border-[#ccff00]/50 rounded-2xl p-3 text-left flex flex-col justify-between transition-all group active:scale-95"
              >
                <div>
                  <div className="w-full h-24 rounded-xl bg-black/40 overflow-hidden mb-2 relative flex items-center justify-center">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <UtensilsCrossed className="w-6 h-6 text-zinc-600" />
                    )}
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/80 text-zinc-300">
                      Stok: {item.stock}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-white line-clamp-1">{item.name}</h3>
                  <span className="text-xs font-black text-[#ccff00] mt-1 block">
                    {formatRupiah(item.price)}
                  </span>
                </div>

                <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-zinc-400 font-semibold group-hover:text-white">
                  <span>+ Tambah</span>
                  <Plus className="w-3.5 h-3.5 text-[#ccff00]" />
                </div>
              </button>
            ))}
          </div>
        )}

      </div>

      {/* 🔴 SISI KANAN: KERANJANG & CHECKOUT */}
      <div className="bg-[#141e1b] border border-white/10 rounded-2xl p-4 flex flex-col justify-between h-[calc(100vh-120px)] sticky top-20">
        
        <div>
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
            <h2 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <ShoppingBag className="w-4 h-4 text-[#ccff00]" />
              Keranjang Pesanan
            </h2>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-[10px] text-rose-400 hover:underline">
                Kosongkan
              </button>
            )}
          </div>

          {/* Atas Nama Pemesan */}
          <div className="mb-3">
            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
              Atas Nama Pemesan
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
              <input
                type="text"
                required
                placeholder="Contoh: Mas Budi / Lapangan 1"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ccff00]"
              />
            </div>
          </div>

          {/* List Items Keranjang */}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {cart.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 text-xs">
                Keranjang masih kosong.<br />Klik menu di sebelah kiri untuk memilih.
              </div>
            ) : (
              cart.map((c) => (
                <div key={c.menuItem.id} className="bg-white/5 p-2.5 rounded-xl border border-white/5 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white truncate">{c.menuItem.name}</h4>
                    <span className="text-[10px] text-zinc-400">{formatRupiah(c.menuItem.price)}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleUpdateQty(c.menuItem.id, -1)} className="p-1 rounded-lg bg-white/10 text-white hover:bg-rose-500/20">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold text-[#ccff00] w-4 text-center">{c.quantity}</span>
                    <button onClick={() => handleUpdateQty(c.menuItem.id, 1)} className="p-1 rounded-lg bg-white/10 text-white hover:bg-[#ccff00]/20">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Total & Checkout Section */}
        <div className="pt-3 border-t border-white/10 space-y-3">
          
          {/* Pilih Metode Pembayaran */}
          <div>
            <label className="block text-[10px] font-semibold text-zinc-400 mb-1">Metode Pembayaran</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'cash', label: 'Tunai', icon: <Banknote className="w-3.5 h-3.5" /> },
                { id: 'qris', label: 'QRIS', icon: <QrCode className="w-3.5 h-3.5" /> },
                { id: 'transfer', label: 'Transfer', icon: <CreditCard className="w-3.5 h-3.5" /> },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={`p-2 rounded-xl border text-center flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
                    paymentMethod === m.id
                      ? 'bg-[#ccff00] border-[#ccff00] text-zinc-950'
                      : 'bg-white/5 border-white/10 text-zinc-400'
                  }`}
                >
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subtotal Total */}
          <div className="flex justify-between items-center text-sm font-black text-white pt-1">
            <span>TOTAL BAYAR:</span>
            <span className="text-base text-[#ccff00]">{formatRupiah(totalAmount)}</span>
          </div>

          {/* Submit Button (All User / Kasir / Owner) */}
          <button
            onClick={handleCheckout}
            disabled={submitting || cart.length === 0}
            className="w-full bg-[#ccff00] hover:bg-[#b8e600] text-zinc-950 font-black py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(204,255,0,0.2)] disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            PROSES TRANSAKSI & BAYAR
          </button>
        </div>

      </div>

      {/* ------------------ 📱 MODAL STRUK SUKSES & CETAK ------------------ */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#141e1b] border border-white/10 rounded-3xl p-6 shadow-2xl relative text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <Receipt className="w-6 h-6" />
            </div>

            <h3 className="text-sm font-bold text-white uppercase tracking-wider">EKSDI CAFE & RENTAL</h3>
            <p className="text-[10px] text-zinc-400 mt-0.5">Struk Transaksi Selesai</p>

            <div className="my-4 p-3 bg-black/40 rounded-2xl border border-white/10 text-left text-xs space-y-2">
              <div className="flex justify-between text-zinc-400 text-[10px]">
                <span>No: {completedOrder.orderNumber}</span>
                <span>{completedOrder.date}</span>
              </div>
              <div className="text-white font-bold border-b border-white/10 pb-2">
                Atas Nama: {completedOrder.customerName}
              </div>

              <div className="space-y-1 pt-1">
                {completedOrder.items.map((i: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-[11px] text-zinc-300">
                    <span>{i.menuItem.name} x{i.quantity}</span>
                    <span>{formatRupiah(i.subtotal)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 pt-2 flex justify-between font-black text-sm text-[#ccff00]">
                <span>TOTAL:</span>
                <span>{formatRupiah(completedOrder.totalAmount)}</span>
              </div>
            </div>

            {/* Tombol Cetak Struk POS & Transaksi Baru */}
            <div className="space-y-2">
              <button
                onClick={() => printThermalReceiptWithjsPDF(completedOrder)}
                className="w-full bg-[#ccff00] text-zinc-950 font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(204,255,0,0.2)]"
              >
                <Printer className="w-4 h-4" /> CETAK STRUK POS (JSPDF)
              </button>

              <button
                onClick={() => setCompletedOrder(null)}
                className="w-full bg-white/5 hover:bg-white/10 text-zinc-300 font-bold py-2.5 rounded-xl text-xs border border-white/10"
              >
                TRANSAKSI BARU
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}