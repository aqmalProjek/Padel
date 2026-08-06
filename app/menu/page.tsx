'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Coffee, 
  UtensilsCrossed, 
  ShoppingBag, 
  Plus, 
  Minus, 
  X, 
  CheckCircle2, 
  Loader2, 
  User, 
  MapPin, 
  Search,
  Check,
  Image as ImageIcon
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

export default function PublicSelfOrderPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Cart & Order Form State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [tableOrCourt, setTableOrCourt] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);

  // Fetch Menu
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

  // Handler Keranjang
  const handleAddToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menuItem.id === item.id
            ? { ...c, quantity: c.quantity + 1, subtotal: (c.quantity + 1) * c.menuItem.price }
            : c
        );
      }
      return [...prev, { menuItem: item, quantity: 1, subtotal: item.price }];
    });
  };

  const handleUpdateQty = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.menuItem.id === itemId) {
            const newQty = c.quantity + delta;
            return newQty > 0
              ? { ...c, quantity: newQty, subtotal: newQty * c.menuItem.price }
              : null;
          }
          return c;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const totalAmount = cart.reduce((acc, curr) => acc + curr.subtotal, 0);
  const totalItemCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);

  // Submit Order dari HP Pelanggan
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!customerName || !tableOrCourt) {
      alert('Mohon isi Nama dan Nomor Meja / Lapangan!');
      return;
    }

    setSubmitting(true);
    const orderNum = `ORD-${Date.now().toString().slice(-6)}`;
    const fullCustomerName = `${customerName.trim()} (${tableOrCourt.trim()})`;

    // 1. Insert Header Order ke pos_orders
    const { data: orderData, error: orderError } = await supabase
      .from('pos_orders')
      .insert([
        {
          order_number: orderNum,
          customer_name: fullCustomerName,
          total_amount: totalAmount,
          payment_status: 'pending',
          payment_method: 'cash',
          notes: orderNotes || null,
        },
      ])
      .select()
      .single();

    if (orderError || !orderData) {
      alert('Gagal mengirim pesanan: ' + orderError?.message);
      setSubmitting(false);
      return;
    }

    // 2. Insert Items ke pos_order_items
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
      setOrderSuccess({
        orderNumber: orderNum,
        customerName: fullCustomerName,
        totalAmount,
        items: [...cart],
      });
      setCart([]);
      setIsCartOpen(false);
    } else {
      alert('Gagal mengirim item pesanan!');
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

  // Filter Menu
  const filteredMenu = menuItems.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <main className="min-h-screen bg-[#0f1715] text-white pb-28 font-sans selection:bg-[#ccff00] selection:text-black">
      
      {/* HEADER CAFE */}
      <div className="bg-[#141e1b] border-b border-white/10 p-4 sticky top-0 z-20 backdrop-blur-md bg-opacity-90">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-[#ccff00]/10 border border-[#ccff00] flex items-center justify-center font-black text-[#ccff00] text-xs">
              EKSDI
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wider text-white uppercase">EKSDI KOFFIE</h1>
              <p className="text-[10px] text-zinc-400">Scan & Order Menu Meja / Lapangan</p>
            </div>
          </div>
          
          <span className="px-2.5 py-1 rounded-full text-[9px] font-extrabold bg-[#ccff00] text-zinc-950 uppercase">
            SELF-ORDER
          </span>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        
        {/* SEARCH & CATEGORY FILTER */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari kopi, snack, minuman..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ccff00]"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: 'Semua Menu' },
              { id: 'minuman', label: 'Minuman' },
              { id: 'makanan', label: 'Makanan & Snack' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-[#ccff00] text-zinc-950'
                    : 'bg-white/5 text-zinc-400 border border-white/10'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* LIST MENU ITEM GRID 2 KOLOM (SEPERTI FOTO ACUAN) */}
        {loading ? (
          <div className="text-center py-20 text-zinc-400 text-xs flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 text-[#ccff00] animate-spin" />
            <span>Memuat Buku Menu Eksdi Koffie...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5">
            {filteredMenu.map((item) => {
              const inCart = cart.find((c) => c.menuItem.id === item.id);
              return (
                <div
                  key={item.id}
                  className="bg-[#141e1b] border border-white/10 rounded-2xl p-2.5 flex flex-col justify-between hover:border-white/20 transition-all shadow-lg group"
                >
                  {/* FOTO MENU / PLACEHOLDER KOSONG */}
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/5 mb-2.5 flex items-center justify-center">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      /* Placeholder Jika Foto Belum Ada */
                      <div className="flex flex-col items-center justify-center gap-1.5 text-zinc-600 p-2 text-center">
                        <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-zinc-500">
                          {item.category === 'minuman' ? (
                            <Coffee className="w-5 h-5 text-amber-500/60" />
                          ) : (
                            <UtensilsCrossed className="w-5 h-5 text-emerald-500/60" />
                          )}
                        </div>
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                          Eksdi Koffie
                        </span>
                      </div>
                    )}

                    {/* Badge Kategori */}
                    <span className="absolute top-2 left-2 text-[8px] font-extrabold uppercase text-[#ccff00] bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md border border-[#ccff00]/20">
                      {item.category}
                    </span>
                  </div>

                  {/* NAMA & HARGA MENU */}
                  <div className="px-1 mb-2">
                    <h3 className="text-xs font-bold text-white line-clamp-1 group-hover:text-[#ccff00] transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-xs font-black text-[#ccff00] mt-0.5">
                      {formatRupiah(item.price)}
                    </p>
                  </div>

                  {/* BUTTON COUNTER / PESAN (MIRIP GAMBAR ACUAN) */}
                  <div>
                    {inCart ? (
                      <div className="flex items-center justify-between bg-white/5 border border-[#ccff00]/30 rounded-xl p-1">
                        <button
                          onClick={() => handleUpdateQty(item.id, -1)}
                          className="w-7 h-7 rounded-lg bg-white/10 hover:bg-rose-500/20 text-white hover:text-rose-400 flex items-center justify-center transition-all"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        <span className="text-xs font-black text-[#ccff00] px-1">
                          {inCart.quantity}
                        </span>

                        <button
                          onClick={() => handleUpdateQty(item.id, 1)}
                          className="w-7 h-7 rounded-lg bg-[#ccff00] text-zinc-950 flex items-center justify-center font-bold hover:bg-[#b8e600] transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddToCart(item)}
                        className="w-full bg-white/5 hover:bg-[#ccff00] hover:text-zinc-950 text-white border border-white/10 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" /> Pesan
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* FLOATING BOTBAR CART BUTTON */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-30">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-[#ccff00] text-zinc-950 font-black p-4 rounded-2xl flex items-center justify-between shadow-[0_0_25px_rgba(204,255,0,0.3)] animate-bounce"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-zinc-950 text-[#ccff00] flex items-center justify-center text-xs font-bold">
                {totalItemCount}
              </span>
              <span className="text-xs uppercase tracking-wider">LIHAT PESANAN SAYA</span>
            </div>
            <span className="text-sm">{formatRupiah(totalAmount)}</span>
          </button>
        </div>
      )}

      {/* 📱 MODAL CHECKOUT FORM PELANGGAN */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#141e1b] border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#ccff00]" /> Konfirmasi Pesanan Saya
              </h3>
              <button onClick={() => setIsCartOpen(false)} className="p-1.5 rounded-full bg-white/5 text-zinc-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitOrder} className="space-y-4">
              
              {/* Form Nama & Meja */}
              <div className="space-y-3 bg-white/5 p-3.5 rounded-2xl border border-white/10">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Atas Nama Pemesan
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="Atas nama siapa?"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-[#0f1715] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ccff00]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Nomor Meja / Lapangan
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Meja 03 / Lapangan 1"
                      value={tableOrCourt}
                      onChange={(e) => setTableOrCourt(e.target.value)}
                      className="w-full bg-[#0f1715] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ccff00]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Catatan Khusus (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Less sugar / Es dikurangi"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full bg-[#0f1715] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ccff00]"
                  />
                </div>
              </div>

              {/* Rincian Menu */}
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {cart.map((c) => (
                  <div key={c.menuItem.id} className="flex justify-between items-center text-xs">
                    <span className="text-zinc-300">{c.menuItem.name} <strong className="text-[#ccff00]">x{c.quantity}</strong></span>
                    <span className="font-bold text-white">{formatRupiah(c.subtotal)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-white/10 flex justify-between items-center font-black text-sm">
                <span>TOTAL:</span>
                <span className="text-base text-[#ccff00]">{formatRupiah(totalAmount)}</span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#ccff00] hover:bg-[#b8e600] text-zinc-950 font-black py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(204,255,0,0.2)] disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                KIRIM PESANAN KE KASIR
              </button>

            </form>

          </div>
        </div>
      )}

      {/* 📱 POP-UP SUKSES PESAN */}
      {orderSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#141e1b] border border-[#ccff00]/30 rounded-3xl p-6 text-center shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-[#ccff00]/10 border border-[#ccff00] text-[#ccff00] flex items-center justify-center mx-auto mb-3">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <h3 className="text-base font-black text-white uppercase">PESANAN TERKIRIM!</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Pesanan atas nama <strong className="text-white">{orderSuccess.customerName}</strong> telah masuk ke sistem kasir.
            </p>

            <div className="my-4 p-3 bg-white/5 rounded-2xl border border-white/10 text-left text-xs space-y-1">
              <div className="text-zinc-400 text-[10px]">No. Order: {orderSuccess.orderNumber}</div>
              <div className="font-black text-[#ccff00] text-sm pt-1">
                Total: {formatRupiah(orderSuccess.totalAmount)}
              </div>
              <p className="text-[10px] text-zinc-400 pt-1">
                *Silakan lakukan pembayaran langsung ke kasir / saat pesanan diantar.
              </p>
            </div>

            <button
              onClick={() => setOrderSuccess(null)}
              className="w-full bg-[#ccff00] text-zinc-950 font-bold py-3 rounded-xl text-xs"
            >
              OK, MENGERTI
            </button>
          </div>
        </div>
      )}

    </main>
  );
}