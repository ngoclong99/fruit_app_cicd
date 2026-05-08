import { useState, useMemo, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usersApi } from '../../api/endpoints/users';
import type { User } from '../../types';
import { useDialog } from '../../context/DialogContext';

type StatusFilter = 'all' | 'active' | 'blocked';
type RoleFilter = 'all' | 'admin' | 'user';
type SortKey = 'name' | 'createdAt' | 'orderCount' | 'totalSpent';

interface EditForm { name: string; email: string; phone: string; role: User['role'] }

export default function AdminUsers() {
  const { t } = useTranslation();
  const { confirm } = useDialog();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [page]);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState<EditForm>({ name: '', email: '', phone: '', role: 'user' });
  const [detailUser, setDetailUser] = useState<User | null>(null);

  useEffect(() => {
    usersApi.list()
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.status !== 'blocked').length,
    blocked: users.filter((u) => u.status === 'blocked').length,
    admins: users.filter((u) => u.role === 'admin').length,
  }), [users]);

  const filtered = useMemo(() => {
    let list = users.filter((u) =>
      (statusFilter === 'all' || (statusFilter === 'blocked' ? u.status === 'blocked' : u.status !== 'blocked')) &&
      (roleFilter === 'all' || u.role === roleFilter) &&
      (search === '' || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || (u.phone ?? '').includes(search))
    );
    list = [...list].sort((a, b) => {
      let av: number | string = 0, bv: number | string = 0;
      if (sortKey === 'name') { av = a.name; bv = b.name; }
      else if (sortKey === 'createdAt') { av = a.createdAt ?? ''; bv = b.createdAt ?? ''; }
      else if (sortKey === 'orderCount') { av = a.orderCount ?? 0; bv = b.orderCount ?? 0; }
      else if (sortKey === 'totalSpent') { av = a.totalSpent ?? 0; bv = b.totalSpent ?? 0; }
      if (av < bv) return sortDesc ? 1 : -1;
      if (av > bv) return sortDesc ? -1 : 1;
      return 0;
    });
    return list;
  }, [users, search, statusFilter, roleFilter, sortKey, sortDesc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const toggleSort = useCallback((key: SortKey) => {
    if (sortKey === key) setSortDesc((d) => !d);
    else { setSortKey(key); setSortDesc(true); }
    setPage(1);
  }, [sortKey]);

  const toggleBlock = useCallback((id: string) => {
    const user = users.find((u) => u.id === id);
    if (!user) return;
    const newStatus = user.status === 'blocked' ? 'active' : 'blocked';
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, status: newStatus } : u));
    setDetailUser((prev) => prev?.id === id ? { ...prev, status: newStatus } : prev);
    usersApi.updateStatus(id, newStatus).catch(() => {
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, status: user.status } : u));
    });
  }, [users]);

  const handleDelete = useCallback(async (id: string, name: string) => {
    const ok = await confirm({ title: t('admin.deleteUserConfirm', { name }), body: t('admin.deleteUserConfirmBody'), type: 'danger', confirmText: t('common.delete'), cancelText: t('common.cancel') });
    if (!ok) return;
    usersApi.delete(id).then(() => {
      setUsers((prev) => prev.filter((u) => u.id !== id));
      if (detailUser?.id === id) setDetailUser(null);
    }).catch(() => {});
  }, [t, confirm, detailUser]);

  const openEdit = useCallback((u: User) => {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, phone: u.phone ?? '', role: u.role });
  }, []);

  const handleEditSave = useCallback(() => {
    if (!editUser) return;
    usersApi.update(editUser.id, { name: form.name, phone: form.phone, role: form.role })
      .then((updated) => {
        setUsers((prev) => prev.map((u) => u.id === editUser.id ? { ...u, ...updated } : u));
        setEditUser(null);
      })
      .catch(() => setEditUser(null));
  }, [editUser, form]);

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button type="button" onClick={() => toggleSort(k)}
      className="flex items-center gap-1 text-left font-semibold text-gray-600 hover:text-green-700 transition">
      {label}
      <span className="text-gray-300">{sortKey === k ? (sortDesc ? '▼' : '▲') : '⇅'}</span>
    </button>
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin" className="text-gray-400 hover:text-gray-600">{t('admin.back')}</Link>
        <h1 className="text-2xl font-bold text-gray-800">{t('admin.titleUsers')}</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: t('admin.usersTotal'), value: stats.total, color: 'bg-blue-50 text-blue-700' },
          { label: t('admin.usersActive'), value: stats.active, color: 'bg-green-50 text-green-700' },
          { label: t('admin.usersBlocked'), value: stats.blocked, color: 'bg-red-50 text-red-700' },
          { label: t('admin.usersAdmins'), value: stats.admins, color: 'bg-purple-50 text-purple-700' },
        ].map((s) => (
          <div key={s.label} className={`${s.color} rounded-2xl p-4`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm opacity-75 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder={t('admin.userSearchPlaceholder')}
          className="border border-gray-200 rounded-lg px-4 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-green-500" />
        <div className="flex rounded-lg overflow-hidden border border-gray-200 text-sm">
          {(['all', 'active', 'blocked'] as StatusFilter[]).map((s) => (
            <button key={s} type="button" onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-2 text-xs font-medium transition ${statusFilter === s
                ? s === 'blocked' ? 'bg-red-500 text-white' : s === 'active' ? 'bg-green-600 text-white' : 'bg-gray-800 text-white'
                : 'text-gray-500 hover:bg-gray-50'}`}>
              {s === 'all' ? t('admin.statusAll') : s === 'active' ? t('admin.statusActive') : t('admin.statusBlocked')}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg overflow-hidden border border-gray-200 text-sm">
          {(['all', 'admin', 'user'] as RoleFilter[]).map((r) => (
            <button key={r} type="button" onClick={() => { setRoleFilter(r); setPage(1); }}
              className={`px-3 py-2 text-xs font-medium transition ${roleFilter === r
                ? r === 'admin' ? 'bg-purple-600 text-white' : r === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white'
                : 'text-gray-500 hover:bg-gray-50'}`}>
              {r === 'all' ? t('admin.roleAll') : r === 'admin' ? t('admin.adminRole') : t('admin.userRole')}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-5 py-3" aria-label={t('admin.colUser')}><SortBtn k="name" label={t('admin.colUser')} /></th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">{t('admin.colEmailPhone')}</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">{t('admin.roleCol')}</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">{t('admin.orderStatus')}</th>
              <th className="text-left px-5 py-3" aria-label={t('admin.statsOrders')}><SortBtn k="orderCount" label={t('admin.statsOrders')} /></th>
              <th className="text-left px-5 py-3" aria-label={t('admin.colSpent')}><SortBtn k="totalSpent" label={t('admin.colSpent')} /></th>
              <th className="text-left px-5 py-3" aria-label={t('admin.colCreatedAt')}><SortBtn k="createdAt" label={t('admin.colCreatedAt')} /></th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">{t('admin.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((u) => (
              <tr key={u.id} className={`border-b last:border-0 hover:bg-gray-50 ${u.status === 'blocked' ? 'opacity-60' : ''}`}>
                <td className="px-5 py-4">
                  <button type="button" onClick={() => setDetailUser(u)} className="flex items-center gap-3 text-left hover:text-green-700 transition">
                    <div className="w-9 h-9 rounded-full bg-linear-to-br from-green-400 to-green-600 flex items-center justify-center font-bold text-white text-sm shrink-0">
                      {u.name.charAt(0)}
                    </div>
                    <span className="font-medium text-gray-800">{u.name}</span>
                  </button>
                </td>
                <td className="px-5 py-4 text-gray-500">
                  <p>{u.email}</p>
                  {u.phone && <p className="text-xs text-gray-400">{u.phone}</p>}
                </td>
                <td className="px-5 py-4">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                    {u.role === 'admin' ? t('admin.adminRole') : t('admin.userRole')}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${u.status === 'blocked' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {u.status === 'blocked' ? t('admin.userBlocked') : t('admin.userActive')}
                  </span>
                </td>
                <td className="px-5 py-4 text-gray-700 font-medium">{u.orderCount ?? 0}</td>
                <td className="px-5 py-4 text-green-700 font-medium text-xs">{(u.totalSpent ?? 0).toLocaleString('vi-VN')}đ</td>
                <td className="px-5 py-4 text-gray-400 text-xs">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '—'}</td>
                <td className="px-5 py-4">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => openEdit(u)}
                      className="text-blue-500 hover:text-blue-700 text-xs font-medium">{t('common.edit')}</button>
                    {u.role !== 'admin' && (
                      <button type="button" onClick={() => toggleBlock(u.id)}
                        className={`text-xs font-medium ${u.status === 'blocked' ? 'text-green-600 hover:text-green-800' : 'text-orange-500 hover:text-orange-700'}`}>
                        {u.status === 'blocked' ? t('admin.actionUnblock') : t('admin.actionBlock')}
                      </button>
                    )}
                    {u.role !== 'admin' && (
                      <button type="button" onClick={() => handleDelete(u.id, u.name)}
                        className="text-red-400 hover:text-red-600 text-xs font-medium">{t('common.delete')}</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t text-sm text-gray-500">
            <span>{t('admin.usersPaginationInfo', { from: (page - 1) * PAGE_SIZE + 1, to: Math.min(page * PAGE_SIZE, filtered.length), total: filtered.length })}</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30">«</button>
              <button type="button" onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30">‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                .reduce<(number | '...')[]>((acc, n, i, arr) => { if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push('...'); acc.push(n); return acc; }, [])
                .map((n, i) => n === '...' ? <span key={`e${i}`} className="px-2">…</span> : (
                  <button key={n} type="button" onClick={() => setPage(n as number)}
                    className={`w-8 h-8 rounded font-medium transition ${page === n ? 'bg-green-600 text-white' : 'hover:bg-gray-100'}`}>{n}</button>
                ))}
              <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages} className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30">›</button>
              <button type="button" onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30">»</button>
            </div>
          </div>
        )}
      </div>

      {detailUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setDetailUser(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-800">{t('admin.userDetailTitle')}</h2>
              <button type="button" onClick={() => setDetailUser(null)} className="text-gray-400 hover:text-gray-600" aria-label={t('common.close')}>✕</button>
            </div>
            <div className="flex flex-col items-center gap-3 mb-5">
              <div className="w-16 h-16 rounded-full bg-linear-to-br from-green-400 to-green-600 flex items-center justify-center font-bold text-white text-2xl">
                {detailUser.name.charAt(0)}
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-800 text-lg">{detailUser.name}</p>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${detailUser.status === 'blocked' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {detailUser.status === 'blocked' ? t('admin.userBlocked') : t('admin.userActive')}
                </span>
              </div>
            </div>
            <div className="space-y-2.5 text-sm mb-5">
              {[
                { label: t('profile.email'), value: detailUser.email },
                { label: t('admin.userPhone'), value: detailUser.phone ?? '—' },
                { label: t('admin.roleCol'), value: detailUser.role === 'admin' ? t('admin.adminRole') : t('admin.userRole') },
                { label: t('admin.colCreatedAt'), value: detailUser.createdAt ? new Date(detailUser.createdAt).toLocaleDateString('vi-VN') : '—' },
                { label: t('admin.statsOrders'), value: String(detailUser.orderCount ?? 0) },
                { label: t('admin.userTotalSpent'), value: `${(detailUser.totalSpent ?? 0).toLocaleString('vi-VN')}đ` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-800">{value}</span>
                </div>
              ))}
            </div>
            {detailUser.role !== 'admin' && (
              <div className="flex gap-2">
                <button type="button" onClick={() => toggleBlock(detailUser.id)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${detailUser.status === 'blocked' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'}`}>
                  {detailUser.status === 'blocked' ? t('admin.actionUnblock') : t('admin.actionBlockAccount')}
                </button>
                <button type="button" onClick={() => handleDelete(detailUser.id, detailUser.name)}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition">
                  {t('admin.actionDeleteAccount')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-800">{t('admin.editUserTitle')}</h2>
              <button type="button" onClick={() => setEditUser(null)} className="text-gray-400 hover:text-gray-600" aria-label={t('common.close')}>✕</button>
            </div>
            <div className="space-y-3">
              {([
                ['name', t('admin.fieldName'), 'text'],
                ['email', t('profile.email'), 'email'],
                ['phone', t('admin.fieldPhone'), 'tel'],
              ] as [keyof EditForm, string, string][]).map(([key, label, type]) => (
                <div key={key}>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
                  <input type={type} title={label} placeholder={label} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    readOnly={key === 'email'} />
                </div>
              ))}
              {editUser.role !== 'admin' && (
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{t('admin.roleCol')}</label>
                  <select title={t('admin.roleCol')} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as User['role'] }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="user">{t('admin.userRole')}</option>
                    <option value="admin">{t('admin.adminRole')}</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button type="button" onClick={handleEditSave}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg transition text-sm">
                {t('common.save')}
              </button>
              <button type="button" onClick={() => setEditUser(null)}
                className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition text-sm">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
