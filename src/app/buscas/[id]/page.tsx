'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  User,
  Phone,
  Building2,
  DollarSign,
  MapPin,
  Bed,
  Bath,
  Car,
  Maximize2,
  Zap,
  Bell,
  CheckCircle2,
  MessageCircle,
  Home,
  Sparkles,
  ExternalLink,
  HelpCircle,
  AlertTriangle,
  Layers,
  Compass,
  Share2,
} from 'lucide-react';
import CircularMatchScore from '@/components/CircularMatchScore';
import MatchExplanationModal from '@/components/MatchExplanationModal';
import SharePropertyModal from '@/components/SharePropertyModal';
import { getWhatsAppUrl } from '@/lib/whatsapp';

const SearchMatchesMap = dynamic(() => import('@/components/SearchMatchesMap'), { ssr: false });

export default function BuscaDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const searchParams = useSearchParams();
  const newMatches = searchParams.get('newMatches');

  const [search, setSearch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'lista' | 'mapa'>(() => (newMatches ? 'mapa' : 'lista'));
  const [shareModalData, setShareModalData] = useState<{
    offerId: string;
    offerType: 'PROPERTY' | 'TYPOLOGY';
    offerTitle: string;
    isPublic?: boolean;
    publicId?: string | null;
    precision?: 'HIDDEN' | 'APPROXIMATE' | 'EXACT';
  } | null>(null);

  useEffect(() => {
    async function loadSearch() {
      try {
        const res = await fetch(`/api/searches/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao carregar busca.');
        setSearch(data.search);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadSearch();
  }, [id]);

  async function handleToggleActive() {
    if (!search) return;
    try {
      const res = await fetch(`/api/searches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !search.active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSearch((prev: any) => ({ ...prev, active: data.search.active }));
    } catch (err: any) {
      alert(err.message || 'Erro ao alternar status.');
    }
  }

  async function handleDelete() {
    if (!confirm('Deseja realmente excluir esta busca de cliente?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/searches/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push('/buscas');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir busca.');
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        Carregando detalhes da busca...
      </div>
    );
  }

  if (error || !search) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Busca não encontrada</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>{error || 'A busca solicitada não existe ou foi removida.'}</p>
        <Link href="/buscas" className="btn-primary">
          Voltar para Buscas
        </Link>
      </div>
    );
  }

  const propertyTypes: string[] = typeof search.propertyTypes === 'string'
    ? JSON.parse(search.propertyTypes)
    : (search.propertyTypes || []);

  const neighborhoods: string[] = typeof search.neighborhoods === 'string'
    ? JSON.parse(search.neighborhoods)
    : (search.neighborhoods || []);

  const cities: string[] = typeof search.cities === 'string'
    ? JSON.parse(search.cities)
    : (search.cities || []);

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Banner de Oportunidades Reveladas (Fase 5 — Requisito 10) */}
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
                Oportunidades encontradas na sua carteira!
              </strong>
              <p style={{ margin: '2px 0 0 0', color: '#047857', fontSize: '0.84rem' }}>
                Encontramos <strong>{newMatches}</strong> {Number(newMatches) === 1 ? 'imóvel compatível' : 'imóveis compatíveis'} com os critérios desta busca.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setViewMode('mapa');
              document.getElementById('secao-ofertas-compativeis')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <MapPin size={14} />
            <span>Ver oportunidades no mapa</span>
          </button>
        </div>
      )}

      {/* Barra de Navegação */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <Link
          href="/buscas"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-secondary)',
            fontSize: '0.88rem',
          }}
        >
          <ArrowLeft size={16} />
          <span>Voltar para lista de buscas</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Toggle de Alerta */}
          <button
            type="button"
            onClick={handleToggleActive}
            className="btn-secondary"
            style={{
              padding: '8px 14px',
              fontSize: '0.84rem',
              color: search.active ? 'var(--color-primary)' : 'var(--text-muted)',
              borderColor: search.active ? 'var(--color-primary-subtle)' : 'var(--border-light)',
            }}
          >
            <Bell size={15} />
            <span>{search.active ? 'Busca Ativa' : 'Busca Pausada'}</span>
          </button>

          <Link href={`/buscas/${id}/editar`} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.84rem' }}>
            <Edit3 size={15} />
            <span>Editar</span>
          </Link>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.84rem', color: 'var(--color-danger)' }}
          >
            <Trash2 size={15} />
            <span>{deleting ? 'Excluindo...' : 'Excluir'}</span>
          </button>
        </div>
      </div>

      {/* Card Principal: Resumo e Cliente */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className={`badge ${search.active ? 'badge-success' : 'badge-neutral'}`}>
                {search.active ? 'Ativa' : 'Inativa'}
              </span>
              <span className="badge badge-primary">{search.purpose}</span>
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {search.name}
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Cadastrada em {new Date(search.createdAt).toLocaleDateString('pt-BR')}
            </p>
          </div>

          {/* Dados do Cliente */}
          <div
            style={{
              padding: '12px 18px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.94rem',
              }}
            >
              {search.client.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--text-primary)' }}>
                {search.client.name}
              </div>
              {search.client.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {search.client.phone}
                  </span>
                  {getWhatsAppUrl(search.client.phone) && (
                    <a
                      href={getWhatsAppUrl(search.client.phone)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '0.74rem',
                        backgroundColor: '#25D366',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 700,
                        textDecoration: 'none',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      }}
                      title="Conversar no WhatsApp"
                    >
                      <MessageCircle size={12} />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Faixa de Valor */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Orçamento do Cliente
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-primary)' }}>
              {search.minPrice ? `R$ ${search.minPrice.toLocaleString('pt-BR')} até ` : 'Até '}
              R$ {search.maxPrice.toLocaleString('pt-BR')}
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {propertyTypes.map((t) => (
              <span key={t} className="badge badge-primary" style={{ padding: '6px 12px' }}>
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Localização e Bairros / Raio */}
        <div>
          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Região de Interesse
          </div>
          {search.locationStrategy === 'TRAVEL_TIME' || (search.maxTravelTimeMinutes && search.maxTravelTimeMinutes > 0) ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <Car size={13} />
                  <span>Tempo de Carro</span>
                </span>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  Até {search.maxTravelTimeMinutes || 15} minutos de deslocamento
                </span>
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', paddingLeft: '2px' }}>
                Ponto de referência: <strong>{search.referenceAddress || (search.searchLatitude ? `Lat ${Number(search.searchLatitude).toFixed(4)}, Lng ${Number(search.searchLongitude).toFixed(4)}` : 'Definido no mapa')}</strong>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', fontStyle: 'italic', paddingLeft: '2px' }}>
                Estimativa baseada na rede viária; não considera trânsito em tempo real.
              </div>
            </div>
          ) : search.locationStrategy === 'RADIUS' || (search.searchRadiusMeters && search.searchRadiusMeters > 0) ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <Compass size={13} />
                  <span>Busca por Raio no Mapa</span>
                </span>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  Raio de {search.searchRadiusMeters >= 1000 ? `${(search.searchRadiusMeters / 1000).toFixed(1).replace('.', ',')} km` : `${search.searchRadiusMeters} m`}
                </span>
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', paddingLeft: '2px' }}>
                Ponto de referência: <strong>{search.referenceAddress || (search.searchLatitude ? `Lat ${Number(search.searchLatitude).toFixed(4)}, Lng ${Number(search.searchLongitude).toFixed(4)}` : 'Definido no mapa')}</strong>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <MapPin size={18} color="var(--color-primary)" />
                <span style={{ fontWeight: 600, fontSize: '0.94rem' }}>
                  {cities.join(', ') || 'Qualquer cidade'}
                </span>
                {neighborhoods.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginLeft: '6px' }}>
                    {neighborhoods.map((b) => (
                      <span key={b} className="badge badge-neutral" style={{ padding: '4px 10px' }}>
                        {b}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {search.referenceAddress && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px', paddingLeft: '26px' }}>
                  Próximo de: <strong>{search.referenceAddress}</strong>
                  {search.maxRadiusKm && ` (em raio de até ${search.maxRadiusKm} km)`}
                </div>
              )}
            </>
          )}
        </div>

        {/* Requisitos Mínimos */}
        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>
            Critérios Mínimos Requeridos
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}><Bed size={18} color="var(--color-primary)" /></div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>{search.minBedrooms > 0 ? `${search.minBedrooms}+` : 'Indif.'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quartos Mín.</div>
            </div>

            <div style={{ padding: '12px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}><Bed size={18} color="var(--color-primary)" /></div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>{search.minSuites > 0 ? `${search.minSuites}+` : 'Indif.'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Suítes Mín.</div>
            </div>

            <div style={{ padding: '12px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}><Car size={18} color="var(--color-primary)" /></div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>{search.minParkingSpaces > 0 ? `${search.minParkingSpaces}+` : 'Indif.'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vagas Mín.</div>
            </div>

            <div style={{ padding: '12px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}><Maximize2 size={18} color="var(--color-primary)" /></div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>{search.minArea ? `${search.minArea} m²+` : 'Indif.'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Área Mínima</div>
            </div>
          </div>
        </div>

        {/* Preferências Avançadas Registradas (Fase 5.0.1) */}
        {(() => {
          const prefs: { label: string; mode: string; type: 'necessary' | 'desirable' | 'info' }[] = [];
          if (search.wantsElevator === 'NECESSARIO') prefs.push({ label: 'Elevador', mode: 'Necessário', type: 'necessary' });
          else if (search.wantsElevator === 'DESEJAVEL') prefs.push({ label: 'Elevador', mode: 'Desejável', type: 'desirable' });

          if (search.wantsPool === 'NECESSARIO') prefs.push({ label: 'Piscina', mode: 'Necessária', type: 'necessary' });
          else if (search.wantsPool === 'DESEJAVEL') prefs.push({ label: 'Piscina', mode: 'Desejável', type: 'desirable' });

          if (search.wantsGym === 'NECESSARIO') prefs.push({ label: 'Academia', mode: 'Necessária', type: 'necessary' });
          else if (search.wantsGym === 'DESEJAVEL') prefs.push({ label: 'Academia', mode: 'Desejável', type: 'desirable' });

          if (search.wantsBarbecue === 'NECESSARIO') prefs.push({ label: 'Churrasqueira', mode: 'Necessária', type: 'necessary' });
          else if (search.wantsBarbecue === 'DESEJAVEL') prefs.push({ label: 'Churrasqueira', mode: 'Desejável', type: 'desirable' });

          if (search.wantsPartyHall === 'NECESSARIO') prefs.push({ label: 'Salão de Festas', mode: 'Necessário', type: 'necessary' });
          else if (search.wantsPartyHall === 'DESEJAVEL') prefs.push({ label: 'Salão de Festas', mode: 'Desejável', type: 'desirable' });

          if (search.wantsPetSpace === 'NECESSARIO') prefs.push({ label: 'Espaço Pet', mode: 'Necessário', type: 'necessary' });
          else if (search.wantsPetSpace === 'DESEJAVEL') prefs.push({ label: 'Espaço Pet', mode: 'Desejável', type: 'desirable' });

          if (search.wantsPenthouse === 'NECESSARIO') prefs.push({ label: 'Cobertura', mode: 'Necessária', type: 'necessary' });
          else if (search.wantsPenthouse === 'DESEJAVEL') prefs.push({ label: 'Cobertura', mode: 'Desejável', type: 'desirable' });

          if (search.preferredFurniture) prefs.push({ label: `Mobília: ${search.preferredFurniture}`, mode: 'Preferência', type: 'info' });

          if (search.requiresRegistered) prefs.push({ label: 'Casa Averbada', mode: 'Necessária', type: 'necessary' });

          if (search.wantsCorner === 'NECESSARIO') prefs.push({ label: 'Terreno de Esquina', mode: 'Necessário', type: 'necessary' });
          else if (search.wantsCorner === 'DESEJAVEL') prefs.push({ label: 'Terreno de Esquina', mode: 'Desejável', type: 'desirable' });

          if (search.wantsGatedCommunity === 'NECESSARIO') prefs.push({ label: 'Condomínio Fechado', mode: 'Necessário', type: 'necessary' });
          else if (search.wantsGatedCommunity === 'DESEJAVEL') prefs.push({ label: 'Condomínio Fechado', mode: 'Desejável', type: 'desirable' });

          if (search.wantsAllotment === 'NECESSARIO') prefs.push({ label: 'Loteamento', mode: 'Necessário', type: 'necessary' });
          else if (search.wantsAllotment === 'DESEJAVEL') prefs.push({ label: 'Loteamento', mode: 'Desejável', type: 'desirable' });

          if (search.preferredStreetPaving) prefs.push({ label: `Pavimentação: ${search.preferredStreetPaving}`, mode: 'Desejável', type: 'desirable' });

          if (search.preferredCommercialType) prefs.push({ label: `Posição da Sala: ${search.preferredCommercialType}`, mode: 'Desejável', type: 'desirable' });

          if (search.acceptsExchange) prefs.push({ label: 'Permuta', mode: 'Cliente tem imóvel/veículo', type: 'info' });

          if (prefs.length === 0) return null;

          return (
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
                Preferências Avançadas
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {prefs.map((p, idx) => {
                  const bg = p.type === 'necessary' ? '#FEE2E2' : p.type === 'desirable' ? '#FEF3C7' : '#EFF6FF';
                  const textCol = p.type === 'necessary' ? '#991B1B' : p.type === 'desirable' ? '#92400E' : '#1E40AF';
                  const borderCol = p.type === 'necessary' ? '#FCA5A5' : p.type === 'desirable' ? '#FDE68A' : '#BFDBFE';
                  return (
                    <span
                      key={idx}
                      style={{
                        backgroundColor: bg,
                        color: textCol,
                        border: `1px solid ${borderCol}`,
                        borderRadius: '999px',
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>{p.label}</span>
                      <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>({p.mode})</span>
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Observações */}
        {search.notes && (
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Observações
            </div>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {search.notes}
            </p>
          </div>
        )}
      </div>

      {/* Seção de Ofertas Compatíveis (Matching Real) */}
      <div id="secao-ofertas-compativeis" style={{ marginTop: '8px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} color="var(--color-primary)" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Quais imóveis da carteira combinam com esta necessidade?
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
                {search.matches?.length || 0} oportunidade(s)
              </span>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Cruzamento determinístico entre imóveis prontos e tipologias de empreendimentos.
            </p>
          </div>

          {/* Ações: Ver no Mapa / Modo Lista */}
          {search.matches && search.matches.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Link
                href={`/?buscaId=${id}`}
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '0.82rem',
                  textDecoration: 'none',
                }}
                title="Abrir esta busca no mapa principal da carteira"
              >
                <Compass size={14} color="var(--color-primary)" />
                <span>Explorar na Home</span>
              </Link>
            <div
              style={{
                display: 'flex',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '3px',
                border: '1px solid var(--border-light)',
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('lista')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'lista' ? 'var(--color-primary)' : 'transparent',
                  color: viewMode === 'lista' ? 'white' : 'var(--text-secondary)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <Layers size={14} />
                <span>Lista</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('mapa')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'mapa' ? 'var(--color-primary)' : 'transparent',
                  color: viewMode === 'mapa' ? 'white' : 'var(--text-secondary)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <MapPin size={14} />
                <span>Mapa</span>
              </button>
            </div>
          </div>
        )}
      </div>

        {(!search.matches || search.matches.length === 0) ? (
          <div
            className="card"
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px dashed var(--border-light)',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto',
                color: 'var(--text-muted)',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <Zap size={24} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
              Nenhum imóvel da carteira atende suficientemente a esta busca no momento.
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto 16px auto' }}>
              Assim que novos imóveis ou tipologias compatíveis forem cadastrados na sua carteira, o sistema identificará as oportunidades automaticamente.
            </p>
            <Link href="/imoveis/novo" className="btn-secondary" style={{ display: 'inline-flex' }}>
              Cadastrar Novo Imóvel
            </Link>
          </div>
        ) : viewMode === 'mapa' ? (
          <SearchMatchesMap
            search={search}
            matches={search.matches}
            onExitSearch={() => setViewMode('lista')}
            onOpenExplanation={(m) => {
              const isTypology = m.offerType === 'TYPOLOGY';
              setSelectedMatch({
                score: m.score,
                clientName: search.client?.name || 'Cliente',
                searchName: search.name,
                offerTitle: isTypology
                  ? `${m.typology?.development?.name} — ${m.typology?.name}`
                  : m.property?.title,
                offerType: isTypology ? 'TYPOLOGY' : 'PROPERTY',
                stage: isTypology ? m.typology?.development?.stage : 'Pronto',
                price: isTypology ? m.typology?.price : m.property?.price,
                explanation: m.parsedExplanation,
              });
            }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {search.matches.map((m: any) => {
              const isTypology = m.offerType === 'TYPOLOGY';
              const offerTitle = isTypology
                ? `${m.typology?.development?.name} — ${m.typology?.name}`
                : m.property?.title;
              const offerImage = isTypology
                ? m.typology?.development?.images?.[0]?.url || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=80'
                : m.property?.images?.[0]?.url || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&auto=format&fit=crop&q=80';
              const offerPrice = isTypology ? m.typology?.price : m.property?.price;
              const offerCity = isTypology ? m.typology?.development?.city : m.property?.city;
              const offerNeighborhood = isTypology ? m.typology?.development?.neighborhood : m.property?.neighborhood;
              const bedrooms = isTypology ? m.typology?.bedrooms : m.property?.bedrooms;
              const suites = isTypology ? m.typology?.suites : m.property?.suites;
              const parkingSpaces = isTypology ? m.typology?.parkingSpaces : m.property?.parkingSpaces;
              const privateArea = isTypology ? m.typology?.privateArea : m.property?.privateArea;
              const offerLink = isTypology
                ? `/empreendimentos/${m.typology?.development?.id}`
                : `/imoveis/${m.property?.id}`;
              const stage = isTypology ? (m.typology?.development?.stage || 'Em construção') : 'Pronto';

              const topBadges = (m.parsedExplanation || []).slice(0, 3);

              return (
                <div
                  key={m.id}
                  className="card"
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '18px',
                    flexWrap: 'wrap',
                    transition: 'box-shadow 0.2s, border-color 0.2s',
                  }}
                >
                  {/* Lado Esquerdo: Imagem + Detalhes */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 360px', minWidth: '280px' }}>
                    <div
                      style={{
                        position: 'relative',
                        width: '100px',
                        height: '84px',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        flexShrink: 0,
                        backgroundColor: '#F3F4F6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src={offerImage}
                        alt={offerTitle}
                        style={{ maxWidth: '100%', maxHeight: '100%', width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          top: 4,
                          left: 4,
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: isTypology ? '#065f46' : '#0369a1',
                          color: 'white',
                          boxShadow: 'var(--shadow-xs)',
                        }}
                      >
                        {stage}
                      </span>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: 2 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={13} color="var(--text-muted)" />
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {offerNeighborhood ? `${offerNeighborhood}, ` : ''}{offerCity}
                          </span>
                        </div>
                        {search.locationStrategy === 'TRAVEL_TIME' && (() => {
                          const travelItem = (m.parsedExplanation || []).find((e: any) => e.category === 'location' && (e.title?.includes('min') || e.detail?.includes('carro')));
                          const matchMinutes = travelItem?.title?.match(/(\d+)\s*min/);
                          return matchMinutes ? (
                            <span
                              style={{
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                color: '#1D4ED8',
                                backgroundColor: '#EFF6FF',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                border: '1px solid #BFDBFE',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              {m.score}% · 🚗 {matchMinutes[1]} min
                            </span>
                          ) : null;
                        })()}
                      </div>

                      <h3
                        style={{
                          fontSize: '1rem',
                          fontWeight: 800,
                          color: 'var(--text-main)',
                          margin: '0 0 4px 0',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {offerTitle}
                      </h3>

                      <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: 6 }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(offerPrice || 0)}
                      </div>

                      {/* Mini tags de especificações */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {bedrooms > 0 && <span><strong>{bedrooms}</strong> dorms</span>}
                        {suites > 0 && <span>• <strong>{suites}</strong> suíte</span>}
                        {parkingSpaces > 0 && <span>• <strong>{parkingSpaces}</strong> vaga(s)</span>}
                        {privateArea && <span>• <strong>{privateArea}</strong> m²</span>}
                      </div>

                      {/* Snippets rápidos de "Por que combina" */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: 8 }}>
                        {topBadges.map((badge: any, bIdx: number) => {
                          const isWarning = badge.status === 'warning';
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
                              {badge.title}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Lado Direito: Score + Ações */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      justifyContent: 'flex-end',
                      flex: '0 0 auto',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <CircularMatchScore score={m.score} size={58} strokeWidth={5} />
                      {(() => {
                        if (search.locationStrategy !== 'TRAVEL_TIME') return null;
                        const travelItem = (m.parsedExplanation || []).find((e: any) => e.category === 'location' && (e.title?.includes('min') || e.detail?.includes('carro')));
                        const matchMinutes = travelItem?.title?.match(/(\d+)\s*min/);
                        return matchMinutes ? (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: '#1D4ED8',
                              backgroundColor: '#EFF6FF',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid #BFDBFE',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            🚗 {matchMinutes[1]} min
                          </span>
                        ) : null;
                      })()}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedMatch({
                            score: m.score,
                            clientName: search.client?.name,
                            clientPhone: search.client?.phone,
                            searchName: search.name,
                            offerTitle,
                            offerType: m.offerType,
                            stage,
                            price: offerPrice,
                            explanation: m.parsedExplanation || [],
                          })
                        }
                        className="btn-secondary"
                        style={{
                          padding: '7px 14px',
                          fontSize: '0.82rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <HelpCircle size={15} />
                        Por que combina?
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setShareModalData({
                            offerId: isTypology ? m.typologyId : m.propertyId,
                            offerType: isTypology ? 'TYPOLOGY' : 'PROPERTY',
                            offerTitle,
                            isPublic: isTypology ? m.typology?.isPublic : m.property?.isPublic,
                            publicId: isTypology ? m.typology?.publicId : m.property?.publicId,
                            precision: isTypology ? m.typology?.publicLocationPrecision : m.property?.publicLocationPrecision,
                          })
                        }
                        className="btn-secondary"
                        style={{
                          padding: '7px 14px',
                          fontSize: '0.82rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: (isTypology ? m.typology?.isPublic : m.property?.isPublic) ? '#065F46' : 'var(--text-main)',
                          backgroundColor: (isTypology ? m.typology?.isPublic : m.property?.isPublic) ? '#F0FDF4' : undefined,
                          borderColor: (isTypology ? m.typology?.isPublic : m.property?.isPublic) ? '#BBF7D0' : undefined,
                        }}
                        title="Enviar apresentação digital deste imóvel para o cliente"
                      >
                        <Share2 size={14} />
                        <span>{search?.client?.name ? `Enviar para ${search.client.name.trim().split(' ')[0]}` : (isTypology ? m.typology?.isPublic : m.property?.isPublic) ? 'Compartilhar' : 'Criar Link'}</span>
                      </button>

                      {getWhatsAppUrl(search.client?.phone) && (
                        <a
                          href={getWhatsAppUrl(search.client.phone)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '7px 14px',
                            fontSize: '0.82rem',
                            backgroundColor: '#25D366',
                            color: 'white',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 700,
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                          }}
                          title="Iniciar conversa no WhatsApp com o cliente"
                        >
                          <MessageCircle size={14} />
                          <span>WhatsApp</span>
                        </a>
                      )}

                      <Link
                        href={offerLink}
                        className="btn-primary"
                        style={{
                          padding: '7px 14px',
                          fontSize: '0.82rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          justifyContent: 'center',
                        }}
                      >
                        Ver Oferta
                        <ExternalLink size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
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
          clientPhone={selectedMatch.clientPhone}
          searchName={selectedMatch.searchName}
          offerTitle={selectedMatch.offerTitle}
          offerType={selectedMatch.offerType}
          stage={selectedMatch.stage}
          price={selectedMatch.price}
          explanation={selectedMatch.explanation}
        />
      )}

      {/* Modal de Compartilhamento Direto com o Cliente */}
      {shareModalData && (
        <SharePropertyModal
          isOpen={Boolean(shareModalData)}
          onClose={() => setShareModalData(null)}
          offerId={shareModalData.offerId}
          offerType={shareModalData.offerType}
          offerTitle={shareModalData.offerTitle}
          clientName={search?.client?.name}
          clientPhone={search?.client?.phone}
          initialIsPublic={shareModalData.isPublic}
          initialPublicId={shareModalData.publicId}
          initialPrecision={shareModalData.precision}
          onStatusChanged={(isPub, pubId) => {
            setSearch((prev: any) => {
              if (!prev || !prev.matches) return prev;
              return {
                ...prev,
                matches: prev.matches.map((matchItem: any) => {
                  if (
                    (shareModalData.offerType === 'PROPERTY' && matchItem.propertyId === shareModalData.offerId) ||
                    (shareModalData.offerType === 'TYPOLOGY' && matchItem.typologyId === shareModalData.offerId)
                  ) {
                    if (shareModalData.offerType === 'PROPERTY' && matchItem.property) {
                      return { ...matchItem, property: { ...matchItem.property, isPublic: isPub, publicId: pubId } };
                    }
                    if (shareModalData.offerType === 'TYPOLOGY' && matchItem.typology) {
                      return { ...matchItem, typology: { ...matchItem.typology, isPublic: isPub, publicId: pubId } };
                    }
                  }
                  return matchItem;
                }),
              };
            });
          }}
        />
      )}
    </div>
  );
}
