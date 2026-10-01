'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  ShieldAlert,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Sparkles,
  Edit3,
} from 'lucide-react';
import { getShareWithClientWhatsAppUrl } from '@/lib/public-sharing';
import PublicPresentationView from './PublicPresentationView';

interface SharePropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  offerId: string;
  offerType?: 'PROPERTY' | 'TYPOLOGY';
  offerTitle: string;
  clientPhone?: string | null;
  clientName?: string | null;
  initialIsPublic?: boolean;
  initialPublicId?: string | null;
  initialPrecision?: 'HIDDEN' | 'APPROXIMATE' | 'EXACT';
  onStatusChanged?: (isPublic: boolean, publicId: string | null) => void;
}

export default function SharePropertyModal({
  isOpen,
  onClose,
  offerId,
  offerType = 'PROPERTY',
  offerTitle,
  clientPhone,
  clientName,
  initialIsPublic = false,
  initialPublicId = null,
  initialPrecision = 'APPROXIMATE',
  onStatusChanged,
}: SharePropertyModalProps) {
  const router = useRouter();

  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [publicId, setPublicId] = useState<string | null>(initialPublicId);
  const [publicUrl, setPublicUrl] = useState<string>('');
  const [precision, setPrecision] = useState<'HIDDEN' | 'APPROXIMATE' | 'EXACT'>(initialPrecision);
  const [publicDTO, setPublicDTO] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endpoint =
    offerType === 'TYPOLOGY'
      ? `/api/typologies/${offerId}/share`
      : `/api/properties/${offerId}/share`;

  // Carrega status mais recente do servidor ao abrir
  useEffect(() => {
    if (!isOpen || !offerId) return;

    let isMounted = true;
    async function loadShareStatus() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error('Não foi possível carregar status de compartilhamento.');
        const data = await res.json();
        if (isMounted) {
          setIsPublic(data.isPublic || false);
          setPublicId(data.publicId || null);
          setPublicUrl(data.publicUrl || (data.publicId ? `${window.location.origin}/p/imovel/${data.publicId}` : ''));
          setPrecision(data.publicLocationPrecision || 'APPROXIMATE');
          if (data.publicDTO) setPublicDTO(data.publicDTO);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadShareStatus();
    return () => {
      isMounted = false;
    };
  }, [isOpen, offerId, endpoint]);

  if (!isOpen) return null;

  async function handlePublish() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish', precision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao publicar link.');

      setIsPublic(true);
      setPublicId(data.publicId);
      const fullUrl = data.publicUrl || `${window.location.origin}/p/imovel/${data.publicId}`;
      setPublicUrl(fullUrl);
      setPrecision(data.publicLocationPrecision || 'APPROXIMATE');
      if (data.publicDTO) setPublicDTO(data.publicDTO);
      if (onStatusChanged) onStatusChanged(true, data.publicId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke() {
    if (
      !confirm(
        'Deseja realmente desativar o link público deste anúncio? O endereço anterior deixará de exibir as informações do imóvel.'
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao desativar link.');

      setIsPublic(false);
      if (data.publicDTO) setPublicDTO(data.publicDTO);
      if (onStatusChanged) onStatusChanged(false, publicId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePrecisionChange(newPrecision: 'HIDDEN' | 'APPROXIMATE' | 'EXACT') {
    setPrecision(newPrecision);
    // Atualiza localmente o DTO para refletir instantaneamente na prévia
    if (publicDTO) {
      setPublicDTO((prev: any) => ({
        ...prev,
        locationPrecision: newPrecision,
      }));
    }

    if (!isPublic) return;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_precision', precision: newPrecision }),
      });
      const data = await res.json();
      if (data.publicDTO) setPublicDTO(data.publicDTO);
    } catch (err) {
      console.error('Erro ao atualizar privacidade da localização:', err);
    }
  }

  function handleCopy() {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const clientFirstName = (clientName || 'Cliente').trim().split(' ')[0];

  const clientShareUrl =
    isPublic && publicUrl && clientPhone
      ? getShareWithClientWhatsAppUrl(clientPhone, clientName, publicUrl)
      : null;

  return (
    <>
      {/* Modal Principal de Compartilhamento */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          animation: 'fadeIn 0.2s ease',
        }}
        onClick={onClose}
      >
        <div
          className="card"
          style={{
            width: '100%',
            maxWidth: '580px',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: '24px',
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            position: 'relative',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '18px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#ECFDF5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Share2 size={18} />
                </div>
                <h2 style={{ fontSize: '1.18rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Apresentação Digital do Imóvel
                </h2>
              </div>
              <p style={{ margin: '4px 0 0 40px', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                {offerTitle}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '4px',
                borderRadius: '6px',
              }}
              aria-label="Fechar modal"
            >
              <X size={20} />
            </button>
          </div>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#FEE2E2',
                border: '1px solid #FCA5A5',
                borderRadius: 'var(--radius-sm)',
                color: '#991B1B',
                fontSize: '0.84rem',
                marginBottom: '16px',
              }}
            >
              {error}
            </div>
          )}

          {/* Estado de Publicação (Privado vs Público) */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: isPublic ? '#F0FDF4' : '#F8FAFC',
              border: `1px solid ${isPublic ? '#BBF7D0' : '#E2E8F0'}`,
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isPublic ? (
                <Globe size={22} color="#059669" />
              ) : (
                <Lock size={22} color="#64748B" />
              )}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '0.94rem', color: isPublic ? '#065F46' : '#334155' }}>
                    {isPublic ? 'Link de Apresentação Ativo' : 'Imóvel Privado'}
                  </strong>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: isPublic ? '#DCFCE7' : '#E2E8F0',
                      color: isPublic ? '#166534' : '#475569',
                    }}
                  >
                    {isPublic ? 'PÚBLICO' : 'INTERNO'}
                  </span>
                </div>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: isPublic ? '#047857' : '#64748B' }}>
                  {isPublic
                    ? 'Qualquer cliente com este link pode visualizar a apresentação profissional.'
                    : 'Este imóvel não está acessível publicamente.'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {!isPublic ? (
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={loading}
                  className="btn-primary"
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.84rem',
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Sparkles size={15} />
                  <span>{loading ? 'Criando...' : 'Criar Link Público'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRevoke}
                  disabled={loading}
                  style={{
                    padding: '7px 12px',
                    fontSize: '0.78rem',
                    color: '#991B1B',
                    backgroundColor: '#FEE2E2',
                    border: '1px solid #FECACA',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                  title="Desativa a visualização pública deste endereço"
                >
                  Desativar Link
                </button>
              )}
            </div>
          </div>

          {/* Configuração de Privacidade da Localização (Oculta, Aproximada, Completa) */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.84rem',
                fontWeight: 700,
                color: 'var(--text-main)',
                marginBottom: '8px',
              }}
            >
              Exibição da Localização na Apresentação:
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handlePrecisionChange('HIDDEN')}
                style={{
                  padding: '10px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1.5px solid ${precision === 'HIDDEN' ? '#059669' : 'var(--border-color)'}`,
                  backgroundColor: precision === 'HIDDEN' ? '#ECFDF5' : '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                <EyeOff
                  size={16}
                  color={precision === 'HIDDEN' ? '#059669' : 'var(--text-muted)'}
                  style={{ margin: '0 auto 4px auto' }}
                />
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: precision === 'HIDDEN' ? '#065F46' : 'var(--text-main)',
                  }}
                >
                  Oculta
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Apenas cidade, sem mapa
                </div>
              </button>

              <button
                type="button"
                onClick={() => handlePrecisionChange('APPROXIMATE')}
                style={{
                  padding: '10px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1.5px solid ${precision === 'APPROXIMATE' ? '#059669' : 'var(--border-color)'}`,
                  backgroundColor: precision === 'APPROXIMATE' ? '#ECFDF5' : '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                <Eye
                  size={16}
                  color={precision === 'APPROXIMATE' ? '#059669' : 'var(--text-muted)'}
                  style={{ margin: '0 auto 4px auto' }}
                />
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: precision === 'APPROXIMATE' ? '#065F46' : 'var(--text-main)',
                  }}
                >
                  Aproximada
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Bairro + mapa territorial
                </div>
              </button>

              <button
                type="button"
                onClick={() => handlePrecisionChange('EXACT')}
                style={{
                  padding: '10px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1.5px solid ${precision === 'EXACT' ? '#059669' : 'var(--border-color)'}`,
                  backgroundColor: precision === 'EXACT' ? '#ECFDF5' : '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                <ShieldAlert
                  size={16}
                  color={precision === 'EXACT' ? '#059669' : 'var(--text-muted)'}
                  style={{ margin: '0 auto 4px auto' }}
                />
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: precision === 'EXACT' ? '#065F46' : 'var(--text-main)',
                  }}
                >
                  Completa
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Endereço + pin exato
                </div>
              </button>
            </div>
          </div>

          {/* Botão de Prévia Fiel (Visível tanto antes quanto depois de publicar) */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#F8FAF9',
              border: '1px solid #E5E7EB',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div>
              <strong style={{ fontSize: '0.88rem', color: '#1F2937' }}>
                Prévia da Apresentação
              </strong>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#6B7280' }}>
                Confira fotos, mapa, descrição e dados antes de enviar ao cliente.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              disabled={!publicDTO}
              className="btn-secondary"
              style={{
                padding: '8px 14px',
                fontSize: '0.84rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0,
              }}
            >
              <Eye size={15} color="#059669" />
              <span>Ver Prévia</span>
            </button>
          </div>

          {/* Bloco de Compartilhamento (se público) */}
          {isPublic && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Campo de URL com Copiar e Abrir */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    marginBottom: '6px',
                  }}
                >
                  Endereço de Apresentação da Daiane Corrêa Imóveis:
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    readOnly
                    value={publicUrl}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      fontSize: '0.86rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: '#F8FAFC',
                      color: 'var(--text-main)',
                      fontFamily: 'monospace',
                    }}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />

                  <button
                    type="button"
                    onClick={handleCopy}
                    className="btn-secondary"
                    style={{
                      padding: '9px 14px',
                      fontSize: '0.84rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      minWidth: '95px',
                      justifyContent: 'center',
                    }}
                  >
                    {copied ? <Check size={15} color="#059669" /> : <Copy size={15} />}
                    <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                  </button>

                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                    style={{
                      padding: '9px 12px',
                      fontSize: '0.84rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="Abrir página pública em nova aba"
                  >
                    <ExternalLink size={15} />
                    <span>Abrir</span>
                  </a>
                </div>
              </div>

              {/* Ação Destacada de Envio ao Cliente via WhatsApp (se houver cliente contextual) */}
              {clientPhone && (
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #86EFAC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '0.76rem',
                        color: '#166534',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Compartilhar com Cliente
                    </div>
                    <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#065F46', marginTop: '2px' }}>
                      {clientName || 'Cliente'} — {clientPhone}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#047857', marginTop: '2px' }}>
                      Mensagem pré-formatada pronta para envio no WhatsApp.
                    </div>
                  </div>

                  <a
                    href={clientShareUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '10px 18px',
                      fontSize: '0.88rem',
                      backgroundColor: '#25D366',
                      color: 'white',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 800,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 6px rgba(37, 211, 102, 0.3)',
                    }}
                  >
                    <MessageCircle size={18} />
                    <span>Enviar para {clientFirstName}</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Rodapé explicativo de segurança */}
          <div
            style={{
              marginTop: '20px',
              paddingTop: '14px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
            }}
          >
            <span>
              🛡️ Matrícula, notas internas e delimitações privadas <strong>nunca</strong> são expostas.
            </span>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{ padding: '6px 14px', fontSize: '0.82rem' }}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Visualizador de Prévia Fiel em Tela Cheia */}
      {previewOpen && publicDTO && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#F8FAF9',
            zIndex: 100000,
            overflowY: 'auto',
          }}
        >
          <PublicPresentationView
            property={publicDTO}
            publicUrl={publicUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/p/imovel/${publicId || 'previa'}`}
            isPreview={true}
            onClosePreview={() => setPreviewOpen(false)}
            onEditProperty={() => {
              if (offerType === 'PROPERTY') {
                router.push(`/imoveis/${offerId}/editar`);
              } else {
                router.push(`/empreendimentos`);
              }
            }}
          />
        </div>
      )}
    </>
  );
}
