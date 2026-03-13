import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  is_admin: number;
  created_at: string;
  subscription_status: string;
  plan: string;
  current_period_end: string;
  cancel_at_period_end: number;
}

interface Stats {
  totalUsers: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  recentSignups: number;
}

export default function AdminPage({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch('/api/admin/users', { credentials: 'include' }),
        fetch('/api/admin/stats', { credentials: 'include' })
      ]);

      if (!usersRes.ok || !statsRes.ok) {
        throw new Error('Error al cargar datos de administrador');
      }

      const usersData = await usersRes.json();
      const statsData = await statsRes.json();

      setUsers(usersData.users);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-500/20 text-green-400',
      inactive: 'bg-gray-500/20 text-gray-400',
      cancelled: 'bg-red-500/20 text-red-400',
      past_due: 'bg-yellow-500/20 text-yellow-400'
    };
    return colors[status] || colors.inactive;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: 'activo',
      inactive: 'inactivo',
      cancelled: 'cancelado',
      past_due: 'vencido'
    };
    return labels[status] || 'ninguno';
  };

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-rosa-claro flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Acceso Denegado</h1>
          <p className="text-negro-fondo">No tienes permiso para ver esta página.</p>
          <button onClick={onBack} className="mt-4 text-rosa-principal hover:underline">
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-rosa-claro flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-rosa-principal border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rosa-claro p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-negro-fondo">Panel de Administración</h1>
            <p className="text-gris-medio">Gestionar usuarios y suscripciones</p>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-rosa-principal hover:bg-pink-600 rounded-lg text-white transition-colors"
          >
            ← Volver a la App
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-rosa-principal/10">
              <p className="text-gris-medio text-sm">Total Usuarios</p>
              <p className="text-3xl font-bold text-negro-fondo">{stats.totalUsers}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-rosa-principal/10">
              <p className="text-gris-medio text-sm">Suscripciones Activas</p>
              <p className="text-3xl font-bold text-green-600">{stats.activeSubscriptions}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-rosa-principal/10">
              <p className="text-gris-medio text-sm">Canceladas</p>
              <p className="text-3xl font-bold text-red-500">{stats.cancelledSubscriptions}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-rosa-principal/10">
              <p className="text-gris-medio text-sm">Nuevos (30 días)</p>
              <p className="text-3xl font-bold text-rosa-principal">{stats.recentSignups}</p>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-rosa-principal/10">
          <div className="p-4 border-b border-rosa-principal/10">
            <h2 className="text-xl font-bold text-negro-fondo">Todos los Usuarios</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-rosa-claro">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gris-medio">Usuario</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gris-medio">Estado</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gris-medio">Registro</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gris-medio">Expira</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gris-medio">Rol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rosa-principal/10">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-rosa-claro/50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-negro-fondo font-medium">{u.name || 'Sin nombre'}</p>
                        <p className="text-gris-medio text-sm">{u.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(u.subscription_status)}`}>
                        {getStatusLabel(u.subscription_status)}
                        {u.cancel_at_period_end ? ' (cancelando)' : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gris-medio text-sm">
                      {new Date(u.created_at).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-4 py-3 text-gris-medio text-sm">
                      {u.current_period_end ? new Date(u.current_period_end).toLocaleDateString('es-ES') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {u.is_admin ? (
                        <span className="px-2 py-1 bg-rosa-principal/20 text-rosa-principal rounded-full text-xs font-medium">
                          Admin
                        </span>
                      ) : (
                        <span className="text-gris-medio text-sm">Usuario</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
