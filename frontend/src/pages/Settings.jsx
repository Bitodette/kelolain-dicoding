import { useEffect, useState } from 'react';
import axios from 'axios';
import { getStoredAuth } from '../utils/auth';
import { API_BASE } from '../utils/api';

const pageOptions = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'keuangan', label: 'Keuangan' },
  { key: 'produk', label: 'Produk' },
  { key: 'kasir', label: 'Kasir' },
  { key: 'insight', label: 'Insight' },
  { key: 'settings', label: 'Pengaturan' },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('roles');
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRolePages, setNewRolePages] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', name: '', roleIds: [], active: true });
  const [editingUser, setEditingUser] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserRoleNames, setCurrentUserRoleNames] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

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
    setCurrentUserRoleNames(stored?.user?.roles?.map((role) => role.name) || []);
    fetchData();
  }, []);

  const togglePage = (pageKey) => {
    setNewRolePages((prev) =>
      prev.includes(pageKey) ? prev.filter((item) => item !== pageKey) : [...prev, pageKey]
    );
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return alert('Nama role wajib diisi');
    try {
      await axios.post(`${API_BASE}/api/roles`, { name: newRoleName.trim(), pages: newRolePages });
      setNewRoleName('');
      setNewRolePages([]);
      showSuccess('Role berhasil ditambahkan');
      fetchData();
    } catch (err) {
      console.error('Gagal membuat role:', err);
      alert(err.response?.data?.error || 'Gagal membuat role.');
    }
  };

  const handleDeleteRole = async (id) => {
    const confirmed = window.confirm('Hapus role ini?');
    if (!confirmed) return;
    try {
      await axios.delete(`${API_BASE}/api/roles/${id}`);
      showSuccess('Role berhasil dihapus');
      fetchData();
    } catch (err) {
      console.error('Gagal menghapus role:', err);
      alert(err.response?.data?.error || 'Gagal menghapus role.');
    }
  };

  const resetUserForm = () => {
    setNewUser({ username: '', password: '', name: '', roleIds: [], active: true });
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
      username: user.username || '',
      password: '',
      name: user.name || '',
      roleIds: user.roles.map((r) => r.id),
      active: user.active,
    });
  };

  const handleSaveUser = async () => {
    if (!newUser.username.trim()) return alert('Username wajib diisi');
    if (!editingUser && !newUser.password.trim()) return alert('Password wajib diisi');
    if (newUser.roleIds.length === 0) return alert('Pengguna harus memiliki minimal 1 role');

    try {
      if (editingUser) {
        const payload = {
          username: newUser.username.trim(),
          name: newUser.name.trim() || newUser.username.trim(),
          roleIds: newUser.roleIds,
          active: newUser.active,
        };
        if (newUser.password.trim()) payload.password = newUser.password.trim();
        await axios.put(`${API_BASE}/api/users/${editingUser.id}`, payload);
        showSuccess('Pengguna berhasil diperbarui');
      } else {
        await axios.post(`${API_BASE}/api/users`, {
          username: newUser.username.trim(),
          password: newUser.password,
          name: newUser.name.trim() || newUser.username.trim(),
          roleIds: newUser.roleIds,
          active: newUser.active,
        });
        showSuccess('Pengguna berhasil ditambahkan');
      }
      resetUserForm();
      fetchData();
    } catch (err) {
      console.error('Gagal menyimpan pengguna:', err);
      alert(err.response?.data?.error || 'Gagal menyimpan pengguna.');
    }
  };

  const handleDeleteUser = async (id, username) => {
    const confirmed = window.confirm(`Hapus pengguna "${username}"?`);
    if (!confirmed) return;
    try {
      await axios.delete(`${API_BASE}/api/users/${id}`);
      showSuccess('Pengguna berhasil dihapus');
      fetchData();
    } catch (err) {
      console.error('Gagal menghapus pengguna:', err);
      alert(err.response?.data?.error || 'Gagal menghapus pengguna.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F4F5F7] p-4 rounded-xl border border-[#E6E8EC]">
        <div>
          <h1 className="text-lg font-bold text-[#23262F]">Pengaturan Role & Pengguna</h1>
          <p className="text-sm text-[#6B7280] mt-1">Kelola role dan hak akses halaman untuk akun pengguna.</p>
        </div>
        {/* <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('roles')}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${activeTab === 'roles' ? 'bg-[#2936C4] text-white' : 'bg-white text-[#23262F] border border-[#E6E8EC]'}`}
          >
            Roles
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${activeTab === 'users' ? 'bg-[#2936C4] text-white' : 'bg-white text-[#23262F] border border-[#E6E8EC]'}`}
          >
            Pengguna
          </button>
        </div> */}
      </div>

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          {successMessage}
        </div>
      )}

      {loading ? (
        <div className="p-8 bg-white rounded-xl border border-[#E6E8EC] text-center text-[#6B7280]">Memuat data...</div>
      ) : error ? (
        <div className="p-8 bg-red-50 rounded-xl border border-red-200 text-sm text-[#A41E1E]">{error}</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 bg-white rounded-xl border border-[#E6E8EC] p-6">
            <h2 className="text-base font-bold text-[#23262F]">Role</h2>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Nama role baru"
                  className="w-full rounded-xl border border-[#E6E8EC] px-4 py-3 text-sm focus:border-[#2936C4] focus:outline-none"
                />
                <button onClick={handleCreateRole} className="btn btn-primary px-4 py-3 text-sm">
                  Tambah Role
                </button>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {pageOptions.map((page) => (
                  <label key={page.key} className="inline-flex items-center gap-2 rounded-xl border border-[#E6E8EC] px-3 py-2 text-sm cursor-pointer hover:border-[#2936C4]">
                    <input
                      type="checkbox"
                      checked={newRolePages.includes(page.key)}
                      onChange={() => togglePage(page.key)}
                      className="h-4 w-4 rounded border-gray-300 text-[#2936C4] focus:ring-[#2936C4]"
                    />
                    {page.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {roles.length === 0 ? (
                <p className="text-sm text-[#6B7280]">Belum ada role dibuat.</p>
              ) : (
                roles.map((role) => {
                  const isCurrentUserRole = currentUserRoleNames.includes(role.name);
                  return (
                    <div key={role.id} className="flex flex-col gap-2 rounded-xl border border-[#E6E8EC] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-[#23262F]">{role.name}</p>
                          <p className="text-xs text-[#6B7280]">Pages: {role.pages.join(', ') || 'Tidak ada'}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteRole(role.id)}
                          disabled={isCurrentUserRole}
                          className={`text-xs font-bold hover:underline ${isCurrentUserRole ? 'text-[#6B7280] cursor-not-allowed' : 'text-[#E02D3C]'}`}
                        >
                          Hapus
                        </button>
                      </div>
                      {isCurrentUserRole && (
                        <p className="text-[11px] text-[#6B7280]">Role ini sedang dipakai oleh akun Anda, sehingga tidak dapat dihapus.</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-4 bg-white rounded-xl border border-[#E6E8EC] p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-[#23262F]">
                {editingUser ? 'Edit Pengguna' : 'Pengguna'}
              </h2>
              {editingUser && (
                <button onClick={resetUserForm} className="text-xs font-bold text-[#6B7280] hover:underline">
                  Batal
                </button>
              )}
            </div>
            <div className="space-y-4">
              <div className="grid gap-3">
                <input
                  value={newUser.username}
                  onChange={(e) => handleNewUserChange('username', e.target.value)}
                  placeholder="Username"
                  className="w-full rounded-xl border border-[#E6E8EC] px-4 py-3 text-sm focus:border-[#2936C4] focus:outline-none"
                />
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => handleNewUserChange('password', e.target.value)}
                  placeholder={editingUser ? 'Kosongkan jika tidak diganti' : 'Password'}
                  className="w-full rounded-xl border border-[#E6E8EC] px-4 py-3 text-sm focus:border-[#2936C4] focus:outline-none"
                />
                <input
                  value={newUser.name}
                  onChange={(e) => handleNewUserChange('name', e.target.value)}
                  placeholder="Nama pengguna"
                  className="w-full rounded-xl border border-[#E6E8EC] px-4 py-3 text-sm focus:border-[#2936C4] focus:outline-none"
                />
                <label className="inline-flex items-center gap-2 rounded-xl border border-[#E6E8EC] px-4 py-3 text-sm cursor-pointer hover:border-[#2936C4]">
                  <input
                    type="checkbox"
                    checked={newUser.active}
                    onChange={(e) => handleNewUserChange('active', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#2936C4] focus:ring-[#2936C4]"
                  />
                  Akun aktif
                </label>
              </div>
              <div className="grid gap-2">
                <p className="text-sm font-bold text-[#3730A3]">Role yang dipilih</p>
                {roles.length === 0 ? (
                  <p className="text-sm text-[#6B7280]">Tambahkan role terlebih dahulu.</p>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2">
                    {roles.map((role) => (
                      <label key={role.id} className="inline-flex items-center gap-2 rounded-xl border border-[#E6E8EC] px-3 py-2 text-sm cursor-pointer hover:border-[#2936C4]">
                        <input
                          type="checkbox"
                          checked={newUser.roleIds.includes(role.id)}
                          onChange={() => toggleUserRole(role.id)}
                          className="h-4 w-4 rounded border-gray-300 text-[#2936C4] focus:ring-[#2936C4]"
                        />
                        {role.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={handleSaveUser} disabled={newUser.roleIds.length === 0} className={`btn px-4 py-3 text-sm ${newUser.roleIds.length === 0 ? 'bg-gray-300 cursor-not-allowed text-[#9CA3AF]' : 'btn-success'}`}>
                {editingUser ? 'Simpan Perubahan' : 'Tambah Pengguna'}
              </button>
            </div>
            <div className="space-y-3">
              {users.length === 0 ? (
                <p className="text-sm text-[#6B7280]">Belum ada pengguna.</p>
              ) : (
                users.map((user) => (
                  <div key={user.id} className={`flex flex-col gap-2 rounded-xl border p-4 ${user.active ? 'border-[#E6E8EC]' : 'border-red-200 bg-red-50'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-[#23262F]">{user.username}</p>
                          {!user.active && <span className="text-[10px] font-bold text-[#E02D3C] bg-red-100 px-1.5 py-0.5 rounded">Nonaktif</span>}
                        </div>
                        <p className="text-xs text-[#6B7280]">{user.name}</p>
                        <p className="text-xs text-[#6B7280]">Role: {user.roles.map((role) => role.name).join(', ') || 'Tidak ada'}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {user.id === currentUserId ? (
                          <span className="text-xs font-semibold text-[#6B7280]">(Akun Anda)</span>
                        ) : (
                          <>
                            <button onClick={() => handleEditUser(user)} className="text-[#2936C4] text-xs font-bold hover:underline">
                              Edit
                            </button>
                            <button onClick={() => handleDeleteUser(user.id, user.username)} className="text-[#E02D3C] text-xs font-bold hover:underline">
                              Hapus
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
