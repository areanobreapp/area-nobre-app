'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  AlertTriangle,
  UserCheck,
  Loader2,
  Building2,
} from 'lucide-react';
import { formatCurrencyBRL } from '@/lib/commercial-unit-format';

interface ShareCommercialUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: {
    id: string;
    unitCode: string;
    developmentId: string;
    listPrice?: number | null;
    promotionalPrice?: number | null;
    commercialStatus?: string | null;
  };
  developmentName?: string;
}

export default function ShareCommercialUnitModal({
  isOpen,
  onClose,
  unit,
  developmentName,
}: ShareCommercialUnitModalProps) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [publicUrl, setPublicUrl] = useState<string>('');
  const [suggestedMessage, setSuggestedMessage] = useState<string>('');
  const [broker, setBroker] = useState<any | null>(null);

  useEffect(() => {
    if (!isOpen || !unit.id) return;

    let isMounted = true;
    async function loadShareLink() {
      try {
        setLoading(true);
        setError(null);
        setCopied(false);

        const res = await fetch(`/api/commercial-units/${unit.id}/share`, {
          method: 'POST',
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Não foi possível gerar link de compartilhamento.');
        }

        if (isMounted) {
          setPublicUrl(data.publicUrl || '');
          setSuggestedMessage(data.suggestedClientMessage || '');
          setBroker(data.broker || null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Erro ao carregar dados de compartilhamento.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadShareLink();

    return () => {
      isMounted = false;
    };
  }, [isOpen, unit.id]);

  if (!isOpen) return null;

  const currentPrice =
    unit.promotionalPrice && unit.promotionalPrice > 0 ? unit.promotionalPrice : unit.listPrice;

  const formattedPrice = currentPrice ? formatCurrencyBRL(currentPrice) : 'Sob Consulta';

  // Em desenvolvimento local, sincroniza a origem com o window.location.origin da sessão ativa
  const effectivePublicUrl = React.useMemo(() => {
    if (!publicUrl) return '';
    if (typeof window !== 'undefined' && window.location?.origin) {
      try {
        const parsed = new URL(publicUrl);
        if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
          return `${window.location.origin}${parsed.pathname}${parsed.search}`;
        }
      } catch {
        // ignore
      }
    }
    return publicUrl;
  }, [publicUrl]);

  const effectiveSuggestedMessage = React.useMemo(() => {
    if (!effectivePublicUrl) return '';
    if (suggestedMessage && publicUrl && effectivePublicUrl !== publicUrl) {
      return suggestedMessage.replace(publicUrl, effectivePublicUrl);
    }
    return suggestedMessage || `Olá! Separei esta unidade comercial para você:\n${effectivePublicUrl}`;
  }, [suggestedMessage, publicUrl, effectivePublicUrl]);

  async function handleCopy() {
    if (!effectivePublicUrl) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(effectivePublicUrl);
      } else {
        const input = document.createElement('input');
        input.value = effectivePublicUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert('Não foi possível copiar o link automaticamente.');
    }
  }

  function handleShareWhatsApp() {
    if (!effectiveSuggestedMessage && !effectivePublicUrl) return;
    const msg = effectiveSuggestedMessage || `Olá! Separei esta unidade comercial para você:\n${effectivePublicUrl}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#DCFCE7',
                color: '#166534',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Share2 size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>
                Compartilhar Unidade
              </h3>
              <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748B' }}>
                Gere um link exclusivo com sua identificação profissional
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Card Resumo da Unidade */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#F1F5F9',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <Building2 size={20} color="#1E4620" style={{ flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: '#1E293B',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {developmentName ? `${developmentName} • ` : ''}Unidade {unit.unitCode}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                  Preço Vigente: <strong style={{ color: '#0F172A' }}>{formattedPrice}</strong>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: '#64748B' }}>
              <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 10px', color: '#1E4620' }} />
              <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Gerando link seguro de compartilhamento...</div>
            </div>
          ) : error ? (
            <div
              style={{
                padding: '14px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '8px',
                color: '#B91C1C',
                fontSize: '0.84rem',
              }}
            >
              <strong>Atenção:</strong> {error}
            </div>
          ) : (
            <>
              {/* Card de Identificação do Corretor */}
              {broker && (
                <div
                  style={{
                    padding: '12px 14px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        backgroundColor: '#1E4620',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.86rem',
                        fontWeight: 700,
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      {broker.avatarUrl ? (
                        <img
                          src={broker.avatarUrl}
                          alt={broker.commercialName}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        (broker.commercialName || broker.name || 'C')[0].toUpperCase()
                      )}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>
                          {broker.commercialName || broker.name}
                        </span>
                        <UserCheck size={14} color="#166534" />
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                        {broker.creci ? `CRECI: ${broker.creci} • ` : ''}
                        {broker.formattedPhone || 'Telefone não cadastrado'}
                      </div>
                    </div>
                  </div>

                  {!broker.hasWhatsApp && (
                    <div
                      style={{
                        marginTop: '4px',
                        padding: '8px 10px',
                        backgroundColor: '#FFFBEB',
                        border: '1px solid #FDE68A',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.76rem',
                        color: '#92400E',
                      }}
                    >
                      <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                      <span>
                        Seu perfil não possui número de WhatsApp válido cadastrado. Cadastre seu telefone no perfil profissional para que o botão de WhatsApp direto funcione na página do cliente.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Campo com Link Seguro */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Link público da unidade
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    value={effectivePublicUrl}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      fontSize: '0.84rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#F8FAFC',
                      color: '#0F172A',
                      outline: 'none',
                    }}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    id="btn-copiar-link-unidade"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '9px 14px',
                      backgroundColor: copied ? '#166534' : '#F1F5F9',
                      color: copied ? '#FFFFFF' : '#0F172A',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                    <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {/* Botões de Ação */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  id="btn-compartilhar-whatsapp"
                  onClick={handleShareWhatsApp}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '11px 16px',
                    backgroundColor: '#25D366',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.90rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  }}
                >
                  <MessageCircle size={18} />
                  <span>Enviar pelo WhatsApp</span>
                </button>

                <a
                  href={effectivePublicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="btn-visualizar-como-cliente"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '9px 14px',
                    backgroundColor: 'transparent',
                    color: '#1E4620',
                    border: '1px solid #1E4620',
                    borderRadius: '8px',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <ExternalLink size={15} />
                  <span>Visualizar como cliente</span>
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
