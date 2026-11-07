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
  RotateCcw,
  UserCheck,
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

  const [isOwner, setIsOwner] = useState<boolean>(true);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [isActiveShare, setIsActiveShare] = useState<boolean>(false);
  const [publicId, setPublicId] = useState<string | null>(initialPublicId);
  const [publicUrl, setPublicUrl] = useState<string>('');
  const [precision, setPrecision] = useState<'HIDDEN' | 'APPROXIMATE' | 'EXACT'>(initialPrecision);
  const [publicDTO, setPublicDTO] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canReactivate, setCanReactivate] = useState(false);

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
        setCanReactivate(false);

        const res = await fetch(endpoint);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.error || 'Não foi possível carregar status de compartilhamento.');
        }

        if (isMounted) {
          const ownerFlag = data.isOwner ?? true;
          setIsOwner(ownerFlag);
          setIsPublic(Boolean(data.isPublic));

          // Para o proprietário, a atividade é isPublic; para o parceiro, é data.isActive
          const activeFlag = ownerFlag ? Boolean(data.isPublic) : Boolean(data.isActive);
          setIsActiveShare(activeFlag);

          setPublicId(data.publicId || null);
          const resolvedUrl = data.publicUrl || (data.publicId ? `${window.location.origin}/p/imovel/${data.publicId}` : '');
          setPublicUrl(resolvedUrl);
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

  async function handlePublish(forceReactivate = false) {
    setLoading(true);
    setError(null);
    try {
      const payload: any = isOwner
        ? { action: 'publish', precision }
        : forceReactivate || canReactivate
        ? { action: 'reactivate' }
        : { action: 'publish' };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 409) {
        // Link individual existia e estava revogado; exige confirmação explícita
        setCanReactivate(true);
        setError('Este link individual foi desativado anteriormente. Confirme a reativação abaixo para voltar a compartilhar.');
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar compartilhamento.');
      }

      setIsOwner(data.isOwner ?? isOwner);
      setIsPublic(Boolean(data.isPublic));
      setIsActiveShare(Boolean(data.isActive ?? true));
      setPublicId(data.publicId);
      const fullUrl = data.publicUrl || `${window.location.origin}/p/imovel/${data.publicId}`;
      setPublicUrl(fullUrl);
      setPrecision(data.publicLocationPrecision || 'APPROXIMATE');
      if (data.publicDTO) setPublicDTO(data.publicDTO);
      setCanReactivate(false);

      if (onStatusChanged) {
        onStatusChanged(Boolean(data.isPublic), data.publicId);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke() {
    const confirmMessage = isOwner
      ? 'Deseja realmente desativar o link público deste anúncio? O endereço deixará de exibir as informações do imóvel.'
      : 'Deseja realmente desativar seu link individual de compartilhamento? Clientes que acessarem seu link verão a tela de indisponibilidade.';

    if (!confirm(confirmMessage)) {
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao desativar link.');
      }

      if (isOwner) {
        setIsPublic(false);
        setIsActiveShare(false);
      } else {
        setIsActiveShare(false);
      }

      if (data.publicDTO) setPublicDTO(data.publicDTO);
      if (onStatusChanged) onStatusChanged(false, publicId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePrecisionChange(newPrecision: 'HIDDEN' | 'APPROXIMATE' | 'EXACT') {
    if (!isOwner) return; // Somente o proprietário altera precisão

    setPrecision(newPrecision);
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
    isActiveShare && publicUrl && clientPhone
      ? getShareWithClientWhatsAppUrl(clientPhone, clientName, publicUrl)
      : null;

  const generalWhatsAppUrl =
    isActiveShare && publicUrl
      ? `https://api.whatsapp.com/send?text=${encodeURIComponent(
          `Olá! Separei este imóvel para você:\n${publicUrl}`
        )}`
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
                    backgroundColor: isOwner ? '#ECFDF5' : '#EFF6FF',
                    color: isOwner ? '#059669' : '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isOwner ? <Share2 size={18} /> : <UserCheck size={18} />}
                </div>
                <h2 style={{ fontSize: '1.18rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  {isOwner ? 'Apresentação Digital do Imóvel' : 'Meu Link de Apresentação'}
                </h2>
              </div>
              <p style={{ margin: '4px 0 0 40px', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                {isOwner
                  ? offerTitle
                  : 'Compartilhe este imóvel da rede com sua própria identidade profissional'}
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
                backgroundColor: canReactivate ? '#FEF3C7' : '#FEE2E2',
                border: `1px solid ${canReactivate ? '#FCD34D' : '#FCA5A5'}`,
                borderRadius: 'var(--radius-sm)',
                color: canReactivate ? '#92400E' : '#991B1B',
                fontSize: '0.84rem',
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div>{error}</div>
              {canReactivate && !isOwner && (
                <div>
                  <button
                    type="button"
                    onClick={() => handlePublish(true)}
                    disabled={loading}
                    className="btn-primary"
                    style={{
                      padding: '6px 14px',
                      fontSize: '0.8rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#D97706',
                    }}
                  >
                    <RotateCcw size={14} />
                    <span>Confirmar Reativação do Link</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* BLOCO 1: Status de Compartilhamento (Proprietário vs Parceiro)            */}
          {/* ========================================================================= */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: isActiveShare ? '#F0FDF4' : '#F8FAFC',
              border: `1px solid ${isActiveShare ? '#BBF7D0' : '#E2E8F0'}`,
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isActiveShare ? (
                <Globe size={22} color="#059669" />
              ) : (
                <Lock size={22} color="#64748B" />
              )}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '0.94rem', color: isActiveShare ? '#065F46' : '#334155' }}>
                    {isOwner
                      ? isPublic
                        ? 'Link de Apresentação Ativo'
                        : 'Imóvel Privado'
                      : isActiveShare
                      ? 'Seu Link Individual Está Ativo'
                      : 'Link Individual Desativado'}
                  </strong>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: isActiveShare ? '#DCFCE7' : '#E2E8F0',
                      color: isActiveShare ? '#166534' : '#475569',
                    }}
                  >
                    {isOwner
                      ? isPublic
                        ? 'PÚBLICO'
                        : 'INTERNO'
                      : isActiveShare
                      ? 'LINK ATIVO'
                      : 'INATIVO'}
                  </span>
                </div>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: isActiveShare ? '#047857' : '#64748B' }}>
                  {isOwner
                    ? isPublic
                      ? 'Qualquer cliente com este link pode visualizar a apresentação profissional.'
                      : 'Este imóvel não está acessível publicamente.'
                    : isActiveShare
                    ? 'Clientes que acessarem seu link verão seu nome, sua marca e seu WhatsApp.'
                    : 'Gere seu link individual para apresentar este imóvel da rede com sua identidade.'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {!isActiveShare ? (
                <button
                  type="button"
                  onClick={() => handlePublish(false)}
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
                  <span>
                    {loading
                      ? 'Processando...'
                      : isOwner
                      ? 'Criar Link Público'
                      : 'Gerar Meu Link'}
                  </span>
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
                  title={
                    isOwner
                      ? 'Desativa a visualização pública deste endereço'
                      : 'Desativa seu link individual de apresentação'
                  }
                >
                  {isOwner ? 'Desativar Link' : 'Desativar Meu Link'}
                </button>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BLOCO 2: Configuração de Localização (EXCLUSIVO PARA O PROPRIETÁRIO)      */}
          {/* ========================================================================= */}
          {isOwner ? (
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
          ) : (
            /* Aviso informativo discreto para o parceiro */
            <div
              style={{
                marginBottom: '18px',
                padding: '10px 14px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Globe size={16} color="#64748B" />
              <span>
                Localização definida pelo responsável original:{' '}
                <strong>
                  {precision === 'HIDDEN'
                    ? 'Oculta'
                    : precision === 'APPROXIMATE'
                    ? 'Aproximada (bairro e centroide)'
                    : 'Completa (endereço exato)'}
                </strong>
              </span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* BLOCO 3: Botão de Prévia Fiel                                             */}
          {/* ========================================================================= */}
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
                {isOwner ? 'Prévia da Apresentação' : 'Prévia com Sua Identidade'}
              </strong>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#6B7280' }}>
                {isOwner
                  ? 'Confira fotos, mapa, descrição e dados antes de enviar ao cliente.'
                  : 'Veja exatamente como seu cliente visualizará o imóvel e seus contatos.'}
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

          {/* ========================================================================= */}
          {/* BLOCO 4: Links de Compartilhamento (Ativo)                                */}
          {/* ========================================================================= */}
          {isActiveShare && (
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
                  {isOwner
                    ? 'Link de Apresentação Pública do Imóvel:'
                    : 'Seu Link Individual de Apresentação:'}
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
                      textDecoration: 'none',
                    }}
                    title="Abrir página pública em nova aba"
                  >
                    <ExternalLink size={15} />
                    <span>Abrir</span>
                  </a>
                </div>
              </div>

              {/* Opções de Envio via WhatsApp */}
              {clientPhone && clientShareUrl ? (
                /* Opção contextual com cliente pré-selecionado */
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
                      Mensagem pré-formatada pronta para envio direto.
                    </div>
                  </div>

                  <a
                    href={clientShareUrl}
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
              ) : generalWhatsAppUrl ? (
                /* Opção direta de compartilhamento no WhatsApp sem exigir cliente selecionado */
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: '#065F46' }}>
                      Enviar pelo WhatsApp
                    </strong>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#047857' }}>
                      Abre o WhatsApp com mensagem e link formatados para escolher a conversa.
                    </p>
                  </div>

                  <a
                    href={generalWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '9px 16px',
                      fontSize: '0.84rem',
                      backgroundColor: '#25D366',
                      color: 'white',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 6px rgba(37, 211, 102, 0.25)',
                    }}
                  >
                    <MessageCircle size={16} />
                    <span>Compartilhar no WhatsApp</span>
                  </a>
                </div>
              ) : null}
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
              🛡️ Matrícula, notas internas e dados privados <strong>nunca</strong> são expostos.
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
            onEditProperty={
              isOwner
                ? () => {
                    if (offerType === 'PROPERTY') {
                      router.push(`/imoveis/${offerId}/editar`);
                    } else {
                      router.push(`/empreendimentos`);
                    }
                  }
                : undefined
            }
          />
        </div>
      )}
    </>
  );
}
