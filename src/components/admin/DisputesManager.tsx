'use client';

import React, { useState, useEffect } from 'react';
import {
  Scale,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Building,
  User,
  Clock,
  AlertCircle,
  Loader2,
  DollarSign,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  X,
  FileText,
} from 'lucide-react';

interface DisputeItem {
  id: string;
  physicalPropertyId: string;
  claimantBrokerId: string;
  type: string;
  status: 'OPEN' | 'RESOLVED' | 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  justification: string | null;
  documentProofUrl: string | null;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  resolutionNotes: string | null;
  resolutionAction: 'APPROVE' | 'REJECT' | null;
  createdAt: string;
  updatedAt: string;
  claimantBroker: {
    id: string;
    name: string;
    email: string;
    profile: {
      commercialName: string | null;
      creci: string | null;
      phone: string | null;
    } | null;
  };
  physicalProperty: {
    id: string;
    sharedPrice: number;
    primaryListingId: string | null;
    unit: {
      unitNumber: string;
      tower: string | null;
    } | null;
    building: {
      id: string;
      name: string;
      address: string;
      city: string;
    } | null;
  };
  priceRevisions: Array<{
    id: string;
    currentPrice: number;
    suggestedPrice: number;
    justification: string;
    documentProofUrl: string | null;
    status: string;
    createdAt: string;
    decidedAt: string | null;
    decisionReason: string | null;
  }>;
}

export default function DisputesManager() {
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');

  // Modal de Arbitragem
  const [selectedDispute, setSelectedDispute] = useState<DisputeItem | null>(null);
  const [action, setAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [customPrice, setCustomPrice] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadDisputes();
  }, [statusFilter]);

  async function loadDisputes() {
    setLoading(true);
    try {
      const url = statusFilter === 'ALL'
        ? '/api/admin/disputes'
        : `/api/admin/disputes?status=${statusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar contestações.');
      setDisputes(data.disputes || []);
    } catch (err: any) {
      console.error('Erro ao carregar contestações:', err);
      setFeedback({ type: 'error', text: err.message || 'Erro ao carregar contestações.' });
    } finally {
      setLoading(false);
    }
  }

  function openArbitrationModal(dispute: DisputeItem) {
    setSelectedDispute(dispute);
    setAction('APPROVE');
    const rev = dispute.priceRevisions?.[0];
    setCustomPrice(rev?.suggestedPrice ? String(rev.suggestedPrice) : String(dispute.physicalProperty.sharedPrice));
    setAdminNotes('');
    setModalError(null);
  }

  async function handleResolveDispute(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDispute) return;

    if (!adminNotes.trim()) {
      setModalError('O parecer / justificativa técnica administrativa é obrigatório.');
      return;
    }

    if (action === 'APPROVE') {
      const num = Number(customPrice);
      if (isNaN(num) || num <= 0) {
        setModalError('Informe um valor de preço aprovado válido maior que zero.');
        return;
      }
    }

    setSubmitting(true);
    setModalError(null);

    try {
      const payload: any = {
        action,
        adminNotes: adminNotes.trim(),
      };
      if (action === 'APPROVE') {
        payload.approvedPrice = Number(customPrice);
      }

      const res = await fetch(`/api/admin/disputes/${selectedDispute.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao arbitrar contestação.');
      }

      setFeedback({
        type: 'success',
        text: action === 'APPROVE'
          ? `Contestação deferida com sucesso! Novo preço compartilhado homologado em R$ ${Number(customPrice).toLocaleString('pt-BR')}.`
          : 'Contestação indeferida. O preço compartilhado atual foi mantido.',
      });

      setSelectedDispute(null);
      await loadDisputes();
    } catch (err: any) {
      setModalError(err.message || 'Erro ao concluir arbitragem.');
    } finally {
      setSubmitting(false);
    }
  }

  const filteredDisputes = disputes.filter((d) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const buildingName = d.physicalProperty?.building?.name?.toLowerCase() || '';
    const claimantName = d.claimantBroker?.name?.toLowerCase() || '';
    const claimantCreci = d.claimantBroker?.profile?.creci?.toLowerCase() || '';
    const unitNumber = d.physicalProperty?.unit?.unitNumber?.toLowerCase() || '';
    return (
      buildingName.includes(term) ||
      claimantName.includes(term) ||
      claimantCreci.includes(term) ||
      unitNumber.includes(term)
    );
  });

  const openCount = disputes.filter((d) => d.status === 'PENDING' || d.status === 'UNDER_REVIEW' || (d.status as string) === 'OPEN').length;
  const resolvedCount = disputes.filter((d) => d.status === 'APPROVED' || d.status === 'REJECTED' || (d.status as string) === 'RESOLVED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Topo informativo */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Scale size={22} color="#1E4620" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#111827' }}>
              Arbitragem de Contestações de Preço Compartilhado
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: '0.86rem', color: '#6B7280' }}>
            Mediação administrativa para divergências de preço único entre corretores parceiros em imóveis físicos.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase' }}>Pendentes</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#B45309' }}>{openCount}</div>
          </div>
          <div style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase' }}>Julgadas</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#047857' }}>{resolvedCount}</div>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
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
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
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

      {/* Barra de Filtros e Busca */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por edifício, corretor, CRECI ou unidade..."
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '0.88rem',
            }}
          />
          <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {(['ALL', 'OPEN', 'RESOLVED'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: statusFilter === st ? '#1E4620' : '#D1D5DB',
                backgroundColor: statusFilter === st ? '#1E4620' : '#FFFFFF',
                color: statusFilter === st ? '#FFFFFF' : '#374151',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {st === 'ALL' ? 'Todas' : st === 'OPEN' ? 'Pendentes (Abertas)' : 'Julgadas (Resolvidas)'}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Contestações */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', color: '#6B7280' }}>
          <Loader2 className="animate-spin" size={28} color="#1E4620" />
          <span style={{ marginLeft: '10px' }}>Carregando contestações...</span>
        </div>
      ) : filteredDisputes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', color: '#6B7280' }}>
          <Scale size={36} color="#9CA3AF" style={{ margin: '0 auto 10px' }} />
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.96rem' }}>Nenhuma contestação encontrada</p>
          <p style={{ margin: '4px 0 0', fontSize: '0.84rem' }}>Não há registros com os filtros selecionados.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredDisputes.map((dispute) => {
            const rev = dispute.priceRevisions?.[0];
            const isOpen = dispute.status === 'PENDING' || dispute.status === 'UNDER_REVIEW' || (dispute.status as string) === 'OPEN';
            const building = dispute.physicalProperty?.building;
            const unit = dispute.physicalProperty?.unit;

            return (
              <div
                key={dispute.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: isOpen ? '1.5px solid #FCD34D' : '1px solid #E5E7EB',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  boxShadow: isOpen ? '0 2px 8px rgba(251, 191, 36, 0.15)' : 'none',
                }}
              >
                {/* Linha superior: Status e Identificação do Imóvel */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        backgroundColor: isOpen ? '#FEF3C7' : '#DCFCE7',
                        color: isOpen ? '#92400E' : '#166534',
                        border: `1px solid ${isOpen ? '#FDE68A' : '#BBF7D0'}`,
                      }}
                    >
                      {isOpen ? '⏳ ABERTA / AGUARDANDO JULGAMENTO' : '✓ JULGADA / RESOLVIDA'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={13} />
                      {new Date(dispute.createdAt).toLocaleDateString('pt-BR')} às {new Date(dispute.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {isOpen && (
                    <button
                      type="button"
                      onClick={() => openArbitrationModal(dispute)}
                      className="btn-primary"
                      style={{ padding: '7px 16px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Scale size={14} />
                      <span>Arbitrar Contestação</span>
                    </button>
                  )}
                </div>

                {/* Imóvel e Preços */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', backgroundColor: '#F9FAFB', padding: '14px', borderRadius: '8px', border: '1px solid #F3F4F6' }}>
                  <div>
                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>Imóvel Físico</div>
                    <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#111827', marginTop: '2px' }}>
                      {building?.name || 'Edifício Não Informado'}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#4B5563', marginTop: '2px' }}>
                      Unidade {unit?.unitNumber || 'S/N'}{unit?.tower ? ` • Torre ${unit.tower}` : ''}
                      {building?.city ? ` — ${building.city}` : ''}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>Preço Atual</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#374151' }}>
                        R$ {dispute.physicalProperty.sharedPrice.toLocaleString('pt-BR')}
                      </div>
                    </div>
                    <ArrowRight size={18} color="#9CA3AF" />
                    <div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#1E4620', textTransform: 'uppercase' }}>Preço Solicitado</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E4620' }}>
                        {rev?.suggestedPrice ? `R$ ${rev.suggestedPrice.toLocaleString('pt-BR')}` : 'Não informado'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Corretor Solicitante e Justificativas */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
                  <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <User size={14} color="#0369A1" />
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>
                        Corretor Solicitante (Contestante)
                      </span>
                    </div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#111827' }}>
                      {dispute.claimantBroker?.name}
                      {dispute.claimantBroker?.profile?.commercialName && (
                        <span style={{ color: '#6B7280', fontWeight: 400 }}> ({dispute.claimantBroker.profile.commercialName})</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: '2px' }}>
                      CRECI: {dispute.claimantBroker?.profile?.creci || 'Não informado'} • Tel: {dispute.claimantBroker?.profile?.phone || 'Não informado'}
                    </div>

                    <div style={{ marginTop: '10px', fontSize: '0.82rem', color: '#374151', backgroundColor: '#F0F9FF', padding: '8px 10px', borderRadius: '6px', border: '1px solid #BAE6FD' }}>
                      <strong>Justificativa da Solicitação:</strong> {rev?.justification || 'Sem justificativa'}
                      {dispute.justification && (
                        <div style={{ marginTop: '4px', borderTop: '1px dashed #7DD3FC', paddingTop: '4px' }}>
                          <strong>Argumento da Contestação:</strong> {dispute.justification}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <ShieldAlert size={14} color="#B45309" />
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#B45309', textTransform: 'uppercase' }}>
                        Recusa do Corretor Principal
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#6B7280' }}>
                      Decidido em: {rev?.decidedAt ? new Date(rev.decidedAt).toLocaleDateString('pt-BR') : 'Data não informada'}
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '0.82rem', color: '#78350F', backgroundColor: '#FFFBEB', padding: '8px 10px', borderRadius: '6px', border: '1px solid #FDE68A' }}>
                      <strong>Motivo da Recusa:</strong> {rev?.decisionReason || 'Sem motivo registrado'}
                    </div>
                  </div>
                </div>

                {/* Resolução Administrativa se já Resolvida */}
                {!isOpen && (
                  <div style={{ backgroundColor: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <CheckCircle2 size={16} color="#166534" />
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>
                        Decisão Administrativa: {dispute.resolutionAction === 'APPROVE' ? 'DEFERIDA (Preço Alterado)' : 'INDEFERIDA (Preço Mantido)'}
                      </span>
                      {dispute.resolvedAt && (
                        <span style={{ fontSize: '0.76rem', color: '#4B5563', marginLeft: 'auto' }}>
                          Julgado em: {new Date(dispute.resolvedAt).toLocaleDateString('pt-BR')} às {new Date(dispute.resolvedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#166534', marginTop: '4px' }}>
                      <strong>Parecer da Administração:</strong> {dispute.resolutionNotes || 'Sem parecer registrado.'}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Arbitragem Administrativa */}
      {selectedDispute && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', maxWidth: '540px', width: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Scale size={20} color="#1E4620" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                  Arbitragem de Contestação
                </h3>
              </div>
              <button type="button" onClick={() => setSelectedDispute(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '0.82rem', color: '#334155' }}>
              <strong>Imóvel:</strong> {selectedDispute.physicalProperty?.building?.name || 'Edifício'} • Unidade {selectedDispute.physicalProperty?.unit?.unitNumber || 'S/N'}<br />
              <strong>Preço atual compartilhado:</strong> R$ {selectedDispute.physicalProperty.sharedPrice.toLocaleString('pt-BR')}<br />
              <strong>Preço sugerido pelo solicitante:</strong> R$ {Number(selectedDispute.priceRevisions?.[0]?.suggestedPrice || 0).toLocaleString('pt-BR')}
            </div>

            {modalError && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '0.82rem' }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleResolveDispute} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '8px', color: '#0F172A' }}>
                  Decisão da Administração *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setAction('APPROVE')}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: action === 'APPROVE' ? '2px solid #166534' : '1px solid #D1D5DB',
                      backgroundColor: action === 'APPROVE' ? '#F0FDF4' : '#FFFFFF',
                      color: action === 'APPROVE' ? '#166534' : '#4B5563',
                      fontWeight: 700,
                      fontSize: '0.86rem',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>✓ Deferir / Alterar Preço</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 400 }}>Homologa novo valor público</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAction('REJECT')}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: action === 'REJECT' ? '2px solid #991B1B' : '1px solid #D1D5DB',
                      backgroundColor: action === 'REJECT' ? '#FEF2F2' : '#FFFFFF',
                      color: action === 'REJECT' ? '#991B1B' : '#4B5563',
                      fontWeight: 700,
                      fontSize: '0.86rem',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>✗ Indeferir / Manter Preço</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 400 }}>Mantém o valor atual</span>
                  </button>
                </div>
              </div>

              {action === 'APPROVE' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '6px', color: '#0F172A' }}>
                    Novo Preço Compartilhado Homologado (R$) *
                  </label>
                  <input
                    type="text"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ex: 850000"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '1rem',
                      fontWeight: 700,
                    }}
                  />
                  <span style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '4px', display: 'block' }}>
                    Este valor será imediatamente replicado para todos os anúncios ativos vinculados a esta unidade.
                  </span>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '6px', color: '#0F172A' }}>
                  Parecer Técnico / Justificativa Administrativa *
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Descreva a fundamentação da decisão (ex: validação com matrícula, alinhamento com proprietário, conferência de documentação)..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.86rem',
                  }}
                />
              </div>

              <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '0.76rem', color: '#64748B', lineHeight: 1.4 }}>
                🛡️ <strong>Regra de Arbitragem:</strong> A decisão administrativa não suspende anúncios nem corretores envolvidos. Caso deferida, atualiza atomicamente o preço compartilhado e encerra a contestação.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedDispute(null)}
                  className="btn-secondary"
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting || !adminNotes.trim()}
                >
                  {submitting ? 'Gravando Julgamento...' : 'Homologar Decisão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
