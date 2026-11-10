'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  DollarSign,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

interface WaitlistOffer {
  id: string;
  physicalPropertyId: string;
  brokerId: string;
  position: number;
  status: 'PENDING_NOTIFICATION' | 'OFFERED' | 'CLAIMED' | 'EXPIRED' | 'REJECTED' | 'CANCELLED';
  draftPropertyId: string | null;
  notifiedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  physicalProperty: {
    id: string;
    sharedPrice: number | null;
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

interface WaitlistOfferBannerProps {
  onOfferAccepted?: () => void;
  onOfferRejected?: () => void;
}

export default function WaitlistOfferBanner({
  onOfferAccepted,
  onOfferRejected,
}: WaitlistOfferBannerProps) {
  const [offers, setOffers] = useState<WaitlistOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'accept' | 'reject' | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; type: 'success' | 'error'; text: string } | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  // Atualiza relógio regressivo a cada 1 segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadOffers();
  }, []);

  async function loadOffers() {
    setLoading(true);
    try {
      const res = await fetch('/api/waitlist/offers');
      if (res.ok) {
        const data = await res.json();
        setOffers(data.offers || []);
      }
    } catch (err) {
      console.error('Erro ao consultar ofertas ativas da lista de espera:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(offer: WaitlistOffer) {
    const confirmAccept = window.confirm(
      `Confirma a aceitação da vaga no ${offer.physicalProperty.building?.name || 'Imóvel'} (Unidade ${offer.physicalProperty.unit?.unitNumber || ''})?\n\nSeu anúncio será ativado imediatamente e ocupará formalmente uma das 3 vagas permitidas.`
    );
    if (!confirmAccept) return;

    setActingId(offer.id);
    setActionType('accept');
    setFeedback(null);
    try {
      const res = await fetch(`/api/waitlist/${offer.id}/accept`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao aceitar oferta.');
      }

      setFeedback({
        id: offer.id,
        type: 'success',
        text: 'Vaga aceita com sucesso! Seu anúncio já está ativo e visível na plataforma.',
      });

      // Remove oferta da lista após pequeno feedback
      setTimeout(() => {
        setOffers((prev) => prev.filter((o) => o.id !== offer.id));
        onOfferAccepted?.();
      }, 1800);
    } catch (err: any) {
      setFeedback({
        id: offer.id,
        type: 'error',
        text: err.message || 'Erro ao aceitar oferta de vaga.',
      });
    } finally {
      setActingId(null);
      setActionType(null);
    }
  }

  async function handleReject(offer: WaitlistOffer) {
    const confirmReject = window.confirm(
      `Atenção: Você tem certeza de que deseja recusar esta vaga?\n\nA sua prioridade nesta fila será finalizada e a oportunidade será transferida imediatamente para o próximo corretor da lista de espera.`
    );
    if (!confirmReject) return;

    setActingId(offer.id);
    setActionType('reject');
    setFeedback(null);
    try {
      const res = await fetch(`/api/waitlist/${offer.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Recusa voluntária pelo corretor.' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao recusar oferta.');
      }

      setFeedback({
        id: offer.id,
        type: 'success',
        text: 'Oferta recusada. A vaga foi repassada para o próximo corretor da fila.',
      });

      setTimeout(() => {
        setOffers((prev) => prev.filter((o) => o.id !== offer.id));
        onOfferRejected?.();
      }, 1500);
    } catch (err: any) {
      setFeedback({
        id: offer.id,
        type: 'error',
        text: err.message || 'Erro ao processar recusa.',
      });
    } finally {
      setActingId(null);
      setActionType(null);
    }
  }

  if (loading) {
    return null; // Carregamento silencioso para não causar layout shift
  }

  if (offers.length === 0) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '8px' }}>
      {offers.map((offer) => {
        const isOffered = offer.status === 'OFFERED';
        const isPendingNotif = offer.status === 'PENDING_NOTIFICATION';

        let timeRemainingText = '';
        let isExpired = false;

        if (isOffered && offer.expiresAt) {
          const expTime = new Date(offer.expiresAt).getTime();
          const diffMs = expTime - now;

          if (diffMs <= 0) {
            isExpired = true;
            timeRemainingText = 'Prazo de 48h expirado';
          } else {
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
            timeRemainingText = `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s restantes`;
          }
        }

        const sharedPriceFormatted = offer.physicalProperty?.sharedPrice
          ? Number(offer.physicalProperty.sharedPrice).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              maximumFractionDigits: 0,
            })
          : 'Sob consulta';

        const buildingName = offer.physicalProperty?.building?.name || 'Edifício Residencial';
        const unitLabel = `Unidade ${offer.physicalProperty?.unit?.unitNumber || ''}${
          offer.physicalProperty?.unit?.tower ? ` • Torre ${offer.physicalProperty.unit.tower}` : ''
        }`;
        const addressLabel = offer.physicalProperty?.building
          ? `${offer.physicalProperty.building.address}, ${offer.physicalProperty.building.city}`
          : '';

        return (
          <div
            key={offer.id}
            style={{
              borderRadius: '14px',
              padding: '20px 24px',
              backgroundColor: isOffered ? '#FFFBEB' : '#EFF6FF',
              border: isOffered ? '2px solid #F59E0B' : '2px solid #60A5FA',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Faixa decorativa lateral */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: '6px',
                backgroundColor: isOffered ? '#D97706' : '#2563EB',
              }}
            />

            {/* Cabeçalho do Card */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: isOffered ? '#FDE68A' : '#DBEAFE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isOffered ? '#92400E' : '#1E40AF',
                  }}
                >
                  <Bell size={20} className={isOffered ? 'animate-pulse' : ''} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: isOffered ? '#92400E' : '#1E40AF' }}>
                    {isOffered ? '🎉 Convocação de Vaga Liberada!' : '⏳ Vaga Pré-Reservada para Você'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: isOffered ? '#B45309' : '#3B82F6' }}>
                    {isOffered
                      ? 'Uma vaga foi disponibilizada para o seu anúncio em lista de espera.'
                      : 'Uma vaga foi liberada e aguarda envio formal de notificação pelo administrador.'}
                  </p>
                </div>
              </div>

              {/* Tag de Tempo Restante */}
              {isOffered && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    backgroundColor: isExpired ? '#FEE2E2' : '#FEF3C7',
                    border: isExpired ? '1px solid #FCA5A5' : '1px solid #FCD34D',
                    color: isExpired ? '#991B1B' : '#92400E',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                  }}
                >
                  <Clock size={16} />
                  <span>{timeRemainingText}</span>
                </div>
              )}
            </div>

            {/* Informações do Imóvel Convocado */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                padding: '12px 16px',
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid #E5E7EB',
              }}
            >
              <div>
                <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: '#6B7280', fontWeight: 700 }}>
                  Imóvel Físico
                </span>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#111827', marginTop: '2px' }}>
                  {buildingName}
                </div>
                <div style={{ fontSize: '0.80rem', color: '#4B5563' }}>
                  {unitLabel}
                </div>
                {addressLabel && (
                  <div style={{ fontSize: '0.74rem', color: '#9CA3AF', marginTop: '2px' }}>
                    {addressLabel}
                  </div>
                )}
              </div>

              <div>
                <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: '#6B7280', fontWeight: 700 }}>
                  Preço de Venda Homologado
                </span>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                  {sharedPriceFormatted}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#6B7280' }}>
                  Preço único compartilhado
                </div>
              </div>

              {isOffered && offer.expiresAt && (
                <div>
                  <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: '#6B7280', fontWeight: 700 }}>
                    Prazo Limite de Aceitação
                  </span>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: isExpired ? '#DC2626' : '#111827', marginTop: '2px' }}>
                    {new Date(offer.expiresAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#6B7280' }}>
                    48 horas corridas
                  </div>
                </div>
              )}

              {offer.draftProperty && (
                <div>
                  <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: '#6B7280', fontWeight: 700 }}>
                    Anúncio Vinculado
                  </span>
                  <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#374151', marginTop: '2px' }}>
                    {offer.draftProperty.title}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 600 }}>
                    Status atual: Rascunho / Inativo
                  </div>
                </div>
              )}
            </div>

            {/* Mensagem de Feedback */}
            {feedback && feedback.id === offer.id && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.86rem',
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

            {/* Ações da Oferta */}
            {isOffered && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  disabled={actingId === offer.id}
                  onClick={() => handleReject(offer)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#6B7280',
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {actingId === offer.id && actionType === 'reject' ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <XCircle size={15} color="#9CA3AF" />
                  )}
                  <span>Recusar vaga</span>
                </button>

                <button
                  type="button"
                  disabled={actingId === offer.id || isExpired}
                  onClick={() => handleAccept(offer)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: isExpired ? '#9CA3AF' : '#059669',
                    color: '#FFFFFF',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: isExpired ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
                  }}
                >
                  {actingId === offer.id && actionType === 'accept' ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  <span>{isExpired ? 'Prazo Expirado' : 'Aceitar Vaga e Ativar Anúncio'}</span>
                </button>
              </div>
            )}

            {isPendingNotif && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.82rem',
                  color: '#1E40AF',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} color="#2563EB" />
                  <span>Sua vaga está garantida e reservada. Você receberá o aviso de convocação formal.</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

