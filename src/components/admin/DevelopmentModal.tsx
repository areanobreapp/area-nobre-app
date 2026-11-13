'use client';

import React, { useState } from 'react';
import {
  X,
  Building2,
  Save,
  Loader2,
  AlertTriangle,
  Calendar,
  MapPin,
  Layers,
} from 'lucide-react';

interface DevelopmentModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (dev: any) => void;
  companyId: string;
  companyName: string;
}

export default function DevelopmentModal({
  open,
  onClose,
  onSaved,
  companyId,
  companyName,
}: DevelopmentModalProps) {
  const [name, setName] = useState('');
  const [stage, setStage] = useState('Lançamento');
  const [projectType, setProjectType] = useState<'VERTICAL' | 'HORIZONTAL' | 'MISTO' | 'LOTEAMENTO'>('VERTICAL');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('Criciúma');
  const [state, setState] = useState('SC');
  const [address, setAddress] = useState('');
  const [deliveryMonth, setDeliveryMonth] = useState<number | ''>('');
  const [deliveryYear, setDeliveryYear] = useState<number | ''>(new Date().getFullYear() + 2);
  const [totalTowers, setTotalTowers] = useState<number | ''>('');
  const [totalUnits, setTotalUnits] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Ativo');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nome do empreendimento é obrigatório.');
      return;
    }
    if (!stage.trim()) {
      setError('Estágio da obra é obrigatório.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        companyId,
        stage: stage.trim(),
        projectType,
        neighborhood: neighborhood.trim() || null,
        city: city.trim() || 'Criciúma',
        state: state.trim() || 'SC',
        address: address.trim() || null,
        deliveryMonth: deliveryMonth !== '' ? Number(deliveryMonth) : null,
        deliveryYear: deliveryYear !== '' ? Number(deliveryYear) : null,
        totalTowers: totalTowers !== '' ? Number(totalTowers) : null,
        totalUnits: totalUnits !== '' ? Number(totalUnits) : null,
        description: description.trim() || null,
        status,
      };

      const res = await fetch('/api/admin/developments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao cadastrar empreendimento.');
      }

      onSaved(data.development);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Falha ao registrar empreendimento.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 9999,
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '620px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#DCFCE7',
                color: '#166534',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building2 size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                Cadastrar Empreendimento
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                Vinculado a: <strong>{companyName}</strong>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              flexWrap: 'wrap',
              fontSize: '0.80rem',
              color: '#1E40AF',
            }}
          >
            <span>
              Deseja incluir fotos, mapa interativo, CEP, diferenciais e plantas agora?
            </span>
            <a
              href={`/empreendimentos/novo?companyId=${encodeURIComponent(companyId)}&returnTo=admin`}
              id="link-cadastro-completo-empreendimento"
              style={{
                fontWeight: 700,
                color: '#1E4620',
                textDecoration: 'underline',
                whiteSpace: 'nowrap',
              }}
            >
              Abrir Formulário Administrativo Completo →
            </a>
          </div>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                color: '#991B1B',
                fontSize: '0.84rem',
                fontWeight: 600,
                border: '1px solid #FECACA',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                Nome do Empreendimento <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="text"
                id="input-dev-name"
                required
                placeholder="Ex: Residencial Palazzo Dei Fiori"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                Estágio da Obra <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                id="select-dev-stage"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.88rem',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                }}
              >
                <option value="Breve lançamento">Breve lançamento</option>
                <option value="Lançamento">Lançamento</option>
                <option value="Na planta">Na planta</option>
                <option value="Em construção">Em construção</option>
                <option value="Próximo da entrega">Próximo da entrega</option>
                <option value="Pronto para morar">Pronto para morar</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                Tipo de Projeto
              </label>
              <select
                id="select-dev-type"
                value={projectType}
                onChange={(e) => setProjectType(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.88rem',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                }}
              >
                <option value="VERTICAL">Vertical (Edifício / Torres)</option>
                <option value="HORIZONTAL">Horizontal (Casas / Condomínio)</option>
                <option value="MISTO">Misto (Comercial e Residencial)</option>
                <option value="LOTEAMENTO">Loteamento / Bairro Planejado</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                Bairro
              </label>
              <input
                type="text"
                id="input-dev-neighborhood"
                placeholder="Ex: Pio Corrêa"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                Cidade / UF
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Criciúma"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
                <input
                  type="text"
                  placeholder="SC"
                  maxLength={2}
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  style={{
                    width: '50px',
                    padding: '9px 8px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.88rem',
                    textAlign: 'center',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                Total de Torres / Quadras
              </label>
              <input
                type="number"
                id="input-dev-towers"
                min={1}
                placeholder="Ex: 2"
                value={totalTowers}
                onChange={(e) => setTotalTowers(e.target.value ? parseInt(e.target.value, 10) : '')}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                Total Estimado de Unidades
              </label>
              <input
                type="number"
                id="input-dev-units"
                min={1}
                placeholder="Ex: 64"
                value={totalUnits}
                onChange={(e) => setTotalUnits(e.target.value ? parseInt(e.target.value, 10) : '')}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                Previsão de Entrega (Mês / Ano)
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <select
                  value={deliveryMonth}
                  onChange={(e) => setDeliveryMonth(e.target.value ? parseInt(e.target.value, 10) : '')}
                  style={{
                    flex: 1,
                    padding: '9px 8px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.86rem',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                  }}
                >
                  <option value="">Mês</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {String(m).padStart(2, '0')}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Ano (2028)"
                  value={deliveryYear}
                  onChange={(e) => setDeliveryYear(e.target.value ? parseInt(e.target.value, 10) : '')}
                  style={{
                    width: '90px',
                    padding: '9px 8px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.86rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                Situação
              </label>
              <select
                id="select-dev-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.88rem',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                }}
              >
                <option value="Ativo">PUBLICADO — Visível para corretores e mapa</option>
                <option value="Rascunho">RASCUNHO — Visível apenas ao ADMIN</option>
                <option value="Inativo">ARQUIVADO — Fora das consultas comerciais</option>
              </select>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                Descrição Resumida
              </label>
              <textarea
                id="textarea-dev-description"
                rows={2}
                placeholder="Destaques do projeto, infraestrutura e proposta de valor..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.84rem',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                color: '#374151',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-salvar-empreendimento-modal"
              disabled={submitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 20px',
                backgroundColor: '#1E4620',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.86rem',
                border: 'none',
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              <span>Cadastrar Empreendimento</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

