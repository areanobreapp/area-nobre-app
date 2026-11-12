'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  Search,
  Filter,
  Plus,
  Edit,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Building2,
  Users,
  MapPin,
  Calendar,
  X,
} from 'lucide-react';

interface CompanyListItem {
  id: string;
  name: string;
  tradeName: string;
  cnpj?: string;
  city: string;
  state: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    developments: number;
    contacts: number;
  };
}

export default function CompanyManager() {
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(15);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('');

  const [toggleModal, setToggleModal] = useState<{
    open: boolean;
    company: CompanyListItem | null;
    loading: boolean;
  }>({ open: false, company: null, loading: false });

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    loadCompanies();
  }, [page, statusFilter, cityFilter]);

  async function loadCompanies(overrideSearch?: string) {
    setLoading(true);
    setFeedback(null);
    try {
      const q = overrideSearch !== undefined ? overrideSearch : search;
      const params = new URLSearchParams();
      if (q.trim()) params.append('search', q.trim());
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (cityFilter.trim()) params.append('city', cityFilter.trim());
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const res = await fetch(`/api/admin/companies?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push('/login');
          return;
        }
        throw new Error('Falha ao carregar lista de construtoras.');
      }

      const data = await res.json();
      setCompanies(data.companies || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', text: err.message || 'Erro ao carregar construtoras.' });
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadCompanies();
  }

  async function handleConfirmToggleStatus() {
    if (!toggleModal.company) return;
    setToggleModal((prev) => ({ ...prev, loading: true }));
    try {
      const nextStatus = toggleModal.company.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const res = await fetch(`/api/admin/companies/${toggleModal.company.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao alternar status da construtora.');
      }

      setCompanies((prev) =>
        prev.map((c) => (c.id === toggleModal.company!.id ? { ...c, status: nextStatus } : c))
      );
      setFeedback({
        type: 'success',
        text: `Construtora "${toggleModal.company.tradeName}" foi ${nextStatus === 'ACTIVE' ? 'ativada' : 'desativada'} com sucesso!`,
      });
      setToggleModal({ open: false, company: null, loading: false });
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', text: err.message || 'Falha ao alterar status.' });
      setToggleModal((prev) => ({ ...prev, loading: false }));
    }
  }

  const activeCount = companies.filter((c) => c.status === 'ACTIVE').length;
  const totalDevelopmentsCount = companies.reduce((acc, c) => acc + (c._count?.developments || 0), 0);

  return (
    <div style={{ width: '100%' }}>
      {/* Feedback Toast / Alert */}
      {feedback && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '10px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.88rem',
            fontWeight: 600,
            backgroundColor: feedback.type === 'success' ? '#F0FDF4' : '#FEF2F2',
            color: feedback.type === 'success' ? '#166534' : '#991B1B',
            border: `1px solid ${feedback.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Cards de Métricas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '16px 20px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>
            Total de Construtoras
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827' }}>
            {total}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '16px 20px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>
            Construtoras Ativas (Nesta Página)
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669' }}>
            {activeCount}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '16px 20px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>
            Empreendimentos Vinculados
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1E4620' }}>
            {totalDevelopmentsCount}
          </div>
        </div>
      </div>

      {/* Ações e Filtros de Busca */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E5E7EB',
          padding: '20px 24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
            marginBottom: '18px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Briefcase size={22} style={{ color: '#1E4620' }} />
              <span>Base Administrativa de Construtoras</span>
            </h2>
            <p style={{ fontSize: '0.84rem', color: '#6B7280', margin: '4px 0 0 0' }}>
              Gerencie dados institucionais, gerentes de parcerias e lançamentos imobiliários.
            </p>
          </div>

          <Link
            href="/admin/construtoras/nova"
            id="btn-nova-construtora"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              backgroundColor: '#1E4620',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.88rem',
              textDecoration: 'none',
              boxShadow: '0 2px 4px rgba(30,70,32,0.18)',
              transition: 'all 0.15s ease',
            }}
          >
            <Plus size={16} strokeWidth={2.6} />
            <span>Nova Construtora</span>
          </Link>
        </div>

        {/* Linha de Busca e Filtros */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 280px', position: 'relative' }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }}
            />
            <input
              type="text"
              id="input-busca-construtora"
              placeholder="Buscar por nome fantasia, razão social ou CNPJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 38px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <select
              id="select-status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '0.88rem',
                backgroundColor: '#FFFFFF',
                color: '#374151',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">Todas as Situações</option>
              <option value="ACTIVE">Apenas Ativas</option>
              <option value="INACTIVE">Apenas Inativas</option>
            </select>

            <button
              type="submit"
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                backgroundColor: '#374151',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Filter size={15} />
              <span>Filtrar</span>
            </button>
          </div>
        </form>
      </div>

      {/* Tabela de Construtoras */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: '#1E4620', margin: '0 auto 12px auto' }} />
            <p style={{ fontSize: '0.88rem', color: '#6B7280', fontWeight: 600, margin: 0 }}>
              Carregando base de construtoras...
            </p>
          </div>
        ) : companies.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#F3F4F6',
                color: '#9CA3AF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <Briefcase size={28} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', marginBottom: '6px' }}>
              Nenhuma construtora encontrada
            </h3>
            <p style={{ fontSize: '0.86rem', color: '#6B7280', maxWidth: '420px', margin: '0 auto 20px auto' }}>
              {search || statusFilter !== 'ALL'
                ? 'Nenhum resultado corresponde aos filtros aplicados. Tente ajustar os termos da busca.'
                : 'Não há construtoras cadastradas no sistema. Comece cadastrando a primeira construtora parceira.'}
            </p>
            <Link
              href="/admin/construtoras/nova"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                backgroundColor: '#1E4620',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.86rem',
                textDecoration: 'none',
              }}
            >
              <Plus size={16} />
              <span>Cadastrar Nova Construtora</span>
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ padding: '14px 20px', fontSize: '0.74rem', fontWeight: 800, color: '#6B7280', textTransform: 'uppercase' }}>
                    Construtora
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: '0.74rem', fontWeight: 800, color: '#6B7280', textTransform: 'uppercase' }}>
                    CNPJ / Localidade
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: '0.74rem', fontWeight: 800, color: '#6B7280', textTransform: 'uppercase' }}>
                    Situação
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: '0.74rem', fontWeight: 800, color: '#6B7280', textTransform: 'uppercase' }}>
                    Acervo
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: '0.74rem', fontWeight: 800, color: '#6B7280', textTransform: 'uppercase' }}>
                    Atualização
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: '0.74rem', fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', textAlign: 'right' }}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => {
                  const initials = company.tradeName
                    ? company.tradeName
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                    : 'CO';

                  return (
                    <tr
                      key={company.id}
                      style={{ borderBottom: '1px solid #F3F4F6', transition: 'background-color 0.15s ease' }}
                    >
                      {/* Logo + Nomes */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          {company.logoUrl ? (
                            <img
                              src={company.logoUrl}
                              alt={company.tradeName}
                              style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '8px',
                                objectFit: 'contain',
                                backgroundColor: '#F9FAFB',
                                border: '1px solid #E5E7EB',
                                padding: '2px',
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '8px',
                                backgroundColor: '#E0E7FF',
                                color: '#3730A3',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.88rem',
                                border: '1px solid #C7D2FE',
                              }}
                            >
                              {initials}
                            </div>
                          )}
                          <div>
                            <Link
                              href={`/admin/construtoras/${company.id}`}
                              style={{
                                fontSize: '0.94rem',
                                fontWeight: 800,
                                color: '#111827',
                                textDecoration: 'none',
                                display: 'block',
                              }}
                            >
                              {company.tradeName}
                            </Link>
                            <span style={{ fontSize: '0.78rem', color: '#6B7280', display: 'block', marginTop: '1px' }}>
                              {company.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* CNPJ / Localidade */}
                      <td style={{ padding: '16px 16px', fontSize: '0.84rem', color: '#374151' }}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>
                          {company.cnpj || 'CNPJ não informado'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#6B7280', marginTop: '2px' }}>
                          <MapPin size={13} />
                          <span>
                            {company.city} - {company.state}
                          </span>
                        </div>
                      </td>

                      {/* Situação */}
                      <td style={{ padding: '16px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '16px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            backgroundColor: company.status === 'ACTIVE' ? '#DEF7EC' : '#F3F4F6',
                            color: company.status === 'ACTIVE' ? '#03543F' : '#6B7280',
                          }}
                        >
                          {company.status === 'ACTIVE' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                          <span>{company.status === 'ACTIVE' ? 'ATIVA' : 'INATIVA'}</span>
                        </span>
                      </td>

                      {/* Acervo */}
                      <td style={{ padding: '16px 16px', fontSize: '0.82rem', color: '#4B5563' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Building2 size={14} style={{ color: '#1E4620' }} />
                          <span>
                            <strong>{company._count?.developments || 0}</strong> empreendimento(s)
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                          <Users size={14} style={{ color: '#4B5563' }} />
                          <span>
                            <strong>{company._count?.contacts || 0}</strong> gerente(s)
                          </span>
                        </div>
                      </td>

                      {/* Data de Atualização */}
                      <td style={{ padding: '16px 16px', fontSize: '0.80rem', color: '#6B7280' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Calendar size={13} />
                          <span>{new Date(company.updatedAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </td>

                      {/* Ações */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <Link
                            href={`/admin/construtoras/${company.id}`}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid #D1D5DB',
                              backgroundColor: '#FFFFFF',
                              color: '#1E4620',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <ExternalLink size={13} />
                            <span>Detalhes</span>
                          </Link>

                          <Link
                            href={`/admin/construtoras/${company.id}/editar`}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1px solid #D1D5DB',
                              backgroundColor: '#FFFFFF',
                              color: '#374151',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Edit size={13} />
                            <span>Editar</span>
                          </Link>

                          <button
                            type="button"
                            onClick={() => setToggleModal({ open: true, company, loading: false })}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1px solid #D1D5DB',
                              backgroundColor: company.status === 'ACTIVE' ? '#FEF2F2' : '#F0FDF4',
                              color: company.status === 'ACTIVE' ? '#991B1B' : '#166534',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {company.status === 'ACTIVE' ? 'Desativar' : 'Ativar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid #E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#F9FAFB',
            }}
          >
            <span style={{ fontSize: '0.82rem', color: '#6B7280' }}>
              Página <strong>{page}</strong> de <strong>{totalPages}</strong> ({total} construtoras)
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: page <= 1 ? '#F3F4F6' : '#FFFFFF',
                  color: page <= 1 ? '#9CA3AF' : '#374151',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: page >= totalPages ? '#F3F4F6' : '#FFFFFF',
                  color: page >= totalPages ? '#9CA3AF' : '#374151',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Confirmação para Alternar Status */}
      {toggleModal.open && toggleModal.company && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: toggleModal.company.status === 'ACTIVE' ? '#FEE2E2' : '#DCFCE7',
                  color: toggleModal.company.status === 'ACTIVE' ? '#DC2626' : '#166534',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                  {toggleModal.company.status === 'ACTIVE' ? 'Desativar Construtora' : 'Ativar Construtora'}
                </h4>
                <span style={{ fontSize: '0.80rem', color: '#6B7280' }}>
                  {toggleModal.company.tradeName}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.86rem', color: '#4B5563', lineHeight: 1.5, marginBottom: '20px' }}>
              {toggleModal.company.status === 'ACTIVE'
                ? `Ao desativar a construtora, seus contatos e empreendimentos deixarão de ser destacados nas buscas públicas e dos corretores. Deseja continuar?`
                : `A construtora voltará a ficar com situação ATIVA e visível para a plataforma.`}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                disabled={toggleModal.loading}
                onClick={() => setToggleModal({ open: false, company: null, loading: false })}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={toggleModal.loading}
                onClick={handleConfirmToggleStatus}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  backgroundColor: toggleModal.company.status === 'ACTIVE' ? '#DC2626' : '#166534',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: toggleModal.loading ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {toggleModal.loading && <Loader2 size={14} className="animate-spin" />}
                <span>
                  {toggleModal.company.status === 'ACTIVE' ? 'Confirmar Desativação' : 'Confirmar Ativação'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

