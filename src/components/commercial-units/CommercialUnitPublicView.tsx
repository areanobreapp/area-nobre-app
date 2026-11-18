'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Building2,
  Ruler,
  Bed,
  Bath,
  Car,
  Compass,
  MapPin,
  MessageCircle,
  ExternalLink,
  Download,
  Maximize2,
  X,
  Eye,
  CheckCircle,
  Layers,
  Sparkles,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Info,
  CreditCard,
  FileText,
  Phone,
  HelpCircle,
  Check,
  Calendar,
} from 'lucide-react';
import type { PublicCommercialUnitData } from '@/lib/commercial-unit-share';
import { formatCurrencyBRL, formatAreaSqm } from '@/lib/commercial-unit-format';

// Carrega o mapa interativo Leaflet apenas no cliente
const DevelopmentSharedMap = dynamic(
  () => import('@/components/development/DevelopmentSharedMap'),
  { ssr: false }
);

interface CommercialUnitPublicViewProps {
  data: PublicCommercialUnitData;
  publicUrl: string;
}

export default function CommercialUnitPublicView({
  data,
  publicUrl,
}: CommercialUnitPublicViewProps) {
  const { unit, development: dev, broker } = data;

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activePlantIndex, setActivePlantIndex] = useState(0);
  const [zoomedPlant, setZoomedPlant] = useState<any | null>(null);
  const [showInstitutionalModal, setShowInstitutionalModal] = useState(false);
  const [downloadingPlantId, setDownloadingPlantId] = useState<string | null>(null);

  // Status comercial visual da unidade
  const statusMeta: Record<string, { label: string; color: string; bg: string; border: string }> = {
    DISPONIVEL: {
      label: 'Unidade Disponível',
      color: '#166534',
      bg: '#DCFCE7',
      border: '#86EFAC',
    },
    RESERVADA: {
      label: 'Unidade Reservada',
      color: '#B45309',
      bg: '#FEF3C7',
      border: '#FDE68A',
    },
    VENDIDA: {
      label: 'Unidade Vendida',
      color: '#475569',
      bg: '#F1F5F9',
      border: '#CBD5E1',
    },
    INDISPONIVEL_TEMPORARIAMENTE: {
      label: 'Indisponível Temporariamente',
      color: '#B91C1C',
      bg: '#FEE2E2',
      border: '#FCA5A5',
    },
  };

  const currentStatusMeta = statusMeta[unit.commercialStatus] || statusMeta.DISPONIVEL;
  const isReservedUnit = unit.commercialStatus === 'RESERVADA';

  const devImages = dev.images && dev.images.length > 0 ? dev.images : [];
  const activeImage = devImages[activeImageIndex] || null;

  const plants = unit.typology?.plants || [];
  const selectedPlant = plants[activePlantIndex] || plants[0] || null;

  const getPublicPlantViewUrl = (plant: { id: string; fileUrl?: string }) =>
    `/api/public/materials/${plant.id}/view`;

  const isImageFormat = (ext?: string | null, type?: string | null) => {
    if (type?.startsWith('image/')) return true;
    const clean = (ext || '').toLowerCase().replace('.', '');
    return ['jpg', 'jpeg', 'png', 'webp'].includes(clean);
  };

  const formattedPrice = unit.currentPrice ? formatCurrencyBRL(unit.currentPrice) : 'Sob Consulta';

  // Handler seguro de download da planta
  async function handleDownloadPlant(plant: { id: string; title: string; fileExtension?: string | null }) {
    try {
      setDownloadingPlantId(plant.id);
      const res = await fetch(`/api/public/materials/${plant.id}/download`);
      if (!res.ok) {
        throw new Error('Não foi possível realizar o download.');
      }
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const ext = plant.fileExtension ? `.${plant.fileExtension.replace(/^\./, '')}` : '';
      link.download = `${plant.title}${ext}`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(link);
    } catch (err: any) {
      alert(err.message || 'Erro ao baixar arquivo da planta.');
    } finally {
      setDownloadingPlantId(null);
    }
  }

  // Mensagem contextual para solicitação de plantas via WhatsApp
  const requestPlantMsg = encodeURIComponent(
    `Olá, ${broker.commercialName}! Gostaria de receber mais detalhes e a planta da unidade ${unit.unitCode} no ${dev.name}.`
  );
  const requestPlantUrl = broker.phone
    ? `https://api.whatsapp.com/send?phone=${broker.phone.replace(/\D/g, '')}&text=${requestPlantMsg}`
    : null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', color: '#0F172A', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* 1. CABEÇALHO SIMPLIFICADO DO ÁREA NOBRE (Sem menus internos ou administrativos) */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '12px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          {/* Identidade Visual Área Nobre + Badge de Apresentação Comercial */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#1E4620',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Building2 size={18} strokeWidth={2.4} />
              </div>
              <span
                style={{
                  fontSize: '0.98rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  color: '#0F172A',
                }}
              >
                ÁREA NOBRE
              </span>
            </div>
            <div style={{ height: '18px', width: '1px', backgroundColor: '#CBD5E1' }} />
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#166534',
                backgroundColor: '#DCFCE7',
                padding: '3px 8px',
                borderRadius: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Apresentação Comercial
            </span>
          </div>

          {/* Botão Rápido de Contato com o Corretor Responsável */}
          {broker.hasWhatsApp && broker.whatsappUrl && (
            <a
              href={broker.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              id="btn-topo-whatsapp-corretor"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                backgroundColor: '#25D366',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                transition: 'background-color 0.15s ease',
              }}
            >
              <MessageCircle size={16} />
              <span>Falar com o Corretor</span>
            </a>
          )}
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px 100px' }}>

        {/* 2. IDENTIFICAÇÃO DA CONSTRUTORA E DO EMPREENDIMENTO */}
        <section
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            padding: '20px 24px',
            marginBottom: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {/* Logomarca oficial da Construtora (sem substituir pela capa) */}
            {dev.company?.logoUrl ? (
              <div
                style={{
                  height: '52px',
                  width: '120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#FFFFFF',
                  padding: '4px',
                  borderRadius: '6px',
                }}
              >
                <img
                  src={dev.company.logoUrl}
                  alt={dev.company.tradeName || dev.company.name}
                  style={{ maxHeight: '48px', maxWidth: '100%', objectFit: 'contain' }}
                />
              </div>
            ) : (
              <div
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  color: '#1E293B',
                  letterSpacing: '0.02em',
                }}
              >
                {dev.company?.tradeName || dev.company?.name || 'Construtora Parceira'}
              </div>
            )}

            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Realização: {dev.company?.tradeName || dev.company?.name || 'Construtora Parceira'}
              </div>
              <h1 style={{ margin: '2px 0 0', fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                {dev.name}
              </h1>
              <div style={{ fontSize: '0.80rem', color: '#64748B', marginTop: '2px' }}>
                {dev.stage ? `${dev.stage} • ` : ''}
                {dev.city ? `${dev.city} - ${dev.state}` : 'Santa Catarina'}
              </div>
            </div>
          </div>

          {/* Botão Conhecer o Empreendimento */}
          <button
            type="button"
            id="btn-conhecer-empreendimento"
            onClick={() => setShowInstitutionalModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              backgroundColor: '#F8FAFC',
              color: '#1E4620',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Building2 size={16} />
            <span>Conhecer o Empreendimento</span>
          </button>
        </section>

        {/* 3. GALERIA DE IMAGENS DO EMPREENDIMENTO + 4. IDENTIFICAÇÃO E PREÇO DA UNIDADE + 5. CARD DO CORRETOR */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            marginBottom: '28px',
          }}
        >
          {/* Coluna da Galeria de Imagens */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              padding: '16px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {activeImage ? (
              <div style={{ position: 'relative', width: '100%', height: '360px', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#0F172A' }}>
                <img
                  src={activeImage.url}
                  alt={activeImage.caption || dev.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />

                {devImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : devImages.length - 1))}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        backgroundColor: 'rgba(15,23,42,0.65)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                      title="Foto anterior"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveImageIndex((prev) => (prev < devImages.length - 1 ? prev + 1 : 0))}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        backgroundColor: 'rgba(15,23,42,0.65)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                      title="Próxima foto"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}

                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    backgroundColor: 'rgba(15,23,42,0.75)',
                    color: '#FFFFFF',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                  }}
                >
                  {activeImageIndex + 1} / {devImages.length}
                </div>
              </div>
            ) : (
              <div
                style={{
                  height: '360px',
                  borderRadius: '10px',
                  backgroundColor: '#F1F5F9',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94A3B8',
                  gap: '8px',
                }}
              >
                <Building2 size={42} strokeWidth={1.5} />
                <span style={{ fontSize: '0.85rem' }}>Imagens em preparação comercial</span>
              </div>
            )}

            {/* Carrossel de Miniaturas */}
            {devImages.length > 1 && (
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: '12px',
                  overflowX: 'auto',
                  paddingBottom: '4px',
                }}
              >
                {devImages.map((img, idx) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    style={{
                      border: idx === activeImageIndex ? '2px solid #1E4620' : '2px solid transparent',
                      borderRadius: '6px',
                      padding: 0,
                      overflow: 'hidden',
                      width: '64px',
                      height: '46px',
                      flexShrink: 0,
                      cursor: 'pointer',
                      backgroundColor: '#E2E8F0',
                    }}
                  >
                    <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Coluna da Unidade e Card do Corretor */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              {/* Badges de Identificação e Situação Comercial */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: currentStatusMeta.color,
                    backgroundColor: currentStatusMeta.bg,
                    border: `1px solid ${currentStatusMeta.border}`,
                    padding: '3px 10px',
                    borderRadius: '4px',
                  }}
                >
                  {currentStatusMeta.label}
                </span>

                {unit.block?.name && (
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      color: '#475569',
                      backgroundColor: '#F1F5F9',
                      padding: '3px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    Torre / Bloco: {unit.block.name}
                  </span>
                )}

                {unit.floorLabel && (
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      color: '#475569',
                      backgroundColor: '#F1F5F9',
                      padding: '3px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    {unit.floorLabel}
                  </span>
                )}
              </div>

              {/* Título da Unidade */}
              <h2 style={{ margin: '0 0 6px', fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                Unidade {unit.unitCode}
              </h2>
              <div style={{ fontSize: '0.86rem', color: '#64748B', marginBottom: '18px' }}>
                {unit.unitType} • {dev.name}
              </div>

              {/* Bloco de Preço e Situação de Reserva (FUNC-01) */}
              <div
                style={{
                  backgroundColor: isReservedUnit ? '#FFFBEB' : '#F0FDF4',
                  border: `1px solid ${isReservedUnit ? '#FDE68A' : '#BBF7D0'}`,
                  borderRadius: '10px',
                  padding: '16px',
                  marginBottom: '18px',
                }}
              >
                <div
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: isReservedUnit ? '#B45309' : '#166534',
                  }}
                >
                  {isReservedUnit ? 'Valor de Referência (Unidade Reservada)' : 'Valor de Tabela Vigente'}
                </div>
                <div
                  style={{
                    fontSize: '1.95rem',
                    fontWeight: 900,
                    color: isReservedUnit ? '#92400E' : '#166534',
                    margin: '4px 0 2px',
                  }}
                >
                  {formattedPrice}
                </div>
                {unit.pricePerSqmText && (
                  <div
                    style={{
                      fontSize: '0.80rem',
                      color: isReservedUnit ? '#B45309' : '#15803D',
                      fontWeight: 600,
                    }}
                  >
                    {unit.pricePerSqmText}
                  </div>
                )}

                {isReservedUnit && (
                  <div
                    style={{
                      marginTop: '10px',
                      paddingTop: '10px',
                      borderTop: '1px dashed #FCD34D',
                      fontSize: '0.78rem',
                      color: '#92400E',
                      lineHeight: 1.45,
                      fontWeight: 600,
                    }}
                  >
                    Esta unidade encontra-se reservada no momento e não está disponível para aquisição imediata. Consulte o corretor responsável para verificar a situação da reserva ou conhecer unidades semelhantes disponíveis.
                  </div>
                )}
              </div>

              {/* Destaques Comerciais da Unidade (quando cadastrados) */}
              {unit.description && (
                <div style={{ marginBottom: '18px', padding: '12px 14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Destaques da Unidade:
                  </div>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#334155', lineHeight: 1.5 }}>
                    {unit.description}
                  </p>
                </div>
              )}
            </div>

            {/* 5. CARD DO CORRETOR RESPONSÁVEL COM WHATSAPP */}
            <div
              style={{
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    backgroundColor: '#1E4620',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.96rem',
                    fontWeight: 700,
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {broker.avatarUrl ? (
                    <img src={broker.avatarUrl} alt={broker.commercialName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    (broker.commercialName || 'C')[0].toUpperCase()
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                    Atendimento Exclusivo
                  </div>
                  <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0F172A' }}>
                    {broker.commercialName}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                    {broker.creci ? `CRECI: ${broker.creci} • ` : ''}
                    {broker.formattedPhone || 'Corretor Autorizado'}
                  </div>
                </div>
              </div>

              {broker.hasWhatsApp && broker.whatsappUrl ? (
                <a
                  href={broker.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="btn-whatsapp-corretor-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 18px',
                    backgroundColor: '#25D366',
                    color: '#FFFFFF',
                    borderRadius: '10px',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  <MessageCircle size={18} />
                  <span>
                    {isReservedUnit
                      ? 'Consultar Reserva / Outras Opções'
                      : 'Tenho Interesse / Chamar no WhatsApp'}
                  </span>
                </a>
              ) : (
                <div style={{ fontSize: '0.78rem', color: '#64748B', textAlign: 'center' }}>
                  Entre em contato através do telefone: <strong>{broker.formattedPhone}</strong>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 6. METRAGENS E CARACTERÍSTICAS DA UNIDADE */}
        <section
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            padding: '24px',
            marginBottom: '28px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
            <Ruler size={18} color="#1E4620" />
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0F172A' }}>
              Metragens e Características da Unidade
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '14px',
            }}
          >
            {unit.privateArea != null && unit.privateArea > 0 && (
              <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.74rem', color: '#64748B', display: 'block' }}>Área Privativa</span>
                <strong style={{ fontSize: '1.05rem', color: '#0F172A' }}>{formatAreaSqm(unit.privateArea)}</strong>
              </div>
            )}
            {unit.totalArea != null && unit.totalArea > 0 && (
              <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.74rem', color: '#64748B', display: 'block' }}>Área Total</span>
                <strong style={{ fontSize: '1.05rem', color: '#0F172A' }}>{formatAreaSqm(unit.totalArea)}</strong>
              </div>
            )}
            {unit.bedrooms > 0 && (
              <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.74rem', color: '#64748B', display: 'block' }}>Dormitórios</span>
                <strong style={{ fontSize: '1.05rem', color: '#0F172A' }}>
                  {unit.bedrooms} {unit.bedrooms === 1 ? 'dormitório' : 'dormitórios'}
                  {unit.suites > 0 ? ` (${unit.suites} suíte${unit.suites > 1 ? 's' : ''})` : ''}
                </strong>
              </div>
            )}
            {unit.bathrooms > 0 && (
              <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.74rem', color: '#64748B', display: 'block' }}>Banheiros</span>
                <strong style={{ fontSize: '1.05rem', color: '#0F172A' }}>
                  {unit.bathrooms} {unit.bathrooms === 1 ? 'banheiro' : 'banheiros'}
                  {unit.lavabos > 0 ? ` + ${unit.lavabos} lavabo` : ''}
                </strong>
              </div>
            )}
            {unit.parkingSpaces > 0 && (
              <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.74rem', color: '#64748B', display: 'block' }}>Vagas de Garagem</span>
                <strong style={{ fontSize: '1.05rem', color: '#0F172A' }}>
                  {unit.parkingSpaces} {unit.parkingSpaces === 1 ? 'vaga' : 'vagas'}
                  {unit.coveredParkingSpaces != null && unit.coveredParkingSpaces > 0 ? ` (${unit.coveredParkingSpaces} coberta${unit.coveredParkingSpaces > 1 ? 's' : ''})` : ''}
                </strong>
              </div>
            )}
            {unit.solarOrientation && (
              <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.74rem', color: '#64748B', display: 'block' }}>Orientação Solar</span>
                <strong style={{ fontSize: '1.05rem', color: '#0F172A' }}>{unit.solarOrientation}</strong>
              </div>
            )}
            {unit.position && (
              <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.74rem', color: '#64748B', display: 'block' }}>Posição</span>
                <strong style={{ fontSize: '1.05rem', color: '#0F172A' }}>{unit.position}</strong>
              </div>
            )}
            {unit.hasBarbecue && (
              <div style={{ padding: '12px', backgroundColor: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
                <span style={{ fontSize: '0.74rem', color: '#166534', display: 'block' }}>Churrasqueira</span>
                <strong style={{ fontSize: '1.05rem', color: '#166534' }}>Sim (na sacada/unidade)</strong>
              </div>
            )}
            {unit.isPenthouse && (
              <div style={{ padding: '12px', backgroundColor: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
                <span style={{ fontSize: '0.74rem', color: '#166534', display: 'block' }}>Tipologia</span>
                <strong style={{ fontSize: '1.05rem', color: '#166534' }}>Cobertura / Penthouse</strong>
              </div>
            )}
          </div>
        </section>

        {/* 7. PLANTA DA UNIDADE COMPARTILHADA (Requirement 4) */}
        <section
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            padding: '24px',
            marginBottom: '28px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="#1E4620" />
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0F172A' }}>
                Planta da Unidade
              </h2>
            </div>
            {unit.typology?.name && (
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#166534', backgroundColor: '#DCFCE7', padding: '3px 10px', borderRadius: '4px' }}>
                Tipologia: {unit.typology.name}
              </span>
            )}
          </div>

          {selectedPlant ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              {isImageFormat(selectedPlant.fileExtension, selectedPlant.fileType) ? (
                <div
                  style={{
                    position: 'relative',
                    maxWidth: '720px',
                    width: '100%',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    overflow: 'hidden',
                    cursor: 'pointer',
                  }}
                  onClick={() => setZoomedPlant(selectedPlant)}
                  title="Clique para ampliar a planta"
                >
                  <img
                    src={getPublicPlantViewUrl(selectedPlant)}
                    alt={selectedPlant.title}
                    style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '460px', objectFit: 'contain', backgroundColor: '#FFFFFF' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 12,
                      right: 12,
                      backgroundColor: 'rgba(15,23,42,0.8)',
                      color: '#FFFFFF',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Maximize2 size={13} />
                    <span>Clique para ampliar</span>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: '24px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    textAlign: 'center',
                    maxWidth: '520px',
                    width: '100%',
                  }}
                >
                  <FileText size={42} color="#1E4620" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                    {selectedPlant.title}
                  </div>
                  <p style={{ margin: '0 0 16px', fontSize: '0.80rem', color: '#64748B' }}>
                    Documento de planta técnica em formato PDF de alta resolução.
                  </p>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <a
                      href={getPublicPlantViewUrl(selectedPlant)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '9px 16px',
                        backgroundColor: '#1E4620',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      <Eye size={15} />
                      <span>Visualizar Planta em PDF</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Botões de Ação da Planta: Visualizar em Nova Aba e Baixar Documento Público */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '4px' }}>
                <a
                  href={getPublicPlantViewUrl(selectedPlant)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    backgroundColor: '#F1F5F9',
                    color: '#0F172A',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    fontSize: '0.80rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={14} />
                  <span>Visualizar em Nova Aba</span>
                </a>

                {selectedPlant.allowDownload !== false && (
                  <button
                    type="button"
                    onClick={() => handleDownloadPlant(selectedPlant)}
                    disabled={downloadingPlantId === selectedPlant.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      backgroundColor: '#F1F5F9',
                      color: '#166534',
                      border: '1px solid #86EFAC',
                      borderRadius: '8px',
                      fontSize: '0.80rem',
                      fontWeight: 600,
                      cursor: downloadingPlantId === selectedPlant.id ? 'wait' : 'pointer',
                    }}
                  >
                    <Download size={14} />
                    <span>{downloadingPlantId === selectedPlant.id ? 'Baixando planta...' : 'Baixar Arquivo'}</span>
                  </button>
                )}
              </div>

              {/* Outras Plantas da Mesma Tipologia (se houver mais de uma) */}
              {plants.length > 1 && (
                <div style={{ marginTop: '16px', width: '100%', maxWidth: '720px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                    Outras opções de planta desta tipologia ({plants.length}):
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {plants.map((p, idx) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setActivePlantIndex(idx)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: idx === activePlantIndex ? '2px solid #1E4620' : '1px solid #CBD5E1',
                          backgroundColor: idx === activePlantIndex ? '#DCFCE7' : '#FFFFFF',
                          color: idx === activePlantIndex ? '#166534' : '#334155',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {p.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Estado discreto quando não houver planta pública cadastrada */
            <div
              style={{
                padding: '24px',
                backgroundColor: '#F8FAFC',
                borderRadius: '10px',
                border: '1px dashed #CBD5E1',
                textAlign: 'center',
                maxWidth: '600px',
                margin: '0 auto',
              }}
            >
              <Layers size={36} color="#94A3B8" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                {unit.typology?.name ? `Tipologia: ${unit.typology.name}` : 'Planta Técnica Sob Consulta'}
              </div>
              <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: '#64748B', lineHeight: 1.5 }}>
                As plantas técnicas, cortes e detalhamentos específicos desta unidade podem ser solicitados diretamente ao corretor responsável.
              </p>
              {requestPlantUrl && (
                <a
                  href={requestPlantUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    backgroundColor: '#25D366',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  <MessageCircle size={15} />
                  <span>Solicitar Planta ao Corretor</span>
                </a>
              )}
            </div>
          )}
        </section>

        {/* 8. CONDIÇÕES DE PAGAMENTO E NEGOCIAÇÃO OFICIAIS (Requirements 5, 6, 7, 8) */}
        <section
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            padding: '24px',
            marginBottom: '28px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={18} color="#1E4620" />
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0F172A' }}>
                Condições de Pagamento e Negociação
              </h2>
            </div>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', backgroundColor: '#F1F5F9', padding: '3px 10px', borderRadius: '4px' }}>
              Condições Oficiais da Construtora
            </span>
          </div>

          {/* Condições Estruturadas Cadastradas pela Construtora */}
          {unit.paymentConditions && unit.paymentConditions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
              {unit.paymentConditions.map((cond) => (
                <div
                  key={cond.id}
                  style={{
                    border: cond.isDefault ? '2px solid #86EFAC' : '1px solid #E2E8F0',
                    backgroundColor: cond.isDefault ? '#F0FDF4' : '#F8FAFC',
                    borderRadius: '10px',
                    padding: '18px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '0.98rem', color: '#0F172A' }}>{cond.title}</strong>
                      {cond.isDefault && (
                        <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#166534', backgroundColor: '#DCFCE7', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                          Fluxo Padrão da Obra
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Grid de Itens do Fluxo Oficial */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '12px',
                      marginBottom: cond.description || cond.publicNotes ? '12px' : 0,
                    }}
                  >
                    {/* Entrada */}
                    {(cond.downPaymentAmount != null || cond.downPaymentPercent != null) && (
                      <div style={{ padding: '10px 12px', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                        <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', fontWeight: 600 }}>Entrada Oficial</span>
                        <strong style={{ fontSize: '0.94rem', color: '#166534' }}>
                          {cond.downPaymentAmount != null ? formatCurrencyBRL(cond.downPaymentAmount) : ''}
                          {cond.downPaymentPercent != null ? ` (${cond.downPaymentPercent}%)` : ''}
                        </strong>
                        {cond.downPaymentInstallments > 1 && (
                          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                            Em até {cond.downPaymentInstallments} parcelas iniciais
                          </div>
                        )}
                      </div>
                    )}

                    {/* Parcelas Mensais */}
                    {cond.monthlyCount != null && (
                      <div style={{ padding: '10px 12px', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                        <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', fontWeight: 600 }}>Parcelamento Mensal</span>
                        <strong style={{ fontSize: '0.94rem', color: '#0F172A' }}>
                          {cond.monthlyCount}x mensais
                          {cond.monthlyInstallmentAmount != null ? ` de ${formatCurrencyBRL(cond.monthlyInstallmentAmount)}` : ''}
                          {cond.monthlyPercentTotal != null && cond.monthlyInstallmentAmount == null ? ` (${cond.monthlyPercentTotal}% total)` : ''}
                        </strong>
                        {(cond.correctionIndexPreKeys || cond.correctionIndexPostKeys) && (
                          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                            Correção: {cond.correctionIndexPreKeys || cond.correctionIndexPostKeys}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Reforços / Intermediárias */}
                    {cond.reinforcementCount != null && cond.reinforcementCount > 0 && (
                      <div style={{ padding: '10px 12px', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                        <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', fontWeight: 600 }}>Reforços / Balões</span>
                        <strong style={{ fontSize: '0.94rem', color: '#0F172A' }}>
                          {cond.reinforcementCount} reforços
                          {cond.reinforcementInstallmentAmount != null ? ` de ${formatCurrencyBRL(cond.reinforcementInstallmentAmount)}` : ''}
                        </strong>
                        {cond.reinforcementFrequencyMonths && (
                          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                            Periodicidade: a cada {cond.reinforcementFrequencyMonths} meses
                          </div>
                        )}
                      </div>
                    )}

                    {/* Chaves / Financiamento */}
                    {(cond.keysAmount != null || cond.financingAmount != null || cond.keysPercent != null || cond.financingPercent != null) && (
                      <div style={{ padding: '10px 12px', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                        <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', fontWeight: 600 }}>Saldo nas Chaves / Financiamento</span>
                        <strong style={{ fontSize: '0.94rem', color: '#0F172A' }}>
                          {cond.keysAmount != null ? `Chaves: ${formatCurrencyBRL(cond.keysAmount)}` : ''}
                          {cond.financingAmount != null ? `Financiamento: ${formatCurrencyBRL(cond.financingAmount)}` : ''}
                          {cond.keysPercent != null && cond.keysAmount == null ? `Chaves: ${cond.keysPercent}%` : ''}
                          {cond.financingPercent != null && cond.financingAmount == null ? `Financiamento: ${cond.financingPercent}%` : ''}
                        </strong>
                      </div>
                    )}
                  </div>

                  {/* Observações Oficiais Autorizadas */}
                  {(cond.publicNotes || cond.description) && (
                    <div style={{ marginTop: '10px', fontSize: '0.80rem', color: '#475569', lineHeight: 1.5, backgroundColor: '#FFFFFF', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                      {cond.publicNotes || cond.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null}

          {/* Situação Oficial de Financiamento e Permuta da Unidade */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '14px',
            }}
          >
            {/* Financiamento Bancário */}
            <div style={{ padding: '14px 16px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
                Financiamento Bancário
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                {unit.acceptsFinancing ? (
                  <>
                    <CheckCircle size={16} color="#166534" />
                    <strong style={{ fontSize: '0.92rem', color: '#166534' }}>Aceita Financiamento Bancário</strong>
                  </>
                ) : (
                  <>
                    <X size={16} color="#94A3B8" />
                    <span style={{ fontSize: '0.90rem', color: '#64748B' }}>Pagamento direto com a construtora</span>
                  </>
                )}
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '0.76rem', color: '#64748B', lineHeight: 1.4 }}>
                {unit.acceptsFinancing
                  ? 'Consulte o corretor responsável para obter simulações com bancos parceiros.'
                  : 'Condições de pagamento direto sem alienação fiduciária bancária.'}
              </p>
            </div>

            {/* Permuta */}
            <div style={{ padding: '14px 16px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
                Permuta de Imóvel ou Veículo
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                {unit.acceptsExchange ? (
                  <>
                    <CheckCircle size={16} color="#166534" />
                    <strong style={{ fontSize: '0.92rem', color: '#166534' }}>Estuda Permuta</strong>
                  </>
                ) : (
                  <>
                    <X size={16} color="#94A3B8" />
                    <span style={{ fontSize: '0.90rem', color: '#64748B' }}>Não aceita permuta</span>
                  </>
                )}
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '0.76rem', color: '#64748B', lineHeight: 1.4 }}>
                {unit.acceptsExchange
                  ? unit.exchangeNotes
                    ? `Condições cadastradas: ${unit.exchangeNotes}`
                    : 'A construtora avalia bens como parte do pagamento mediante análise.'
                  : 'Pagamento exclusivamente em recursos financeiros.'}
              </p>
            </div>
          </div>

          {/* Nota de Orientação Comercial para o Cliente */}
          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              backgroundColor: '#F0FDF4',
              borderRadius: '8px',
              border: '1px solid #BBF7D0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '0.80rem', color: '#166534', flex: '1 1 280px' }}>
              Deseja uma simulação oficial ou fluxo de pagamento personalizado para o seu perfil?
            </div>
            {broker.hasWhatsApp && broker.whatsappUrl && (
              <a
                href={broker.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  backgroundColor: '#25D366',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <MessageCircle size={15} />
                <span>Consultar Simulação</span>
              </a>
            )}
          </div>
        </section>

        {/* 9. LOCALIZAÇÃO DO EMPREENDIMENTO (UI-01: card único gerenciado por DevelopmentSharedMap) */}
        <div style={{ marginBottom: '28px' }}>
          <DevelopmentSharedMap
            developmentName={dev.name}
            address={dev.address}
            number={dev.number}
            complement={dev.complement}
            neighborhood={dev.neighborhood}
            city={dev.city}
            state={dev.state}
            zipcode={dev.zipcode}
            latitude={dev.latitude}
            longitude={dev.longitude}
          />
        </div>

        {/* 10. OPÇÃO "CONHECER O EMPREENDIMENTO" (Card Final) */}
        <section
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '2px solid #1E4620',
            padding: '28px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '16px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              backgroundColor: '#1E4620',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              fontWeight: 700,
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }}
          >
            {broker.avatarUrl ? (
              <img src={broker.avatarUrl} alt={broker.commercialName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              (broker.commercialName || 'C')[0].toUpperCase()
            )}
          </div>

          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Atendimento Comercial Responsável
            </div>
            <h3 style={{ margin: '4px 0', fontSize: '1.30rem', fontWeight: 800, color: '#0F172A' }}>
              {broker.commercialName}
            </h3>
            <div style={{ fontSize: '0.84rem', color: '#64748B' }}>
              {broker.creci ? `CRECI: ${broker.creci} • ` : ''}
              {broker.city}
            </div>
            {broker.tagline && (
              <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: '#475569', fontStyle: 'italic' }}>
                &ldquo;{broker.tagline}&rdquo;
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {broker.hasWhatsApp && broker.whatsappUrl && (
              <a
                href={broker.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="btn-whatsapp-corretor-footer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  backgroundColor: '#25D366',
                  color: '#FFFFFF',
                  borderRadius: '10px',
                  fontSize: '0.94rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: '0 4px 10px rgba(37,211,102,0.25)',
                }}
              >
                <MessageCircle size={20} />
                <span>Conversar pelo WhatsApp</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => setShowInstitutionalModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                backgroundColor: '#F8FAFC',
                color: '#1E4620',
                border: '1px solid #1E4620',
                borderRadius: '10px',
                fontSize: '0.90rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Building2 size={18} />
              <span>Conhecer o Empreendimento</span>
            </button>
          </div>
        </section>
      </main>

      {/* 11. BARRA FLUTUANTE DE CONTATO NO RODAPÉ (MOBILE) */}
      {broker.hasWhatsApp && broker.whatsappUrl && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#FFFFFF',
            borderTop: '1px solid #E2E8F0',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            zIndex: 35,
            boxShadow: '0 -2px 10px rgba(0,0,0,0.06)',
          }}
          className="mobile-bottom-bar"
        >
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Unidade {unit.unitCode}</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#166534' }}>{formattedPrice}</div>
          </div>
          <a
            href={broker.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            id="btn-whatsapp-mobile-bottom"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              backgroundColor: '#25D366',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontSize: '0.86rem',
              fontWeight: 700,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <MessageCircle size={18} />
            <span>Falar no WhatsApp</span>
          </a>
        </div>
      )}

      {/* 12. MODAL INSTITUCIONAL: CONHECER O EMPREENDIMENTO (Sem Estoque) */}
      {showInstitutionalModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15,23,42,0.7)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => setShowInstitutionalModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '720px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#F8FAFC',
                position: 'sticky',
                top: 0,
                zIndex: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={20} color="#1E4620" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>
                  {dev.name} • Apresentação Institucional
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInstitutionalModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Construtora */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {dev.company?.logoUrl && (
                  <img
                    src={dev.company.logoUrl}
                    alt={dev.company.tradeName || dev.company.name}
                    style={{ height: '42px', maxWidth: '140px', objectFit: 'contain' }}
                  />
                )}
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>Realização</div>
                  <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0F172A' }}>
                    {dev.company?.tradeName || dev.company?.name || 'Construtora Parceira'}
                  </div>
                </div>
              </div>

              {/* Descrição Institucional */}
              {dev.description && (
                <div>
                  <h4 style={{ margin: '0 0 8px', fontSize: '0.92rem', fontWeight: 700, color: '#1E293B' }}>
                    Sobre o Empreendimento
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.86rem', color: '#334155', lineHeight: 1.6 }}>
                    {dev.description}
                  </p>
                </div>
              )}

              {/* Infraestrutura e Lazer */}
              <div>
                <h4 style={{ margin: '0 0 10px', fontSize: '0.92rem', fontWeight: 700, color: '#1E293B' }}>
                  Infraestrutura e Lazer
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                  {dev.hasPool && (
                    <div style={{ padding: '8px 10px', backgroundColor: '#F0FDF4', borderRadius: '6px', fontSize: '0.80rem', color: '#166534', fontWeight: 600 }}>
                      ✓ Piscina
                    </div>
                  )}
                  {dev.hasGym && (
                    <div style={{ padding: '8px 10px', backgroundColor: '#F0FDF4', borderRadius: '6px', fontSize: '0.80rem', color: '#166534', fontWeight: 600 }}>
                      ✓ Academia / Fitness
                    </div>
                  )}
                  {dev.hasPartyHall && (
                    <div style={{ padding: '8px 10px', backgroundColor: '#F0FDF4', borderRadius: '6px', fontSize: '0.80rem', color: '#166534', fontWeight: 600 }}>
                      ✓ Salão de Festas
                    </div>
                  )}
                  {dev.hasPetSpace && (
                    <div style={{ padding: '8px 10px', backgroundColor: '#F0FDF4', borderRadius: '6px', fontSize: '0.80rem', color: '#166534', fontWeight: 600 }}>
                      ✓ Espaço Pet
                    </div>
                  )}
                  {dev.hasElevator && (
                    <div style={{ padding: '8px 10px', backgroundColor: '#F0FDF4', borderRadius: '6px', fontSize: '0.80rem', color: '#166534', fontWeight: 600 }}>
                      ✓ Elevador
                    </div>
                  )}
                </div>
              </div>

              {/* Botão de Fechar e Contato */}
              <div style={{ marginTop: '10px', paddingTop: '16px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontSize: '0.80rem', color: '#64748B' }}>
                  Atendimento com <strong>{broker.commercialName}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInstitutionalModal(false)}
                  style={{
                    padding: '8px 18px',
                    backgroundColor: '#1E4620',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Voltar para Unidade {unit.unitCode}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 13. MODAL DE ZOOM / LIGHTBOX DA PLANTA */}
      {zoomedPlant && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15,23,42,0.88)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => setZoomedPlant(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '920px',
              width: '100%',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#F8FAFC',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} color="#1E4620" />
                <span style={{ fontSize: '0.90rem', fontWeight: 700, color: '#0F172A' }}>
                  {zoomedPlant.title}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a
                  href={getPublicPlantViewUrl(zoomedPlant)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={13} />
                  <span>Nova Aba</span>
                </a>
                {zoomedPlant.allowDownload !== false && (
                  <button
                    type="button"
                    onClick={() => handleDownloadPlant(zoomedPlant)}
                    disabled={downloadingPlantId === zoomedPlant.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 10px',
                      backgroundColor: '#DCFCE7',
                      color: '#166534',
                      border: '1px solid #86EFAC',
                      borderRadius: '6px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: downloadingPlantId === zoomedPlant.id ? 'wait' : 'pointer',
                    }}
                  >
                    <Download size={13} />
                    <span>Baixar</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setZoomedPlant(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                  title="Fechar"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div style={{ padding: '16px', display: 'flex', justifyContent: 'center', backgroundColor: '#0F172A' }}>
              <img
                src={getPublicPlantViewUrl(zoomedPlant)}
                alt={zoomedPlant.title}
                style={{ maxWidth: '100%', maxHeight: '78vh', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
