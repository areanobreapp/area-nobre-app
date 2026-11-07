'use client';

import React from 'react';
import { Bed, Bath, Car, Maximize2, Info } from 'lucide-react';
import {
  PropertyFeaturesInput,
  resolveMainArea,
  resolveBedrooms,
  resolveBathrooms,
  resolveParking,
  resolveIndividualFeatureCards,
  isLand,
} from '@/lib/property-display';

/**
 * 1. COMPONENTE COMPACTO PARA CARDS (Listagem de Imóveis, Tipologias, Matches)
 * Compacto, com rótulos por extenso legíveis no celular.
 */
export function PropertyCompactFeatures({
  property,
  className = '',
}: {
  property: PropertyFeaturesInput;
  className?: string;
}) {
  const mainArea = resolveMainArea(property);
  const bedInfo = resolveBedrooms(property);
  const bathInfo = resolveBathrooms(property);
  const parkInfo = resolveParking(property);
  const isLandPlot = isLand(property.propertyType);

  if (isLandPlot) {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
          padding: '8px 0',
          borderTop: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
          flexWrap: 'wrap',
        }}
      >
        {mainArea ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              color: 'var(--color-primary)',
              backgroundColor: 'var(--color-primary-light)',
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <Maximize2 size={13} color="var(--color-primary)" />
            <span>{mainArea.formatted} ({mainArea.label})</span>
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.78rem' }}>
            Metragem a consultar
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={className}
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
      {bedInfo !== null && (
        <span
          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          title={bedInfo.suites > 0 ? `${bedInfo.total} quartos totais, sendo ${bedInfo.suites} suíte(s)` : `${bedInfo.total} quartos`}
        >
          <Bed size={14} color="var(--color-primary)" />
          <span>
            <strong style={{ color: 'var(--text-primary)' }}>{bedInfo.total}</strong>{' '}
            <span style={{ color: 'var(--text-secondary)' }}>{bedInfo.total === 1 ? 'quarto' : 'quartos'}</span>
            {bedInfo.suites > 0 && (
              <span style={{ fontSize: '0.74rem', color: 'var(--color-primary)', fontWeight: 600, marginLeft: 2 }}>
                ({bedInfo.suites} {bedInfo.suites === 1 ? 'suíte' : 'suítes'})
              </span>
            )}
          </span>
        </span>
      )}

      {bathInfo !== null && (
        <span
          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          title={`${bathInfo.total} banheiros totais`}
        >
          <Bath size={14} color="var(--color-primary)" />
          <span>
            <strong style={{ color: 'var(--text-primary)' }}>{bathInfo.total}</strong>{' '}
            <span style={{ color: 'var(--text-secondary)' }}>{bathInfo.total === 1 ? 'banheiro' : 'banheiros'}</span>
          </span>
        </span>
      )}

      {parkInfo !== null && (
        <span
          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          title={`${parkInfo.total} vagas totais`}
        >
          <Car size={14} color="var(--color-primary)" />
          <span>
            <strong style={{ color: 'var(--text-primary)' }}>{parkInfo.total}</strong>{' '}
            <span style={{ color: 'var(--text-secondary)' }}>{parkInfo.total === 1 ? 'vaga' : 'vagas'}</span>
          </span>
        </span>
      )}

      {mainArea && (
        <span
          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}
          title={mainArea.label}
        >
          <Maximize2 size={14} color="var(--color-primary)" />
          <span>
            <strong style={{ color: 'var(--text-primary)' }}>{mainArea.formatted}</strong>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500, marginLeft: 3 }}>
              {mainArea.label === 'Área Privativa' ? 'privativa' : mainArea.label === 'Área Construída' ? 'construída' : mainArea.label === 'Área do Terreno' ? 'terreno' : 'total'}
            </span>
          </span>
        </span>
      )}
    </div>
  );
}

/**
 * 2. NOVA GRADE DE CARACTERÍSTICAS INDIVIDUAIS (Etapa 4A Refinamento)
 * Cartões compactos e autoexplicativos em grade responsiva (2 colunas no celular, 3-4 no desktop).
 * Elimina redundância e apresenta suítes, banheiros sociais, lavabos e vagas em cartões dedicados.
 */
export function PropertyIndividualFeaturesGrid({
  property,
  isPublic = false,
}: {
  property: PropertyFeaturesInput;
  isPublic?: boolean;
}) {
  const cards = resolveIndividualFeatureCards(property, {
    excludeTotalBathrooms: true,
    isPublic,
  });
  const bedInfo = resolveBedrooms(property);
  const isLandPlot = isLand(property.propertyType);
  const hasSuites = (bedInfo?.suites ?? 0) > 0;

  if (cards.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div className="property-individual-grid">
        {cards.map((card) => {
          // Em apresentação pública, evita cartões com cores de erro/aviso de manutenção
          const isWarning = !isPublic && (card.badge?.type === 'warning' || card.isResidual);

          let IconComponent = Bed;
          if (card.icon === 'bath') IconComponent = Bath;
          else if (card.icon === 'car') IconComponent = Car;
          else if (card.icon === 'maximize') IconComponent = Maximize2;

          return (
            <div
              key={card.id}
              style={{
                padding: '12px 14px',
                backgroundColor: isWarning ? '#FFFBEB' : 'var(--bg-subtle, #F1F4F2)',
                borderRadius: 'var(--radius-sm, 8px)',
                border: isWarning ? '1px solid #FDE68A' : '1px solid var(--border-subtle, #E5E7EB)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '4px',
                minHeight: '82px',
                transition: 'border-color var(--transition-fast)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <IconComponent size={16} color={isWarning ? '#B45309' : 'var(--color-primary, #1E4620)'} />
                {card.badge && (
                  <span
                    style={{
                      fontSize: '0.64rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-full, 9999px)',
                      backgroundColor: isWarning ? '#FEF3C7' : '#EFF6FF',
                      color: isWarning ? '#92400E' : '#1E40AF',
                      border: isWarning ? '1px solid #FDE68A' : '1px solid #BFDBFE',
                    }}
                  >
                    {card.badge.label}
                  </span>
                )}
              </div>

              <div>
                <div
                  style={{
                    fontSize: typeof card.value === 'string' ? '1.10rem' : '1.30rem',
                    fontWeight: 800,
                    color: isWarning ? '#78350F' : 'var(--text-primary, #111827)',
                    lineHeight: 1.1,
                  }}
                >
                  {card.value}
                </div>
                <div
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: isWarning ? '#92400E' : 'var(--text-secondary, #4B5563)',
                    marginTop: '2px',
                    lineHeight: 1.2,
                  }}
                >
                  {card.title}
                </div>
                {card.sublabel && (
                  <div
                    style={{
                      fontSize: '0.68rem',
                      color: isWarning ? '#B45309' : 'var(--text-muted, #6B7280)',
                      marginTop: '2px',
                    }}
                  >
                    {card.sublabel}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rodapé explicativo condizente com a nova apresentação (Seção 6) */}
      {!isLandPlot && hasSuites && (
        <div
          style={{
            fontSize: '0.74rem',
            color: 'var(--text-muted, #6B7280)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 2px',
          }}
        >
          <Info size={13} color="var(--color-primary, #1E4620)" style={{ flexShrink: 0 }} />
          <span>
            {isPublic
              ? 'Cada suíte possui seu próprio banheiro. Os cartões de banheiros sociais, lavabos e adicionais representam apenas os banheiros fora das suítes.'
              : 'Cada suíte possui seu próprio banheiro. Os cartões de banheiros sociais, lavabos e não classificados representam apenas os banheiros fora das suítes.'}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * 3. COMPONENTE PARA APRESENTAÇÃO PÚBLICA DE IMÓVEIS (Etapa 4B)
 * Adaptado para clientes externos, sem alertas ou jargões técnicos cadastrais.
 */
export function PublicPropertyFeaturesGrid({
  property,
}: {
  property: PropertyFeaturesInput;
}) {
  return <PropertyIndividualFeaturesGrid property={property} isPublic={true} />;
}

// Aliases para compatibilidade
export const PropertyFeaturesOverview = PropertyIndividualFeaturesGrid;
export const PropertyFeaturesDetailSection = () => null;
