import { useEffect, useState } from 'react';
import axios from 'axios';
import { getStoredAuth } from '../utils/auth';
import { API_BASE } from '../utils/api';
import { useToast } from "../components/Toast";
import { useConfirm } from "../components/ConfirmDialog";
import { PlusIcon, TrashIcon, PencilSquareIcon, CheckIcon } from "@heroicons/react/24/outline";

const pageOptions = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'keuangan', label: 'Keuangan' },
  { key: 'produk', label: 'Produk' },
  { key: 'kasir', label: 'Kasir' },
  { key: 'insight', label: 'Insight' },
  { key: 'settings', label: 'Pengaturan' },
];

function ChevronDown({ open }) {
  return (
    <svg
      className={`w-5 h-5 text-[#6B7280] transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function Section({ title, desc, open, onToggle, children }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E6E8EC] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[#F8FAFC] transition-colors"
      >
        <div>
          <h2 className="text-base font-bold text-[#23262F]">{title}</h2>
          {desc && <p className="text-sm text-[#6B7280] mt-0.5">{desc}</p>}
        </div>
        <ChevronDown open={open} />
      </button>
      {open && <div className="px-5 pb-5 border-t border-[#E6E8EC] pt-5">{children}</div>}
    </div>
  );
}

export default function Settings() {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const [openSection, setOpenSection] = useState('roles');
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRolePages, setNewRolePages] = useState([]);
  const [newUser, setNewUser] = useState({ name: '', password: '', roleIds: [] });
  const [editingUser, setEditingUser] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserRoleNames, setCurrentUserRoleNames] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesRes, usersRes] = await Promise.all([
        axios.get(`${API_BASE}/api/roles`),
        axios.get(`${API_BASE}/api/users`),
      ]);
      setRoles(rolesRes.data || []);
      setUsers(usersRes.data || []);
    } catch (err) {
      console.error('Gagal memuat data settings:', err);
      setError('Gagal memuat data. Pastikan Anda memiliki akses dan server menyala.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const stored = getStoredAuth();
    setCurrentUserId(stored?.user?.id ?? null);
    setCurrentUserRoleNames(stored?.user?.roles || []);
    fetchData();
  }, []);

  const togglePage = (pageKey) => {
    setNewRolePages((prev) =>
      prev.includes(pageKey) ? prev.filter((item) => item !== pageKey) : [...prev, pageKey]
    );
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return addToast('Nama role wajib diisi', 'warning');
    try {
      await axios.post(`${API_BASE}/api/roles`, { name: newRoleName.trim(), pages: newRolePages });
      setNewRoleName('');
      setNewRolePages([]);
      addToast('Role berhasil ditambahkan', 'success');
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.error || 'Gagal membuat role.', 'error');
    }
  };

  const handleDeleteRole = async (id) => {
    const confirmed = await confirm('Hapus role ini?', 'Hapus Role');
    if (!confirmed) return;
    try {
      await axios.delete(`${API_BASE}/api/roles/${id}`);
      addToast('Role berhasil dihapus', 'success');
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.error || 'Gagal menghapus role.', 'error');
    }
  };

  const resetUserForm = () => {
    setNewUser({ name: '', password: '', roleIds: [] });
    setEditingUser(null);
  };

  const handleNewUserChange = (field, value) => {
    setNewUser((prev) => ({ ...prev, [field]: value }));
  };

  const toggleUserRole = (roleId) => {
    setNewUser((prev) => ({
      ...prev,
      roleIds: prev.roleIds.includes(roleId)
        ? prev.roleIds.filter((id) => id !== roleId)
        : [...prev.roleIds, roleId],
    }));
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setNewUser({
      name: user.name || '',
      password: '',
      roleIds: user.roles.map((r) => r.id),
    });
  };

  const handleSaveUser = async () => {
    if (!newUser.name.trim()) return addToast('Nama wajib diisi', 'warning');
    if (!editingUser && !newUser.password.trim()) return addToast('Password wajib diisi', 'warning');
    if (newUser.roleIds.length === 0) return addToast('Pengguna harus memiliki minimal 1 role', 'warning');

    try {
      if (editingUser) {
        const payload = {
          name: newUser.name.trim(),
          roleIds: newUser.roleIds,
        };
        if (newUser.password.trim()) payload.password = newUser.password.trim();
        await axios.put(`${API_BASE}/api/users/${editingUser.id}`, payload);
        addToast('Pengguna berhasil diperbarui', 'success');
      } else {
        await axios.post(`${API_BASE}/api/users`, {
          name: newUser.name.trim(),
          password: newUser.password,
          roleIds: newUser.roleIds,
        });
        addToast('Pengguna berhasil ditambahkan', 'success');
      }
      resetUserForm();
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.error || 'Gagal menyimpan pengguna.', 'error');
    }
  };

  const handleDeleteUser = async (id, name) => {
    const confirmed = await confirm(`Hapus pengguna "${name}"?`, 'Hapus Pengguna');
    if (!confirmed) return;
    try {
      await axios.delete(`${API_BASE}/api/users/${id}`);
      addToast('Pengguna berhasil dihapus', 'success');
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.error || 'Gagal menghapus pengguna.', 'error');
    }
  };

  return (
    <div className="pt-4 sm:pt-8 pb-12 max-w-7xl mx-auto space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-3.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <Section
        title="Role & Hak Akses"
        desc="Atur role dan halaman yang bisa diakses"
        open={openSection === 'roles'}
        onToggle={() => setOpenSection(openSection === 'roles' ? null : 'roles')}
      >
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="Nama role baru"
              className="flex-1 rounded-xl border border-[#E6E8EC] px-4 py-2.5 text-sm focus:border-[#2936C4] focus:outline-none"
            />
            <button onClick={handleCreateRole} className="btn btn-primary px-5 py-2.5 text-sm shrink-0 gap-2">
              <PlusIcon className="w-4 h-4" strokeWidth={2.5} /> Tambah
            </button>
          </div>

          <div>
            <p className="text-xs font-bold text-[#6B7280] mb-2 uppercase tracking-wide">Akses halaman</p>
            <div className="flex flex-wrap gap-2">
              {pageOptions.map((page) => (
                <button
                  key={page.key}
                  type="button"
                  onClick={() => togglePage(page.key)}
                  className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold border transition-colors ${
                    newRolePages.includes(page.key)
                      ? 'bg-[#2936C4] text-white border-[#2936C4]'
                      : 'bg-white text-[#6B7280] border-[#E6E8EC] hover:border-[#2936C4]'
                  }`}
                >
                  {page.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {roles.length === 0 ? (
              <p className="text-sm text-[#6B7280] py-2">Belum ada role.</p>
            ) : (
              roles.map((role) => {
                const isCurrentUserRole = currentUserRoleNames.includes(role.name);
                return (
                  <div key={role.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#E6E8EC] px-4 py-3">
                    <div>
                      <p className="font-bold text-sm text-[#23262F]">{role.name}</p>
                      <p className="text-xs text-[#6B7280]">{role.pages.join(', ') || 'Tidak ada akses'}</p>
                    </div>
                    {!isCurrentUserRole && (
                      <button
                        onClick={() => handleDeleteRole(role.id)}
                        className="text-xs font-bold shrink-0 flex items-center gap-1 text-[#E02D3C] hover:underline"
                      >
                        <TrashIcon className="w-3.5 h-3.5" /> Hapus
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Section>

      <Section
        title="Kelola Pengguna"
        desc="Tambah, edit, atau nonaktifkan akun pengguna"
        open={openSection === 'users'}
        onToggle={() => setOpenSection(openSection === 'users' ? null : 'users')}
      >
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={newUser.name}
              onChange={(e) => handleNewUserChange('name', e.target.value)}
              placeholder="Nama pengguna"
              className="flex-1 rounded-xl border border-[#E6E8EC] px-4 py-2.5 text-sm focus:border-[#2936C4] focus:outline-none"
            />
            <input
              type="password"
              value={newUser.password}
              onChange={(e) => handleNewUserChange('password', e.target.value)}
              placeholder={editingUser ? 'Kosongkan jika tidak diganti' : 'Password'}
              className="rounded-xl border border-[#E6E8EC] px-4 py-2.5 text-sm focus:border-[#2936C4] focus:outline-none"
            />
          </div>

          <div>
            <p className="text-xs font-bold text-[#6B7280] mb-2 uppercase tracking-wide">Role</p>
            <div className="flex flex-wrap gap-2">
              {roles.length === 0 ? (
                <p className="text-sm text-[#6B7280]">Buat role terlebih dahulu.</p>
              ) : (
                roles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => toggleUserRole(role.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold border transition-colors ${
                      newUser.roleIds.includes(role.id)
                        ? 'bg-[#2936C4] text-white border-[#2936C4]'
                        : 'bg-white text-[#6B7280] border-[#E6E8EC] hover:border-[#2936C4]'
                    }`}
                  >
                    {role.name}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveUser}
              disabled={newUser.roleIds.length === 0}
              className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-colors inline-flex items-center gap-2 ${
                newUser.roleIds.length === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-[#1D7A52] text-white hover:bg-[#16603f]'
              }`}
            >
              {editingUser ? <><CheckIcon className="w-4 h-4" strokeWidth={2.5} /> Simpan Perubahan</> : <><PlusIcon className="w-4 h-4" strokeWidth={2.5} /> Tambah Pengguna</>}
            </button>
            {editingUser && (
              <button onClick={resetUserForm} className="text-sm font-semibold text-[#6B7280] hover:text-[#23262F] transition-colors">
                Batal
              </button>
            )}
          </div>

          <div className="space-y-2">
            {users.length === 0 ? (
              <p className="text-sm text-[#6B7280] py-2">Belum ada pengguna.</p>
            ) : (
              users.map((user) => {
                const userRoleNames = user.roles.map((r) => r.name);
                const hasSharedRole = userRoleNames.some((name) => currentUserRoleNames.includes(name));
                return (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#E6E8EC] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-[#23262F]">{user.name || user.username}</p>
                    <p className="text-xs text-[#8B95A7]">{user.roles.map((role) => role.name).join(', ')}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {user.id === currentUserId ? (
                      <span className="text-xs font-semibold text-[#6B7280]">Akun Anda</span>
                    ) : (
                      <>
                        <button onClick={() => handleEditUser(user)} className="text-xs font-bold text-[#2936C4] hover:underline flex items-center gap-1">
                          <PencilSquareIcon className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.name || user.username)}
                          disabled={hasSharedRole}
                          className={`text-xs font-bold flex items-center gap-1 ${hasSharedRole ? 'text-[#6B7280] cursor-not-allowed' : 'text-[#E02D3C] hover:underline'}`}
                        >
                          {hasSharedRole ? 'Tidak bisa hapus' : <><TrashIcon className="w-3.5 h-3.5" /> Hapus</>}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}
