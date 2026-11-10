'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  MapPin,
  Building2,
  DollarSign,
  Maximize2,
  Bed,
  Bath,
  Car,
  Zap,
  CheckCircle,
  Share2,
  Image as ImageIcon,
  User,
  Sparkles,
  HelpCircle,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Pentagon,
  MessageCircle,
  Users,
  X,
  Lock,
  Scale,
  Clock,
  ArrowRight,
} from 'lucide-react';
import CircularMatchScore from '@/components/CircularMatchScore';
import { PropertyIndividualFeaturesGrid } from '@/components/PropertyFeaturesDisplay';
import dynamic from 'next/dynamic';
import MatchExplanationModal from '@/components/MatchExplanationModal';
import SharePropertyModal from '@/components/SharePropertyModal';
import { getWhatsAppUrl } from '@/lib/whatsapp';

const PropertyDetailMap = dynamic(() => import('@/components/PropertyDetailMap'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100%',
        height: '360px',
        backgroundColor: '#F3F4F6',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.9rem',
      }}
    >
      Carregando mapa...
    </div>
  ),
});

export default function ImovelDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const searchParams = useSearchParams();
  const newMatches = searchParams.get('newMatches');

  const [property, setProperty] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [targetShareClient, setTargetShareClient] = useState<{ name: string; phone: string } | null>(null);

  // Modais de Preço Compartilhado e Revisão (F2.B05.3G.1 e F2.B05.3G.2)
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [newSharedPrice, setNewSharedPrice] = useState('');
  const [priceChangeReason, setPriceChangeReason] = useState('');
  const [submittingPrice, setSubmittingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [proposedPrice, setProposedPrice] = useState('');
  const [revisionJustification, setRevisionJustification] = useState('');
  const [submittingRevision, setSubmittingRevision] = useState(false);
  const [revisionError, setRevisionError] = useState<string | null>(null);

  // Estados de Revisões de Preço e Contestações (F2.B05.3G.2)
  const [revisions, setRevisions] = useState<any[]>([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);

  const [acceptingRevision, setAcceptingRevision] = useState<any | null>(null);
  const [acceptingSubmitting, setAcceptingSubmitting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const [rejectingRevision, setRejectingRevision] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingSubmitting, setRejectingSubmitting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  const [disputingRevision, setDisputingRevision] = useState<any | null>(null);
  const [disputeJustification, setDisputeJustification] = useState('');
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);

  async function loadRevisions() {
    setLoadingRevisions(true);
    try {
      const res = await fetch(`/api/properties/${id}/price-revisions`);
      if (res.ok) {
        const data = await res.json();
        setRevisions(data.requests || []);
      }
    } catch (err) {
      console.error('Erro ao buscar revisões de preço:', err);
    } finally {
      setLoadingRevisions(false);
    }
  }

  async function handleUpdateSharedPrice() {
    setPriceError(null);
    if (!newSharedPrice || Number(newSharedPrice) <= 0) {
      setPriceError('Informe um valor válido maior que zero.');
      return;
    }

    setSubmittingPrice(true);
    try {
      const res = await fetch(`/api/properties/${id}/price`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price: Number(newSharedPrice),
          reason: priceChangeReason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao atualizar preço compartilhado.');
      }

      setShowPriceModal(false);
      // Recarrega propriedade
      const updatedRes = await fetch(`/api/properties/${id}`);
      if (updatedRes.ok) {
        const updatedData = await updatedRes.json();
        setProperty(updatedData.property);
      }
      alert('Preço compartilhado atualizado com sucesso para todos os anúncios ativos vinculados!');
    } catch (err: any) {
      setPriceError(err.message || 'Falha ao atualizar preço compartilhado.');
    } finally {
      setSubmittingPrice(false);
    }
  }

  async function handleSubmitPriceRevision() {
    setRevisionError(null);
    if (!proposedPrice || Number(proposedPrice) <= 0) {
      setRevisionError('Informe um valor proposto válido maior que zero.');
      return;
    }
    if (!revisionJustification.trim()) {
      setRevisionError('Informe a justificativa da solicitação.');
      return;
    }

    setSubmittingRevision(true);
    try {
      const res = await fetch(`/api/properties/${id}/price-revisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestedPrice: Number(proposedPrice),
          proposedPrice: Number(proposedPrice),
          justification: revisionJustification.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao enviar solicitação de revisão.');
      }

      setShowRevisionModal(false);
      await loadRevisions();
      alert('Solicitação de revisão de preço enviada com sucesso ao corretor do Anúncio Principal!');
    } catch (err: any) {
      setRevisionError(err.message || 'Falha ao enviar solicitação.');
    } finally {
      setSubmittingRevision(false);
    }
  }

  async function handleAcceptRevision() {
    if (!acceptingRevision) return;
    setAcceptingSubmitting(true);
    setAcceptError(null);
    try {
      const res = await fetch(`/api/price-revisions/${acceptingRevision.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'STALE_PRICE') {
          throw new Error('O preço compartilhado foi modificado recentemente. Atualize a página antes de confirmar o aceite.');
        }
        if (data.code === 'UNAUTHORIZED_NOT_PRIMARY') {
          throw new Error('Você não detém mais a condição de Anúncio Principal deste imóvel.');
        }
        throw new Error(data.error || 'Erro ao aceitar solicitação de revisão.');
      }

      setAcceptingRevision(null);
      // Recarrega propriedade e revisões
      const updatedRes = await fetch(`/api/properties/${id}`);
      if (updatedRes.ok) {
        const updatedData = await updatedRes.json();
        setProperty(updatedData.property);
      }
      await loadRevisions();
      alert(`Preço compartilhado atualizado com sucesso para R$ ${Number(data.updatedPrice || acceptingRevision.suggestedPrice).toLocaleString('pt-BR')} em todos os anúncios vinculados!`);
    } catch (err: any) {
      setAcceptError(err.message || 'Falha ao aceitar revisão.');
    } finally {
      setAcceptingSubmitting(false);
    }
  }

  async function handleRejectRevision() {
    if (!rejectingRevision) return;
    if (!rejectReason.trim()) {
      setRejectError('Informe obrigatoriamente a justificativa para a recusa.');
      return;
    }

    setRejectingSubmitting(true);
    setRejectError(null);
    try {
      const res = await fetch(`/api/price-revisions/${rejectingRevision.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisionReason: rejectReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao registrar recusa.');
      }

      setRejectingRevision(null);
      await loadRevisions();
      alert('Solicitação de revisão recusada com sucesso.');
    } catch (err: any) {
      setRejectError(err.message || 'Falha ao registrar recusa.');
    } finally {
      setRejectingSubmitting(false);
    }
  }

  async function handleDisputeRevision() {
    if (!disputingRevision) return;
    setDisputeSubmitting(true);
    setDisputeError(null);
    try {
      const res = await fetch(`/api/price-revisions/${disputingRevision.id}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ justification: disputeJustification.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao encaminhar contestação administrativa.');
      }

      setDisputingRevision(null);
      await loadRevisions();
      alert('Contestação administrativa encaminhada com sucesso à gestão do Área Nobre! Não há suspensão de anúncios.');
    } catch (err: any) {
      setDisputeError(err.message || 'Falha ao abrir contestação.');
    } finally {
      setDisputeSubmitting(false);
    }
  }

  useEffect(() => {
    async function loadProperty() {
      try {
        const res = await fetch(`/api/properties/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao carregar imóvel.');
        setProperty(data.property);
        setIsOwner(data.isOwner ?? true);
        if (data.property?.physicalPropertyId) {
          loadRevisions();
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadProperty();
  }, [id]);

  async function handleToggleStatus(newStatus: string) {
    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProperty(data.property);
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status.');
    }
  }

  async function handleDelete() {
    if (!confirm('Deseja realmente excluir este imóvel permanentemente?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/properties/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push('/imoveis');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir imóvel.');
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        Carregando informações do imóvel...
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Imóvel não encontrado</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>{error || 'O imóvel solicitado não existe ou foi removido.'}</p>
        <Link href="/imoveis" className="btn-primary">
          Voltar para Imóveis
        </Link>
      </div>
    );
  }

  const images = property.images || [];
  const currentPhoto = images[activePhotoIndex]?.url || images[0]?.url || null;

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Banner de Oportunidade Revelada (Fase 5 — Requisito 9) */}
      {newMatches && Number(newMatches) > 0 && (
        <div
          style={{
            backgroundColor: '#ECFDF5',
            border: '1.5px solid #6EE7B7',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.12)',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={22} color="#059669" />
            <div>
              <strong style={{ color: '#065F46', fontSize: '0.96rem' }}>
                Oportunidade revelada!
              </strong>
              <p style={{ margin: '2px 0 0 0', color: '#047857', fontSize: '0.84rem' }}>
                Encontramos <strong>{newMatches}</strong> {Number(newMatches) === 1 ? 'busca compatível' : 'buscas compatíveis'} com este imóvel na sua carteira.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              document.getElementById('secao-buscas-compativeis')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.82rem' }}
          >
            Ver buscas compatíveis
          </button>
        </div>
      )}

      {/* Barra Superior de Navegação */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link
          href="/imoveis"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-secondary)',
            fontSize: '0.88rem',
          }}
        >
          <ArrowLeft size={16} />
          <span>Voltar para lista de imóveis</span>
        </Link>

        {isOwner ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => {
                setTargetShareClient(null);
                setShareModalOpen(true);
              }}
              className="btn-secondary"
              style={{
                padding: '8px 14px',
                fontSize: '0.86rem',
                color: property.isPublic ? '#065F46' : 'var(--text-main)',
                backgroundColor: property.isPublic ? '#ECFDF5' : undefined,
                borderColor: property.isPublic ? '#A7F3D0' : undefined,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Share2 size={15} />
              <span>{property.isPublic ? 'Compartilhado' : 'Compartilhar'}</span>
            </button>
            <Link href={`/imoveis/${id}/editar`} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.86rem' }}>
              <Edit3 size={15} />
              <span>Editar</span>
            </Link>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.86rem', color: 'var(--color-danger)' }}
            >
              <Trash2 size={15} />
              <span>{deleting ? 'Excluindo...' : 'Excluir'}</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: '#EEF2FF',
                color: '#4338CA',
                border: '1px solid #E0E7FF',
                fontSize: '0.84rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>Imóvel de {property.responsibleBroker?.profile?.commercialName || property.responsibleBroker?.name || 'outro corretor'}</span>
            </span>

            {/* Ação de Compartilhamento para Corretor Parceiro (Ponto 21) */}
            {property.isPublic && property.status === 'Disponível' && (
              <button
                type="button"
                onClick={() => {
                  setTargetShareClient(null);
                  setShareModalOpen(true);
                }}
                className="btn-primary"
                style={{
                  padding: '8px 16px',
                  fontSize: '0.86rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                title="Apresentar este imóvel da rede com a sua identidade profissional"
              >
                <Share2 size={15} />
                <span>Compartilhar</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Galeria de Fotos */}
      <div className="card" style={{ padding: '16px', overflow: 'hidden' }}>
        {currentPhoto ? (
          <div>
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '380px',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                backgroundColor: '#F3F4F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={currentPhoto}
                alt={property.title}
                style={{ maxWidth: '100%', maxHeight: '100%', width: '100%', height: '100%', objectFit: 'contain' }}
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: 12,
                  left: 12,
                  backgroundColor: 'rgba(0,0,0,0.65)',
                  color: 'white',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                Foto {activePhotoIndex + 1} de {images.length}
              </span>
            </div>

            {/* Miniaturas */}
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
                {images.map((img: any, idx: number) => (
                  <button
                    key={img.id || idx}
                    type="button"
                    onClick={() => setActivePhotoIndex(idx)}
                    style={{
                      width: '72px',
                      height: '56px',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      backgroundColor: '#F3F4F6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: idx === activePhotoIndex ? '2px solid var(--color-primary)' : '1px solid var(--border-light)',
                      padding: 0,
                      cursor: 'pointer',
                      flexShrink: 0,
                      opacity: idx === activePhotoIndex ? 1 : 0.65,
                      transition: 'opacity var(--transition-fast)',
                    }}
                  >
                    <img src={img.url} alt={`Miniatura ${idx + 1}`} style={{ maxWidth: '100%', maxHeight: '100%', width: '100%', height: '100%', objectFit: 'contain' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              height: '240px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              gap: '8px',
            }}
          >
            <ImageIcon size={36} color="var(--text-light)" />
            <span style={{ fontSize: '0.9rem' }}>Nenhuma foto cadastrada</span>
            <Link href={`/imoveis/${id}/editar`} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              Adicionar fotos
            </Link>
          </div>
        )}
      </div>

      {/* Cabeçalho do Imóvel e Preço */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className={`badge ${property.status === 'Disponível' ? 'badge-success' : 'badge-neutral'}`}>
                {property.status}
              </span>
              {isOwner && property.authorizationState && (
                property.authorizationState.allowed ? (
                  property.authorizationState.isLegacy ? (
                    <span className="badge" style={{ backgroundColor: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE' }} title="Imóvel anterior à regra de autorização formal">
                      ✓ Imóvel Histórico
                    </span>
                  ) : (
                    <span className="badge" style={{ backgroundColor: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0' }} title="Autorização do proprietário confirmada">
                      ✓ Autorização Confirmada
                    </span>
                  )
                ) : (
                  <span className="badge" style={{ backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5' }} title={property.authorizationState.reason || 'Autorização necessária'}>
                    {property.authorizationState.reason?.includes('revogada') ? '🚫 Autorização Revogada' : '⚠️ Autorização Pendente'}
                  </span>
                )
              )}
              <span className="badge badge-primary">{property.propertyType}</span>
              <span className="badge badge-neutral">{property.purpose}</span>
              {property.acceptsExchange && (
                <span className="badge" style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>
                  Aceita Permuta
                </span>
              )}
              {property.isRegistered && (
                <span className="badge" style={{ backgroundColor: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}>
                  Averbada
                </span>
              )}
              {property.isCorner && (
                <span className="badge" style={{ backgroundColor: '#F3E8FF', color: '#6B21A8', border: '1px solid #E9D5FF' }}>
                  Esquina
                </span>
              )}
              {property.inGatedCommunity && (
                <span className="badge" style={{ backgroundColor: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE' }}>
                  Em Condomínio
                </span>
              )}
              {property.isPenthouse && (
                <span className="badge" style={{ backgroundColor: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A' }}>
                  Cobertura
                </span>
              )}
              {property.floor && (
                <span className="badge badge-neutral">
                  {property.floor}º Andar
                </span>
              )}
              {property.internalCode && (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Código: {property.internalCode}
                </span>
              )}
              {property.physicalPropertyId && (
                property.isPrimaryListing ? (
                  <span className="badge" style={{ backgroundColor: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0', fontWeight: 700 }} title="Anúncio Principal do imóvel físico">
                    ⭐ Anúncio Principal
                  </span>
                ) : (
                  <span className="badge" style={{ backgroundColor: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE', fontWeight: 700 }} title="Anúncio Secundário vinculado a imóvel compartilhado">
                    👥 Anúncio Secundário
                  </span>
                )
              )}
              {property.physicalProperty?.activeListingsCount !== undefined && (
                <span className="badge badge-neutral" title="Ocupação das 3 vagas deste imóvel físico">
                  {property.physicalProperty.activeListingsCount} de 3 vagas
                </span>
              )}
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {property.title}
            </h1>
            {property.building && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '8px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', fontSize: '0.84rem', fontWeight: 700, marginTop: '4px', marginBottom: '4px' }}>
                <Building2 size={15} />
                <span>Edifício {property.building.name}</span>
                {property.physicalProperty?.unit?.unitNumber && (
                  <span style={{ color: '#4B5563', fontWeight: 600 }}>
                    • Unidade {property.physicalProperty.unit.unitNumber}
                    {property.physicalProperty.unit.tower ? ` (${property.physicalProperty.unit.tower})` : ''}
                  </span>
                )}
              </div>
            )}
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
              <MapPin size={16} color="var(--color-primary)" />
              {property.address ? `${property.address}, ${property.number || 'S/N'} — ` : ''}
              {property.neighborhood ? `${property.neighborhood}, ` : ''}{property.city || ''} {property.state ? `- ${property.state}` : ''}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              {property.physicalProperty?.sharedPrice ? 'Preço Único Compartilhado' : `Valor para ${property.purpose}`}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>
              R$ {property.price.toLocaleString('pt-BR')}
            </div>
            {property.physicalProperty?.priceUpdatedAt && (
              <div style={{ fontSize: '0.74rem', color: '#6B7280', marginTop: '2px' }}>
                Atualizado em {new Date(property.physicalProperty.priceUpdatedAt).toLocaleDateString('pt-BR')} às {new Date(property.physicalProperty.priceUpdatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
            {isOwner && property.physicalPropertyId && (
              <div style={{ marginTop: '8px' }}>
                {property.isPrimaryListing ? (
                  <button
                    type="button"
                    onClick={() => {
                      setNewSharedPrice(String(property.price));
                      setPriceChangeReason('');
                      setPriceError(null);
                      setShowPriceModal(true);
                    }}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Edit3 size={13} />
                    <span>Alterar Preço Compartilhado</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setProposedPrice('');
                      setRevisionJustification('');
                      setRevisionError(null);
                      setShowRevisionModal(true);
                    }}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <DollarSign size={13} />
                    <span>Solicitar Revisão de Preço</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Indicador de Matches da Carteira */}
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: 'var(--color-primary-light)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-primary-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={20} color="var(--color-primary)" />
            <span style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--color-primary)' }}>
              {property.matches?.length || 0} busca(s) compatível(is) encontrada(s)
            </span>
          </div>

          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Cruzamento determinístico em tempo real com clientes ativos da carteira.
          </span>
        </div>

        {/* Grade de Características Individuais */}
        <PropertyIndividualFeaturesGrid property={property} />

        {/* Comodidades & Características Adicionais (Fase 5.0.1) */}
        {(() => {
          const amenities: { label: string; value: string; present: boolean }[] = [];
          if (property.hasPool === true) amenities.push({ label: 'Piscina', value: 'Sim', present: true });
          if (property.hasGym === true) amenities.push({ label: 'Academia', value: 'Sim', present: true });
          if (property.hasBarbecue === true) amenities.push({ label: 'Churrasqueira', value: 'Sim', present: true });
          if (property.hasPartyHall === true) amenities.push({ label: 'Salão de Festas', value: 'Sim', present: true });
          if (property.hasElevator === true) amenities.push({ label: 'Elevador', value: 'Sim', present: true });
          if (property.hasPetSpace === true) amenities.push({ label: 'Espaço Pet', value: 'Sim', present: true });
          if (property.furniture) amenities.push({ label: 'Mobília', value: property.furniture, present: true });
          if (property.commercialType) amenities.push({ label: 'Tipo Comercial', value: property.commercialType, present: true });
          if (property.streetPaving) amenities.push({ label: 'Pavimentação', value: property.streetPaving, present: true });

          if (amenities.length === 0 && !property.exchangeNotes && !property.registryNumber) return null;

          return (
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Comodidades & Opcionais
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {amenities.map((a, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-light)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <CheckCircle size={14} color="var(--color-primary)" />
                    <span>{a.label}: <strong>{a.value}</strong></span>
                  </span>
                ))}
              </div>
              {property.exchangeNotes && (
                <div style={{ fontSize: '0.84rem', color: '#92400E', backgroundColor: '#FEF3C7', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid #FDE68A', marginTop: '4px' }}>
                  <strong>Detalhes da permuta:</strong> {property.exchangeNotes}
                </div>
              )}
              {property.registryNumber && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Matrícula imobiliária: <strong>{property.registryNumber}</strong>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Bloco de Identidade Física e Corretores Vinculados */}
      {property.physicalPropertyId && (
        <div
          className="card"
          style={{
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} color="var(--color-primary)" />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Identidade Física do Imóvel & Corretores Vinculados
              </h2>
            </div>
            <span style={{ fontSize: '0.76rem', padding: '3px 10px', borderRadius: '12px', backgroundColor: '#E0F2FE', color: '#0369A1', fontWeight: 700 }}>
              {property.physicalProperty?.activeListingsCount || 1} de 3 vagas preenchidas
            </span>
          </div>

          <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Este imóvel físico possui capacidade máxima de 3 corretores e preço de venda compartilhado unificado (R$ {property.price.toLocaleString('pt-BR')}).
          </p>

          {property.physicalProperty?.listings && property.physicalProperty.listings.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Corretores com anúncios ativos nesta unidade:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {property.physicalProperty.listings.map((l: any) => {
                  const isCurrentListing = l.id === property.id;
                  const brokerName = l.responsibleBroker?.name || l.user?.name || 'Corretor';
                  const commercialName = l.responsibleBroker?.profile?.commercialName || l.user?.profile?.commercialName;
                  const creci = l.responsibleBroker?.profile?.creci || l.user?.profile?.creci;

                  return (
                    <div
                      key={l.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: isCurrentListing ? '#F0FDF4' : 'var(--bg-subtle)',
                        border: isCurrentListing ? '1px solid #BBF7D0' : '1px solid var(--border-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            backgroundColor: l.isPrimaryListing ? '#DCFCE7' : '#F1F5F9',
                            color: l.isPrimaryListing ? '#166534' : '#475569',
                            fontWeight: 700,
                          }}
                        >
                          Vaga {l.listingSlot || (l.isPrimaryListing ? 1 : 2)} {l.isPrimaryListing ? '• Anúncio Principal' : '• Anúncio Secundário'}
                        </span>
                        <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {brokerName}
                          {commercialName && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> ({commercialName})</span>}
                        </span>
                        {creci && (
                          <span style={{ fontSize: '0.76rem', color: 'var(--text-light)' }}>
                            CRECI: {creci}
                          </span>
                        )}
                      </div>

                      {isCurrentListing ? (
                        <span style={{ fontSize: '0.76rem', color: '#15803D', fontWeight: 700 }}>
                          (Seu anúncio)
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          Anúncio Ativo
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bloco de Gestão de Revisões de Preço Compartilhado (F2.B05.3G.2) */}
      {property.physicalPropertyId && isOwner && (
        <div
          className="card"
          style={{
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign size={18} color="var(--color-primary)" />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {property.isPrimaryListing
                  ? 'Solicitações de Revisão de Preço Recebidas'
                  : 'Minhas Solicitações de Revisão de Preço'}
              </h2>
            </div>

            {!property.isPrimaryListing && (
              <button
                type="button"
                onClick={() => {
                  setProposedPrice('');
                  setRevisionJustification('');
                  setRevisionError(null);
                  setShowRevisionModal(true);
                }}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <DollarSign size={13} />
                <span>Nova Solicitação</span>
              </button>
            )}
          </div>

          <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            {property.isPrimaryListing
              ? 'Como corretor do Anúncio Principal, você avalia propostas de alteração de preço enviadas por outros corretores vinculados a este imóvel físico.'
              : 'Você pode solicitar a alteração do preço compartilhado ao corretor do Anúncio Principal. Em caso de recusa, é possível encaminhar uma contestação administrativa à Área Nobre.'}
          </p>

          {loadingRevisions ? (
            <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', padding: '12px 0' }}>
              Carregando histórico de revisões...
            </div>
          ) : revisions.length === 0 ? (
            <div style={{ padding: '16px', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', fontSize: '0.84rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              {property.isPrimaryListing
                ? 'Nenhuma solicitação de revisão recebida para esta unidade até o momento.'
                : 'Nenhuma solicitação de revisão enviada por você para esta unidade.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {revisions.map((rev) => {
                const isPending = rev.status === 'PENDING';
                const isAccepted = rev.status === 'APPROVED' || rev.status === 'ACCEPTED';
                const isRejected = rev.status === 'REJECTED';
                const isDisputed = rev.status === 'ESCALATED' || rev.status === 'DISPUTED';

                return (
                  <div
                    key={rev.id}
                    style={{
                      padding: '14px',
                      borderRadius: '8px',
                      border: isPending ? '1.5px solid #FCD34D' : '1px solid var(--border-light)',
                      backgroundColor: isPending ? '#FFFBEB' : 'var(--bg-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {isPending && (
                          <span className="badge" style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', fontWeight: 800 }}>
                            ⏳ Aguardando Decisão
                          </span>
                        )}
                        {isAccepted && (
                          <span className="badge" style={{ backgroundColor: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0', fontWeight: 800 }}>
                            ✓ Preço Homologado
                          </span>
                        )}
                        {isRejected && (
                          <span className="badge" style={{ backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5', fontWeight: 800 }}>
                            ✗ Recusada
                          </span>
                        )}
                        {isDisputed && (
                          <span className="badge" style={{ backgroundColor: '#F3E8FF', color: '#6B21A8', border: '1px solid #E9D5FF', fontWeight: 800 }}>
                            ⚖️ Em Arbitragem Administrativa
                          </span>
                        )}

                        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} />
                          {new Date(rev.createdAt).toLocaleDateString('pt-BR')} às {new Date(rev.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Ações para o Corretor Principal */}
                      {property.isPrimaryListing && isPending && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingRevision(rev);
                              setRejectReason('');
                              setRejectError(null);
                            }}
                            className="btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.76rem', color: '#991B1B' }}
                          >
                            Recusar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAcceptingRevision(rev);
                              setAcceptError(null);
                            }}
                            className="btn-primary"
                            style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                          >
                            Aceitar
                          </button>
                        </div>
                      )}

                      {/* Ação para o Corretor Secundário quando recusada */}
                      {!property.isPrimaryListing && isRejected && !isDisputed && (
                        <button
                          type="button"
                          onClick={() => {
                            setDisputingRevision(rev);
                            setDisputeJustification('');
                            setDisputeError(null);
                          }}
                          className="btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#6B21A8', backgroundColor: '#FAF5FF', borderColor: '#E9D5FF' }}
                        >
                          <Scale size={12} />
                          <span>Contestar Administrativamente</span>
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                        Preço atual: <strong>R$ {rev.currentPrice.toLocaleString('pt-BR')}</strong>
                      </div>
                      <ArrowRight size={14} color="var(--text-muted)" />
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                        Preço proposto: R$ {rev.suggestedPrice.toLocaleString('pt-BR')}
                      </div>
                      {property.isPrimaryListing && rev.requestingBroker && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                          Por: <strong>{rev.requestingBroker.name}</strong>
                          {rev.requestingBroker.profile?.creci && ` (CRECI ${rev.requestingBroker.profile.creci})`}
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', backgroundColor: '#FFFFFF', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                      <strong>Justificativa:</strong> {rev.justification}
                    </div>

                    {isRejected && rev.decisionReason && (
                      <div style={{ fontSize: '0.82rem', color: '#991B1B', backgroundColor: '#FEF2F2', padding: '8px 12px', borderRadius: '6px', border: '1px solid #FCA5A5' }}>
                        <strong>Motivo da Recusa:</strong> {rev.decisionReason}
                        {rev.decidedAt && (
                          <span style={{ fontSize: '0.74rem', color: '#6B7280', display: 'block', marginTop: '2px' }}>
                            Registrado em {new Date(rev.decidedAt).toLocaleDateString('pt-BR')} às {new Date(rev.decidedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Descrição e Detalhes */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Descrição</h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
            {property.description || 'Nenhuma descrição detalhada informada.'}
          </p>
        </div>

        {property.internalNotes && (
          <div style={{ padding: '14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-primary)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Observações Internas do Corretor
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              {property.internalNotes}
            </p>
          </div>
        )}
      </div>

      {/* Localização do Imóvel no Mapa (Etapa 3C / Ponto 12) */}
      <PropertyDetailMap
        latitude={property.latitude}
        longitude={property.longitude}
        boundary={property.boundary}
        boundaryArea={property.boundaryArea}
        title={property.title}
        propertyType={property.propertyType}
        address={property.address}
        number={property.number}
        neighborhood={property.neighborhood}
        city={property.city}
        state={property.state}
        propertyId={property.id}
        isOwner={isOwner}
      />

      {/* Seção de Buscas Compatíveis da Carteira — Fluxo Inverso (Fase 5 — Requisito 8) */}
      <div id="secao-buscas-compativeis" className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} color="var(--color-primary)" />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                Quem está procurando algo parecido com este imóvel?
              </h2>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  backgroundColor: 'var(--color-primary-light)',
                  color: 'var(--color-primary)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                {property.matches?.length || 0} demanda(s)
              </span>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Buscas compatíveis na sua carteira • Cruzamento determinístico de demanda
            </p>
          </div>
        </div>

        {(!property.matches || property.matches.length === 0) ? (
          <div
            style={{
              padding: '28px 16px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border-light)',
            }}
          >
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0 }}>
              Nenhum cliente cadastrado está procurando um imóvel com este perfil no momento.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {property.matches.map((m: any) => {
              const client = m.search?.client;
              const topBadges = (m.parsedExplanation || []).slice(0, 3);

              return (
                <div
                  key={m.id}
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: 'var(--bg-surface)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <CircularMatchScore score={m.score} size={54} strokeWidth={5} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.98rem' }}>
                          {client?.name || 'Cliente sem nome'}
                        </span>
                        {client?.phone && (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            • {client.phone}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Busca: <strong>{m.search?.title || 'Perfil sem título'}</strong>
                        {m.search?.targetNeighborhoods && ` em ${m.search.targetNeighborhoods}`}
                      </div>

                      {topBadges.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                          {topBadges.map((badge: string, bIdx: number) => (
                            <span
                              key={bIdx}
                              style={{
                                fontSize: '0.74rem',
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'var(--bg-subtle)',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border-light)',
                              }}
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedMatch({
                          score: m.score,
                          clientName: client?.name,
                          clientPhone: client?.phone,
                          searchName: m.search?.title,
                          offerTitle: property.title,
                          offerType: 'Imóvel',
                          stage: client?.stage,
                          price: property.price,
                          explanation: m.parsedExplanation,
                        })
                      }
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                      <HelpCircle size={14} />
                      <span>Por que {m.score}%?</span>
                    </button>

                    {client?.phone && (
                      <a
                        href={getWhatsAppUrl(
                          client.phone || '',
                          `Olá, ${client.name}! Encontrei um imóvel com ${m.score}% de compatibilidade com a sua busca: "${property.title}". O que acha de darmos uma olhada?`
                        ) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#15803D' }}
                      >
                        <MessageCircle size={14} />
                        <span>WhatsApp</span>
                      </a>
                    )}

                    {property.isPublic && client && (
                      <button
                        type="button"
                        onClick={() => {
                          setTargetShareClient({
                            name: client.name,
                            phone: client.phone || '',
                          });
                          setShareModalOpen(true);
                        }}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#059669' }}
                        title="Apresentar este imóvel para este cliente da carteira"
                      >
                        <Share2 size={13} />
                        <span>Apresentar</span>
                      </button>
                    )}

                    <Link
                      href={`/mapa?offerId=${property.id}&offerType=PROPERTY&matchSearchId=${m.searchId}`}
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--color-primary)' }}
                      title="Explorar no mapa da carteira"
                    >
                      <MapPin size={13} color="var(--color-primary)" />
                      <span>No mapa</span>
                    </Link>

                    <Link
                      href={`/buscas/${m.searchId}`}
                      className="btn-primary"
                      style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '5px', justifyContent: 'center', textDecoration: 'none' }}
                    >
                      <span>Ver Busca</span>
                      <ExternalLink size={13} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Gestão Rápida de Status */}
      <div className="card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Status do Imóvel</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Altere a visibilidade na carteira</div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {['Disponível', 'Reservado', 'Vendido/Alugado', 'Inativo'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => handleToggleStatus(st)}
              className={property.status === st ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '6px 12px', fontSize: '0.82rem' }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Modal Explicativo */}
      {selectedMatch && (
        <MatchExplanationModal
          isOpen={Boolean(selectedMatch)}
          onClose={() => setSelectedMatch(null)}
          score={selectedMatch.score}
          clientName={selectedMatch.clientName}
          clientPhone={selectedMatch.clientPhone}
          searchName={selectedMatch.searchName}
          offerTitle={selectedMatch.offerTitle}
          offerType={selectedMatch.offerType}
          stage={selectedMatch.stage}
          price={selectedMatch.price}
          explanation={selectedMatch.explanation}
        />
      )}

      {/* Modal de Compartilhamento */}
      {property && (
        <SharePropertyModal
          isOpen={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false);
            setTargetShareClient(null);
          }}
          offerId={property.id}
          offerType="PROPERTY"
          offerTitle={property.title}
          clientName={targetShareClient?.name}
          clientPhone={targetShareClient?.phone}
          initialIsPublic={property.isPublic}
          initialPublicId={property.publicId}
          initialPrecision={property.publicLocationPrecision}
          onStatusChanged={(isPub, pubId) => {
            setProperty((prev: any) => ({
              ...prev,
              isPublic: isPub,
              publicId: pubId,
            }));
          }}
        />
      )}

      {/* Modal de Alteração de Preço Compartilhado (Anúncio Principal) */}
      {showPriceModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                Atualizar Preço Compartilhado
              </h3>
              <button type="button" onClick={() => setShowPriceModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', color: '#92400E', fontSize: '0.82rem', lineHeight: 1.4 }}>
              <strong>⚠️ Atenção:</strong> A alteração deste valor atualizará automaticamente o preço de venda de todos os anúncios ativos vinculados a este imóvel físico no Área Nobre.
            </div>

            {priceError && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '0.82rem' }}>
                {priceError}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Novo Valor (R$) *
              </label>
              <input
                type="text"
                value={newSharedPrice}
                onChange={(e) => setNewSharedPrice(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 750000"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '1rem', fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Motivo da Alteração (opcional)
              </label>
              <textarea
                value={priceChangeReason}
                onChange={(e) => setPriceChangeReason(e.target.value)}
                placeholder="Ex: Negociação com proprietário, ajuste de mercado..."
                rows={3}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '0.86rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setShowPriceModal(false)}
                className="btn-secondary"
                disabled={submittingPrice}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleUpdateSharedPrice}
                className="btn-primary"
                disabled={submittingPrice || !newSharedPrice || Number(newSharedPrice) <= 0}
              >
                {submittingPrice ? 'Atualizando...' : 'Confirmar Alteração'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Solicitação de Revisão de Preço (Anúncio Secundário) */}
      {showRevisionModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                Solicitar Revisão de Preço Compartilhado
              </h3>
              <button type="button" onClick={() => setShowRevisionModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: 1.4 }}>
              Sua solicitação será enviada ao <strong>corretor do Anúncio Principal</strong>. Caso aceita, o preço de todos os anúncios ativos será atualizado. Em caso de recusa, você poderá contestar administrativamente.
            </p>

            {revisionError && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '0.82rem' }}>
                {revisionError}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Valor Proposto (R$) *
              </label>
              <input
                type="text"
                value={proposedPrice}
                onChange={(e) => setProposedPrice(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 720000"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '1rem', fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Justificativa / Observação *
              </label>
              <textarea
                value={revisionJustification}
                onChange={(e) => setRevisionJustification(e.target.value)}
                placeholder="Informe o motivo da alteração acordado com o proprietário..."
                rows={3}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '0.86rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setShowRevisionModal(false)}
                className="btn-secondary"
                disabled={submittingRevision}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmitPriceRevision}
                className="btn-primary"
                disabled={submittingRevision || !proposedPrice || Number(proposedPrice) <= 0 || !revisionJustification.trim()}
              >
                {submittingRevision ? 'Enviando...' : 'Enviar Solicitação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Aceite de Revisão (Corretor Principal) */}
      {acceptingRevision && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                Aceitar Revisão de Preço
              </h3>
              <button type="button" onClick={() => setAcceptingRevision(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: 1.5 }}>
              Você está aceitando a proposta de <strong>{acceptingRevision.requestingBroker?.name || 'Corretor parceiro'}</strong> para alterar o preço deste imóvel físico para <strong>R$ {acceptingRevision.suggestedPrice.toLocaleString('pt-BR')}</strong>.
            </p>

            <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', color: '#92400E', fontSize: '0.82rem', lineHeight: 1.4 }}>
              <strong>⚠️ Atenção:</strong> Ao confirmar, o novo valor será aplicado a <strong>todos os anúncios ativos vinculados</strong> a esta unidade física.
            </div>

            {acceptError && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '0.82rem' }}>
                {acceptError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setAcceptingRevision(null)}
                className="btn-secondary"
                disabled={acceptingSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAcceptRevision}
                className="btn-primary"
                disabled={acceptingSubmitting}
              >
                {acceptingSubmitting ? 'Atualizando...' : 'Confirmar e Atualizar Preço'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Recusa de Revisão (Corretor Principal) */}
      {rejectingRevision && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                Recusar Solicitação de Revisão
              </h3>
              <button type="button" onClick={() => setRejectingRevision(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: 1.5 }}>
              Para recusar a proposta de alteração de preço, informe obrigatoriamente o motivo da decisão.
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
                placeholder="Ex: Proprietário ratificou que mantém o valor atual; valor abaixo da avaliação de mercado..."
                rows={3}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '0.86rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setRejectingRevision(null)}
                className="btn-secondary"
                disabled={rejectingSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRejectRevision}
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
                {rejectingSubmitting ? 'Registrando...' : 'Confirmar Recusa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Contestação Administrativa (Corretor Secundário) */}
      {disputingRevision && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Scale size={20} color="#6B21A8" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                  Contestar Decisão Administrativamente
                </h3>
              </div>
              <button type="button" onClick={() => setDisputingRevision(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: 1.5 }}>
              Sua solicitação de revisão para <strong>R$ {disputingRevision.suggestedPrice.toLocaleString('pt-BR')}</strong> foi recusada pelo corretor principal. Você pode encaminhar o caso para arbitragem da administração do Área Nobre.
            </p>

            <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', fontSize: '0.8rem', lineHeight: 1.4 }}>
              🛡️ <strong>Garantia de Operação:</strong> A abertura de contestação não suspende seu anúncio nem o do colega corretor. Os anúncios permanecem ativos durante a avaliação técnica.
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
                placeholder="Ex: Confirmação direta com o proprietário por escrito nesta data..."
                rows={3}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '0.86rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setDisputingRevision(null)}
                className="btn-secondary"
                disabled={disputeSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDisputeRevision}
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
