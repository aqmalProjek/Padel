'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  UtensilsCrossed, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  Image as ImageIcon, 
  Upload, 
  X, 
  Loader2, 
  RefreshCw, 
  Coffee, 
  Pizza, 
  Activity,
  CheckCircle2,
  XCircle
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

export default function MasterMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'minuman' as 'makanan' | 'minuman' | 'sewa_alat',
    price: 15000,
    stock: 20,
    image_url: '',
    is_available: true,
  });

  // Fetch Data Menu
  const fetchMenuItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setItems(data as MenuItem[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMenuItems();
  }, []);

  // Upload Foto ke Supabase Storage (Bucket: menu-images)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `menu/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('menu-images')
      .upload(filePath, file);

    if (uploadError) {
      alert('Gagal mengupload gambar: ' + uploadError.message);
      setUploadingImage(false);
      return;
    }

    // Ambil Public URL
    const { data: publicUrlData } = supabase.storage
      .from('menu-images')
      .getPublicUrl(filePath);

    if (publicUrlData) {
      setFormData((prev) => ({ ...prev, image_url: publicUrlData.publicUrl }));
    }
    setUploadingImage(false);
  };

  // Modal Handlers
  const handleOpenCreateModal = () => {
    setSelectedItem(null);
    setFormData({
      name: '',
      category: 'minuman',
      price: 15000,
      stock: 20,
      image_url: '',
      is_available: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: MenuItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      price: item.price,
      stock: item.stock,
      image_url: item.image_url || '',
      is_available: item.is_available,
    });
    setIsModalOpen(true);
  };

  // Submit Save/Update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      name: formData.name,
      category: formData.category,
      price: formData.price,
      stock: formData.stock,
      image_url: formData.image_url || null,
      is_available: formData.is_available,
      updated_at: new Date().toISOString(),
    };

    if (selectedItem) {
      const { error } = await supabase.from('menu_items').update(payload).eq('id', selectedItem.id);
      if (!error) {
        setIsModalOpen(false);
        fetchMenuItems();
      } else {
        alert('Gagal mengupdate menu: ' + error.message);
      }
    } else {
      const { error } = await supabase.from('menu_items').insert([payload]);
      if (!error) {
        setIsModalOpen(false);
        fetchMenuItems();
      } else {
        alert('Gagal menambah menu: ' + error.message);
      }
    }
    setSubmitting(false);
  };

  // Delete Item
  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Apakah kamu yakin ingin menghapus ${name}?`)) {
      const { error } = await supabase.from('menu_items').delete().eq('id', id);
      if (!error) {
        fetchMenuItems();
      } else {
        alert('Gagal menghapus: ' + error.message);
      }
    }
  };

  // Toggle Availability Status
  const handleToggleAvailable = async (item: MenuItem) => {
    const { error } = await supabase
      .from('menu_items')
      .update({ is_available: !item.is_available })
      .eq('id', item.id);

    if (!error) {
      fetchMenuItems();
    }
  };

  // Format Rupiah
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Filter Items
  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#141e1b] p-5 rounded-2xl border border-white/10">
        <div>
          <h1 className="text-lg font-black text-[#ccff00] flex items-center gap-2 uppercase tracking-wide">
            <UtensilsCrossed className="w-5 h-5 text-[#ccff00]" />
            Master Menu Cafe & Rental Alat
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Kelola daftar makanan, minuman, dan persewaan raket/alat di Eksdi Padel.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="bg-[#ccff00] hover:bg-[#b8e600] text-zinc-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(204,255,0,0.2)] shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Tambah Menu Baru
        </button>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-[#141e1b] p-3 rounded-2xl border border-white/10">
        
        {/* Category Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'Semua Menu', icon: <UtensilsCrossed className="w-3.5 h-3.5" /> },
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
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 md:max-w-xs">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari nama menu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ccff00]"
          />
        </div>

      </div>

      {/* GRID ITEMS */}
      {loading ? (
        <div className="text-center py-16 bg-[#141e1b] rounded-2xl border border-white/10">
          <RefreshCw className="w-6 h-6 text-[#ccff00] animate-spin mx-auto mb-2" />
          <p className="text-xs text-zinc-400">Memuat Daftar Menu...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-[#141e1b] rounded-2xl border border-white/10">
          <UtensilsCrossed className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-xs text-zinc-400">Belum ada menu di kategori ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-[#141e1b] border rounded-2xl overflow-hidden flex flex-col justify-between transition-all ${
                item.is_available ? 'border-white/10 hover:border-white/20' : 'border-rose-500/30 opacity-60'
              }`}
            >
              {/* Gambar Item */}
              <div className="relative w-full h-36 bg-black/40 flex items-center justify-center overflow-hidden">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-zinc-600" />
                )}

                {/* Badge Kategori */}
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-black/70 backdrop-blur-md text-[#ccff00] border border-white/10">
                  {item.category.replace('_', ' ')}
                </span>

                {/* Toggle Available Button */}
                <button
                  onClick={() => handleToggleAvailable(item)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/70 backdrop-blur-md text-zinc-300 hover:text-white"
                  title={item.is_available ? 'Tandai Stok Habis' : 'Tandai Tersedia'}
                >
                  {item.is_available ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                </button>
              </div>

              {/* Detail Info */}
              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white line-clamp-1">{item.name}</h3>
                  <div className="flex items-center justify-between mt-1 text-[11px]">
                    <span className="font-extrabold text-[#ccff00]">{formatRupiah(item.price)}</span>
                    <span className="text-zinc-400">Stok: {item.stock}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/10">
                  <button
                    onClick={() => handleOpenEditModal(item)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-zinc-200 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id, item.name)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ------------------ 📱 MODAL FORM CREATE / EDIT ------------------ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#141e1b] border border-white/10 rounded-3xl p-6 shadow-2xl relative animate-fadeIn max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-[#ccff00]" />
                {selectedItem ? 'Edit Data Menu' : 'Tambah Menu Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-full bg-white/5 text-zinc-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Preview & Upload Gambar */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Foto Produk Menu</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shrink-0 relative">
                    {formData.image_url ? (
                      <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-zinc-600" />
                    )}
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-[#ccff00] animate-spin" />
                      </div>
                    )}
                  </div>

                  <label className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 text-center cursor-pointer transition-all">
                    <Upload className="w-4 h-4 text-[#ccff00] mx-auto mb-1" />
                    <span className="block text-[11px] font-bold text-zinc-300">Pilih / Upload Foto</span>
                    <span className="block text-[9px] text-zinc-500 mt-0.5">JPG, PNG, WebP (Maks 2MB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Nama Menu */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Nama Menu / Alat</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pocari Sweat 500ml / Sewa Raket Head"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ccff00]"
                />
              </div>

              {/* Kategori */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Kategori</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full bg-[#0f1715] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#ccff00]"
                >
                  <option value="minuman">Minuman (Isotonik, Kopi, Air)</option>
                  <option value="makanan">Makanan / Snack</option>
                  <option value="sewa_alat">Persewaan Alat (Raket, Bola, Handuk)</option>
                </select>
              </div>

              {/* Harga & Stok */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Harga Jual (Rp)</label>
                  <input
                    type="number"
                    required
                    step="500"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#ccff00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Stok Awal</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#ccff00]"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="is_available"
                  checked={formData.is_available}
                  onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                  className="w-4 h-4 accent-[#ccff00] rounded cursor-pointer"
                />
                <label htmlFor="is_available" className="text-xs text-zinc-300 font-medium cursor-pointer">
                  Tersedia untuk Dijual di Kasir
                </label>
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || uploadingImage}
                  className="w-full bg-[#ccff00] hover:bg-[#b8e600] text-zinc-950 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(204,255,0,0.15)] disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>SIMPAN MENU</span>}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}