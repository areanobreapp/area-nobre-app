'use client';

import React from 'react';
import Link from 'next/link';
import {
  Layers,
  Bed,
  Bath,
  Car,
  Maximize2,
  Users,
  ExternalLink,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { PublicBuildingFloorDTO, PublicBuildingUnitDTO } from '@/lib/public-building-dto';

interface BuildingApartmentListProps {
  floors: PublicBuildingFloorDTO[];
  hasAvailableUnits: boolean;
  buildingName: string;
}

export default function BuildingApartmentList({
  floors,
  hasAvailableUnits,
  buildingName,
}: BuildingApartmentListProps) {
  if (!hasAvailableUnits || floors.length === 0) {
    return (
      <section
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E5E7EB',
          padding: '36px 20px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#F3F4F6',
            color: '#6B7280',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px auto',
          }}
        >
          <Building size={24} />
        </div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1F2937', margin: '0 0 6px 0' }}>
          Nenhum apartamento anunciado no momento
        </h3>
        <p style={{ fontSize: '0.86rem', color: '#6B7280', margin: '0 0 18px 0', maxWidth: '420px', marginInline: 'auto' }}>
          Este condomínio faz parte do Cadastro Mestre do Área Nobre, mas ainda não possui unidades ativas anunciadas por nossos corretores parceiros.
        </p>
        <Link
          href="/mapa"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 18px',
            backgroundColor: '#1E4620',
            color: '#FFFFFF',
            borderRadius: '8px',
            fontSize: '0.88rem',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Buscar outros imóveis no mapa
        </Link>
      </section>
    );
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            Apartamentos Disponíveis
          </h2>
          <span style={{ fontSize: '0.82rem', color: '#6B7280' }}>
            Agrupados por pavimento e unidade física com preço canônico garantido
          </span>
        </div>
      </div>

      {/* Lista de Pavimentos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {floors.map((floorGroup, fIdx) => (
          <div
            key={`floor_${floorGroup.tower || 'notower'}_${floorGroup.floor ?? 'unk'}_${fIdx}`}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            {/* Cabeçalho do Pavimento */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                padding: '10px 16px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} style={{ color: '#1E4620' }} />
                <strong style={{ fontSize: '0.90rem', color: '#1E293B', fontWeight: 800 }}>
                  {floorGroup.floorLabel}
                </strong>
              </div>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: '#475569',
                  backgroundColor: '#E2E8F0',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}
              >
                {floorGroup.units.length} {floorGroup.units.length === 1 ? 'unidade' : 'unidades'}
              </span>
            </div>

            {/* Unidades Físicas deste Pavimento */}
            <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {floorGroup.units.map((unit) => (
                <UnitCard key={unit.physicalPropertyId} unit={unit} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function UnitCard({ unit }: { unit: PublicBuildingUnitDTO }) {
  return (
    <article
      style={{
        backgroundColor: unit.hasMyListing ? '#F0FDF4' : '#FAFAFA',
        border: unit.hasMyListing ? '1.5px solid #86EFAC' : '1px solid #E5E7EB',
        borderRadius: '10px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'all 0.15s ease',
      }}
    >
      {/* Topo do Card: Identificação da Unidade e Preço Canônico */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', margin: 0 }}>
              {unit.unitNumber ? `Apartamento ${unit.unitNumber}` : unit.title}
            </h3>
            {unit.hasMyListing && (
              <span
                style={{
                  fontSize: '0.70rem',
                  fontWeight: 800,
                  color: '#166534',
                  backgroundColor: '#DCFCE7',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid #86EFAC',
                }}
              >
                Seu Anúncio
              </span>
            )}
          </div>
          {unit.unitNumber && unit.title && unit.title.toLowerCase() !== `apartamento ${unit.unitNumber}`.toLowerCase() && (
            <span style={{ fontSize: '0.80rem', color: '#6B7280', display: 'block', marginTop: '2px' }}>
              {unit.title}
            </span>
          )}
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.70rem', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>
            Preço Canônico
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1E4620' }}>
            R$ {unit.price.toLocaleString('pt-BR')}
          </span>
        </div>
      </div>

      {/* Atributos Estruturais da Unidade */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '0.80rem',
          color: '#374151',
          padding: '8px 12px',
          backgroundColor: '#FFFFFF',
          borderRadius: '6px',
          border: '1px solid #E5E7EB',
        }}
      >
        {unit.privateArea && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Maximize2 size={13} style={{ color: '#1E4620' }} />
            <strong>{unit.privateArea} m²</strong> privativos
          </span>
        )}
        {unit.bedrooms > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Bed size={13} style={{ color: '#1E4620' }} />
            <strong>{unit.bedrooms}</strong> {unit.bedrooms === 1 ? 'quarto' : 'quartos'} {unit.suites > 0 ? `(${unit.suites} suíte)` : ''}
          </span>
        )}
        {unit.bathrooms > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Bath size={13} style={{ color: '#1E4620' }} />
            <strong>{unit.bathrooms}</strong> banheiros
          </span>
        )}
        {unit.parkingSpaces > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Car size={13} style={{ color: '#1E4620' }} />
            <strong>{unit.parkingSpaces}</strong> {unit.parkingSpaces === 1 ? 'vaga' : 'vagas'}
          </span>
        )}
      </div>

      {/* Seção Neutra de Corretores Parceiros Responsáveis */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          paddingTop: '8px',
          borderTop: '1px dashed #D1D5DB',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              color: '#3730A3',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Users size={12} />
            {unit.listings.length === 1
              ? '1 Corretor Credenciado anunciando esta unidade:'
              : `${unit.listings.length} Corretores Credenciados anunciando esta unidade:`}
          </span>
        </div>

        {/* Grade de Corretores com Apresentação Equitativa */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '8px',
          }}
        >
          {unit.listings.map((listing) => (
            <BrokerCard key={listing.id} listing={listing} />
          ))}
        </div>
      </div>
    </article>
  );
}

function BrokerCard({ listing }: { listing: any }) {
  const broker = listing.broker;
  const isMine = Boolean(listing.isMine);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 10px',
        backgroundColor: isMine ? '#EEF2FF' : '#FFFFFF',
        border: isMine ? '1px solid #A5B4FC' : '1px solid #E2E8F0',
        borderRadius: '6px',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
        {/* Avatar ou Inicial */}
        {broker.avatarUrl || broker.logoUrl ? (
          <img
            src={broker.avatarUrl || broker.logoUrl}
            alt={broker.commercialName}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              objectFit: 'cover',
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#4F46E5',
              color: '#FFFFFF',
              fontSize: '11px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {broker.commercialName.charAt(0).toUpperCase()}
          </div>
        )}

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span
              style={{
                fontSize: '0.80rem',
                fontWeight: 700,
                color: '#1F2937',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={broker.commercialName}
            >
              {broker.commercialName}
            </span>
            {isMine && (
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  color: '#4F46E5',
                  backgroundColor: '#E0E7FF',
                  padding: '1px 4px',
                  borderRadius: '3px',
                }}
              >
                Você
              </span>
            )}
          </div>
          {broker.creci && (
            <span style={{ fontSize: '0.68rem', color: '#6B7280', display: 'block' }}>
              CRECI: {broker.creci}
            </span>
          )}
        </div>
      </div>

      {/* Botão de Acesso ao Anúncio */}
      <Link
        href={`/imoveis/${listing.id}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          backgroundColor: '#4F46E5',
          color: '#FFFFFF',
          borderRadius: '4px',
          fontSize: '0.74rem',
          fontWeight: 700,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          boxShadow: '0 1px 2px rgba(79, 70, 229, 0.2)',
          transition: 'all 0.15s ease',
        }}
      >
        <span>Ver Anúncio</span>
        <ExternalLink size={11} />
      </Link>
    </div>
  );
}

