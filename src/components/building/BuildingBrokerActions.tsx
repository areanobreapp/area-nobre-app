'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  PlusCircle,
  MapPin,
  Pentagon,
  Camera,
  Info,
  X,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { PublicBuildingDTO } from '@/lib/public-building-dto';

interface BuildingBrokerActionsProps {
  building: PublicBuildingDTO;
  isBroker: boolean;
}

export default function BuildingBrokerActions({
  building,
  isBroker,
}: BuildingBrokerActionsProps) {
  const [showFacadeModal, setShowFacadeModal] = useState(false);
  const [facadeUrl, setFacadeUrl] = useState('');
  const [facadeJustification, setFacadeJustification] = useState('');
  const [submittingFacade, setSubmittingFacade] = useState(false);
  const [facadeFeedback, setFacadeFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isBroker) {
    return null;
  }

  const isGeoValidated = building.geoValidationStatus === 'ADMIN_VALIDATED';
  const isBoundaryValidated = building.boundaryValidationStatus === 'ADMIN_VALIDATED';
  const isCoverValidated = building.coverImageValidationStatus === 'ADMIN_VALIDATED';

  const handleSubmitFacade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facadeUrl.trim()) return;

    setSubmittingFacade(true);
    setFacadeFeedback(null);

    try {
      const res = await fetch(`/api/buildings/${building.id}/image-contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: facadeUrl.trim(),
          justification: facadeJustification.trim() || undefined,
          isSubstitutionProposal: Boolean(building.coverImageUrl),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao submeter contribuição de fachada.');
      }

      setFacadeFeedback({
        type: 'success',
        message: data.message || 'Contribuição de fachada enviada para moderação com sucesso!',
      });
      setFacadeUrl('');
      setFacadeJustification('');
      setTimeout(() => {
        setShowFacadeModal(false);
        setFacadeFeedback(null);
      }, 2500);
    } catch (err: any) {
      setFacadeFeedback({
        type: 'error',
        message: err.message || 'Ocorreu um erro ao submeter a fotografia.',
      });
    } finally {
      setSubmittingFacade(false);
    }
  };

  return (
    <>
      <section
        style={{
          backgroundColor: '#F8FAFC',
          borderRadius: '12px',
          border: '1.5px solid #CBD5E1',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} style={{ color: '#1E4620' }} />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Área Exclusiva do Corretor Parceiro
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                Ações colaborativas para manter o Cadastro Mestre deste condomínio atualizado
              </span>
            </div>
          </div>

          <Link
            href={`/imoveis/novo?buildingId=${building.id}`}
            id="btn-broker-add-unit"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#1E4620',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 1px 2px rgba(30, 70, 32, 0.2)',
            }}
          >
            <PlusCircle size={15} />
            <span>Cadastrar Unidade</span>
          </Link>
        </div>

        {/* Grid de Ações Colaborativas */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '10px',
          }}
        >
          {/* Sugerir Localização */}
          <Link
            href={`/?search=${encodeURIComponent(building.name)}&buildingId=${building.id}`}
            id="btn-broker-suggest-location"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              color: '#1E293B',
              textDecoration: 'none',
              fontSize: '0.82rem',
              fontWeight: 700,
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ backgroundColor: '#EFF6FF', padding: '6px', borderRadius: '6px', color: '#2563EB' }}>
              <MapPin size={16} />
            </div>
            <div>
              <div>Sugerir Pin no Mapa</div>
              <div style={{ fontSize: '0.70rem', color: '#64748B', fontWeight: 500 }}>
                {isGeoValidated ? 'Validado administrativamente' : 'Localização colaborativa'}
              </div>
            </div>
          </Link>

          {/* Sugerir Perímetro */}
          <Link
            href={`/?search=${encodeURIComponent(building.name)}&buildingId=${building.id}&territory=true`}
            id="btn-broker-suggest-boundary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              color: '#1E293B',
              textDecoration: 'none',
              fontSize: '0.82rem',
              fontWeight: 700,
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ backgroundColor: '#F0FDF4', padding: '6px', borderRadius: '6px', color: '#16A34A' }}>
              <Pentagon size={16} />
            </div>
            <div>
              <div>Sugerir Perímetro</div>
              <div style={{ fontSize: '0.70rem', color: '#64748B', fontWeight: 500 }}>
                {isBoundaryValidated ? 'Validado administrativamente' : 'Delimitação de lote'}
              </div>
            </div>
          </Link>

          {/* Sugerir Fachada */}
          <button
            type="button"
            id="btn-broker-suggest-facade"
            onClick={() => setShowFacadeModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              color: '#1E293B',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ backgroundColor: '#FAF5FF', padding: '6px', borderRadius: '6px', color: '#9333EA' }}>
              <Camera size={16} />
            </div>
            <div>
              <div>Sugerir Fachada</div>
              <div style={{ fontSize: '0.70rem', color: '#64748B', fontWeight: 500 }}>
                {isCoverValidated ? 'Validada administrativamente' : 'Atualizar foto da fachada'}
              </div>
            </div>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#64748B' }}>
          <Info size={13} style={{ flexShrink: 0 }} />
          <span>
            Contribuições submetidas são avaliadas pela equipe de moderação administrativa para preservar a integridade do ecossistema.
          </span>
        </div>
      </section>

      {/* Modal Interativo de Sugestão de Fachada */}
      {showFacadeModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowFacadeModal(false);
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={20} style={{ color: '#9333EA' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                  {building.coverImageUrl ? 'Sugerir Substituição da Fachada' : 'Sugerir Foto da Fachada'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFacadeModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6B7280',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: '#4B5563', margin: 0 }}>
              Edifício: <strong>{building.name}</strong>. Envie a URL de uma foto nítida e frontal da fachada coletiva do condomínio.
            </p>

            {facadeFeedback && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: facadeFeedback.type === 'success' ? '#F0FDF4' : '#FEF2F2',
                  color: facadeFeedback.type === 'success' ? '#166534' : '#991B1B',
                  border: `1px solid ${facadeFeedback.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
                }}
              >
                {facadeFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{facadeFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSubmitFacade} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  URL Pública da Imagem *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://exemplo.com/fachada.jpg"
                  value={facadeUrl}
                  onChange={(e) => setFacadeUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.86rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Justificativa / Observação
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Foto recente capturada em ângulo frontal sem obstruções."
                  value={facadeJustification}
                  onChange={(e) => setFacadeJustification(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.86rem',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowFacadeModal(false)}
                  disabled={submittingFacade}
                  style={{
                    padding: '9px 16px',
                    backgroundColor: '#F3F4F6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingFacade || !facadeUrl.trim()}
                  style={{
                    padding: '9px 16px',
                    backgroundColor: '#1E4620',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: submittingFacade || !facadeUrl.trim() ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {submittingFacade ? (
                    <>
                      <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <span>Enviar para Moderação</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

