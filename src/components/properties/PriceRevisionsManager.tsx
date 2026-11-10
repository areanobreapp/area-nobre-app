'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  Scale,
  Building,
  User,
  AlertTriangle,
  Loader2,
  X,
  ExternalLink,
  MessageCircle,
  FileText,
} from 'lucide-react';

interface RevisionRequest {
  id: string;
  propertyId: string;
  physicalPropertyId: string;
  requestingBrokerId: string;
  currentPrice: number;
  suggestedPrice: number;
  justification: string;
  documentProofUrl: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'APPROVED' | 'REJECTED' | 'DISPUTED' | 'ESCALATED' | 'CANCELLED';
  createdAt: string;
  decidedAt: string | null;
  decidedByUserId: string | null;
  decisionReason: string | null;
  requestingBroker: {
    id: string;
    name: string;
    email: string;
    profile: {
      commercialName: string | null;
      creci: string | null;
      phone: string | null;
    } | null;
  };
  decidedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  property?: {
    id: string;
    internalCode: string | null;
    title: string;
    price: number;
    status: string;
    isPrimaryListing: boolean;
  } | null;
  physicalProperty?: {
    id: string;
    sharedPrice: number;
    primaryListingId: string | null;
    unit?: {
      unitNumber: string;
      tower: string | null;
    } | null;
    building?: {
      id: string;
      name: string;
      address: string;
      city: string;
    } | null;
  } | null;
  dispute?: {
    id: string;
    status: string;
    createdAt: string;
    resolvedAt: string | null;
  } | null;
}

export default function PriceRevisionsManager() {
  const [activeTab, setActiveTab] = useState<'assigned' | 'mine'>('assigned');
  const [requests, setRequests] = useState<RevisionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal de Aceitar Revisão (Corretor Principal)
  const [acceptingRequest, setAcceptingRequest] = useState<RevisionRequest | null>(null);
  const [acceptingSubmitting, setAcceptingSubmitting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // Modal de Recusar Revisão (Corretor Principal)
  const [rejectingRequest, setRejectingRequest] = useState<RevisionRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingSubmitting, setRejectingSubmitting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Modal de Contestação Administrativa (Corretor Secundário)
  const [disputingRequest, setDisputingRequest] = useState<RevisionRequest | null>(null);
  const [disputeJustification, setDisputeJustification] = useState('');
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, [activeTab]);

  async function loadRequests() {
    setLoading(true);
    try {
      const res = await fetch(`/api/price-revisions?scope=${activeTab}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao buscar solicitações de revisão.');
      setRequests(data.requests || []);
    } catch (err: any) {
      console.error('Erro ao carregar solicitações de revisão:', err);
      setFeedback({ type: 'error', text: err.message || 'Falha ao carregar solicitações.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmAccept() {
    if (!acceptingRequest) return;
    setAcceptingSubmitting(true);
    setAcceptError(null);
    try {
      const res = await fetch(`/api/price-revisions/${acceptingRequest.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'STALE_PRICE') {
          throw new Error('O preço compartilhado deste imóvel físico foi modificado por outra ação recente. Atualize a página e confira o valor atual antes de aceitar.');
        }
        if (data.code === 'UNAUTHORIZED_NOT_PRIMARY') {
          throw new Error('Você não detém mais a condição de Anúncio Principal deste imóvel físico.');
        }
        throw new Error(data.error || 'Erro ao aceitar solicitação.');
      }

      setFeedback({
        type: 'success',
        text: `Solicitação aceita com sucesso! O novo preço compartilhado de R$ ${Number(data.updatedPrice || acceptingRequest.suggestedPrice).toLocaleString('pt-BR')} foi aplicado a todos os anúncios vinculados.`,
      });
      setAcceptingRequest(null);
      await loadRequests();
    } catch (err: any) {
      setAcceptError(err.message || 'Erro ao processar aceite.');
    } finally {
      setAcceptingSubmitting(false);
    }
  }

  async function handleConfirmReject() {
    if (!rejectingRequest) return;
    if (!rejectReason.trim()) {
      setRejectError('Informe obrigatoriamente a justificativa para a recusa.');
      return;
    }

    setRejectingSubmitting(true);
    setRejectError(null);
    try {
      const res = await fetch(`/api/price-revisions/${rejectingRequest.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisionReason: rejectReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao recusar solicitação.');
      }

      setFeedback({
        type: 'success',
        text: 'Solicitação de revisão recusada. O corretor solicitante foi notificado do motivo.',
      });
      setRejectingRequest(null);
      await loadRequests();
    } catch (err: any) {
      setRejectError(err.message || 'Erro ao registrar recusa.');
    } finally {
      setRejectingSubmitting(false);
    }
  }

  async function handleConfirmDispute() {
    if (!disputingRequest) return;
    setDisputeSubmitting(true);
    setDisputeError(null);
    try {
      const res = await fetch(`/api/price-revisions/${disputingRequest.id}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ justification: disputeJustification.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao encaminhar contestação administrativa.');
      }

      setFeedback({
        type: 'success',
        text: 'Contestação administrativa encaminhada com sucesso para a gestão da Área Nobre! A administração analisará as justificativas sem suspender anúncios.',
      });
      setDisputingRequest(null);
      await loadRequests();
    } catch (err: any) {
      setDisputeError(err.message || 'Erro ao abrir contestação.');
    } finally {
      setDisputeSubmitting(false);
    }
  }

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Abas Superiores de Escopo de Revisão */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('assigned')}
          style={{
            padding: '8px 18px',
            fontSize: '0.88rem',
            fontWeight: 700,
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'assigned' ? '#DCFCE7' : 'transparent',
            color: activeTab === 'assigned' ? '#166534' : 'var(--text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>Recebidas (Como Anúncio Principal)</span>
          {activeTab === 'assigned' && pendingCount > 0 && (
            <span style={{ fontSize: '0.72rem', padding: '2px 7px', borderRadius: '10px', backgroundColor: '#166534', color: 'white', fontWeight: 800 }}>
              {pendingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('mine')}
          style={{
            padding: '8px 18px',
            fontSize: '0.88rem',
            fontWeight: 700,
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'mine' ? '#EEF2FF' : 'transparent',
            color: activeTab === 'mine' ? '#3730A3' : 'var(--text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>Minhas Solicitações Enviadas</span>
        </button>
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

      {/* Lista de Solicitações */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <Loader2 className="animate-spin" size={28} color="var(--color-primary)" />
          <span style={{ marginLeft: '10px' }}>Carregando solicitações de revisão...</span>
        </div>
      ) : requests.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
          <DollarSign size={36} color="var(--text-light)" style={{ margin: '0 auto 10px' }} />
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.96rem' }}>
            {activeTab === 'assigned'
              ? 'Nenhuma solicitação de revisão recebida'
              : 'Nenhuma solicitação de revisão enviada'}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '0.84rem' }}>
            {activeTab === 'assigned'
              ? 'Quando outros corretores vinculados a imóveis onde você é o Anúncio Principal solicitarem alteração de preço, elas aparecerão aqui.'
              : 'Solicitações de alteração de preço enviadas aos corretores principais de imóveis físicos compartilhados aparecerão aqui.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {requests.map((req) => {
            const isPending = req.status === 'PENDING';
            const isAccepted = req.status === 'APPROVED' || req.status === 'ACCEPTED';
            const isRejected = req.status === 'REJECTED';
            const isDisputed = req.status === 'ESCALATED' || req.status === 'DISPUTED';
            const building = req.physicalProperty?.building;
            const unit = req.physicalProperty?.unit;

            return (
              <div
                key={req.id}
                className="card"
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  border: isPending ? '1.5px solid #FCD34D' : '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                {/* Linha 1: Status e Data */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {isPending && (
                      <span className="badge" style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', fontWeight: 800 }}>
                        ⏳ Pendente de Análise
                      </span>
                    )}
                    {isAccepted && (
                      <span className="badge" style={{ backgroundColor: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0', fontWeight: 800 }}>
                        ✓ Aceita e Homologada
                      </span>
                    )}
                    {isRejected && (
                      <span className="badge" style={{ backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5', fontWeight: 800 }}>
                        ✗ Recusada pelo Corretor Principal
                      </span>
                    )}
                    {isDisputed && (
                      <span className="badge" style={{ backgroundColor: '#F3E8FF', color: '#6B21A8', border: '1px solid #E9D5FF', fontWeight: 800 }}>
                        ⚖️ Em Contestação Administrativa
                      </span>
                    )}

                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={13} />
                      {new Date(req.createdAt).toLocaleDateString('pt-BR')} às {new Date(req.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Ações Rápidas para o Corretor Principal (Aba Recebidas) */}
                  {activeTab === 'assigned' && isPending && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingRequest(req);
                          setRejectReason('');
                          setRejectError(null);
                        }}
                        className="btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '0.8rem', color: '#991B1B' }}
                      >
                        Recusar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAcceptingRequest(req);
                          setAcceptError(null);
                        }}
                        className="btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                      >
                        Aceitar Preço
                      </button>
                    </div>
                  )}

                  {/* Ação para Corretor Secundário (Aba Enviadas) após recusa */}
                  {activeTab === 'mine' && isRejected && !isDisputed && (
                    <button
                      type="button"
                      onClick={() => {
                        setDisputingRequest(req);
                        setDisputeJustification('');
                        setDisputeError(null);
                      }}
                      className="btn-secondary"
                      style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#6B21A8', borderColor: '#E9D5FF', backgroundColor: '#FAF5FF' }}
                    >
                      <Scale size={14} />
                      <span>Contestar Administrativamente</span>
                    </button>
                  )}
                </div>

                {/* Linha 2: Imóvel Físico e Comparação de Preços */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', backgroundColor: 'var(--bg-subtle)', padding: '14px', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Imóvel Físico Vinculado
                    </div>
                    <div style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {building?.name || req.property?.title || 'Edifício'}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Unidade {unit?.unitNumber || 'S/N'}{unit?.tower ? ` • Torre ${unit.tower}` : ''}
                      {building?.city ? ` — ${building.city}` : ''}
                    </div>
                    {req.property?.id && (
                      <Link
                        href={`/imoveis/${req.property.id}`}
                        style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', textDecoration: 'none' }}
                      >
                        <span>Abrir Detalhes do Imóvel</span>
                        <ExternalLink size={12} />
                      </Link>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Preço Compartilhado Atual
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        R$ {req.currentPrice.toLocaleString('pt-BR')}
                      </div>
                    </div>
                    <ArrowRight size={18} color="var(--text-muted)" />
                    <div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                        Preço Sugerido
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                        R$ {req.suggestedPrice.toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Linha 3: Solicitante e Justificativas */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeTab === 'assigned' && (
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                      <strong>Solicitado por:</strong> {req.requestingBroker?.name}
                      {req.requestingBroker?.profile?.commercialName && ` (${req.requestingBroker.profile.commercialName})`}
                      {req.requestingBroker?.profile?.creci && ` • CRECI: ${req.requestingBroker.profile.creci}`}
                    </div>
                  )}

                  <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)', backgroundColor: '#F8FAFC', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <strong>Justificativa do Solicitante:</strong> {req.justification}
                  </div>

                  {isRejected && req.decisionReason && (
                    <div style={{ fontSize: '0.84rem', color: '#991B1B', backgroundColor: '#FEF2F2', padding: '10px 14px', borderRadius: '8px', border: '1px solid #FCA5A5' }}>
                      <strong>Motivo da Recusa (Corretor Principal):</strong> {req.decisionReason}
                      {req.decidedAt && (
                        <span style={{ fontSize: '0.76rem', color: '#6B7280', display: 'block', marginTop: '2px' }}>
                          Registrado em {new Date(req.decidedAt).toLocaleDateString('pt-BR')} às {new Date(req.decidedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Aceite (Corretor Principal) */}
      {acceptingRequest && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                Aceitar Revisão de Preço
              </h3>
              <button type="button" onClick={() => setAcceptingRequest(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: 1.5 }}>
              Você está prestes a aceitar a solicitação do colega corretor <strong>{acceptingRequest.requestingBroker?.name}</strong>.
            </p>

            <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', color: '#92400E', fontSize: '0.82rem', lineHeight: 1.4 }}>
              <strong>⚠️ Consequência Comercial:</strong> O preço público de venda de todos os anúncios ativos vinculados a este imóvel físico será imediatamente atualizado para <strong>R$ {acceptingRequest.suggestedPrice.toLocaleString('pt-BR')}</strong>.
            </div>

            {acceptError && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '0.82rem' }}>
                {acceptError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setAcceptingRequest(null)}
                className="btn-secondary"
                disabled={acceptingSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAccept}
                className="btn-primary"
                disabled={acceptingSubmitting}
              >
                {acceptingSubmitting ? 'Atualizando Preço...' : 'Confirmar e Atualizar Preço'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Recusa (Corretor Principal) */}
      {rejectingRequest && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                Recusar Solicitação de Revisão
              </h3>
              <button type="button" onClick={() => setRejectingRequest(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: 1.5 }}>
              Para recusar a revisão de preço proposta por <strong>{rejectingRequest.requestingBroker?.name}</strong>, é obrigatório registrar a justificativa clara da sua recusa.
            </p>

            {rejectError && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '0.82rem' }}>
                {rejectError}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '6px' }}>
                Motivo da Recusa *
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ex: Proprietário confirmou que mantém o valor atual; contrato de exclusividade firmado em outro patamar..."
                rows={3}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '0.86rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                className="btn-secondary"
                disabled={rejectingSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  cursor: rejectingSubmitting || !rejectReason.trim() ? 'not-allowed' : 'pointer',
                  opacity: rejectingSubmitting || !rejectReason.trim() ? 0.6 : 1,
                }}
                disabled={rejectingSubmitting || !rejectReason.trim()}
              >
                {rejectingSubmitting ? 'Registrando Recusa...' : 'Confirmar Recusa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Contestação Administrativa (Corretor Secundário) */}
      {disputingRequest && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Scale size={20} color="#6B21A8" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                  Contestar Decisão Administrativamente
                </h3>
              </div>
              <button type="button" onClick={() => setDisputingRequest(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: 1.5 }}>
              Sua solicitação de revisão para <strong>R$ {disputingRequest.suggestedPrice.toLocaleString('pt-BR')}</strong> foi recusada pelo corretor principal. Você pode encaminhar o caso para a administração do Área Nobre para mediação formal.
            </p>

            <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', fontSize: '0.8rem', lineHeight: 1.4 }}>
              🛡️ <strong>Garantia de Operação:</strong> A abertura de contestação não suspende seu anúncio nem o do corretor parceiro. Os anúncios continuam ativos enquanto a gestão avalia os fatos.
            </div>

            {disputeError && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '0.82rem' }}>
                {disputeError}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '6px' }}>
                Argumentos Adicionais para a Administração (opcional)
              </label>
              <textarea
                value={disputeJustification}
                onChange={(e) => setDisputeJustification(e.target.value)}
                placeholder="Ex: Possuo autorização direta do proprietário por escrito nesta data..."
                rows={3}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '0.86rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setDisputingRequest(null)}
                className="btn-secondary"
                disabled={disputeSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDispute}
                className="btn-primary"
                disabled={disputeSubmitting}
              >
                {disputeSubmitting ? 'Encaminhando...' : 'Encaminhar Contestação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
