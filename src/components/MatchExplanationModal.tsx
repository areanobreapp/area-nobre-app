'use client';

import React from 'react';
import { X, CheckCircle2, AlertTriangle, XCircle, Info, Sparkles, Building2, Home, MessageCircle } from 'lucide-react';
import CircularMatchScore from './CircularMatchScore';
import { MatchExplanationItem } from '@/lib/matching/types';
import { getWhatsAppUrl } from '@/lib/whatsapp';

interface MatchExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  clientName?: string;
  clientPhone?: string | null;
  searchName?: string;
  offerTitle: string;
  offerType: 'PROPERTY' | 'TYPOLOGY' | string;
  stage?: string | null;
  price?: number;
  explanation: MatchExplanationItem[];
}

export default function MatchExplanationModal({
  isOpen,
  onClose,
  score,
  clientName,
  clientPhone,
  searchName,
  offerTitle,
  offerType,
  stage,
  price,
  explanation = [],
}: MatchExplanationModalProps) {
  if (!isOpen) return null;

  const whatsAppUrl = getWhatsAppUrl(clientPhone);
  const isTypology = offerType === 'TYPOLOGY';

  const positiveItems = explanation.filter((e) => e.status === 'positive');
  const warningItems = explanation.filter((e) => e.status === 'warning');
  const negativeItems = explanation.filter((e) => e.status === 'negative');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '540px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'white',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                backgroundColor: 'var(--color-primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Por que combina?
              </h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Diagnóstico determinístico de compatibilidade
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: 6,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Card Resumo do Match */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              padding: '16px 18px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'white',
              border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: isTypology ? '#ecfdf5' : '#f0f9ff',
                    color: isTypology ? '#065f46' : '#0369a1',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {isTypology ? <Building2 size={12} /> : <Home size={12} />}
                  {isTypology ? (stage || 'Em construção') : 'Pronto'}
                </span>
                {clientName && (
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Para <strong>{clientName}</strong>
                  </span>
                )}
              </div>

              <h3
                style={{
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {offerTitle}
              </h3>

              {price !== undefined && (
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: 2 }}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(price)}
                </div>
              )}
            </div>

            <CircularMatchScore score={score} size={64} strokeWidth={6} showLabel={false} />
          </div>

          {/* Lista de Fatores */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Critérios Avaliados ({explanation.length})
            </div>

            {explanation.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Nenhum detalhe disponível para este match.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* 1. Pontos Positivos */}
                {positiveItems.map((item, idx) => (
                  <div
                    key={`pos-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                    }}
                  >
                    <CheckCircle2 size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#166534' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#15803d', marginTop: 1 }}>
                        {item.detail}
                      </div>
                    </div>
                  </div>
                ))}

                {/* 2. Pontos de Atenção / Tolerâncias */}
                {warningItems.map((item, idx) => (
                  <div
                    key={`warn-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: '#fffbeb',
                      border: '1px solid #fde68a',
                    }}
                  >
                    <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#92400e' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#b45309', marginTop: 1 }}>
                        {item.detail}
                      </div>
                    </div>
                  </div>
                ))}

                {/* 3. Incompatibilidades */}
                {negativeItems.map((item, idx) => (
                  <div
                    key={`neg-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                    }}
                  >
                    <XCircle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#991b1b' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#b91c1c', marginTop: 1 }}>
                        {item.detail}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
            }}
          >
            <Info size={16} style={{ flexShrink: 0 }} />
            <span>
              Algoritmo determinístico da Área Nobre: sem inteligência artificial opaca, cruzando dados reais de localização, valor, dormitórios, vagas e área.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: whatsAppUrl ? 'space-between' : 'flex-end',
            backgroundColor: 'var(--bg-subtle)',
            gap: '12px',
          }}
        >
          {whatsAppUrl && (
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: '#25D366',
                color: 'white',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.86rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 2px 6px rgba(37, 211, 102, 0.3)',
              }}
              title="Iniciar conversa no WhatsApp com o cliente"
            >
              <MessageCircle size={15} />
              <span>WhatsApp com Cliente</span>
            </a>
          )}

          <button
            onClick={onClose}
            className="btn-primary"
            style={{ padding: '8px 20px', fontSize: '0.88rem' }}
          >
            Fechar Diagnóstico
          </button>
        </div>
      </div>
    </div>
  );
}
