'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  MapPin,
  Building,
  Calendar,
  Layers,
  Bed,
  Bath,
  Car,
  Maximize2,
  DollarSign,
  Image as ImageIcon,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  HardHat,
  Sparkles,
  HelpCircle,
  ExternalLink,
  Share2,
} from 'lucide-react';
import MatchExplanationModal from '@/components/MatchExplanationModal';
import SharePropertyModal from '@/components/SharePropertyModal';

export default function EmpreendimentoDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [development, setDevelopment] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [selectedTypologyShare, setSelectedTypologyShare] = useState<{
    id: string;
    name: string;
    clientName?: string;
    clientPhone?: string;
    isPublic?: boolean;
    publicId?: string | null;
    precision?: 'HIDDEN' | 'APPROXIMATE' | 'EXACT';
  } | null>(null);

  useEffect(() => {
    async function loadDevelopment() {
      try {
        const res = await fetch(`/api/developments/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao carregar empreendimento.');
        setDevelopment(data.development);
        setIsOwner(data.isOwner ?? true);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadDevelopment();
  }, [id]);

  async function handleToggleStatus() {
    if (!development) return;
    setToggling(true);
    const newStatus = development.status === 'Ativo' ? 'Inativo' : 'Ativo';
    try {
      const res = await fetch(`/api/developments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDevelopment(data.development);
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status.');
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Deseja realmente excluir este empreendimento e todas as suas tipologias?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/developments/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push('/empreendimentos');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir empreendimento.');
      setDeleting(false);
    }
  }

  function getStageBadgeClass(stage: string) {
    switch (stage) {
      case 'Lançamento':
        return 'badge-stage-lancamento';
      case 'Na planta':
        return 'badge-stage-planta';
      case 'Em construção':
        return 'badge-stage-construcao';
      case 'Próximo da entrega':
        return 'badge-stage-entrega';
      default:
        return 'badge-neutral';
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        Carregando detalhes do empreendimento...
      </div>
    );
  }

  if (error || !development) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Empreendimento não encontrado</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>{error || 'O empreendimento solicitado não existe ou foi removido.'}</p>
        <Link href="/empreendimentos" className="btn-primary">
          Voltar para Imóveis em construção
        </Link>
      </div>
    );
  }

  const images = development.images || [];
  const currentPhoto = images[activePhotoIndex]?.url || images[0]?.url || null;
  const typologies = development.typologies || [];
  const minPrice = typologies.length > 0 ? Math.min(...typologies.map((t: any) => t.price).filter((p: number) => p > 0)) : null;

  return (
    <div style={{ maxWidth: '920px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Barra Superior de Navegação */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <Link
          href="/empreendimentos"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-secondary)',
            fontSize: '0.88rem',
          }}
        >
          <ArrowLeft size={16} />
          <span>Voltar para Imóveis em construção</span>
        </Link>

        {isOwner ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleToggleStatus}
              disabled={toggling}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.86rem' }}
            >
              {development.status === 'Ativo' ? 'Desativar' : 'Ativar Empreendimento'}
            </button>

            <Link
              href={`/empreendimentos/${id}/editar`}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.86rem' }}
            >
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
              <span>Empreendimento de {development.responsibleBroker?.profile?.commercialName || development.responsibleBroker?.name || 'outro corretor'}</span>
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
                alt={development.name}
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
            <Link href={`/empreendimentos/${id}/editar`} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              Adicionar fotos
            </Link>
          </div>
        )}
      </div>

      {/* Cabeçalho do Empreendimento */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className={`badge ${getStageBadgeClass(development.stage)}`}>
                {development.stage}
              </span>
              <span className={`badge ${development.status === 'Ativo' ? 'badge-success' : 'badge-neutral'}`}>
                {development.status}
              </span>
              <span className="badge badge-primary">
                Construtora: {development.developer}
              </span>
            </div>

            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {development.name}
            </h1>

            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
              <MapPin size={16} color="var(--color-primary)" />
              {development.address ? `${development.address}, ${development.number || 'S/N'} — ` : ''}
              {development.neighborhood ? `${development.neighborhood}, ` : ''}{development.city || ''} {development.state ? `- ${development.state}` : ''}
            </p>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Unidades a partir de
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>
              {minPrice && minPrice > 0 ? `R$ ${minPrice.toLocaleString('pt-BR')}` : 'Sob consulta'}
            </div>
            {development.deliveryDate && (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={14} color="var(--color-primary)" />
                <span>Previsão de entrega: <strong>{development.deliveryDate}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Banner de Matches da Carteira */}
        {(() => {
          const totalMatches = typologies.reduce((acc: number, t: any) => acc + (t.matches?.length || 0), 0);
          return (
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
                  {totalMatches} match(es) identificado(s) nas tipologias deste empreendimento
                </span>
              </div>

              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Cada tipologia cruza de forma independente com as buscas da carteira.
              </span>
            </div>
          );
        })()}
      </div>

      {/* SEÇÃO: Tipologias / Unidades Disponíveis */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Tipologias & Unidades Disponíveis
            </h2>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              Especificações técnicas e valores de cada tipo de planta disponível neste empreendimento.
            </p>
          </div>

          <Link href={`/empreendimentos/${id}/editar`} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.82rem' }}>
            <Edit3 size={14} />
            <span>Gerenciar plantas</span>
          </Link>
        </div>

        {typologies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            Nenhuma tipologia cadastrada para este empreendimento.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {typologies.map((t: any) => (
              <div
                key={t.id}
                style={{
                  padding: '18px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {/* Cabeçalho da Tipologia */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.02rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {t.name}
                    </h3>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {t.propertyType}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedTypologyShare({
                          id: t.id,
                          name: `${development.name} — ${t.name}`,
                          isPublic: t.isPublic,
                          publicId: t.publicId,
                          precision: t.publicLocationPrecision,
                        })
                      }
                      className="btn-secondary"
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.74rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: t.isPublic ? '#065F46' : 'var(--text-main)',
                        backgroundColor: t.isPublic ? '#ECFDF5' : undefined,
                        borderColor: t.isPublic ? '#A7F3D0' : undefined,
                      }}
                      title="Compartilhar apresentação desta tipologia"
                    >
                      <Share2 size={12} />
                      <span>{t.isPublic ? 'Compartilhado' : 'Compartilhar'}</span>
                    </button>

                    <span
                      className={`badge ${
                        t.status === 'Disponível'
                          ? 'badge-success'
                          : t.status === 'Reservada'
                          ? 'badge-stage-construcao'
                          : 'badge-neutral'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                </div>

                {/* Preço */}
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    A partir de
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                    R$ {t.price.toLocaleString('pt-BR')}
                  </div>
                </div>

                {/* Grid de Características */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '0.82rem',
                    color: 'var(--text-secondary)',
                    padding: '8px 0',
                    borderTop: '1px solid var(--border-subtle)',
                    borderBottom: '1px solid var(--border-subtle)',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Bed size={14} /> {t.bedrooms} qtos
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Bed size={14} color="var(--color-primary)" /> {t.suites} suíte(s)
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Bath size={14} /> {t.bathrooms} banh
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Car size={14} /> {t.parkingSpaces} vg
                  </span>
                  {t.privateArea && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                      <Maximize2 size={14} /> {t.privateArea} m²
                    </span>
                  )}
                </div>

                {/* Observações da Tipologia */}
                {t.notes && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                    {t.notes}
                  </p>
                )}

                {/* Matches desta Tipologia com Clientes */}
                <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px dashed var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Sparkles size={13} color="var(--color-primary)" />
                      {t.matches?.length || 0} busca(s) compatível(is)
                    </span>
                  </div>

                  {t.matches && t.matches.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {t.matches.map((m: any) => (
                        <div
                          key={m.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'white',
                            border: '1px solid var(--border-light)',
                            fontSize: '0.8rem',
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1, paddingRight: '8px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {m.search?.client?.name || 'Cliente'}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {m.search?.name}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <span style={{ fontWeight: 800, color: 'var(--color-primary)' }}>
                              {m.score}%
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedMatch({
                                  score: m.score,
                                  clientName: m.search?.client?.name,
                                  searchName: m.search?.name,
                                  offerTitle: `${development.name} — ${t.name}`,
                                  offerType: 'TYPOLOGY',
                                  stage: development.stage,
                                  price: t.price,
                                  explanation: m.parsedExplanation || [],
                                })
                              }
                              className="btn-secondary"
                              style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                            >
                              Por quê?
                            </button>
                            <Link
                              href={`/buscas/${m.searchId}`}
                              className="btn-primary"
                              style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                            >
                              Ver
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SEÇÃO: Descrição e Notas do Corretor */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Descrição do Empreendimento</h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
            {development.description || 'Nenhuma descrição detalhada informada.'}
          </p>
        </div>

        {development.internalNotes && (
          <div style={{ padding: '14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-primary)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Observações Internas da Corretora Daiane Corrêa (Confidencial)
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              {development.internalNotes}
            </p>
          </div>
        )}
      </div>

      {/* Modal Explicativo: Por que combina? */}
      {selectedMatch && (
        <MatchExplanationModal
          isOpen={Boolean(selectedMatch)}
          onClose={() => setSelectedMatch(null)}
          score={selectedMatch.score}
          clientName={selectedMatch.clientName}
          searchName={selectedMatch.searchName}
          offerTitle={selectedMatch.offerTitle}
          offerType={selectedMatch.offerType}
          stage={selectedMatch.stage}
          price={selectedMatch.price}
          explanation={selectedMatch.explanation}
        />
      )}

      {/* Modal de Compartilhamento de Tipologia */}
      {selectedTypologyShare && (
        <SharePropertyModal
          isOpen={Boolean(selectedTypologyShare)}
          onClose={() => setSelectedTypologyShare(null)}
          offerId={selectedTypologyShare.id}
          offerType="TYPOLOGY"
          offerTitle={selectedTypologyShare.name}
          clientName={selectedTypologyShare.clientName}
          clientPhone={selectedTypologyShare.clientPhone}
          initialIsPublic={selectedTypologyShare.isPublic}
          initialPublicId={selectedTypologyShare.publicId}
          initialPrecision={selectedTypologyShare.precision}
          onStatusChanged={(isPub, pubId) => {
            setDevelopment((prev: any) => {
              if (!prev || !prev.typologies) return prev;
              return {
                ...prev,
                typologies: prev.typologies.map((item: any) => {
                  if (item.id === selectedTypologyShare.id) {
                    return { ...item, isPublic: isPub, publicId: pubId };
                  }
                  return item;
                }),
              };
            });
          }}
        />
      )}
    </div>
  );
}
