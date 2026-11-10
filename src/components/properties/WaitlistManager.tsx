'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  Building2,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  ExternalLink,
  Search,
  Filter,
  DollarSign,
  AlertTriangle,
  ShieldCheck,
  Bell,
  ArrowRight,
} from 'lucide-react';

interface WaitlistEntry {
  id: string;
  physicalPropertyId: string;
  brokerId: string;
  position: number;
  status: 'WAITING' | 'PENDING_NOTIFICATION' | 'OFFERED' | 'CLAIMED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
  draftPropertyId: string | null;
  notifiedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  physicalProperty: {
    id: string;
    sharedPrice: number | null;
    activeListingsCount: number;
    primaryListingId: string | null;
    building: {
      id: string;
      name: string;
      address: string;
      city: string;
    } | null;
    unit: {
      unitNumber: string;
      tower: string | null;
    } | null;
  };
  draftProperty?: {
    id: string;
    title: string;
    price: number;
    status: string;
  } | null;
}

export default function WaitlistManager() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'OFFERED' | 'RESOLVED'>('ALL');
  const [search, setSearch] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadWaitlist();
  }, []);

  async function loadWaitlist() {
    setLoading(true);
    try {
      const res = await fetch('/api/waitlist?scope=mine');
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } catch (err) {
      console.error('Erro ao buscar lista de espera do corretor:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(entry: WaitlistEntry) {
    const buildingName = entry.physicalProperty?.building?.name || 'Imóvel';
    const unitNumber = entry.physicalProperty?.unit?.unitNumber || '';

    const confirmCancel = window.confirm(
      `Deseja realmente cancelar sua inscrição na lista de espera do ${buildingName} (Unidade ${unitNumber})?\n\nSua posição (${entry.position}º na fila) será liberada.`
    );
    if (!confirmCancel) return;

    setCancellingId(entry.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/waitlist/${entry.id}/cancel`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao cancelar inscrição.');
      }

      setFeedback({
        type: 'success',
        text: 'Inscrição cancelada com sucesso.',
      });

      // Atualiza localmente
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, status: 'CANCELLED' } : e))
      );
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Erro ao cancelar inscrição.',
      });
    } finally {
      setCancellingId(null);
    }
  }

  // Métricas
  const activeCount = entries.filter(
    (e) => e.status === 'WAITING' || e.status === 'PENDING_NOTIFICATION' || e.status === 'OFFERED'
  ).length;
  const offeredCount = entries.filter((e) => e.status === 'OFFERED').length;
  const claimedCount = entries.filter((e) => e.status === 'CLAIMED').length;

  // Filtragem
  const filteredEntries = entries.filter((e) => {
    if (statusFilter === 'ACTIVE') {
      if (e.status !== 'WAITING' && e.status !== 'PENDING_NOTIFICATION' && e.status !== 'OFFERED') return false;
    } else if (statusFilter === 'OFFERED') {
      if (e.status !== 'OFFERED') return false;
    } else if (statusFilter === 'RESOLVED') {
      if (e.status === 'WAITING' || e.status === 'PENDING_NOTIFICATION' || e.status === 'OFFERED') return false;
    }

    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const bName = e.physicalProperty?.building?.name?.toLowerCase() || '';
    const uNum = e.physicalProperty?.unit?.unitNumber?.toLowerCase() || '';
    const dTitle = e.draftProperty?.title?.toLowerCase() || '';
    return bName.includes(term) || uNum.includes(term) || dTitle.includes(term);
  });

  function getStatusBadge(status: string) {
    switch (status) {
      case 'WAITING':
        return {
          label: 'Aguardando liberação de vaga',
          bg: '#EFF6FF',
          color: '#1E40AF',
          border: '#BFDBFE',
          icon: <Clock size={13} />,
        };
      case 'PENDING_NOTIFICATION':
        return {
          label: 'Vaga reservada — Aguardando envio de convocação',
          bg: '#FEF3C7',
          color: '#92400E',
          border: '#FDE68A',
          icon: <ShieldCheck size={13} />,
        };
      case 'OFFERED':
        return {
          label: 'Convocado! Vaga disponível (Prazo de 48h)',
          bg: '#ECFDF5',
          color: '#065F46',
          border: '#A7F3D0',
          icon: <Bell size={13} />,
        };
      case 'CLAIMED':
        return {
          label: 'Vaga assumida (Anúncio Ativo)',
          bg: '#F0FDF4',
          color: '#15803D',
          border: '#BBF7D0',
          icon: <CheckCircle2 size={13} />,
        };
      case 'REJECTED':
        return {
          label: 'Oferta recusada pelo corretor',
          bg: '#F3F4F6',
          color: '#4B5563',
          border: '#E5E7EB',
          icon: <XCircle size={13} />,
        };
      case 'EXPIRED':
        return {
          label: 'Prazo de 48h expirado',
          bg: '#FEE2E2',
          color: '#991B1B',
          border: '#FECACA',
          icon: <AlertTriangle size={13} />,
        };
      case 'CANCELLED':
        return {
          label: 'Inscrição cancelada',
          bg: '#F3F4F6',
          color: '#6B7280',
          border: '#E5E7EB',
          icon: <XCircle size={13} />,
        };
      default:
        return {
          label: status,
          bg: '#F3F4F6',
          color: '#374151',
          border: '#E5E7EB',
          icon: <Clock size={13} />,
        };
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Topo / Explicação */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={22} color="#059669" />
            <span>Minhas Inscrições na Lista de Espera</span>
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#6B7280' }}>
            Acompanhe a sua posição cronológica e o status de convocação para unidades com vagas esgotadas.
          </p>
        </div>

        {/* Cards Resumo */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.30rem', fontWeight: 800, color: '#1E40AF' }}>{activeCount}</div>
            <div style={{ fontSize: '0.74rem', color: '#3B82F6', fontWeight: 600 }}>Em Espera Ativa</div>
          </div>

          <div
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              backgroundColor: offeredCount > 0 ? '#FEF3C7' : '#F9FAFB',
              border: offeredCount > 0 ? '1px solid #FCD34D' : '1px solid #E5E7EB',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.30rem', fontWeight: 800, color: offeredCount > 0 ? '#B45309' : '#6B7280' }}>
              {offeredCount}
            </div>
            <div style={{ fontSize: '0.74rem', color: offeredCount > 0 ? '#D97706' : '#9CA3AF', fontWeight: 600 }}>
              Ofertas Disponíveis
            </div>
          </div>

          <div
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.30rem', fontWeight: 800, color: '#15803D' }}>{claimedCount}</div>
            <div style={{ fontSize: '0.74rem', color: '#16A34A', fontWeight: 600 }}>Vagas Conquistadas</div>
          </div>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: feedback.type === 'success' ? '#ECFDF5' : '#FEE2E2',
            color: feedback.type === 'success' ? '#065F46' : '#991B1B',
            border: feedback.type === 'success' ? '1px solid #A7F3D0' : '1px solid #FCA5A5',
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { key: 'ALL', label: 'Todas' },
            { key: 'ACTIVE', label: 'Aguardando / Ativas' },
            { key: 'OFFERED', label: 'Ofertas (48h)' },
            { key: 'RESOLVED', label: 'Histórico' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key as any)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: 600,
                border: statusFilter === tab.key ? '1px solid #059669' : '1px solid #E5E7EB',
                backgroundColor: statusFilter === tab.key ? '#ECFDF5' : '#FFFFFF',
                color: statusFilter === tab.key ? '#065F46' : '#4B5563',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por edifício, unidade..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '0.84rem',
              outline: 'none',
            }}
          />
          <Search size={15} color="#9CA3AF" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      {/* Lista de Inscrições */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
          <p style={{ margin: 0, fontSize: '0.90rem' }}>Carregando sua lista de espera...</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '40px 20px',
            textAlign: 'center',
            border: '1px dashed #D1D5DB',
            color: '#6B7280',
          }}
        >
          <Clock size={32} color="#9CA3AF" style={{ margin: '0 auto 10px' }} />
          <h3 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700, color: '#374151' }}>
            Nenhuma inscrição encontrada
          </h3>
          <p style={{ margin: 0, fontSize: '0.86rem' }}>
            Quando você tentar anunciar um imóvel com as 3 vagas completas, poderá ingressar na lista de espera para acompanhar sua prioridade aqui.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredEntries.map((entry) => {
            const badge = getStatusBadge(entry.status);
            const building = entry.physicalProperty?.building;
            const unit = entry.physicalProperty?.unit;
            const isActive = entry.status === 'WAITING' || entry.status === 'PENDING_NOTIFICATION' || entry.status === 'OFFERED';
            const isOffered = entry.status === 'OFFERED';

            const sharedPriceFormatted = entry.physicalProperty?.sharedPrice
              ? Number(entry.physicalProperty.sharedPrice).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  maximumFractionDigits: 0,
                })
              : null;

            return (
              <div
                key={entry.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  padding: '20px',
                  border: isOffered ? '2px solid #F59E0B' : '1px solid #E5E7EB',
                  boxShadow: isOffered ? '0 4px 12px rgba(245, 158, 11, 0.12)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                {/* Linha Superior: Imóvel e Posição */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: '#F3F4F6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#4B5563',
                        flexShrink: 0,
                      }}
                    >
                      <Building2 size={22} />
                    </div>

                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>
                        {building?.name || 'Edifício Residencial'}
                      </h4>
                      <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: '#4B5563' }}>
                        Unidade {unit?.unitNumber || '—'}{unit?.tower ? ` • Torre ${unit.tower}` : ''}
                      </p>
                      {building?.address && (
                        <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} />
                          <span>{building.address}, {building.city}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Posição na Fila e Status Badge */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <div
                      style={{
                        padding: '4px 12px',
                        borderRadius: '16px',
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #DBEAFE',
                        color: '#1E40AF',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Clock size={13} />
                      <span>{entry.position}º lugar na fila FIFO</span>
                    </div>

                    <div
                      style={{
                        padding: '3px 10px',
                        borderRadius: '6px',
                        backgroundColor: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`,
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      {badge.icon}
                      <span>{badge.label}</span>
                    </div>
                  </div>
                </div>

                {/* Linha Central: Preço Compartilhado, Datas e Anúncio Rascunho */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '10px',
                    padding: '12px 14px',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '8px',
                    fontSize: '0.80rem',
                    color: '#4B5563',
                  }}
                >
                  <div>
                    <span style={{ color: '#6B7280', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>
                      Preço Compartilhado
                    </span>
                    <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                      {sharedPriceFormatted || 'Sob consulta'}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: '#6B7280', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>
                      Data de Inscrição
                    </span>
                    <div style={{ fontWeight: 600, color: '#111827', marginTop: '2px' }}>
                      {new Date(entry.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>

                  {entry.draftProperty && (
                    <div>
                      <span style={{ color: '#6B7280', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>
                        Anúncio Preservado
                      </span>
                      <div style={{ fontWeight: 600, color: '#111827', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <Link href={`/imoveis/${entry.draftProperty.id}`} style={{ color: '#059669', textDecoration: 'underline' }}>
                          {entry.draftProperty.title}
                        </Link>
                      </div>
                    </div>
                  )}

                  {entry.expiresAt && (
                    <div>
                      <span style={{ color: '#6B7280', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>
                        Prazo de Resposta
                      </span>
                      <div style={{ fontWeight: 700, color: entry.status === 'EXPIRED' ? '#DC2626' : '#D97706', marginTop: '2px' }}>
                        {new Date(entry.expiresAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Ações da Inscrição */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
                  <div style={{ fontSize: '0.76rem', color: '#6B7280' }}>
                    Identificador da fila: <code style={{ backgroundColor: '#F3F4F6', padding: '2px 4px', borderRadius: '4px' }}>{entry.id}</code>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {isActive && (
                      <button
                        type="button"
                        disabled={cancellingId === entry.id}
                        onClick={() => handleCancel(entry)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #D1D5DB',
                          backgroundColor: '#FFFFFF',
                          color: '#DC2626',
                          fontSize: '0.80rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {cancellingId === entry.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        <span>Cancelar inscrição</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

