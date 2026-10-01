'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Building,
  Key,
  AlertTriangle,
  ArrowUpDown,
  Loader2,
  ExternalLink,
} from 'lucide-react';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  profile: {
    commercialName: string | null;
    creci: string | null;
    phone: string | null;
    city: string | null;
    avatarUrl: string | null;
  } | null;
  _count: {
    properties: number;
    searches: number;
    developments: number;
  };
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadUsers();
  }, [roleFilter, statusFilter]);

  async function loadUsers() {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (roleFilter !== 'Todos') params.append('role', roleFilter);
      if (statusFilter !== 'Todos') params.append('status', statusFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          router.push('/');
          return;
        }
        throw new Error('Falha ao carregar usuários.');
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', text: 'Não foi possível carregar a lista de usuários.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus(user: AdminUser) {
    const nextStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setUpdatingId(user.id);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao alterar status.');
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
      );
      setFeedback({
        type: 'success',
        text: `Usuário ${user.name} agora está ${nextStatus === 'ACTIVE' ? 'ATIVO' : 'DESATIVADO'}.`,
      });
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', text: err.message || 'Falha ao atualizar status.' });
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleToggleRole(user: AdminUser) {
    const nextRole = user.role === 'ADMIN' ? 'BROKER' : 'ADMIN';
    setUpdatingId(user.id);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao alterar papel.');
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: nextRole } : u))
      );
      setFeedback({
        type: 'success',
        text: `Papel de ${user.name} alterado para ${nextRole === 'ADMIN' ? 'ADMINISTRADOR' : 'CORRETOR'}.`,
      });
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', text: err.message || 'Falha ao alterar papel.' });
    } finally {
      setUpdatingId(null);
    }
  }

  const activeBrokers = users.filter((u) => u.role === 'BROKER' && u.status === 'ACTIVE').length;
  const totalProperties = users.reduce((acc, u) => acc + (u._count?.properties || 0), 0);
  const totalSearches = users.reduce((acc, u) => acc + (u._count?.searches || 0), 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 className="animate-spin" size={32} color="#1E4620" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '32px 20px 80px 20px' }}>
      {/* Cabeçalho */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <ShieldAlert size={28} color="#1E4620" />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            Painel de Administração
          </h1>
        </div>
        <p style={{ color: '#4B5563', fontSize: '0.92rem', margin: 0 }}>
          Gestão centralizada de corretores, permissões e status operacional da plataforma Área Nobre.
        </p>
      </div>

      {feedback && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 18px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: feedback.type === 'success' ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${feedback.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
            color: feedback.type === 'success' ? '#166534' : '#991B1B',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Cards de Métricas Rápidas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '18px 20px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>
            Total de Usuários
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#111827' }}>
            {users.length}
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '18px 20px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>
            Corretores Ativos
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#059669' }}>
            {activeBrokers}
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '18px 20px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>
            Imóveis na Base
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#111827' }}>
            {totalProperties}
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '18px 20px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>
            Demandas Ativas
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1E4620' }}>
            {totalSearches}
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          padding: '16px 20px',
          border: '1px solid #E5E7EB',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', minWidth: '240px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="text"
              placeholder="Buscar por nome, e-mail, CRECI ou imobiliária..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
              style={{
                width: '100%',
                padding: '9px 14px 9px 36px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '0.88rem',
              }}
            />
            <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          </div>
          <button
            type="button"
            onClick={loadUsers}
            style={{
              padding: '9px 16px',
              borderRadius: '8px',
              backgroundColor: '#1E4620',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: 'pointer',
            }}
          >
            Buscar
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#6B7280' }}>Papel:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '0.85rem',
                backgroundColor: '#FFFFFF',
              }}
            >
              <option value="Todos">Todos</option>
              <option value="BROKER">Corretor</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#6B7280' }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '0.85rem',
                backgroundColor: '#FFFFFF',
              }}
            >
              <option value="Todos">Todos</option>
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '14px 20px', fontWeight: 700 }}>Usuário / Profissional</th>
                <th style={{ padding: '14px 16px', fontWeight: 700 }}>Marca / CRECI</th>
                <th style={{ padding: '14px 16px', fontWeight: 700 }}>Papel</th>
                <th style={{ padding: '14px 16px', fontWeight: 700 }}>Status</th>
                <th style={{ padding: '14px 16px', fontWeight: 700 }}>Carteira</th>
                <th style={{ padding: '14px 20px', fontWeight: 700, textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px 20px', textAlign: 'center', color: '#6B7280' }}>
                    Nenhum usuário encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isUpdating = updatingId === user.id;
                  const initials = user.name
                    ? user.name.split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
                    : 'AN';

                  return (
                    <tr
                      key={user.id}
                      style={{
                        borderBottom: '1px solid #F3F4F6',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {/* Usuário */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {user.profile?.avatarUrl ? (
                            <img
                              src={user.profile.avatarUrl}
                              alt={user.name}
                              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                backgroundColor: user.role === 'ADMIN' ? '#92400E' : '#1E4620',
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.95rem',
                              }}
                            >
                              {initials}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 700, color: '#111827' }}>{user.name}</div>
                            <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>{user.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Marca / CRECI */}
                      <td style={{ padding: '16px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#374151', fontSize: '0.84rem' }}>
                          {user.profile?.commercialName || '—'}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#059669', fontWeight: 600 }}>
                          {user.profile?.creci || 'Sem CRECI'}
                        </div>
                      </td>

                      {/* Papel */}
                      <td style={{ padding: '16px 16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            backgroundColor: user.role === 'ADMIN' ? '#FEF3C7' : '#F3F4F6',
                            color: user.role === 'ADMIN' ? '#92400E' : '#374151',
                          }}
                        >
                          {user.role === 'ADMIN' ? 'ADMIN' : 'CORRETOR'}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            backgroundColor: user.status === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2',
                            color: user.status === 'ACTIVE' ? '#166534' : '#991B1B',
                          }}
                        >
                          {user.status === 'ACTIVE' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          <span>{user.status === 'ACTIVE' ? 'ATIVO' : 'INATIVO'}</span>
                        </span>
                      </td>

                      {/* Carteira */}
                      <td style={{ padding: '16px 16px', fontSize: '0.8rem', color: '#4B5563' }}>
                        <div><strong>{user._count?.properties || 0}</strong> imóveis</div>
                        <div><strong>{user._count?.searches || 0}</strong> buscas</div>
                      </td>

                      {/* Ações */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          {/* Alternar Status */}
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleToggleStatus(user)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid #D1D5DB',
                              backgroundColor: user.status === 'ACTIVE' ? '#FFFFFF' : '#F0FDF4',
                              color: user.status === 'ACTIVE' ? '#DC2626' : '#166534',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              cursor: isUpdating ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {isUpdating ? '...' : user.status === 'ACTIVE' ? 'Desativar' : 'Ativar'}
                          </button>

                          {/* Alternar Papel */}
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleToggleRole(user)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid #D1D5DB',
                              backgroundColor: '#FFFFFF',
                              color: '#374151',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              cursor: isUpdating ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {user.role === 'ADMIN' ? 'Tornar Corretor' : 'Tornar Admin'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
