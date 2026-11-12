'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  X,
  Layers,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building,
  User,
  Clock,
  ArrowRight,
  Loader2,
  ShieldCheck,
  FileText,
  Percent,
} from 'lucide-react';
import { ModerationQueueItem } from '@/lib/building-moderation-service';
import { createBaseMapTileLayer } from '@/lib/geo/basemaps';
import { parseGeoJsonToLatLngs, calculateSphericalArea } from '@/lib/geo/polygon';

interface BoundaryModerationModalProps {
  item: ModerationQueueItem;
  onClose: () => void;
  onDecide: (decision: 'APPROVE' | 'REJECT', notes: string) => Promise<void>;
}

export default function BoundaryModerationModal({
  item,
  onClose,
  onDecide,
}: BoundaryModerationModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const [confirmAction, setConfirmAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentBoundary = item.building.currentBoundary || null;
  const currentArea = item.building.currentBoundaryArea || 0;

  const proposedBoundary = item.boundaryData?.boundary || null;
  const proposedArea = item.boundaryData?.boundaryArea || 0;

  // Cálculo da variação percentual de área
  const areaDeltaPercent =
    currentArea > 0 && proposedArea > 0
      ? Math.round(((proposedArea - currentArea) / currentArea) * 100)
      : null;

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Coordenada inicial de centro
    const defaultCenter: [number, number] = [
      item.building.currentLatitude ?? -28.6775,
      item.building.currentLongitude ?? -49.3705,
    ];

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 18,
      zoomControl: true,
    });
    mapInstanceRef.current = map;

    const tileLayer = createBaseMapTileLayer('street');
    tileLayer.addTo(map);

    const layerGroup = L.featureGroup().addTo(map);

    // 1. Renderiza Perímetro Vigente (Azul / Contínuo)
    if (currentBoundary) {
      try {
        const currentGeoJson = JSON.parse(currentBoundary);
        const curLayer = L.geoJSON(currentGeoJson, {
          style: {
            color: '#2563EB',
            weight: 3,
            fillColor: '#3B82F6',
            fillOpacity: 0.22,
          },
        }).bindPopup(`<b>Perímetro Vigente</b><br>${item.building.name}<br>Área: ~${Math.round(currentArea)} m²`);
        curLayer.addTo(layerGroup);
      } catch (err) {
        console.warn('Falha ao renderizar perímetro vigente:', err);
      }
    }

    // 2. Renderiza Perímetro Proposto (Laranja/Âmbar / Tracejado)
    if (proposedBoundary) {
      try {
        const proposedGeoJson = JSON.parse(proposedBoundary);
        const propLayer = L.geoJSON(proposedGeoJson, {
          style: {
            color: '#D97706',
            weight: 3.5,
            dashArray: '6, 6',
            fillColor: '#F59E0B',
            fillOpacity: 0.35,
          },
        }).bindPopup(
          `<b>Proposta do Corretor</b><br>${item.broker.name}<br>Área: ~${Math.round(proposedArea)} m²`
        );
        propLayer.addTo(layerGroup);
      } catch (err) {
        console.warn('Falha ao renderizar perímetro proposto:', err);
      }
    }

    // Enquadra a visão nos polígonos
    if (layerGroup.getLayers().length > 0) {
      map.fitBounds(layerGroup.getBounds(), { padding: [50, 50], maxZoom: 19 });
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [currentBoundary, proposedBoundary, currentArea, proposedArea, item]);

  const handleExecuteDecision = async () => {
    if (!confirmAction) return;
    if (confirmAction === 'REJECT' && !decisionNotes.trim()) {
      setErrorMsg('A justificativa é obrigatória para rejeição.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onDecide(confirmAction, decisionNotes.trim() || 'Aprovado pelo administrador.');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao processar decisão de terreno.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '1100px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Cabeçalho */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#1E4620',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={22} style={{ color: '#86EFAC' }} />
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                Moderação de Terreno Coletivo
              </h2>
              <div style={{ fontSize: '0.80rem', color: '#BBF7D0' }}>
                {item.building.name} • {item.building.neighborhood}, {item.building.city}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: '#FFFFFF',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo: Mapa + Painel Lateral */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(340px, 1fr) 360px',
            flex: 1,
            minHeight: '490px',
            overflow: 'hidden',
          }}
        >
          {/* Coluna 1: Mapa Interativo */}
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '440px' }} />

            {/* Legenda Flutuante do Mapa */}
            <div
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                backgroundColor: 'rgba(255,255,255,0.95)',
                padding: '10px 14px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                fontSize: '0.78rem',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '16px', height: '10px', backgroundColor: '#3B82F6', border: '2px solid #2563EB' }} />
                <span>Perímetro Vigente</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '16px', height: '10px', backgroundColor: '#F59E0B', border: '2px dashed #D97706' }} />
                <span>Proposta do Corretor</span>
              </div>
            </div>
          </div>

          {/* Coluna 2: Análise Geométrica e Decisão */}
          <div
            style={{
              padding: '20px',
              backgroundColor: '#F9FAFB',
              borderLeft: '1px solid #E5E7EB',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              overflowY: 'auto',
            }}
          >
            <div>
              {/* Quadro de Comparação de Área */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  padding: '14px',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  marginBottom: '16px',
                }}
              >
                <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Comparativo de Área Territorial
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.70rem', color: '#6B7280' }}>Área Vigente</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#2563EB' }}>
                      {currentArea > 0 ? `${Math.round(currentArea)} m²` : 'Sem delimitação'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.70rem', color: '#6B7280' }}>Área Proposta</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#D97706' }}>
                      {proposedArea > 0 ? `${Math.round(proposedArea)} m²` : '—'}
                    </div>
                  </div>
                </div>

                {areaDeltaPercent !== null && (
                  <div
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      backgroundColor: Math.abs(areaDeltaPercent) > 20 ? '#FEF2F2' : '#F0FDF4',
                      color: Math.abs(areaDeltaPercent) > 20 ? '#991B1B' : '#166534',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'inline-block',
                    }}
                  >
                    Variação: {areaDeltaPercent > 0 ? `+${areaDeltaPercent}%` : `${areaDeltaPercent}%`}
                  </div>
                )}
              </div>

              {/* Origem e Classificação Cadastral */}
              <div
                style={{
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '10px',
                  padding: '12px',
                  marginBottom: '16px',
                  fontSize: '0.78rem',
                }}
              >
                <div style={{ fontWeight: 800, color: '#1E40AF', marginBottom: '4px' }}>
                  Origem: Desenho Manual Colaborativo
                </div>
                <div style={{ color: '#374151', lineHeight: 1.35 }}>
                  Geometria delimitada por corretor. A aprovação a classifica como{' '}
                  <strong>Administrativamente Validada</strong>, sem convertê-la falsamente em cadastro oficial da prefeitura.
                </div>
              </div>

              {/* Dados do Autor e Justificativa */}
              <div style={{ fontSize: '0.80rem', color: '#374151', marginBottom: '16px' }}>
                <div style={{ marginBottom: '6px' }}>
                  <strong>Corretor:</strong> {item.broker.name}
                  {item.broker.commercialName && ` (${item.broker.commercialName})`}
                </div>
                <div style={{ marginBottom: '6px' }}>
                  <strong>Data de Envio:</strong> {new Date(item.createdAt).toLocaleString('pt-BR')}
                </div>
                {item.justification && (
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      marginTop: '6px',
                      fontStyle: 'italic',
                      fontSize: '0.76rem',
                    }}
                  >
                    &ldquo;{item.justification}&rdquo;
                  </div>
                )}
              </div>
            </div>

            {/* Ações */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px' }}>
              <button
                type="button"
                onClick={() => setConfirmAction('APPROVE')}
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#1E4620',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <CheckCircle2 size={16} /> Aprovar Perímetro Proposto
              </button>

              <button
                type="button"
                onClick={() => setConfirmAction('REJECT')}
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#FFFFFF',
                  color: '#DC2626',
                  border: '1px solid #DC2626',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <XCircle size={16} /> Rejeitar Proposta
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação com Justificativa */}
      {confirmAction && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            zIndex: 100000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              padding: '24px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 30px rgba(0,0,0,0.3)',
            }}
          >
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 12px 0', color: '#111827' }}>
              {confirmAction === 'APPROVE' ? 'Confirmar Aprovação do Terreno' : 'Confirmar Rejeição do Terreno'}
            </h3>

            <p style={{ fontSize: '0.84rem', color: '#4B5563', margin: '0 0 16px 0', lineHeight: 1.45 }}>
              {confirmAction === 'APPROVE'
                ? 'A aprovação atualizará o lote cadastral e sincronizará o terreno oficial coletivo do condomínio. Os polígonos particulares dos anúncios permanecerão intocados.'
                : 'A rejeição manterá o terreno coletivo vigente inalterado. Informe a justificativa administrativa.'}
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                Justificativa Administrativa {confirmAction === 'REJECT' && <span style={{ color: '#DC2626' }}>*</span>}
              </label>
              <textarea
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder="Ex: Perímetro confrontado com a cerca física e aprovado como terreno coletivo do edifício."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.84rem',
                  resize: 'none',
                }}
              />
            </div>

            {errorMsg && (
              <div style={{ backgroundColor: '#FEF2F2', color: '#DC2626', padding: '8px 12px', borderRadius: '6px', fontSize: '0.80rem', marginBottom: '14px' }}>
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={submitting}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#F3F4F6',
                  color: '#4B5563',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleExecuteDecision}
                disabled={submitting}
                style={{
                  padding: '8px 18px',
                  backgroundColor: confirmAction === 'REJECT' ? '#DC2626' : '#1E4620',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                Confirmar Decisão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
