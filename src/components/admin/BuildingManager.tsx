'use client';

import React, { useState, useEffect } from 'react';
import {
  Building as BuildingIcon,
  Search,
  Plus,
  Edit,
  CheckCircle2,
  Clock,
  MapPin,
  Users,
  Layers,
  Sparkles,
  Loader2,
  X,
  AlertCircle,
  Eye,
  Filter,
  Check,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const LocationPickerModal = dynamic(() => import('@/components/LocationPickerModal'), { ssr: false });

interface BuildingItem {
  id: string;
  name: string;
  normalizedName: string;
  address: string;
  number: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipcode: string | null;
  latitude: number;
  longitude: number;
  totalFloors: number | null;
  unitsPerFloor: number | null;
  towers: string | null;
  landRegistryNumber: string | null;
  landRegistryOffice: string | null;
  hasPool: boolean | null;
  hasGym: boolean | null;
  hasPartyHall: boolean | null;
  hasElevator: boolean | null;
  hasPetSpace: boolean | null;
  hasBarbecue: boolean | null;
  coverImageUrl: string | null;
  status: string;
  verifiedByAdmin: boolean;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  _count?: {
    units: number;
    properties: number;
  };
}

export default function BuildingManager() {
  const [buildings, setBuildings] = useState<BuildingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [verifiedFilter, setVerifiedFilter] = useState('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modais
  const [editingBuilding, setEditingBuilding] = useState<BuildingItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [viewingUnitsBuilding, setViewingUnitsBuilding] = useState<BuildingItem | null>(null);
  const [unitsList, setUnitsList] = useState<any[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Location picker no modal
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Form states (Criação e Edição)
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNumber, setFormNumber] = useState('');
  const [formNeighborhood, setFormNeighborhood] = useState('');
  const [formCity, setFormCity] = useState('Criciúma');
  const [formState, setFormState] = useState('SC');
  const [formZipcode, setFormZipcode] = useState('');
  const [formLat, setFormLat] = useState<number | null>(-28.6775);
  const [formLng, setFormLng] = useState<number | null>(-49.3700);
  const [formFloors, setFormFloors] = useState('');
  const [formUnitsPerFloor, setFormUnitsPerFloor] = useState('');
  const [formTowers, setFormTowers] = useState('');
  const [formLandRegistry, setFormLandRegistry] = useState('');
  const [formLandOffice, setFormLandOffice] = useState('');
  const [formHasPool, setFormHasPool] = useState(false);
  const [formHasGym, setFormHasGym] = useState(false);
  const [formHasPartyHall, setFormHasPartyHall] = useState(false);
  const [formHasElevator, setFormHasElevator] = useState(false);
  const [formHasPetSpace, setFormHasPetSpace] = useState(false);
  const [formHasBarbecue, setFormHasBarbecue] = useState(false);
  const [formVerified, setFormVerified] = useState(true);
  const [formStatus, setFormStatus] = useState('ACTIVE');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadBuildings();
  }, [statusFilter, verifiedFilter]);

  async function loadBuildings() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (verifiedFilter !== 'all') params.append('verified', verifiedFilter);

      const res = await fetch(`/api/buildings?${params.toString()}`);
      if (!res.ok) throw new Error('Falha ao consultar edifícios.');
      const data = await res.json();
      setBuildings(data.buildings || []);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erro ao carregar edifícios.' });
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadBuildings();
  }

  function openCreateModal() {
    setFormName('');
    setFormAddress('');
    setFormNumber('');
    setFormNeighborhood('');
    setFormCity('Criciúma');
    setFormState('SC');
    setFormZipcode('');
    setFormLat(-28.6775);
    setFormLng(-49.3700);
    setFormFloors('');
    setFormUnitsPerFloor('');
    setFormTowers('');
    setFormLandRegistry('');
    setFormLandOffice('');
    setFormHasPool(false);
    setFormHasGym(false);
    setFormHasPartyHall(false);
    setFormHasElevator(false);
    setFormHasPetSpace(false);
    setFormHasBarbecue(false);
    setFormVerified(true);
    setFormStatus('ACTIVE');
    setFormError(null);
    setIsCreating(true);
  }

  function openEditModal(b: BuildingItem) {
    setEditingBuilding(b);
    setFormName(b.name);
    setFormAddress(b.address);
    setFormNumber(b.number || '');
    setFormNeighborhood(b.neighborhood);
    setFormCity(b.city);
    setFormState(b.state);
    setFormZipcode(b.zipcode || '');
    setFormLat(b.latitude);
    setFormLng(b.longitude);
    setFormFloors(b.totalFloors ? String(b.totalFloors) : '');
    setFormUnitsPerFloor(b.unitsPerFloor ? String(b.unitsPerFloor) : '');
    setFormTowers(b.towers ? (Array.isArray(JSON.parse(b.towers || '[]')) ? JSON.parse(b.towers || '[]').join(', ') : b.towers) : '');
    setFormLandRegistry(b.landRegistryNumber || '');
    setFormLandOffice(b.landRegistryOffice || '');
    setFormHasPool(Boolean(b.hasPool));
    setFormHasGym(Boolean(b.hasGym));
    setFormHasPartyHall(Boolean(b.hasPartyHall));
    setFormHasElevator(Boolean(b.hasElevator));
    setFormHasPetSpace(Boolean(b.hasPetSpace));
    setFormHasBarbecue(Boolean(b.hasBarbecue));
    setFormVerified(Boolean(b.verifiedByAdmin));
    setFormStatus(b.status);
    setFormError(null);
  }

  async function handleSaveBuilding(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Informe o nome do edifício.');
      return;
    }
    if (!formAddress.trim()) {
      setFormError('Informe o endereço/rua do edifício.');
      return;
    }
    if (!formNeighborhood.trim()) {
      setFormError('Informe o bairro do edifício.');
      return;
    }
    if (formLat === null || formLng === null) {
      setFormError('Localize o pin do edifício no mapa.');
      return;
    }

    setSaving(true);
    try {
      const towersArray = formTowers.trim()
        ? formTowers.split(',').map((t) => t.trim()).filter(Boolean)
        : null;

      const payload = {
        name: formName.trim(),
        address: formAddress.trim(),
        number: formNumber.trim() || null,
        neighborhood: formNeighborhood.trim(),
        city: formCity.trim(),
        state: formState.trim(),
        zipcode: formZipcode.trim() || null,
        latitude: formLat,
        longitude: formLng,
        totalFloors: formFloors ? parseInt(formFloors, 10) : null,
        unitsPerFloor: formUnitsPerFloor ? parseInt(formUnitsPerFloor, 10) : null,
        towers: towersArray,
        landRegistryNumber: formLandRegistry.trim() || null,
        landRegistryOffice: formLandOffice.trim() || null,
        hasPool: formHasPool,
        hasGym: formHasGym,
        hasPartyHall: formHasPartyHall,
        hasElevator: formHasElevator,
        hasPetSpace: formHasPetSpace,
        hasBarbecue: formHasBarbecue,
        status: formStatus,
        verifiedByAdmin: formVerified,
      };

      const url = editingBuilding ? `/api/buildings/${editingBuilding.id}` : '/api/buildings';
      const method = editingBuilding ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar edifício.');
      }

      setFeedback({
        type: 'success',
        text: editingBuilding ? 'Edifício atualizado com sucesso.' : 'Novo edifício cadastrado com sucesso.',
      });
      setIsCreating(false);
      setEditingBuilding(null);
      loadBuildings();
    } catch (err: any) {
      setFormError(err.message || 'Falha ao salvar edifício.');
    } finally {
      setSaving(false);
    }
  }

  async function openUnitsModal(b: BuildingItem) {
    setViewingUnitsBuilding(b);
    setLoadingUnits(true);
    try {
      const res = await fetch(`/api/buildings/${b.id}/units`);
      if (res.ok) {
        const data = await res.json();
        setUnitsList(data.units || []);
      }
    } catch (err) {
      console.error('Erro ao buscar unidades:', err);
    } finally {
      setLoadingUnits(false);
    }
  }

  const pendingReviewCount = buildings.filter((b) => !b.verifiedByAdmin).length;
  const verifiedCount = buildings.filter((b) => b.verifiedByAdmin).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Cards de Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '18px 20px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>
            Total de Edifícios
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#111827' }}>
            {buildings.length}
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '18px 20px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>
            Verificados pelo Admin
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#059669' }}>
            {verifiedCount}
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '18px 20px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>
            Aguardando Revisão (Corretores)
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: pendingReviewCount > 0 ? '#B45309' : '#111827' }}>
            {pendingReviewCount}
          </div>
        </div>
      </div>

      {feedback && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: feedback.type === 'success' ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${feedback.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
            color: feedback.type === 'success' ? '#166534' : '#991B1B',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Barra de Filtros e Novo Edifício */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          padding: '16px 20px',
          border: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 280px', maxWidth: '420px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
            <input
              type="text"
              placeholder="Buscar por nome, bairro ou endereço..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '9px 14px',
              borderRadius: '8px',
              backgroundColor: '#1E4620',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Buscar
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <select
            value={verifiedFilter}
            onChange={(e) => setVerifiedFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.84rem' }}
          >
            <option value="all">Todas as Verificações</option>
            <option value="false">Aguardando Revisão</option>
            <option value="true">Verificados</option>
          </select>

          <button
            type="button"
            onClick={openCreateModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '8px',
              backgroundColor: '#16A34A',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            <span>Novo Edifício</span>
          </button>
        </div>
      </div>

      {/* Lista de Edifícios */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>
          <Loader2 size={24} className="spin" style={{ margin: '0 auto 8px' }} />
          <span>Carregando edifícios residenciais...</span>
        </div>
      ) : buildings.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: '14px', border: '1px solid #E5E7EB' }}>
          <BuildingIcon size={36} color="#9CA3AF" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#374151', margin: '0 0 6px 0' }}>
            Nenhum edifício residencial encontrado
          </h3>
          <p style={{ fontSize: '0.84rem', color: '#6B7280', margin: 0 }}>
            {search ? 'Tente ajustar os termos da busca ou os filtros.' : 'Cadastre o primeiro edifício residencial para iniciar a base colaborativa.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {buildings.map((b) => (
            <div
              key={b.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '14px',
                border: '1px solid #E5E7EB',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '14px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: '#EFF6FF',
                        color: '#1D4ED8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <BuildingIcon size={20} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#111827', margin: 0, lineHeight: 1.3 }}>
                        {b.name}
                      </h4>
                      <div style={{ fontSize: '0.78rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <MapPin size={12} />
                        <span>{b.neighborhood}, {b.city}</span>
                      </div>
                    </div>
                  </div>

                  {b.verifiedByAdmin ? (
                    <span
                      title="Verificado pela administração"
                      style={{
                        padding: '3px 8px',
                        borderRadius: '999px',
                        backgroundColor: '#DCFCE7',
                        color: '#166534',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <CheckCircle2 size={12} />
                      <span>Verificado</span>
                    </span>
                  ) : (
                    <span
                      title="Cadastrado por corretor — requer revisão"
                      style={{
                        padding: '3px 8px',
                        borderRadius: '999px',
                        backgroundColor: '#FEF3C7',
                        color: '#92400E',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Clock size={12} />
                      <span>Revisar</span>
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.80rem', color: '#4B5563', lineHeight: 1.4, margin: '8px 0' }}>
                  <strong>Endereço:</strong> {b.address}{b.number ? `, ${b.number}` : ''}
                </div>

                {/* Características resumidas */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '8px 0' }}>
                  {b.totalFloors && (
                    <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#F3F4F6', color: '#374151', fontWeight: 600 }}>
                      {b.totalFloors} andares
                    </span>
                  )}
                  {b.hasElevator && (
                    <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#F3F4F6', color: '#374151', fontWeight: 600 }}>
                      Elevador
                    </span>
                  )}
                  {b.hasPool && (
                    <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#EFF6FF', color: '#1E40AF', fontWeight: 600 }}>
                      Piscina
                    </span>
                  )}
                  {b.hasGym && (
                    <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#F0FDF4', color: '#166534', fontWeight: 600 }}>
                      Academia
                    </span>
                  )}
                  {b.hasPartyHall && (
                    <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#FDF4FF', color: '#86198F', fontWeight: 600 }}>
                      Salão de Festas
                    </span>
                  )}
                </div>

                {/* Métricas e cadastro */}
                <div style={{ fontSize: '0.76rem', color: '#9CA3AF', borderTop: '1px solid #F3F4F6', paddingTop: '8px', marginTop: '10px' }}>
                  <span>Cadastrado por: <strong>{b.createdBy.name}</strong></span>
                  {b._count && (
                    <span style={{ marginLeft: '10px' }}>
                      • <strong>{b._count.properties}</strong> anúncio(s) • <strong>{b._count.units}</strong> unidade(s)
                    </span>
                  )}
                </div>
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #E5E7EB', paddingTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => openUnitsModal(b)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563EB',
                    fontSize: '0.80rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Eye size={14} />
                  <span>Unidades ({b._count?.units || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => openEditModal(b)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#F3F4F6',
                    color: '#374151',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.80rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Edit size={14} />
                  <span>Editar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação / Edição de Edifício */}
      {(isCreating || editingBuilding) && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
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
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BuildingIcon size={20} color="#1E4620" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#111827' }}>
                  {editingBuilding ? 'Editar Edifício Residencial' : 'Cadastrar Novo Edifício Residencial'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingBuilding(null);
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveBuilding} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {formError && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', fontSize: '0.84rem' }}>
                  {formError}
                </div>
              )}

              {/* Identificação Básica */}
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '6px' }}>
                  Nome do Edifício *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Edifício Solar das Acácias"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.88rem' }}
                />
              </div>

              {/* Endereço e Localização */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '6px' }}>
                    Logradouro / Rua *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Rua Coronel Pedro Benedet"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '6px' }}>
                    Número Predial
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 350"
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '6px' }}>
                    Bairro *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Centro"
                    value={formNeighborhood}
                    onChange={(e) => setFormNeighborhood(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '6px' }}>
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '6px' }}>
                    CEP
                  </label>
                  <input
                    type="text"
                    placeholder="88801-250"
                    value={formZipcode}
                    onChange={(e) => setFormZipcode(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              {/* Pin no Mapa */}
              <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#111827' }}>
                    Localização Geográfica do Edifício
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                    Lat: {formLat?.toFixed(5) || 'Não informada'}, Lng: {formLng?.toFixed(5) || 'Não informada'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLocationPicker(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <MapPin size={14} color="#16A34A" />
                  <span>Ajustar Pin no Mapa</span>
                </button>
              </div>

              {/* Estrutura */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '6px' }}>
                    Total de Pavimentos / Andares
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ex: 12"
                    value={formFloors}
                    onChange={(e) => setFormFloors(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '6px' }}>
                    Unidades por Andar
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ex: 4"
                    value={formUnitsPerFloor}
                    onChange={(e) => setFormUnitsPerFloor(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '6px' }}>
                    Torres / Blocos (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Torre A, Torre B"
                    value={formTowers}
                    onChange={(e) => setFormTowers(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              {/* Comodidades Compartilhadas */}
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '8px' }}>
                  Comodidades Compartilhadas do Edifício
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formHasElevator} onChange={(e) => setFormHasElevator(e.target.checked)} />
                    <span>Elevador</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formHasPool} onChange={(e) => setFormHasPool(e.target.checked)} />
                    <span>Piscina</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formHasGym} onChange={(e) => setFormHasGym(e.target.checked)} />
                    <span>Academia</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formHasPartyHall} onChange={(e) => setFormHasPartyHall(e.target.checked)} />
                    <span>Salão de Festas</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formHasPetSpace} onChange={(e) => setFormHasPetSpace(e.target.checked)} />
                    <span>Espaço Pet</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formHasBarbecue} onChange={(e) => setFormHasBarbecue(e.target.checked)} />
                    <span>Churrasqueira coletiva</span>
                  </label>
                </div>
              </div>

              {/* Governança Administrativa */}
              <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#111827' }}>
                  Governança do Registro
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer', color: '#166534' }}>
                    <input type="checkbox" checked={formVerified} onChange={(e) => setFormVerified(e.target.checked)} />
                    <span>Edifício verificado e aprovado pelo Administrador</span>
                  </label>
                </div>
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingBuilding(null);
                  }}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#374151',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '9px 22px',
                    borderRadius: '8px',
                    backgroundColor: '#1E4620',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {saving && <Loader2 size={16} className="spin" />}
                  <span>{saving ? 'Salvando...' : 'Salvar Edifício'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Unidades Registradas */}
      {viewingUnitsBuilding && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
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
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#111827' }}>
                  Unidades: {viewingUnitsBuilding.name}
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: '2px' }}>
                  {viewingUnitsBuilding.address}, {viewingUnitsBuilding.neighborhood}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingUnitsBuilding(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              {loadingUnits ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#6B7280' }}>
                  <Loader2 size={20} className="spin" style={{ margin: '0 auto 6px' }} />
                  <span>Carregando unidades...</span>
                </div>
              ) : unitsList.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#6B7280' }}>
                  <span>Nenhuma unidade individual foi cadastrada neste edifício ainda.</span>
                  <p style={{ fontSize: '0.78rem', margin: '6px 0 0' }}>
                    As unidades são registradas automaticamente quando corretores cadastram apartamentos informando o número da unidade.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
                  {unitsList.map((u) => (
                    <div
                      key={u.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB',
                        backgroundColor: '#F9FAFB',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#111827' }}>
                        Unidade {u.unitNumber}
                      </div>
                      {u.tower && (
                        <div style={{ fontSize: '0.76rem', color: '#4B5563', fontWeight: 600 }}>
                          {u.tower}
                        </div>
                      )}
                      {u.floor !== null && u.floor !== undefined && (
                        <div style={{ fontSize: '0.74rem', color: '#6B7280' }}>
                          {u.floor}º andar
                        </div>
                      )}
                      {u.privateArea && (
                        <div style={{ fontSize: '0.74rem', color: '#166534', fontWeight: 600, marginTop: '4px' }}>
                          {u.privateArea} m² privativos
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setViewingUnitsBuilding(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Mapa para Pin do Edifício */}
      {showLocationPicker && (
        <LocationPickerModal
          isOpen={showLocationPicker}
          initialLat={formLat}
          initialLng={formLng}
          addressToGeocode={`${formAddress || ''}${formNumber ? `, ${formNumber}` : ''}, ${formNeighborhood || ''}, ${formCity || 'Criciúma'}, ${formState || 'SC'}`}
          onConfirm={(lat, lng) => {
            setFormLat(lat);
            setFormLng(lng);
            setShowLocationPicker(false);
          }}
          onCancel={() => setShowLocationPicker(false)}
        />
      )}
    </div>
  );
}

