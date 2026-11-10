'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Building2,
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  ExternalLink,
  DollarSign,
  ShieldCheck,
  Send,
  RefreshCw,
  Phone,
  MessageCircle,
  Eye,
  XCircle,
} from 'lucide-react';

interface AdminWaitlistEntry {
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
  broker: {
    id: string;
    name: string;
    email: string;
    profile: {
      commercialName: string | null;
      phone: string | null;
      creci: string | null;
    } | null;
  };
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

export default function AdminWaitlistManager() {
  const [entries, setEntries] = useState<AdminWaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [processingExp, setProcessingExp] = useState(false);
  const [notifyingId, setNotifyingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadEntries();
  }, []);

  async function loadEntries() {
    setLoading(true);
    try {
      const res = await fetch('/api/waitlist?scope=all');
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } catch (err) {
      console.error('Erro ao buscar lista de espera admin:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleProcessExpirations() {
    setProcessingExp(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/waitlist/process-expirations', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao processar expirações.');
      }

      setFeedback({
        type: 'success',
        text: data.message || 'Processamento concluído com sucesso.',
      });
      loadEntries();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Erro ao processar expirações.',
      });
    } finally {
      setProcessingExp(false);
    }
  }

  async function handleNotify(entry: AdminWaitlistEntry) {
    const brokerName = entry.broker?.profile?.commercialName || entry.broker?.name || 'Corretor';
    const buildingName = entry.physicalProperty?.building?.name || 'Edifício';

    const confirmNotify = window.confirm(
      `Disponibilizar oferta formalmente para ${brokerName} no ${buildingName}?\n\nEsta ação mudará o status para OFFERED e iniciará o prazo de 48 horas corridas.`
    );
    if (!confirmNotify) return;

    setNotifyingId(entry.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/waitlist/${entry.id}/notify`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao disponibilizar oferta.');
      }

      setFeedback({
        type: 'success',
        text: `Oferta disponibilizada com sucesso para ${brokerName}. O prazo de 48h foi iniciado.`,
      });
      loadEntries();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Erro ao disponibilizar oferta.',
      });
    } finally {
      setNotifyingId(null);
    }
  }

  // Métricas
  const waitingCount = entries.filter((e) => e.status === 'WAITING').length;
  const pendingNotifCount = entries.filter((e) => e.status === 'PENDING_NOTIFICATION').length;
  const offeredCount = entries.filter((e) => e.status === 'OFFERED').length;
  const claimedCount = entries.filter((e) => e.status === 'CLAIMED').length;

  const filteredEntries = entries.filter((e) => {
    if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;

    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const bName = e.physicalProperty?.building?.name?.toLowerCase() || '';
    const uNum = e.physicalProperty?.unit?.unitNumber?.toLowerCase() || '';
    const brokerName = e.broker?.name?.toLowerCase() || '';
    const commercialName = e.broker?.profile?.commercialName?.toLowerCase() || '';
    const creci = e.broker?.profile?.creci?.toLowerCase() || '';
    return (
      bName.includes(term) ||
      uNum.includes(term) ||
      brokerName.includes(term) ||
      commercialName.includes(term) ||
      creci.includes(term)
    );
  });

  function getWhatsAppUrl(phone: string | null | undefined): string | null {
    if (!phone) return null;
    const clean = phone.replace(/\D/g, '');
    if (!clean) return null;
    const full = clean.startsWith('55') ? clean : `55${clean}`;
    return `https://wa.me/${full}`;
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'WAITING':
        return { label: 'Em Fila FIFO (Aguardando)', bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE' };
      case 'PENDING_NOTIFICATION':
        return { label: 'Vaga Reservada (Pendente Envio)', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' };
      case 'OFFERED':
        return { label: 'Oferta Aberta (Prazo 48h)', bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' };
      case 'CLAIMED':
        return { label: 'Vaga Assumida (Ativo)', bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' };
      case 'REJECTED':
        return { label: 'Recusada pelo Corretor', bg: '#F3F4F6', color: '#4B5563', border: '#E5E7EB' };
      case 'EXPIRED':
        return { label: 'Prazo Expirado', bg: '#FEE2E2', color: '#991B1B', border: '#FECACA' };
      case 'CANCELLED':
        return { label: 'Cancelada', bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' };
      default:
        return { label: status, bg: '#F3F4F6', color: '#374151', border: '#E5E7EB' };
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Topo / Header Administrativo */}
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
            <Clock size={22} color="#D97706" />
            <span>Gestão da Lista de Espera e Convocações</span>
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: '#6B7280' }}>
            Monitoramento das filas FIFO por imóvel físico, vagas reservadas e disparo formal de prazos de 48 horas.
          </p>
        </div>

        <button
          type="button"
          disabled={processingExp}
          onClick={handleProcessExpirations}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            border: '1px solid #D1D5DB',
            backgroundColor: '#FFFFFF',
            color: '#374151',
            fontSize: '0.86rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          {processingExp ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          <span>Processar Expirações</span>
        </button>
      </div>

      {/* Métricas Administrativas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
        <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <div style={{ fontSize: '1.50rem', fontWeight: 800, color: '#1E40AF' }}>{waitingCount}</div>
          <div style={{ fontSize: '0.80rem', fontWeight: 600, color: '#3B82F6' }}>Corretores em Fila (WAITING)</div>
          <div style={{ fontSize: '0.72rem', color: '#60A5FA', marginTop: '2px' }}>Aguardando liberação de vagas</div>
        </div>

        <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#FEF3C7', border: '1px solid #FCD34D' }}>
          <div style={{ fontSize: '1.50rem', fontWeight: 800, color: '#92400E' }}>{pendingNotifCount}</div>
          <div style={{ fontSize: '0.80rem', fontWeight: 600, color: '#B45309' }}>Vagas Reservadas (PENDING_NOTIFICATION)</div>
          <div style={{ fontSize: '0.72rem', color: '#D97706', marginTop: '2px' }}>Aguardando envio formal do aviso</div>
        </div>

        <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0' }}>
          <div style={{ fontSize: '1.50rem', fontWeight: 800, color: '#065F46' }}>{offeredCount}</div>
          <div style={{ fontSize: '0.80rem', fontWeight: 600, color: '#059669' }}>Ofertas Ativas (OFFERED)</div>
          <div style={{ fontSize: '0.72rem', color: '#10B981', marginTop: '2px' }}>Dentro do prazo de 48 horas</div>
        </div>

        <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
          <div style={{ fontSize: '1.50rem', fontWeight: 800, color: '#15803D' }}>{claimedCount}</div>
          <div style={{ fontSize: '0.80rem', fontWeight: 600, color: '#16A34A' }}>Vagas Conquistadas (CLAIMED)</div>
          <div style={{ fontSize: '0.72rem', color: '#22C55E', marginTop: '2px' }}>Anúncios ativados com sucesso</div>
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

      {/* Filtros e Busca */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { key: 'ALL', label: 'Todas' },
            { key: 'WAITING', label: 'Em Fila' },
            { key: 'PENDING_NOTIFICATION', label: 'Reservadas' },
            { key: 'OFFERED', label: 'Em Oferta (48h)' },
            { key: 'CLAIMED', label: 'Assumidas' },
            { key: 'EXPIRED', label: 'Expiradas' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: 600,
                border: statusFilter === tab.key ? '1px solid #D97706' : '1px solid #E5E7EB',
                backgroundColor: statusFilter === tab.key ? '#FEF3C7' : '#FFFFFF',
                color: statusFilter === tab.key ? '#92400E' : '#4B5563',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '300px' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por edifício, corretor, CRECI..."
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

      {/* Lista de Registros */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
          <p style={{ margin: 0, fontSize: '0.90rem' }}>Carregando dados da lista de espera...</p>
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
            Nenhum registro encontrado
          </h3>
          <p style={{ margin: 0, fontSize: '0.86rem' }}>
            Não há registros na lista de espera correspondentes aos filtros selecionados.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredEntries.map((entry) => {
            const badge = getStatusBadge(entry.status);
            const building = entry.physicalProperty?.building;
            const unit = entry.physicalProperty?.unit;
            const broker = entry.broker;
            const whatsAppUrl = getWhatsAppUrl(broker?.profile?.phone);

            return (
              <div
                key={entry.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid #E5E7EB',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                {/* Linha Superior */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        backgroundColor: '#F3F4F6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#374151',
                        flexShrink: 0,
                      }}
                    >
                      <Building2 size={20} />
                    </div>

                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>
                        {building?.name || 'Edifício Residencial'} — Unidade {unit?.unitNumber || '—'}
                        {unit?.tower ? ` (Torre ${unit.tower})` : ''}
                      </h4>
                      <p style={{ margin: '2px 0 0', fontSize: '0.80rem', color: '#6B7280' }}>
                        Capacidade ativa: {entry.physicalProperty?.activeListingsCount || 0} de 3 vagas ocupadas
                      </p>
                    </div>
                  </div>

                  {/* Posição FIFO e Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #DBEAFE',
                        color: '#1E40AF',
                        fontSize: '0.80rem',
                        fontWeight: 700,
                      }}
                    >
                      {entry.position}º na Fila FIFO
                    </div>

                    <div
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`,
                        fontSize: '0.78rem',
                        fontWeight: 600,
                      }}
                    >
                      {badge.label}
                    </div>
                  </div>
                </div>

                {/* Dados do Corretor e Imóvel */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '12px',
                    padding: '12px 14px',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#6B7280', fontWeight: 700 }}>
                      Corretor Solicitante
                    </span>
                    <div style={{ fontWeight: 700, color: '#111827', marginTop: '2px' }}>
                      {broker?.name || '—'}
                    </div>
                    {broker?.profile?.commercialName && (
                      <div style={{ fontSize: '0.78rem', color: '#4B5563' }}>
                        {broker.profile.commercialName}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      {broker?.profile?.creci && (
                        <span style={{ fontSize: '0.74rem', backgroundColor: '#E5E7EB', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          CRECI: {broker.profile.creci}
                        </span>
                      )}
                      {whatsAppUrl && (
                        <a
                          href={whatsAppUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '0.74rem',
                            color: '#059669',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          <MessageCircle size={13} />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#6B7280', fontWeight: 700 }}>
                      Preço Homologado / Rascunho
                    </span>
                    <div style={{ fontWeight: 700, color: '#059669', marginTop: '2px' }}>
                      {entry.physicalProperty?.sharedPrice
                        ? Number(entry.physicalProperty.sharedPrice).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                            maximumFractionDigits: 0,
                          })
                        : 'Sob consulta'}
                    </div>
                    {entry.draftProperty && (
                      <div style={{ fontSize: '0.78rem', color: '#374151', marginTop: '2px' }}>
                        Rascunho: <em>{entry.draftProperty.title}</em>
                      </div>
                    )}
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#6B7280', fontWeight: 700 }}>
                      Datas Registradas
                    </span>
                    <div style={{ color: '#374151', marginTop: '2px' }}>
                      Inscrição: {new Date(entry.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {entry.expiresAt && (
                      <div style={{ color: entry.status === 'EXPIRED' ? '#DC2626' : '#D97706', fontWeight: 600, marginTop: '2px' }}>
                        Expiração: {new Date(entry.expiresAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Ações Administrativas */}
                {entry.status === 'PENDING_NOTIFICATION' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
                    <button
                      type="button"
                      disabled={notifyingId === entry.id}
                      onClick={() => handleNotify(entry)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#D97706',
                        color: '#FFFFFF',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {notifyingId === entry.id ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                      <span>Disponibilizar Convocação (Iniciar 48h)</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

