'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  X,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Move,
  Compass,
  Building,
  User,
  Clock,
  ArrowRight,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { ModerationQueueItem } from '@/lib/building-moderation-service';
import { createBaseMapTileLayer } from '@/lib/geo/basemaps';

interface LocationModerationModalProps {
  item: ModerationQueueItem;
  onClose: () => void;
  onDecide: (
    decision: 'APPROVE' | 'REJECT' | 'MANUAL_OVERRIDE',
    notes: string,
    manualCoords?: { latitude: number; longitude: number }
  ) => Promise<void>;
}

export default function LocationModerationModal({
  item,
  onClose,
  onDecide,
}: LocationModerationModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const [manualMode, setManualMode] = useState(false);
  const [manualCoords, setManualCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const manualMarkerRef = useRef<L.Marker | null>(null);

  // Confirmação e Decisão
  const [confirmAction, setConfirmAction] = useState<'APPROVE' | 'REJECT' | 'MANUAL_OVERRIDE' | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentLat = item.building.currentLatitude ?? -28.6775;
  const currentLng = item.building.currentLongitude ?? -49.3705;
  const proposedLat = item.locationData?.latitude ?? currentLat;
  const proposedLng = item.locationData?.longitude ?? currentLng;
  const distanceMeters = item.locationData?.distanceFromCurrent ?? 0;

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [proposedLat, proposedLng],
      zoom: 17,
      zoomControl: true,
    });
    mapInstanceRef.current = map;

    // Camada Cartográfica Padrão
    const tileLayer = createBaseMapTileLayer('street');
    tileLayer.addTo(map);

    // 1. Marcador Posição Atual (Azul / Teardrop)
    const currentIcon = L.divIcon({
      className: 'current-building-pin',
      html: `
        <div style="position: relative; width: 30px; height: 38px;">
          <svg width="30" height="38" viewBox="0 0 36 44">
            <path d="M18,44 C16.5,41 2,27 2,18 A16,16 0 1,1 34,18 C34,27 19.5,41 18,44 Z" fill="#2563EB" stroke="#FFFFFF" stroke-width="2"/>
          </svg>
          <div style="position: absolute; top: -20px; left: 50%; transform: translateX(-50%); background: #1E3A8A; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; white-space: nowrap;">
            Vigente
          </div>
        </div>
      `,
      iconSize: [30, 38],
      iconAnchor: [15, 38],
    });

    const currentMarker = L.marker([currentLat, currentLng], { icon: currentIcon })
      .addTo(map)
      .bindPopup(`<b>Posição Vigente</b><br>${item.building.name}<br>${currentLat.toFixed(5)}, ${currentLng.toFixed(5)}`);

    // 2. Marcador Posição Proposta (Âmbar / Laranja)
    const proposedIcon = L.divIcon({
      className: 'proposed-building-pin',
      html: `
        <div style="position: relative; width: 34px; height: 42px;">
          <svg width="34" height="42" viewBox="0 0 36 44">
            <path d="M18,44 C16.5,41 2,27 2,18 A16,16 0 1,1 34,18 C34,27 19.5,41 18,44 Z" fill="#D97706" stroke="#FFFFFF" stroke-width="2.5"/>
          </svg>
          <div style="position: absolute; top: -20px; left: 50%; transform: translateX(-50%); background: #B45309; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 800; white-space: nowrap;">
            Proposta
          </div>
        </div>
      `,
      iconSize: [34, 42],
      iconAnchor: [17, 42],
    });

    const proposedMarker = L.marker([proposedLat, proposedLng], { icon: proposedIcon })
      .addTo(map)
      .bindPopup(
        `<b>Proposta do Corretor</b><br>${item.broker.name}<br>${proposedLat.toFixed(5)}, ${proposedLng.toFixed(5)}<br>Distância: ~${Math.round(distanceMeters)}m`
      )
      .openPopup();

    // 3. Linha conectando os dois pontos caso distantes
    if (Math.abs(currentLat - proposedLat) > 0.00001 || Math.abs(currentLng - proposedLng) > 0.00001) {
      const line = L.polyline(
        [
          [currentLat, currentLng],
          [proposedLat, proposedLng],
        ],
        {
          color: '#D97706',
          weight: 3,
          dashArray: '6, 6',
          opacity: 0.8,
        }
      ).addTo(map);

      // Enquadra ambos os marcadores no campo de visão
      const bounds = L.latLngBounds([[currentLat, currentLng], [proposedLat, proposedLng]]);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 18 });
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [currentLat, currentLng, proposedLat, proposedLng, distanceMeters, item]);

  // Ativação do modo manual
  const handleToggleManual = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!manualMode) {
      const center = map.getCenter();
      setManualCoords({ latitude: center.lat, longitude: center.lng });
      setManualMode(true);

      const needleIcon = L.divIcon({
        className: 'admin-needle-marker',
        html: `
          <div style="position: relative; width: 24px; height: 44px; display: flex; flex-direction: column; align-items: center;">
            <div style="position: absolute; top: -20px; background: #1E4620; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 800; white-space: nowrap;">
              Ajuste Manual
            </div>
            <div style="width: 14px; height: 14px; border-radius: 50%; background: #1E4620; border: 2px solid #FFFFFF; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
            <div style="width: 2px; height: 26px; background: #1E4620;"></div>
            <div style="width: 5px; height: 5px; border-radius: 50%; background: #1E4620; margin-top: -2px;"></div>
          </div>
        `,
        iconSize: [24, 44],
        iconAnchor: [12, 43],
      });

      const marker = L.marker(center, { icon: needleIcon, draggable: true }).addTo(map);
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setManualCoords({ latitude: pos.lat, longitude: pos.lng });
      });
      manualMarkerRef.current = marker;
    } else {
      if (manualMarkerRef.current) {
        manualMarkerRef.current.remove();
        manualMarkerRef.current = null;
      }
      setManualCoords(null);
      setManualMode(false);
    }
  };

  const handleExecuteDecision = async () => {
    if (!confirmAction) return;
    if (confirmAction === 'REJECT' && !decisionNotes.trim()) {
      setErrorMsg('A justificativa é obrigatória para rejeição.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onDecide(
        confirmAction,
        decisionNotes.trim() || 'Aprovado pelo administrador.',
        confirmAction === 'MANUAL_OVERRIDE' && manualCoords ? manualCoords : undefined
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao processar decisão.');
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
          maxWidth: '1080px',
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
            <MapPin size={22} style={{ color: '#86EFAC' }} />
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                Moderação de Localização Predial
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

        {/* Corpo: Grid Mapa + Painel de Análise */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(320px, 1fr) 340px',
            flex: 1,
            minHeight: '480px',
            overflow: 'hidden',
          }}
        >
          {/* Coluna 1: Mapa Interativo */}
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '440px' }} />

            {/* Botão de alternar ajuste manual */}
            <div style={{ position: 'absolute', bottom: '16px', left: '16px', zIndex: 1000 }}>
              <button
                type="button"
                onClick={handleToggleManual}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  backgroundColor: manualMode ? '#1E4620' : '#FFFFFF',
                  color: manualMode ? '#FFFFFF' : '#1E4620',
                  border: '2px solid #1E4620',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  cursor: 'pointer',
                }}
              >
                <Move size={16} />
                {manualMode ? 'Desativar Ajuste Manual' : 'Ajustar Ponto Manualmente'}
              </button>
            </div>
          </div>

          {/* Coluna 2: Detalhes, Comparativo e Ações */}
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
              {/* Card de Resumo de Distância */}
              <div
                style={{
                  backgroundColor: distanceMeters > 50 ? '#FEF2F2' : '#EFF6FF',
                  border: `1px solid ${distanceMeters > 50 ? '#FCA5A5' : '#BFDBFE'}`,
                  borderRadius: '10px',
                  padding: '12px 14px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  {distanceMeters > 50 ? (
                    <AlertTriangle size={18} color="#DC2626" />
                  ) : (
                    <Compass size={18} color="#2563EB" />
                  )}
                  <span
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      color: distanceMeters > 50 ? '#991B1B' : '#1E40AF',
                    }}
                  >
                    Distância: ~{Math.round(distanceMeters)} metros
                  </span>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#4B5563', lineHeight: 1.35 }}>
                  {distanceMeters > 50
                    ? 'Proposta com divergência superior a 50m da coordenada estimada/vigente.'
                    : 'Proposta próxima da coordenada já registrada no sistema.'}
                </div>
              </div>

              {/* Informações da Contribuição */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Dados da Submissão
                </div>
                <div style={{ fontSize: '0.82rem', color: '#1F2937', marginBottom: '6px' }}>
                  <strong>Corretor:</strong> {item.broker.name}
                  {item.broker.commercialName && ` (${item.broker.commercialName})`}
                </div>
                {item.broker.creci && (
                  <div style={{ fontSize: '0.78rem', color: '#4B5563', marginBottom: '4px' }}>
                    <strong>CRECI:</strong> {item.broker.creci}
                  </div>
                )}
                <div style={{ fontSize: '0.78rem', color: '#4B5563', marginBottom: '4px' }}>
                  <strong>Data de Envio:</strong> {new Date(item.createdAt).toLocaleString('pt-BR')}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#4B5563' }}>
                  <strong>Tipo:</strong> {item.contributionType}
                </div>
              </div>

              {/* Coordenadas Vigentes vs Propostas */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  padding: '12px',
                  border: '1px solid #E5E7EB',
                  fontSize: '0.78rem',
                  marginBottom: '16px',
                }}
              >
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ color: '#2563EB', fontWeight: 800 }}>● Vigente:</span>{' '}
                  {currentLat.toFixed(5)}, {currentLng.toFixed(5)}
                </div>
                <div style={{ marginBottom: manualMode ? '8px' : '0' }}>
                  <span style={{ color: '#D97706', fontWeight: 800 }}>● Proposta:</span>{' '}
                  {proposedLat.toFixed(5)}, {proposedLng.toFixed(5)}
                </div>
                {manualMode && manualCoords && (
                  <div>
                    <span style={{ color: '#1E4620', fontWeight: 800 }}>● Ajuste Manual:</span>{' '}
                    {manualCoords.latitude.toFixed(5)}, {manualCoords.longitude.toFixed(5)}
                  </div>
                )}
              </div>
            </div>

            {/* Botões de Decisão */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px' }}>
              {manualMode && manualCoords ? (
                <button
                  type="button"
                  onClick={() => setConfirmAction('MANUAL_OVERRIDE')}
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
                  <ShieldCheck size={16} /> Homologar Ponto Manual
                </button>
              ) : (
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
                  <CheckCircle2 size={16} /> Aprovar Esta Localização
                </button>
              )}

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
              {confirmAction === 'APPROVE' && 'Confirmar Aprovação da Localização'}
              {confirmAction === 'REJECT' && 'Confirmar Rejeição da Proposta'}
              {confirmAction === 'MANUAL_OVERRIDE' && 'Confirmar Coordenadas Manuais'}
            </h3>

            <p style={{ fontSize: '0.84rem', color: '#4B5563', margin: '0 0 16px 0', lineHeight: 1.45 }}>
              {confirmAction === 'APPROVE' &&
                'A aprovação tornará as coordenadas propostas o ponto oficial do condomínio no mapa com validação administrativa máxima (ADMIN_VALIDATED).'}
              {confirmAction === 'REJECT' &&
                'A rejeição manterá as coordenadas vigentes atuais. Informe obrigatoriamente a justificativa para o corretor.'}
              {confirmAction === 'MANUAL_OVERRIDE' &&
                'As coordenadas posicionadas manualmente serão homologadas como oficiais da administração.'}
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                Justificativa Administrativa {confirmAction === 'REJECT' && <span style={{ color: '#DC2626' }}>*</span>}
              </label>
              <textarea
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder="Ex: Coordenadas conferidas no local e validadas conforme o endereço predial oficial."
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
