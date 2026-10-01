'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Building2,
  MapPin,
  Bed,
  Bath,
  Car,
  Maximize2,
  Check,
  ChevronLeft,
  ChevronRight,
  X,
  MessageCircle,
  Phone,
  Mail,
  Shield,
  Sparkles,
  Layers,
  Calendar,
  Compass,
  ArrowUpRight,
  Edit3,
} from 'lucide-react';
import { PublicPropertyDTO } from '@/lib/public-property-dto';
import { getContactBrokerWhatsAppUrl } from '@/lib/public-sharing';

const PublicPropertyMap = dynamic(() => import('./PublicPropertyMap'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100%',
        height: '340px',
        backgroundColor: '#F8FAF9',
        borderRadius: '14px',
        border: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6B7280',
        fontSize: '0.86rem',
        marginTop: '16px',
      }}
    >
      Carregando mapa...
    </div>
  ),
});

interface PublicPresentationViewProps {
  property: PublicPropertyDTO;
  publicUrl: string;
  isPreview?: boolean;
  onClosePreview?: () => void;
  onEditProperty?: () => void;
}

export default function PublicPresentationView({
  property,
  publicUrl,
  isPreview = false,
  onClosePreview,
  onEditProperty,
}: PublicPresentationViewProps) {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const images = property.images && property.images.length > 0
    ? property.images
    : [{ id: 'placeholder', url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&auto=format&fit=crop&q=80', isCover: true }];

  const currentPhoto = images[activePhotoIndex] || images[0];
  const hasMultiplePhotos = images.length > 1;

  const contactWhatsAppUrl = getContactBrokerWhatsAppUrl(
    property.title,
    publicUrl,
    property.broker.phone,
    property.broker.name
  );

  const formatPrice = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val);

  function prevPhoto() {
    setActivePhotoIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }

  function nextPhoto() {
    setActivePhotoIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }

  // Lista de diferenciais confirmados (apenas o que for explicitamente true)
  const amenities: { label: string; icon?: any }[] = [];
  if (property.hasPool) amenities.push({ label: 'Piscina' });
  if (property.hasGym) amenities.push({ label: 'Academia' });
  if (property.hasBarbecue) amenities.push({ label: 'Churrasqueira' });
  if (property.hasPartyHall) amenities.push({ label: 'Salão de festas' });
  if (property.hasElevator) amenities.push({ label: 'Elevador' });
  if (property.hasPetSpace) amenities.push({ label: 'Espaço pet' });
  if (property.isPenthouse) amenities.push({ label: 'Cobertura' });
  if (property.acceptsExchange) amenities.push({ label: 'Aceita permuta' });
  if (property.isRegistered) amenities.push({ label: 'Imóvel averbado' });
  if (property.isCorner) amenities.push({ label: 'Terreno de esquina' });
  if (property.inGatedCommunity) amenities.push({ label: 'Condomínio fechado' });
  if (property.inAllotment) amenities.push({ label: 'Loteamento planejado' });
  if (property.streetPaving) amenities.push({ label: `Pavimentação em ${property.streetPaving}` });
  if (property.furniture && property.furniture !== 'Não') {
    amenities.push({ label: `Mobília ${property.furniture.toLowerCase()}` });
  }
  if (property.commercialType) {
    amenities.push({ label: `Sala comercial ${property.commercialType.toLowerCase()}` });
  }

  return (
    <div style={{ backgroundColor: '#F8FAF9', minHeight: '100vh', paddingBottom: '90px' }}>
      {/* Banner de Prévia Exclusivo para a Corretora Daiane */}
      {isPreview && (
        <div
          style={{
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '12px 20px',
            position: 'sticky',
            top: 0,
            zIndex: 60,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                backgroundColor: '#059669',
                color: '#FFFFFF',
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.5px',
              }}
            >
              PRÉVIA OFICIAL
            </span>
            <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#F1F5F9' }}>
              Esta é a apresentação idêntica que seu cliente receberá ao abrir o link.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onEditProperty && (
              <button
                type="button"
                onClick={onEditProperty}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  backgroundColor: '#334155',
                  color: '#FFFFFF',
                  border: '1px solid #475569',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
              >
                <Edit3 size={14} />
                <span>Editar imóvel</span>
              </button>
            )}

            {onClosePreview && (
              <button
                type="button"
                onClick={onClosePreview}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)',
                }}
              >
                <X size={14} />
                <span>Voltar</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Topo Institucional: Daiane Corrêa Imóveis */}
      <header
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid rgba(0, 0, 0, 0.07)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        }}
      >
        <div
          style={{
            maxWidth: '1120px',
            margin: '0 auto',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          {/* Identidade do Corretor / Imobiliária (Fase 5.4) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {property.broker.logoUrl ? (
              <img
                src={property.broker.logoUrl}
                alt={property.broker.brandName}
                style={{
                  height: '42px',
                  maxWidth: '130px',
                  objectFit: 'contain',
                  borderRadius: '6px',
                }}
              />
            ) : property.broker.avatarUrl ? (
              <img
                src={property.broker.avatarUrl}
                alt={property.broker.name}
                style={{
                  width: '42px',
                  height: '42px',
                  objectFit: 'cover',
                  borderRadius: '10px',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                }}
              />
            ) : (
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: '#1E4620',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.15rem',
                  letterSpacing: '-0.5px',
                  boxShadow: '0 2px 6px rgba(30, 70, 32, 0.25)',
                }}
              >
                {property.broker.brandName
                  ? property.broker.brandName.split(' ').map((w: string) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
                  : 'AN'}
              </div>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: '#111827',
                    letterSpacing: '-0.3px',
                  }}
                >
                  {property.broker.brandName}
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#059669',
                    backgroundColor: '#ECFDF5',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {property.broker.creci}
                </span>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#6B7280' }}>
                Apresentação Digital Exclusiva
              </div>
            </div>
          </div>

          {/* Botão de Contato no Topo (Desktop) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <a
              href={contactWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '9999px',
                backgroundColor: '#25D366',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.86rem',
                boxShadow: '0 2px 8px rgba(37, 211, 102, 0.28)',
                transition: 'transform 0.15s ease',
              }}
            >
              <MessageCircle size={16} />
              <span>Falar com Daiane</span>
            </a>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal da Apresentação */}
      <main style={{ maxWidth: '1120px', margin: '24px auto', padding: '0 20px' }}>
        {/* Banner do Imóvel: Galeria e Visualização Principal */}
        <section
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
            marginBottom: '28px',
          }}
        >
          {/* Área da Imagem Principal */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '460px',
              backgroundColor: '#1E293B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
            onClick={() => setLightboxOpen(true)}
          >
            <img
              src={currentPhoto.url}
              alt={property.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform 0.3s ease',
              }}
            />

            {/* Selo do Tipo de Oferta */}
            <div
              style={{
                position: 'absolute',
                top: '18px',
                left: '18px',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  backgroundColor: '#1E4620',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                  letterSpacing: '0.5px',
                }}
              >
                {property.propertyType}
              </span>
              {property.isDevelopmentOffer && (
                <span
                  style={{
                    backgroundColor: '#0369A1',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  {property.development?.stage || 'Em construção'}
                </span>
              )}
            </div>

            {/* Contador de Fotos */}
            {hasMultiplePhotos && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '18px',
                  right: '18px',
                  backgroundColor: 'rgba(15, 23, 42, 0.75)',
                  backdropFilter: 'blur(4px)',
                  color: '#FFFFFF',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '5px 12px',
                  borderRadius: '20px',
                }}
              >
                {activePhotoIndex + 1} de {images.length} fotos • Clique para ampliar
              </div>
            )}

            {/* Setas de navegação (somente se houver mais de uma foto) */}
            {hasMultiplePhotos && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    prevPhoto();
                  }}
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#1E293B',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    transition: 'background-color 0.2s',
                  }}
                  aria-label="Foto anterior"
                >
                  <ChevronLeft size={22} />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    nextPhoto();
                  }}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#1E293B',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    transition: 'background-color 0.2s',
                  }}
                  aria-label="Próxima foto"
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}
          </div>

          {/* Faixa de Miniaturas (Thumbnails) */}
          {hasMultiplePhotos && (
            <div
              style={{
                display: 'flex',
                gap: '10px',
                padding: '14px 18px',
                overflowX: 'auto',
                backgroundColor: '#FAFAF9',
                borderTop: '1px solid #E5E7EB',
              }}
            >
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActivePhotoIndex(idx)}
                  style={{
                    width: '76px',
                    height: '56px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: activePhotoIndex === idx ? '2.5px solid #1E4620' : '2px solid transparent',
                    cursor: 'pointer',
                    flexShrink: 0,
                    padding: 0,
                    opacity: activePhotoIndex === idx ? 1 : 0.7,
                    transition: 'opacity 0.2s, border 0.2s',
                  }}
                >
                  <img
                    src={img.url}
                    alt={`Foto ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Grade em 2 Colunas: Informações Detalhadas (Esq) + Card de Contato (Dir) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 340px',
            gap: '28px',
            alignItems: 'start',
          }}
          className="presentation-grid"
        >
          {/* Coluna da Esquerda: Dados Principais, Características e Localização */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Bloco de Título e Preço */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(0, 0, 0, 0.06)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
              }}
            >
              {/* Localização formatada */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#6B7280',
                  fontSize: '0.88rem',
                  marginBottom: '8px',
                }}
              >
                <MapPin size={16} color="#059669" />
                <span>
                  {property.locationPrecision === 'HIDDEN'
                    ? property.city
                    : property.neighborhood
                    ? `${property.neighborhood}, ${property.city} - ${property.state}`
                    : `${property.city} - ${property.state}`}
                </span>
              </div>

              <h1
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  color: '#111827',
                  margin: '0 0 14px 0',
                  lineHeight: 1.25,
                }}
              >
                {property.title}
              </h1>

              {/* Valor */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: '#1E4620', letterSpacing: '-0.5px' }}>
                  {formatPrice(property.price)}
                </span>
                <span style={{ fontSize: '0.86rem', color: '#6B7280', fontWeight: 600 }}>
                  {property.purpose === 'Locação' ? '/ mês' : 'valor de venda'}
                </span>
              </div>
            </div>

            {/* Grid de Especificações Rápidas */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                padding: '22px 24px',
                border: '1px solid rgba(0, 0, 0, 0.06)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '16px',
              }}
            >
              {property.privateArea && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#F1F5F9', color: '#334155' }}>
                    <Maximize2 size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                      {property.privateArea} m²
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Área privativa</div>
                  </div>
                </div>
              )}

              {property.landArea && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#F1F5F9', color: '#334155' }}>
                    <Layers size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                      {property.landArea} m²
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Área do terreno</div>
                  </div>
                </div>
              )}

              {property.suites > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#F1F5F9', color: '#334155' }}>
                    <Bed size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                      {property.suites} {property.suites === 1 ? 'suíte' : 'suítes'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                      {property.otherBedrooms && property.otherBedrooms > 0
                        ? `+ ${property.otherBedrooms} dorms`
                        : 'Dormitório master'}
                    </div>
                  </div>
                </div>
              )}

              {property.suites === 0 && property.bedrooms > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#F1F5F9', color: '#334155' }}>
                    <Bed size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                      {property.bedrooms} dormitórios
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Quartos</div>
                  </div>
                </div>
              )}

              {property.bathrooms > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#F1F5F9', color: '#334155' }}>
                    <Bath size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                      {property.bathrooms} {property.bathrooms === 1 ? 'banheiro' : 'banheiros'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Total</div>
                  </div>
                </div>
              )}

              {property.parkingSpaces > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#F1F5F9', color: '#334155' }}>
                    <Car size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                      {property.parkingSpaces} {property.parkingSpaces === 1 ? 'vaga' : 'vagas'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Garagem</div>
                  </div>
                </div>
              )}

              {property.floor && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#F1F5F9', color: '#334155' }}>
                    <Building2 size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                      {property.floor}º andar
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Pavimento</div>
                  </div>
                </div>
              )}
            </div>

            {/* Contexto de Empreendimento (se for lançamento/em construção) */}
            {property.isDevelopmentOffer && property.development && (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid #BAE6FD',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <Building2 size={20} color="#0369A1" />
                  <h2 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Sobre o Empreendimento {property.development.name}
                  </h2>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '12px',
                    marginBottom: '14px',
                  }}
                >
                  <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#F0F9FF' }}>
                    <div style={{ fontSize: '0.72rem', color: '#0284C7', textTransform: 'uppercase', fontWeight: 700 }}>
                      Construtora
                    </div>
                    <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0369A1' }}>
                      {property.development.developer}
                    </div>
                  </div>

                  <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#F0F9FF' }}>
                    <div style={{ fontSize: '0.72rem', color: '#0284C7', textTransform: 'uppercase', fontWeight: 700 }}>
                      Fase da Obra
                    </div>
                    <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0369A1' }}>
                      {property.development.stage}
                    </div>
                  </div>

                  {property.development.deliveryDate && (
                    <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#F0F9FF' }}>
                      <div style={{ fontSize: '0.72rem', color: '#0284C7', textTransform: 'uppercase', fontWeight: 700 }}>
                        Previsão de Entrega
                      </div>
                      <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0369A1' }}>
                        {property.development.deliveryDate}
                      </div>
                    </div>
                  )}
                </div>

                {property.development.description && (
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155', lineHeight: 1.6 }}>
                    {property.development.description}
                  </p>
                )}
              </div>
            )}

            {/* Descrição do Imóvel */}
            {property.description && (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                }}
              >
                <h2 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#111827', margin: '0 0 12px 0' }}>
                  Descrição
                </h2>
                <div
                  style={{
                    fontSize: '0.94rem',
                    color: '#374151',
                    lineHeight: 1.7,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {property.description}
                </div>
              </div>
            )}

            {/* Diferenciais e Comodidades */}
            {amenities.length > 0 && (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                }}
              >
                <h2 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#111827', margin: '0 0 16px 0' }}>
                  Destaques e Comodidades
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {amenities.map((item, idx) => (
                    <span
                      key={idx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        backgroundColor: '#F0FDF4',
                        color: '#166534',
                        border: '1px solid #BBF7D0',
                        fontSize: '0.86rem',
                        fontWeight: 700,
                      }}
                    >
                      <Check size={14} color="#059669" />
                      <span>{item.label}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Localização Permitida */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(0, 0, 0, 0.06)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Compass size={20} color="#1E4620" />
                <h2 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                  Localização
                </h2>
              </div>

              {property.locationPrecision === 'EXACT' ? (
                <div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.94rem', color: '#1F2937', fontWeight: 600 }}>
                    {property.address}
                    {property.number ? `, ${property.number}` : ''}
                    {property.neighborhood ? ` — ${property.neighborhood}` : ''}, {property.city} - {property.state}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#6B7280' }}>
                    Localização exata disponibilizada pela corretora responsável.
                  </p>
                </div>
              ) : property.locationPrecision === 'APPROXIMATE' ? (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    backgroundColor: '#F8FAF9',
                    border: '1px solid #E5E7EB',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <MapPin size={18} color="#059669" />
                    <strong style={{ fontSize: '0.96rem', color: '#111827' }}>
                      Bairro {property.neighborhood || 'Central'}, {property.city} - {property.state}
                    </strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#6B7280' }}>
                    Por privacidade e discrição ao proprietário, a localização acima é aproximada. Para agendar visita ou obter o endereço exato, contate a corretora.
                  </p>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '0.92rem', color: '#4B5563' }}>
                  Localizado na região de <strong>{property.city} - {property.state}</strong>.
                </p>
              )}

              {/* Mapa com basemaps (Mapa / Satélite) e privacidade estrita */}
              {property.locationPrecision !== 'HIDDEN' && (
                <PublicPropertyMap
                  locationPrecision={property.locationPrecision}
                  latitude={property.latitude}
                  longitude={property.longitude}
                  approximateCenter={property.approximateCenter}
                  neighborhood={property.neighborhood}
                  city={property.city || 'Criciúma'}
                  title={property.title}
                />
              )}
            </div>
          </div>

          {/* Coluna da Direita: Card de Apresentação e Contato com Daiane Corrêa */}
          <aside style={{ position: 'sticky', top: '80px' }}>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.08)',
              }}
            >
              {/* Perfil do Corretor */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                {property.broker.avatarUrl ? (
                  <img
                    src={property.broker.avatarUrl}
                    alt={property.broker.name}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      backgroundColor: '#1E4620',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      boxShadow: '0 4px 10px rgba(30, 70, 32, 0.25)',
                      flexShrink: 0,
                    }}
                  >
                    {property.broker.name
                      ? property.broker.name.split(' ').map((w: string) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
                      : 'AN'}
                  </div>
                )}
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', margin: '0 0 2px 0' }}>
                    {property.broker.name}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700 }}>
                    {property.broker.creci}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#6B7280' }}>
                    {property.broker.brandName}
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '0.84rem', color: '#4B5563', lineHeight: 1.5, margin: '0 0 20px 0' }}>
                {property.broker.tagline}. Atendimento consultivo, rápido e focado nas melhores oportunidades de Criciúma.
              </p>

              {/* Botão de Ação WhatsApp (CTA Principal) */}
              <a
                href={contactWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: '12px',
                  backgroundColor: '#25D366',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.98rem',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(37, 211, 102, 0.35)',
                  marginBottom: '12px',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <MessageCircle size={20} />
                <span>Tenho Interesse neste Imóvel</span>
              </a>

              {/* Informações de Contato Direto */}
              <div
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  backgroundColor: '#F8FAF9',
                  border: '1px solid #E5E7EB',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '0.8rem',
                  color: '#374151',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Phone size={14} color="#6B7280" />
                  <span>{property.broker.formattedPhone}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={14} color="#6B7280" />
                  <span>{property.broker.email}</span>
                </div>
              </div>

              {/* Selo de Confiança */}
              <div
                style={{
                  marginTop: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.74rem',
                  color: '#6B7280',
                  justifyContent: 'center',
                }}
              >
                <Shield size={14} color="#059669" />
                <span>Consultoria credenciada e segura</span>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Barra Flutuante de Contato no Mobile (Sticky Bottom) */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid rgba(0, 0, 0, 0.1)',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.08)',
          zIndex: 50,
        }}
        className="mobile-cta-bar"
      >
        <div>
          <div style={{ fontSize: '0.72rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700 }}>
            Valor
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1E4620' }}>
            {formatPrice(property.price)}
          </div>
        </div>

        <a
          href={contactWhatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '11px 20px',
            borderRadius: '10px',
            backgroundColor: '#25D366',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '0.9rem',
            textDecoration: 'none',
            boxShadow: '0 2px 8px rgba(37, 211, 102, 0.3)',
          }}
        >
          <MessageCircle size={18} />
          <span>Falar com {property.broker.name ? property.broker.name.split(' ')[0] : 'Corretor'}</span>
        </a>
      </div>

      {/* Lightbox / Visualizador em Tela Cheia */}
      {lightboxOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.94)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'none',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              padding: '8px',
            }}
            aria-label="Fechar galeria"
          >
            <X size={28} />
          </button>

          <img
            src={currentPhoto.url}
            alt={property.title}
            style={{
              maxWidth: '92vw',
              maxHeight: '85vh',
              objectFit: 'contain',
              borderRadius: '8px',
            }}
            onClick={(e) => e.stopPropagation()}
          />

          {hasMultiplePhotos && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prevPhoto();
                }}
                style={{
                  position: 'absolute',
                  left: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <ChevronLeft size={28} />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  nextPhoto();
                }}
                style={{
                  position: 'absolute',
                  right: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <ChevronRight size={28} />
              </button>
            </>
          )}
        </div>
      )}

      {/* Rodapé da Apresentação */}
      <footer
        style={{
          marginTop: '60px',
          padding: '24px 20px',
          borderTop: '1px solid #E5E7EB',
          backgroundColor: '#FFFFFF',
          textAlign: 'center',
          fontSize: '0.8rem',
          color: '#6B7280',
        }}
      >
        <p style={{ margin: '0 0 6px 0', fontWeight: 600, color: '#374151' }}>
          {property.broker.brandName} • {property.broker.creci}
        </p>
        <p style={{ margin: '0 0 8px 0' }}>
          {property.broker.city} • Apresentação preparada exclusivamente para você
        </p>
        <p style={{ margin: 0, fontSize: '0.72rem', color: '#9CA3AF' }}>
          Tecnologia Área Nobre
        </p>
      </footer>
    </div>
  );
}
