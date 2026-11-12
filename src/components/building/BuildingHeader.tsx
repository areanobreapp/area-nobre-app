'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Building2,
  Share2,
  ArrowLeft,
  Check,
  Copy,
  Layers,
  Sparkles,
} from 'lucide-react';
import { PublicBuildingDTO } from '@/lib/public-building-dto';

interface BuildingHeaderProps {
  building: PublicBuildingDTO;
}

export default function BuildingHeader({ building }: BuildingHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const shareData = {
      title: `${building.name} — Área Nobre`,
      text: `Conheça os apartamentos disponíveis no ${building.name} em ${building.neighborhood || building.city}.`,
      url,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        setShareFeedback('Compartilhado com sucesso!');
        setTimeout(() => setShareFeedback(null), 3000);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback: cópia para a área de transferência
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setShareFeedback('Link copiado para a área de transferência!');
      setTimeout(() => {
        setCopied(false);
        setShareFeedback(null), 3000;
      }, 3000);
    } catch {
      setShareFeedback('Não foi possível copiar o link.');
      setTimeout(() => setShareFeedback(null), 3000);
    }
  };

  const addressFormatted = [
    building.address ? `${building.address}${building.number ? `, ${building.number}` : ''}` : null,
    building.neighborhood,
    `${building.city} - ${building.state}`,
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <header style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
      {/* Barra de Navegação Superior */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <Link
          href="/mapa"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#1E4620',
            fontWeight: 700,
            fontSize: '0.88rem',
            textDecoration: 'none',
            padding: '8px 14px',
            backgroundColor: '#F0FDF4',
            borderRadius: '8px',
            border: '1px solid #BBF7D0',
            transition: 'all 0.15s ease',
          }}
        >
          <ArrowLeft size={16} />
          <span>Voltar ao Mapa</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            id="btn-share-building"
            onClick={handleShare}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.15s ease',
            }}
          >
            {copied ? <Check size={16} color="#16A34A" /> : <Share2 size={16} />}
            <span>{copied ? 'Link Copiado!' : 'Compartilhar'}</span>
          </button>
        </div>
      </div>

      {/* Notificação de Feedback do Compartilhamento */}
      {shareFeedback && (
        <div
          style={{
            backgroundColor: '#DCFCE7',
            color: '#166534',
            padding: '8px 14px',
            borderRadius: '6px',
            fontSize: '0.82rem',
            fontWeight: 600,
            border: '1px solid #86EFAC',
          }}
        >
          {shareFeedback}
        </div>
      )}

      {/* Banner / Fachada Coletiva do Edifício */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '240px',
          maxHeight: '35vh',
          borderRadius: '16px',
          overflow: 'hidden',
          backgroundColor: '#0F172A',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        }}
      >
        {building.coverImageUrl ? (
          <>
            <img
              src={building.coverImageUrl}
              alt={`Fachada oficial do ${building.name}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                background: 'rgba(30, 70, 32, 0.92)',
                color: '#FFFFFF',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.74rem',
                fontWeight: 800,
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Building2 size={14} />
              <span>Fotografia Oficial da Fachada</span>
            </div>
          </>
        ) : (
          /* Placeholder elegante caso não haja fachada */
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#1E293B',
              color: '#94A3B8',
              gap: '8px',
              padding: '20px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#CBD5E1',
              }}
            >
              <Building2 size={28} />
            </div>
            <strong style={{ fontSize: '0.96rem', color: '#E2E8F0' }}>
              Cadastro Coletivo do Condomínio
            </strong>
            <span style={{ fontSize: '0.76rem', color: '#94A3B8' }}>
              Fotografia da fachada ainda não enviada pelos corretores parceiros
            </span>
          </div>
        )}
      </div>

      {/* Identificação Principal do Edifício */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              backgroundColor: '#E8F5E9',
              color: '#1E4620',
              fontWeight: 800,
              fontSize: '0.74rem',
              padding: '3px 10px',
              borderRadius: '999px',
              border: '1px solid #C8E6C9',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Condomínio Residencial
          </span>

          {building.boundaryArea && (
            <span
              style={{
                backgroundColor: '#F0FDF4',
                color: '#15803D',
                fontWeight: 700,
                fontSize: '0.74rem',
                padding: '3px 10px',
                borderRadius: '999px',
                border: '1px solid #BBF7D0',
              }}
            >
              Terreno Coletivo: {Math.round(building.boundaryArea)} m²
            </span>
          )}

          {building.geoValidationStatus === 'ADMIN_VALIDATED' && (
            <span
              style={{
                backgroundColor: '#EFF6FF',
                color: '#1D4ED8',
                fontWeight: 700,
                fontSize: '0.74rem',
                padding: '3px 10px',
                borderRadius: '999px',
                border: '1px solid #BFDBFE',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Sparkles size={12} /> Localização Validada
            </span>
          )}
        </div>

        <h1
          style={{
            fontSize: '1.85rem',
            fontWeight: 900,
            color: '#111827',
            margin: '4px 0 0 0',
            lineHeight: 1.2,
          }}
        >
          {building.name}
        </h1>

        <p
          style={{
            fontSize: '0.94rem',
            color: '#4B5563',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <MapPin size={16} style={{ color: '#1E4620', flexShrink: 0 }} />
          <span>{addressFormatted}</span>
        </p>
      </div>

      {/* Cartões de Métricas Globais */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '12px',
          backgroundColor: '#F8FAFC',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', fontWeight: 800, textTransform: 'uppercase' }}>
            Unidades Anunciadas
          </span>
          <strong style={{ fontSize: '1.45rem', color: '#1E4620', fontWeight: 900 }}>
            {building.totalUnitsCount}
          </strong>
          <span style={{ fontSize: '0.70rem', color: '#15803D', display: 'block' }}>
            {building.totalUnitsCount === 1 ? 'apartamento físico' : 'apartamentos físicos'}
          </span>
        </div>

        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', fontWeight: 800, textTransform: 'uppercase' }}>
            Anúncios Ativos
          </span>
          <strong style={{ fontSize: '1.45rem', color: '#1D4ED8', fontWeight: 900 }}>
            {building.totalListingsCount}
          </strong>
          <span style={{ fontSize: '0.70rem', color: '#2563EB', display: 'block' }}>
            co-anúncios credenciados
          </span>
        </div>

        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', fontWeight: 800, textTransform: 'uppercase' }}>
            Menor Preço
          </span>
          <strong style={{ fontSize: '1.25rem', color: '#1E4620', fontWeight: 900, whiteSpace: 'nowrap' }}>
            {building.minPrice ? `R$ ${building.minPrice.toLocaleString('pt-BR')}` : 'Sob Consulta'}
          </strong>
          <span style={{ fontSize: '0.70rem', color: '#64748B', display: 'block' }}>
            {building.minPrice ? 'valor de entrada' : 'sem unidades ativas'}
          </span>
        </div>
      </div>
    </header>
  );
}

