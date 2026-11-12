'use client';

import React, { useState } from 'react';
import {
  X,
  Camera,
  CheckCircle2,
  XCircle,
  Building,
  User,
  Clock,
  ArrowRight,
  Loader2,
  Maximize2,
  ShieldCheck,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { ModerationQueueItem } from '@/lib/building-moderation-service';

interface FacadeModerationModalProps {
  item: ModerationQueueItem;
  onClose: () => void;
  onDecide: (decision: 'APPROVE' | 'REJECT', notes: string) => Promise<void>;
}

export default function FacadeModerationModal({
  item,
  onClose,
  onDecide,
}: FacadeModerationModalProps) {
  const [confirmAction, setConfirmAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Lightbox de ampliação
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const currentCoverUrl = item.building.currentCoverImageUrl || null;
  const proposedCoverUrl = item.facadeData?.imageUrl || null;

  const handleExecuteDecision = async () => {
    if (!confirmAction) return;
    if (confirmAction === 'REJECT' && !decisionNotes.trim()) {
      setErrorMsg('A justificativa é obrigatória para rejeição.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onDecide(confirmAction, decisionNotes.trim() || 'Aprovado pelo administrador.');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao processar decisão de fotografia.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '1020px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Cabeçalho */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#1E4620',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Camera size={22} style={{ color: '#86EFAC' }} />
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                Moderação de Fotografia da Fachada
              </h2>
              <div style={{ fontSize: '0.80rem', color: '#BBF7D0' }}>
                {item.building.name} • {item.building.neighborhood}, {item.building.city}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: '#FFFFFF',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo: Comparação Visual Lado a Lado (Split View) */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
              marginBottom: '20px',
            }}
          >
            {/* Foto Vigente */}
            <div
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: '12px',
                border: '1px solid #E5E7EB',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                }}
              >
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#2563EB', textTransform: 'uppercase' }}>
                  ● Fotografia Vigente
                </span>
                {currentCoverUrl && (
                  <button
                    type="button"
                    onClick={() => setExpandedImage(currentCoverUrl)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4B5563',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.74rem',
                    }}
                  >
                    <Maximize2 size={14} /> Ampliar
                  </button>
                )}
              </div>

              <div
                style={{
                  height: '240px',
                  backgroundColor: '#E5E7EB',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {currentCoverUrl ? (
                  <img
                    src={currentCoverUrl}
                    alt="Fachada Vigente"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                    onClick={() => setExpandedImage(currentCoverUrl)}
                  />
                ) : (
                  <div style={{ color: '#6B7280', fontSize: '0.82rem', textAlign: 'center', padding: '16px' }}>
                    Nenhuma fotografia cadastrada anteriormente.
                  </div>
                )}
              </div>
            </div>

            {/* Nova Foto Proposta */}
            <div
              style={{
                backgroundColor: '#FEF3C7',
                borderRadius: '12px',
                border: '1px solid #FCD34D',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                }}
              >
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#D97706', textTransform: 'uppercase' }}>
                  ★ Nova Foto Proposta
                </span>
                {proposedCoverUrl && (
                  <button
                    type="button"
                    onClick={() => setExpandedImage(proposedCoverUrl)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#92400E',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.74rem',
                    }}
                  >
                    <Maximize2 size={14} /> Ampliar
                  </button>
                )}
              </div>

              <div
                style={{
                  height: '240px',
                  backgroundColor: '#FDE68A',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {proposedCoverUrl ? (
                  <img
                    src={proposedCoverUrl}
                    alt="Foto Proposta"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                    onClick={() => setExpandedImage(proposedCoverUrl)}
                  />
                ) : (
                  <div style={{ color: '#92400E', fontSize: '0.82rem' }}>Sem imagem</div>
                )}
              </div>
            </div>
          </div>

          {/* Dados do Autor e Justificativa */}
          <div
            style={{
              backgroundColor: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '10px',
              padding: '14px 16px',
              marginBottom: '16px',
              fontSize: '0.80rem',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginBottom: '8px' }}>
              <div>
                <strong>Corretor:</strong> {item.broker.name}
                {item.broker.commercialName && ` (${item.broker.commercialName})`}
              </div>
              <div>
                <strong>Data de Submissão:</strong> {new Date(item.createdAt).toLocaleString('pt-BR')}
              </div>
              <div>
                <strong>Tipo:</strong> {item.contributionType}
              </div>
            </div>

            {item.justification && (
              <div style={{ marginTop: '6px', color: '#4B5563' }}>
                <strong>Justificativa do Corretor:</strong> &ldquo;{item.justification}&rdquo;
              </div>
            )}
          </div>

          {/* Aviso de Proteção de Anúncios */}
          <div
            style={{
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '0.76rem',
              color: '#1E40AF',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <ShieldCheck size={18} />
            <span>
              A aprovação atualizará <strong>exclusivamente a foto coletiva da fachada do condomínio</strong>. As fotos
              particulares de cada anúncio individual não serão alteradas.
            </span>
          </div>
        </div>

        {/* Rodapé: Botões de Decisão */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#F9FAFB',
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={() => setConfirmAction('REJECT')}
            style={{
              padding: '10px 18px',
              backgroundColor: '#FFFFFF',
              color: '#DC2626',
              border: '1px solid #DC2626',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <XCircle size={16} /> Rejeitar Fotografia
          </button>

          <button
            type="button"
            onClick={() => setConfirmAction('APPROVE')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#1E4620',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CheckCircle2 size={16} /> Aprovar Foto Oficial da Fachada
          </button>
        </div>
      </div>

      {/* Lightbox / Imagem Ampliada */}
      {expandedImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.88)',
            zIndex: 100001,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setExpandedImage(null)}
        >
          <button
            type="button"
            onClick={() => setExpandedImage(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={22} />
          </button>
          <img
            src={expandedImage}
            alt="Fachada em Alta Resolução"
            style={{ maxWidth: '92vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: '8px' }}
          />
        </div>
      )}

      {/* Modal de Confirmação com Justificativa */}
      {confirmAction && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            zIndex: 100000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              padding: '24px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 30px rgba(0,0,0,0.3)',
            }}
          >
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 12px 0', color: '#111827' }}>
              {confirmAction === 'APPROVE' ? 'Confirmar Aprovação da Fachada' : 'Confirmar Rejeição da Fotografia'}
            </h3>

            <p style={{ fontSize: '0.84rem', color: '#4B5563', margin: '0 0 16px 0', lineHeight: 1.45 }}>
              {confirmAction === 'APPROVE'
                ? 'A foto proposta se tornará a fotografia oficial compartilhada do condomínio. A imagem anterior será preservada no histórico.'
                : 'A foto proposta será rejeitada e a foto oficial vigente será mantida.'}
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                Justificativa Administrativa {confirmAction === 'REJECT' && <span style={{ color: '#DC2626' }}>*</span>}
              </label>
              <textarea
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder="Ex: Foto de excelente nitidez, enquadramento frontal perfeito e sem marcas comerciais."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.84rem',
                  resize: 'none',
                }}
              />
            </div>

            {errorMsg && (
              <div style={{ backgroundColor: '#FEF2F2', color: '#DC2626', padding: '8px 12px', borderRadius: '6px', fontSize: '0.80rem', marginBottom: '14px' }}>
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={submitting}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#F3F4F6',
                  color: '#4B5563',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleExecuteDecision}
                disabled={submitting}
                style={{
                  padding: '8px 18px',
                  backgroundColor: confirmAction === 'REJECT' ? '#DC2626' : '#1E4620',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                Confirmar Decisão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

