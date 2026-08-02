'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    Users,
    UserPlus,
    ShieldCheck,
    User,
    Mail,
    KeyRound,
    Trash2,
    RefreshCw,
    X,
    Loader2,
    CheckCircle2,
    Shield
} from 'lucide-react';

interface UserProfile {
    id: string;
    full_name: string;
    role: 'owner' | 'kasir';
    created_at: string;
}

export default function MasterUsersPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        role: 'kasir' as 'owner' | 'kasir',
    });

    // Fetch Daftar Users dari Tabel Profiles
    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: true });

        if (!error && data) {
            setUsers(data as UserProfile[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Tambah User Baru via Supabase Auth & Profiles
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        // Kirim full_name & role di dalam options.data
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                data: {
                    full_name: formData.fullName,
                    role: formData.role,
                },
            },
        });

        if (authError) {
            alert('Gagal pendaftaran akun: ' + authError.message);
            setSubmitting(false);
            return;
        }

        if (authData.user) {
            alert('Akun user berhasil dibuat!');
            setIsModalOpen(false);
            setFormData({ fullName: '', email: '', password: '', role: 'kasir' });

            // Beri sedikit jeda waktu agar trigger database selesai mengeksekusi
            setTimeout(() => {
                fetchUsers();
            }, 500);
        }
        setSubmitting(false);
    };

    // Toggle Ubah Role (Kasir <-> Owner)
    const handleToggleRole = async (user: UserProfile) => {
        const newRole = user.role === 'owner' ? 'kasir' : 'owner';
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', user.id);

        if (!error) {
            fetchUsers();
        } else {
            alert('Gagal mengupdate role: ' + error.message);
        }
    };

    // Hapus User
    const handleDeleteUser = async (id: string, name: string) => {
        if (confirm(`Apakah kamu yakin ingin menghapus akses untuk ${name}?`)) {
            const { error } = await supabase.from('profiles').delete().eq('id', id);
            if (!error) {
                fetchUsers();
            } else {
                alert('Gagal menghapus user: ' + error.message);
            }
        }
    };

    return (
        <div className="space-y-6">

            {/* HEADER SECTION */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#141e1b] p-5 rounded-2xl border border-white/10">
                <div>
                    <h1 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-wide">
                        <Users className="w-5 h-5 text-[#ccff00]" />
                        Master Users & Pengaturan Hak Akses
                    </h1>
                    <p className="text-xs text-zinc-400 mt-1">
                        Kelola akun yang bisa masuk ke portal admin/kasir serta tentukan peran (*role*).
                    </p>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-[#ccff00] hover:bg-[#b8e600] text-zinc-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(204,255,0,0.2)] shrink-0"
                >
                    <UserPlus className="w-4 h-4 stroke-[2.5]" />
                    Tambah User Baru
                </button>
            </div>

            {/* LIST USERS GRID */}
            {loading ? (
                <div className="text-center py-16 bg-[#141e1b] rounded-2xl border border-white/10">
                    <RefreshCw className="w-6 h-6 text-[#ccff00] animate-spin mx-auto mb-2" />
                    <p className="text-xs text-zinc-400">Memuat Data Users...</p>
                </div>
            ) : users.length === 0 ? (
                <div className="text-center py-16 bg-[#141e1b] rounded-2xl border border-white/10">
                    <Users className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    <p className="text-xs text-zinc-400">Belum ada user tambahan terdaftar.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {users.map((u) => (
                        <div
                            key={u.id}
                            className="bg-[#141e1b] border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-white/20 transition-all"
                        >
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span
                                        className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 ${u.role === 'owner'
                                                ? 'bg-[#ccff00]/10 text-[#ccff00] border border-[#ccff00]/30'
                                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                            }`}
                                    >
                                        {u.role === 'owner' ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                        {u.role.toUpperCase()}
                                    </span>

                                    <button
                                        onClick={() => handleToggleRole(u)}
                                        className="text-[10px] text-zinc-400 hover:text-white underline decoration-dashed"
                                        title="Ubah Role"
                                    >
                                        Ubah Role
                                    </button>
                                </div>

                                <h3 className="text-base font-bold text-white mb-1">{u.full_name}</h3>
                                <p className="text-xs text-zinc-400">
                                    Terdaftar: {new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                            </div>

                            <div className="mt-5 pt-3 border-t border-white/10 flex justify-end">
                                <button
                                    onClick={() => handleDeleteUser(u.id, u.full_name)}
                                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all flex items-center gap-1.5 text-xs font-semibold"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Hapus User
                                </button>
                            </div>

                        </div>
                    ))}
                </div>
            )}

            {/* ------------------ 📱 MODAL TAMBAH USER ------------------ */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-[#141e1b] border border-white/10 rounded-3xl p-6 shadow-2xl relative animate-fadeIn">

                        <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-4">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <UserPlus className="w-4 h-4 text-[#ccff00]" />
                                Registrasi User / Kasir Baru
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-full bg-white/5 text-zinc-400">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="space-y-4">

                            {/* Nama Lengkap */}
                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 mb-1">Nama Lengkap</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Budi (Kasir Shift Pagi)"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ccff00]"
                                />
                            </div>

                            {/* Email Login */}
                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 mb-1">Email untuk Login</label>
                                <div className="relative">
                                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                                    <input
                                        type="email"
                                        required
                                        placeholder="kasir1@eksdipadel.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ccff00]"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 mb-1">Password Awal</label>
                                <div className="relative">
                                    <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        placeholder="Minimal 6 karakter"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ccff00]"
                                    />
                                </div>
                            </div>

                            {/* Pilih Role */}
                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 mb-1">Role / Peran</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'owner' | 'kasir' })}
                                    className="w-full bg-[#0f1715] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#ccff00]"
                                >
                                    <option value="kasir">Kasir (Akses Operasional Booking & Cafe)</option>
                                    <option value="owner">Owner (Akses Penuh + Laporan Pendapatan)</option>
                                </select>
                            </div>

                            {/* Submit */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full bg-[#ccff00] hover:bg-[#b8e600] text-zinc-950 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(204,255,0,0.15)] disabled:opacity-50"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>BUAT AKUN USER</span>}
                                </button>
                            </div>

                        </form>

                    </div>
                </div>
            )}

        </div>
    );
}