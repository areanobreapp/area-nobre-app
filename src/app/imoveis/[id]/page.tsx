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
} from 'lucide-react';
import CircularMatchScore from '@/components/CircularMatchScore';
import MatchExplanationModal from '@/components/MatchExplanationModal';
import SharePropertyModal from '@/components/SharePropertyModal';
import { getWhatsAppUrl } from '@/lib/whatsapp';

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

  useEffect(() => {
    async function loadProperty() {
      try {
        const res = await fetch(`/api/properties/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao carregar imóvel.');
        setProperty(data.property);
        setIsOwner(data.isOwner ?? true);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {property.title}
            </h1>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
              <MapPin size={16} color="var(--color-primary)" />
              {property.address ? `${property.address}, ${property.number || 'S/N'} — ` : ''}
              {property.neighborhood ? `${property.neighborhood}, ` : ''}{property.city || ''} {property.state ? `- ${property.state}` : ''}
            </p>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Valor para {property.purpose}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>
              R$ {property.price.toLocaleString('pt-BR')}
            </div>
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

        {/* Grid de Características Rápidas */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '12px',
            paddingTop: '8px',
          }}
        >
          <div style={{ padding: '12px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}><Bed size={18} color="var(--color-primary)" /></div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>{property.bedrooms}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quartos</div>
          </div>

          <div style={{ padding: '12px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}><Bed size={18} color="var(--color-primary)" /></div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>{property.suites}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Suítes</div>
          </div>

          <div style={{ padding: '12px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}><Bath size={18} color="var(--color-primary)" /></div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>{property.bathrooms}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Banheiros</div>
          </div>

          <div style={{ padding: '12px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}><Car size={18} color="var(--color-primary)" /></div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>{property.parkingSpaces}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vagas</div>
          </div>

          <div style={{ padding: '12px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}><Maximize2 size={18} color="var(--color-primary)" /></div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>{property.privateArea ? `${property.privateArea} m²` : '—'}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Área Privativa</div>
          </div>

          {property.totalArea ? (
            <div style={{ padding: '12px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}><Maximize2 size={18} color="var(--color-primary)" /></div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>{property.totalArea} m²</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Área Informada</div>
            </div>
          ) : null}

          {property.boundaryArea ? (
            <div style={{ padding: '12px', backgroundColor: '#F0FDF4', borderRadius: 'var(--radius-sm)', textAlign: 'center', border: '1px solid #BBF7D0' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}><Pentagon size={18} color="#15803D" /></div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#166534' }}>{property.boundaryArea.toLocaleString('pt-BR')} m²</div>
              <div style={{ fontSize: '0.75rem', color: '#15803D', fontWeight: 600 }}>Área no Mapa (aprox.)</div>
            </div>
          ) : null}
        </div>

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
          if (property.landArea) amenities.push({ label: 'Área do Terreno', value: `${property.landArea} m²`, present: true });

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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 18px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: 'white',
                    gap: '16px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: '1 1 300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 4 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          backgroundColor: 'var(--color-primary-light)',
                          color: 'var(--color-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        {client?.name?.[0]?.toUpperCase() || 'C'}
                      </div>
                      <span style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-main)' }}>
                        {client?.name || 'Cliente'}
                      </span>
                      {client?.phone && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          • {client.phone}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Demanda: <strong>{m.search?.name}</strong> • Teto:{' '}
                      <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(m.search?.maxPrice || 0)}
                      </span>
                    </div>

                    {/* Mini tags explicativas */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      {topBadges.map((b: any, bIdx: number) => {
                        const isWarning = b.status === 'warning';
                        return (
                          <span
                            key={bIdx}
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: isWarning ? '#fffbeb' : '#f0fdf4',
                              color: isWarning ? '#92400e' : '#166534',
                              border: isWarning ? '1px solid #fde68a' : '1px solid #bbf7d0',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                            }}
                          >
                            {isWarning ? <AlertTriangle size={11} /> : <CheckCircle2 size={11} />}
                            {b.title}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', justifyContent: 'flex-end' }}>
                    <CircularMatchScore score={m.score} size={54} strokeWidth={5} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedMatch({
                            score: m.score,
                            clientName: client?.name,
                            clientPhone: client?.phone,
                            searchName: m.search?.name,
                            offerTitle: property.title,
                            offerType: 'PROPERTY',
                            stage: 'Pronto',
                            price: property.price,
                            explanation: m.parsedExplanation || [],
                          })
                        }
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      >
                        <HelpCircle size={14} />
                        Por que combina?
                      </button>

                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setTargetShareClient({ name: client?.name || 'Cliente', phone: client?.phone || '' });
                            setShareModalOpen(true);
                          }}
                          className="btn-secondary"
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.78rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#065F46',
                            backgroundColor: '#F0FDF4',
                            borderColor: '#BBF7D0',
                          }}
                          title="Compartilhar link da apresentação com este cliente"
                        >
                          <Share2 size={13} />
                          <span>{client?.name ? `Enviar para ${client.name.trim().split(' ')[0]}` : 'Compartilhar'}</span>
                        </button>

                        {getWhatsAppUrl(client?.phone) && (
                          <a
                            href={getWhatsAppUrl(client.phone)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '6px 10px',
                              fontSize: '0.78rem',
                              backgroundColor: '#25D366',
                              color: 'white',
                              borderRadius: 'var(--radius-sm)',
                              fontWeight: 700,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            }}
                            title="Conversar com o cliente no WhatsApp"
                          >
                            <MessageCircle size={13} />
                            <span>WhatsApp</span>
                          </a>
                        )}

                        <Link
                          href={`/?buscaId=${m.searchId}`}
                          className="btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
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
    </div>
  );
}
