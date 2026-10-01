'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Building2,
  DollarSign,
  MapPin,
  FileText,
  Upload,
  X,
  Check,
  ArrowLeft,
  Image as ImageIcon,
  AlertCircle,
  Compass,
  Pentagon,
  ChevronDown,
  ChevronUp,
  Sliders,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const LocationPickerModal = dynamic(() => import('./LocationPickerModal'), { ssr: false });
const ParcelBoundaryModal = dynamic(() => import('./ParcelBoundaryModal'), { ssr: false });

interface PropertyFormProps {
  initialData?: any;
  isEditing?: boolean;
}

export default function PropertyForm({ initialData, isEditing = false }: PropertyFormProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Campos do formulário
  const [title, setTitle] = useState(initialData?.title || '');
  const [internalCode, setInternalCode] = useState(initialData?.internalCode || '');
  const [propertyType, setPropertyType] = useState(initialData?.propertyType || 'Apartamento');
  const [purpose, setPurpose] = useState(initialData?.purpose || 'Venda');
  const [status, setStatus] = useState(initialData?.status || 'Disponível');
  const [price, setPrice] = useState(initialData?.price ? String(initialData.price) : '');

  // Semântica de dormitórios e banheiros (Fase 5.0.1)
  const initialSuites = initialData?.suites !== undefined ? String(initialData.suites) : '1';
  const initialOtherBedrooms = initialData?.otherBedrooms !== undefined && initialData?.otherBedrooms !== null
    ? String(initialData.otherBedrooms)
    : String(Math.max(0, (initialData?.bedrooms ?? 2) - (initialData?.suites ?? 1)));
  const initialOtherBathrooms = initialData?.otherBathrooms !== undefined && initialData?.otherBathrooms !== null
    ? String(initialData.otherBathrooms)
    : String(Math.max(0, (initialData?.bathrooms ?? 2) - (initialData?.suites ?? 1)));

  const [suites, setSuites] = useState(initialSuites);
  const [otherBedrooms, setOtherBedrooms] = useState(initialOtherBedrooms);
  const [otherBathrooms, setOtherBathrooms] = useState(initialOtherBathrooms);

  // Áreas
  const [privateArea, setPrivateArea] = useState(initialData?.privateArea ? String(initialData.privateArea) : '');
  const [totalArea, setTotalArea] = useState(initialData?.totalArea ? String(initialData.totalArea) : '');
  const [landArea, setLandArea] = useState(initialData?.landArea ? String(initialData.landArea) : '');

  const [parkingSpaces, setParkingSpaces] = useState(initialData?.parkingSpaces !== undefined ? String(initialData.parkingSpaces) : '1');
  const [description, setDescription] = useState(initialData?.description || '');
  const [internalNotes, setInternalNotes] = useState(initialData?.internalNotes || '');

  // Negociação
  const [acceptsExchange, setAcceptsExchange] = useState<boolean | null>(
    initialData?.acceptsExchange !== undefined ? initialData.acceptsExchange : null
  );
  const [exchangeNotes, setExchangeNotes] = useState(initialData?.exchangeNotes || '');
  const [registryNumber, setRegistryNumber] = useState(initialData?.registryNumber || '');

  // Casa
  const [isRegistered, setIsRegistered] = useState<boolean | null>(
    initialData?.isRegistered !== undefined ? initialData.isRegistered : null
  );

  // Lazer & Comodidades Casa / Apartamento
  const [hasPool, setHasPool] = useState<boolean | null>(
    initialData?.hasPool !== undefined ? initialData.hasPool : null
  );
  const [hasGym, setHasGym] = useState<boolean | null>(
    initialData?.hasGym !== undefined ? initialData.hasGym : null
  );
  const [furniture, setFurniture] = useState<string>(initialData?.furniture || '');
  const [hasBarbecue, setHasBarbecue] = useState<boolean | null>(
    initialData?.hasBarbecue !== undefined ? initialData.hasBarbecue : null
  );

  // Apartamento
  const [hasPartyHall, setHasPartyHall] = useState<boolean | null>(
    initialData?.hasPartyHall !== undefined ? initialData.hasPartyHall : null
  );
  const [hasElevator, setHasElevator] = useState<boolean | null>(
    initialData?.hasElevator !== undefined ? initialData.hasElevator : null
  );
  const [isPenthouse, setIsPenthouse] = useState<boolean | null>(
    initialData?.isPenthouse !== undefined ? initialData.isPenthouse : null
  );
  const [hasPetSpace, setHasPetSpace] = useState<boolean | null>(
    initialData?.hasPetSpace !== undefined ? initialData.hasPetSpace : null
  );
  const [floor, setFloor] = useState(initialData?.floor !== undefined && initialData?.floor !== null ? String(initialData.floor) : '');

  // Terreno
  const [isCorner, setIsCorner] = useState<boolean | null>(
    initialData?.isCorner !== undefined ? initialData.isCorner : null
  );
  const [inGatedCommunity, setInGatedCommunity] = useState<boolean | null>(
    initialData?.inGatedCommunity !== undefined ? initialData.inGatedCommunity : null
  );
  const [inAllotment, setInAllotment] = useState<boolean | null>(
    initialData?.inAllotment !== undefined ? initialData.inAllotment : null
  );
  const [streetPaving, setStreetPaving] = useState<string>(initialData?.streetPaving || 'Asfalto');

  // Comercial
  const [commercialType, setCommercialType] = useState<string>(initialData?.commercialType || 'Térrea');

  // Toggle de seção expansível de Dados Avançados
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Localização
  const [zipcode, setZipcode] = useState(initialData?.zipcode || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [number, setNumber] = useState(initialData?.number || '');
  const [complement, setComplement] = useState(initialData?.complement || '');
  const [neighborhood, setNeighborhood] = useState(initialData?.neighborhood || '');
  const [city, setCity] = useState(initialData?.city || 'Criciúma');
  const [state, setState] = useState(initialData?.state || 'SC');
  const [latitude, setLatitude] = useState(initialData?.latitude ? String(initialData.latitude) : '');
  const [longitude, setLongitude] = useState(initialData?.longitude ? String(initialData.longitude) : '');
  const [geoPrecision, setGeoPrecision] = useState<{ precision?: 'precise' | 'approximate'; precisionLevel?: string } | null>(null);

  // Delimitação do terreno (Fase 4.2)
  const [boundary, setBoundary] = useState<string | null>(initialData?.boundary || null);
  const [boundaryArea, setBoundaryArea] = useState<number | null>(initialData?.boundaryArea || null);
  const [showBoundaryModal, setShowBoundaryModal] = useState<boolean>(false);

  // Fotos
  const [images, setImages] = useState<string[]>(
    initialData?.images?.map((img: any) => img.url) || []
  );

  // Formatação de Moeda
  function formatCurrency(val: string) {
    const clean = val.replace(/\D/g, '');
    if (!clean) return '';
    const num = Number(clean);
    return num.toLocaleString('pt-BR');
  }

  function handlePriceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '');
    setPrice(raw);
  }

  // Upload de Imagens
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('entityType', 'property');
    if (initialData?.id) {
      formData.append('entityId', initialData.id);
    }
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao enviar fotos.');
      }

      setImages((prev) => [...prev, ...data.urls]);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar imagens.');
    } finally {
      setUploading(false);
    }
  }

  function handleRemoveImage(indexToRemove: number) {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  }

  // Consulta CEP rápida via GeoBase (com fallback)
  async function handleCepLookup() {
    const cleanCep = zipcode.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    try {
      const res = await fetch(`/api/geo/cep/${cleanCep}`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data;
        if (data) {
          if (data.street) setAddress(data.street);
          if (data.neighborhood) setNeighborhood(data.neighborhood);
          if (data.city) setCity(data.city);
          if (data.state) setState(data.state);
          if (data.latitude && data.longitude) {
            setLatitude(String(data.latitude));
            setLongitude(String(data.longitude));
          }
          // Nunca limpa coordenadas já existentes ou confirmadas se a consulta de CEP não fornecer coordenadas
          return;
        }
      }

      // Fallback direto via CEP caso rota falhe
      const fallbackRes = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const fallbackData = await fallbackRes.json();
      if (!fallbackData.erro) {
        if (fallbackData.logradouro) setAddress(fallbackData.logradouro);
        if (fallbackData.bairro) setNeighborhood(fallbackData.bairro);
        if (fallbackData.localidade) setCity(fallbackData.localidade);
        if (fallbackData.uf) setState(fallbackData.uf);
        // Preserva coordenadas existentes
      }
    } catch (err) {
      console.warn('Erro ao consultar CEP:', err);
    }
  }

  async function handleSubmit(saveStatus: string) {
    setError(null);

    if (!title.trim()) {
      setError('Por favor, informe o título do imóvel.');
      return;
    }
    if (!price || Number(price) <= 0) {
      setError('Por favor, informe um valor de venda ou locação válido.');
      return;
    }

    setLoading(true);

    let finalLat: number | null = latitude !== '' && !isNaN(Number(latitude)) ? Number(latitude) : null;
    let finalLng: number | null = longitude !== '' && !isNaN(Number(longitude)) ? Number(longitude) : null;

    // Failsafe: se houver endereço/CEP mas não houver coordenadas, executa geocodificação automática antes de salvar
    if ((finalLat === null || finalLng === null) && (address?.trim() || zipcode?.trim())) {
      try {
        const rawAddr = `${address || ''}${number ? `, ${number}` : ''}, ${neighborhood || ''}, ${city || 'Criciúma'}, ${state || 'SC'}`;
        const geoRes = await fetch('/api/geo/geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: rawAddr,
            limit: 1,
            components: {
              street: address,
              number: number,
              neighborhood: neighborhood,
              city: city || 'Criciúma',
              state: state || 'SC',
              postalCode: zipcode,
            },
          }),
        });
        if (geoRes.ok) {
          const geoJson = await geoRes.json();
          if (geoJson.results && geoJson.results.length > 0) {
            finalLat = Number(geoJson.results[0].lat);
            finalLng = Number(geoJson.results[0].lng);
            setLatitude(String(finalLat));
            setLongitude(String(finalLng));
          }
        }
      } catch (geoErr) {
        console.warn('Geocodificação prévia ao envio falhou:', geoErr);
      }
    }

    const parsedSuitesNum = parseInt(suites, 10) || 0;
    const parsedOtherBedNum = parseInt(otherBedrooms, 10) || 0;
    const parsedOtherBathNum = parseInt(otherBathrooms, 10) || 0;

    const payload = {
      title,
      internalCode,
      propertyType,
      purpose,
      status: saveStatus,
      price: Number(price),
      privateArea: privateArea ? parseFloat(privateArea) : null,
      totalArea: totalArea ? parseFloat(totalArea) : null,
      landArea: landArea ? parseFloat(landArea) : null,
      suites: parsedSuitesNum,
      otherBedrooms: parsedOtherBedNum,
      bedrooms: parsedSuitesNum + parsedOtherBedNum,
      otherBathrooms: parsedOtherBathNum,
      bathrooms: parsedSuitesNum + parsedOtherBathNum,
      parkingSpaces: parseInt(parkingSpaces, 10) || 0,
      description,
      internalNotes,
      zipcode,
      address,
      number,
      complement,
      neighborhood,
      city,
      state,
      latitude: finalLat,
      longitude: finalLng,
      boundary: boundary || null,
      boundaryArea: boundaryArea !== null && boundaryArea !== undefined && !isNaN(Number(boundaryArea)) ? Number(boundaryArea) : null,
      acceptsExchange,
      exchangeNotes: exchangeNotes || null,
      registryNumber: registryNumber || null,
      isRegistered,
      hasPool,
      hasGym,
      furniture: furniture || null,
      hasBarbecue,
      hasPartyHall,
      hasElevator,
      isPenthouse,
      hasPetSpace,
      floor: floor ? parseInt(floor, 10) : null,
      isCorner,
      inGatedCommunity,
      inAllotment,
      streetPaving: streetPaving || null,
      commercialType: commercialType || null,
      images,
    };

    try {
      const url = isEditing ? `/api/properties/${initialData.id}` : '/api/properties';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar imóvel.');
      }

      const matchQuery = data.matchCount ? `?newMatches=${data.matchCount}` : '';
      router.push(`/imoveis/${data.property.id}${matchQuery}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar imóvel.');
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Voltar */}
      <button
        type="button"
        onClick={() => router.back()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: '0.88rem',
          width: 'fit-content',
        }}
      >
        <ArrowLeft size={16} />
        <span>Voltar</span>
      </button>

      {/* Título da Página */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {isEditing ? 'Editar Imóvel' : 'Cadastrar Novo Imóvel'}
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Preencha as informações essenciais para gerenciar e cruzar com as buscas da carteira.
          </p>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--color-danger-bg)',
            color: 'var(--color-danger)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: '1px solid #FECACA',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* BLOCO 1: Informações Principais */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
          <Building2 size={20} color="var(--color-primary)" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Informações Principais</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
              Título do Imóvel *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Apartamento no Centro com Varanda"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-subtle)',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
              Código Interno (Opcional)
            </label>
            <input
              type="text"
              value={internalCode}
              onChange={(e) => setInternalCode(e.target.value)}
              placeholder="Ex: AP-102"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-subtle)',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
              Tipo de Imóvel *
            </label>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-subtle)',
              }}
            >
              <option value="Apartamento">Apartamento</option>
              <option value="Casa">Casa</option>
              <option value="Terreno">Terreno</option>
              <option value="Comercial">Comercial</option>
              <option value="Galpão">Galpão</option>
              <option value="Rural">Rural</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
              Finalidade *
            </label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-subtle)',
              }}
            >
              <option value="Venda">Venda</option>
              <option value="Locação">Locação</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-subtle)',
              }}
            >
              <option value="Disponível">Disponível</option>
              <option value="Reservado">Reservado</option>
              <option value="Vendido/Alugado">Vendido / Alugado</option>
              <option value="Inativo">Inativo</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
              Valor (R$) *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                required
                value={formatCurrency(price)}
                onChange={handlePriceChange}
                placeholder="Ex: 650.000"
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 36px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-subtle)',
                  fontWeight: 700,
                  fontSize: '0.98rem',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                }}
              >
                R$
              </span>
            </div>
          </div>
        </div>

        {/* Permuta (Negociação) */}
        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
              Aceita Permuta?
            </label>
            <select
              value={acceptsExchange === null ? '' : acceptsExchange ? 'true' : 'false'}
              onChange={(e) => setAcceptsExchange(e.target.value === '' ? null : e.target.value === 'true')}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-subtle)',
              }}
            >
              <option value="">Não informado</option>
              <option value="true">Sim, aceita permuta</option>
              <option value="false">Não aceita permuta</option>
            </select>
          </div>

          {acceptsExchange === true && (
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Observação da Permuta
              </label>
              <input
                type="text"
                value={exchangeNotes}
                onChange={(e) => setExchangeNotes(e.target.value)}
                placeholder="Ex: Aceita imóvel de até R$ 300 mil ou veículo na negociação"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* BLOCO 2: Características Adaptativas por Tipo */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} color="var(--color-primary)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              {propertyType === 'Terreno'
                ? 'Características do Terreno'
                : propertyType === 'Comercial'
                ? 'Características Comerciais'
                : propertyType === 'Casa'
                ? 'Características da Casa'
                : 'Características do Apartamento'}
            </h2>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-primary)', backgroundColor: 'var(--color-primary-light)', padding: '3px 10px', borderRadius: '12px', fontWeight: 600 }}>
            Formulário adaptado para {propertyType}
          </span>
        </div>

        {/* Layout para Terreno */}
        {propertyType === 'Terreno' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Área do Terreno (m²) Documental *
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={landArea}
                onChange={(e) => setLandArea(e.target.value)}
                placeholder="Ex: 360"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              />
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Metragem da escritura/matrícula (independente da delimitação no mapa).
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Terreno de Esquina?
              </label>
              <select
                value={isCorner === null ? '' : isCorner ? 'true' : 'false'}
                onChange={(e) => setIsCorner(e.target.value === '' ? null : e.target.value === 'true')}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              >
                <option value="">Não informado</option>
                <option value="true">Sim, de esquina</option>
                <option value="false">Não (meio de quadra)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Em Condomínio Fechado?
              </label>
              <select
                value={inGatedCommunity === null ? '' : inGatedCommunity ? 'true' : 'false'}
                onChange={(e) => setInGatedCommunity(e.target.value === '' ? null : e.target.value === 'true')}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              >
                <option value="">Não informado</option>
                <option value="true">Sim, em condomínio</option>
                <option value="false">Não (lote aberto / rua pública)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Em Loteamento Planejado?
              </label>
              <select
                value={inAllotment === null ? '' : inAllotment ? 'true' : 'false'}
                onChange={(e) => setInAllotment(e.target.value === '' ? null : e.target.value === 'true')}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              >
                <option value="">Não informado</option>
                <option value="true">Sim, em loteamento</option>
                <option value="false">Não</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Calçamento da Rua
              </label>
              <select
                value={streetPaving}
                onChange={(e) => setStreetPaving(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              >
                <option value="Asfalto">Asfalto</option>
                <option value="Lajota">Lajota</option>
                <option value="Paralelepípedo">Paralelepípedo</option>
                <option value="Terra">Terra / Saibro</option>
              </select>
            </div>
          </div>
        ) : propertyType === 'Comercial' ? (
          /* Layout para Comercial */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Tipo de Sala / Posição
              </label>
              <select
                value={commercialType}
                onChange={(e) => setCommercialType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              >
                <option value="Térrea">Térrea (com vitrine de rua)</option>
                <option value="Aérea">Aérea (em edifício comercial)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Área Útil / Privativa (m²)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={privateArea}
                onChange={(e) => setPrivateArea(e.target.value)}
                placeholder="Ex: 60"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Área Total (m²)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={totalArea}
                onChange={(e) => setTotalArea(e.target.value)}
                placeholder="Ex: 85"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Área do Terreno (m²)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={landArea}
                onChange={(e) => setLandArea(e.target.value)}
                placeholder="Ex: 300"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Banheiros
              </label>
              <input
                type="number"
                min="0"
                value={otherBathrooms}
                onChange={(e) => setOtherBathrooms(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Vagas de Garagem
              </label>
              <input
                type="number"
                min="0"
                value={parkingSpaces}
                onChange={(e) => setParkingSpaces(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              />
            </div>
          </div>
        ) : (
          /* Layout para Casa e Apartamento */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Bloco de Dormitórios e Banheiros com Semântica Precisa (Requisito 2) */}
            <div style={{ padding: '16px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Composição de Quartos e Banheiros
                </span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, backgroundColor: '#ECFDF5', color: '#065F46', padding: '2px 8px', borderRadius: '12px', border: '1px solid #A7F3D0' }}>
                    Total: {(parseInt(suites, 10) || 0) + (parseInt(otherBedrooms, 10) || 0)} dormitório(s)
                  </span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, backgroundColor: '#EFF6FF', color: '#1E40AF', padding: '2px 8px', borderRadius: '12px', border: '1px solid #BFDBFE' }}>
                    Total: {(parseInt(suites, 10) || 0) + (parseInt(otherBathrooms, 10) || 0)} banheiro(s)
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                    Suítes
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={suites}
                    onChange={(e) => setSuites(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-light)',
                      backgroundColor: 'white',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                    Outros Quartos
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={otherBedrooms}
                    onChange={(e) => setOtherBedrooms(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-light)',
                      backgroundColor: 'white',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                    Outros Banheiros
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={otherBathrooms}
                    onChange={(e) => setOtherBathrooms(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-light)',
                      backgroundColor: 'white',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                    Vagas de Garagem
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={parkingSpaces}
                    onChange={(e) => setParkingSpaces(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-light)',
                      backgroundColor: 'white',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Metragens e Específicos de Casa / Apartamento */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                  Área Privativa / Útil (m²)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={privateArea}
                  onChange={(e) => setPrivateArea(e.target.value)}
                  placeholder="Ex: 85"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: 'var(--bg-subtle)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                  Área Total (m²)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={totalArea}
                  onChange={(e) => setTotalArea(e.target.value)}
                  placeholder="Ex: 110"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: 'var(--bg-subtle)',
                  }}
                />
              </div>

              {propertyType === 'Casa' ? (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                      Área do Terreno (m²)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={landArea}
                      onChange={(e) => setLandArea(e.target.value)}
                      placeholder="Ex: 360"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-light)',
                        backgroundColor: 'var(--bg-subtle)',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                      Averbada (Financiável)?
                    </label>
                    <select
                      value={isRegistered === null ? '' : isRegistered ? 'true' : 'false'}
                      onChange={(e) => setIsRegistered(e.target.value === '' ? null : e.target.value === 'true')}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-light)',
                        backgroundColor: 'var(--bg-subtle)',
                      }}
                    >
                      <option value="">Não informado</option>
                      <option value="true">Sim, averbada</option>
                      <option value="false">Não averbada</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                      Andar
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={floor}
                      onChange={(e) => setFloor(e.target.value)}
                      placeholder="Ex: 5"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-light)',
                        backgroundColor: 'var(--bg-subtle)',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                      Unidade Cobertura?
                    </label>
                    <select
                      value={isPenthouse === null ? '' : isPenthouse ? 'true' : 'false'}
                      onChange={(e) => setIsPenthouse(e.target.value === '' ? null : e.target.value === 'true')}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-light)',
                        backgroundColor: 'var(--bg-subtle)',
                      }}
                    >
                      <option value="">Não</option>
                      <option value="true">Sim, cobertura</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* BLOCO 3: Localização */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
          <MapPin size={20} color="var(--color-primary)" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Localização do Imóvel</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
              CEP
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={zipcode}
                onChange={(e) => setZipcode(e.target.value)}
                onBlur={handleCepLookup}
                placeholder="Ex: 88801-000"
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              />
              <button
                type="button"
                onClick={handleCepLookup}
                className="btn-secondary"
                style={{ padding: '8px 14px', fontSize: '0.82rem' }}
              >
                Buscar
              </button>
            </div>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
              Endereço / Logradouro
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex: Rua Coronel Pedro Benedet"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-subtle)',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
              Número
            </label>
            <input
              type="text"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="Ex: 350"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-subtle)',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
              Complemento
            </label>
            <input
              type="text"
              value={complement}
              onChange={(e) => setComplement(e.target.value)}
              placeholder="Ex: Apto 402"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-subtle)',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
              Bairro *
            </label>
            <input
              type="text"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="Ex: Centro"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-subtle)',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
              Cidade *
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ex: Criciúma"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-subtle)',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
              Estado (UF)
            </label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="Ex: SC"
              maxLength={2}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-subtle)',
              }}
            />
          </div>
        </div>

        {/* Status da Geolocalização no Mapa */}
        {(() => {
          const hasCoords = Boolean(latitude && longitude);
          const hasAddress = Boolean(address?.trim() || zipcode?.trim());

          if (hasCoords) {
            // Estado C: Localização Confirmada pelo Usuário
            const isPrecise = geoPrecision?.precision === 'precise' || geoPrecision?.precisionLevel === 'rooftop';
            return (
              <div
                style={{
                  marginTop: '12px',
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #86EFAC',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        backgroundColor: '#DCFCE7',
                        color: '#15803D',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Check size={20} strokeWidth={3} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Localização Confirmada no Mapa</span>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            backgroundColor: isPrecise ? '#BBF7D0' : '#E0E7FF',
                            color: isPrecise ? '#166534' : '#3730A3',
                          }}
                        >
                          {isPrecise ? 'Ponto Preciso' : 'Ponto na Via / Ajustado'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#15803D', marginTop: '2px' }}>
                        Coordenadas: {Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}
                        {address && ` • ${address}${number ? `, ${number}` : ''}`}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowLocationPicker(true)}
                      style={{ padding: '8px 14px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <MapPin size={15} />
                      <span>Ajustar marcador</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLatitude('');
                        setLongitude('');
                        setGeoPrecision(null);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-danger)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '4px 8px',
                      }}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          if (hasAddress) {
            // Estado A: Endereço Identificado pelo CEP (Ainda não confirmado no mapa)
            return (
              <div
                style={{
                  marginTop: '12px',
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        backgroundColor: '#DBEAFE',
                        color: '#1D4ED8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <MapPin size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Endereço Identificado pelo CEP</span>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            backgroundColor: '#FEF3C7',
                            color: '#92400E',
                          }}
                        >
                          Aguardando confirmação no mapa
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#1E3A8A', marginTop: '2px' }}>
                        {address || 'Logradouro'}
                        {number ? `, ${number}` : ''}
                        {neighborhood ? ` • ${neighborhood}` : ''}
                        {city ? ` • ${city}/${state || 'SC'}` : ''}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#2563EB', marginTop: '2px' }}>
                        Clique em <strong>Localizar no mapa</strong> para calcular coordenadas e posicionar o marcador.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setShowLocationPicker(true)}
                    style={{
                      padding: '9px 16px',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      backgroundColor: '#1E4620',
                      boxShadow: '0 2px 8px rgba(30, 70, 32, 0.25)',
                    }}
                  >
                    <Compass size={16} />
                    <span>Localizar no mapa</span>
                  </button>
                </div>
              </div>
            );
          }

          // Estado Inicial / Neutro (Sem endereço nem coordenadas)
          return (
            <div
              style={{
                marginTop: '12px',
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#F9FAFB',
                border: '1px dashed var(--border-light)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      backgroundColor: '#F3F4F6',
                      color: '#6B7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Compass size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Imóvel sem coordenadas no mapa
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Preencha o CEP ou endereço acima para localizar automaticamente o imóvel no mapa.
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowLocationPicker(true)}
                  style={{ padding: '8px 14px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <MapPin size={15} />
                  <span>Localizar no mapa</span>
                </button>
              </div>
            </div>
          );
        })()}

        {/* Delimitação Opcional do Terreno no Mapa (Fase 4.2) */}
        {latitude && longitude ? (
          <div
            style={{
              padding: '16px 20px',
              borderRadius: 'var(--radius-md)',
              border: boundary ? '1px solid #86EFAC' : '1px dashed var(--border-light)',
              backgroundColor: boundary ? '#F0FDF4' : '#F9FAFB',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '8px',
                    backgroundColor: boundary ? '#DCFCE7' : '#E5E7EB',
                    color: boundary ? '#15803D' : '#6B7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Pentagon size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Delimitação do Terreno no Mapa</span>
                    {boundary ? (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          backgroundColor: '#BBF7D0',
                          color: '#166534',
                        }}
                      >
                        Perímetro Delimitado
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          backgroundColor: '#F3F4F6',
                          color: '#6B7280',
                        }}
                      >
                        Opcional
                      </span>
                    )}
                  </div>

                  {boundary && boundaryArea ? (
                    <div style={{ fontSize: '0.84rem', color: '#166534', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span>
                        Área aproximada delimitada: <strong>{boundaryArea.toLocaleString('pt-BR')} m²</strong>
                      </span>
                      {totalArea && (
                        <span style={{ color: '#4B5563' }}>
                          • Área informada (documental): {Number(totalArea).toLocaleString('pt-BR')} m²
                        </span>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Desenhe os vértices do terreno diretamente no mapa para visualização do perímetro.
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {boundary ? (
                  <>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowBoundaryModal(true)}
                      style={{ padding: '8px 14px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Pentagon size={15} />
                      <span>Editar delimitação</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBoundary(null);
                        setBoundaryArea(null);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-danger)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '4px 8px',
                      }}
                    >
                      Remover
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowBoundaryModal(true)}
                    style={{
                      padding: '8px 14px',
                      fontSize: '0.84rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <Pentagon size={15} color="var(--color-primary)" />
                    <span>Delimitar terreno no mapa</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Modal de Delimitação do Terreno no Mapa (Fase 4.2) */}
        {showBoundaryModal && latitude && longitude && (
          <ParcelBoundaryModal
            isOpen={showBoundaryModal}
            initialBoundary={boundary}
            centerLat={parseFloat(latitude)}
            centerLng={parseFloat(longitude)}
            informedArea={totalArea ? parseFloat(totalArea) : (privateArea ? parseFloat(privateArea) : null)}
            onConfirm={(geoJson, areaM2) => {
              setBoundary(geoJson);
              setBoundaryArea(areaM2);
              setShowBoundaryModal(false);
            }}
            onRemove={() => {
              setBoundary(null);
              setBoundaryArea(null);
              setShowBoundaryModal(false);
            }}
            onCancel={() => setShowBoundaryModal(false)}
          />
        )}

        {/* Modal de Confirmação e Ajuste de Localização */}
        {showLocationPicker && (
          <LocationPickerModal
            initialLat={latitude ? parseFloat(latitude) : null}
            initialLng={longitude ? parseFloat(longitude) : null}
            addressToGeocode={`${address || ''}${number ? `, ${number}` : ''}, ${neighborhood || ''}, ${city || 'Criciúma'}, ${state || 'SC'}`}
            addressComponents={{
              street: address,
              number: number,
              neighborhood: neighborhood,
              city: city || 'Criciúma',
              state: state || 'SC',
              postalCode: zipcode,
            }}
            onConfirm={(confirmedLat, confirmedLng, _formattedAddr, meta) => {
              setLatitude(String(confirmedLat));
              setLongitude(String(confirmedLng));
              if (meta) {
                setGeoPrecision(meta);
              }
              setShowLocationPicker(false);
            }}
            onCancel={() => setShowLocationPicker(false)}
            title="Localização do Imóvel no Mapa"
          />
        )}
      </div>

      {/* BLOCO 4: Fotos do Imóvel */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
          <ImageIcon size={20} color="var(--color-primary)" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Fotos do Imóvel</h2>
        </div>

        <div>
          <label
            htmlFor="file-upload"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '30px 20px',
              border: '2px dashed var(--border-light)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-subtle)',
              cursor: uploading ? 'not-allowed' : 'pointer',
              transition: 'border-color var(--transition-fast)',
            }}
          >
            <Upload size={28} color="var(--color-primary)" style={{ marginBottom: '8px' }} />
            <span style={{ fontSize: '0.94rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {uploading ? 'Enviando fotos...' : 'Clique para adicionar fotos ou arraste aqui'}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              A primeira foto será a capa principal do anúncio
            </span>
            <input
              id="file-upload"
              type="file"
              multiple
              accept="image/*"
              disabled={uploading}
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {/* Pré-visualização de Imagens */}
        {images.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px', marginTop: '12px' }}>
            {images.map((url, idx) => (
              <div
                key={idx}
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '4/3',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden',
                  backgroundColor: '#F3F4F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: idx === 0 ? '2px solid var(--color-primary)' : '1px solid var(--border-light)',
                }}
              >
                <img
                  src={url}
                  alt={`Foto ${idx + 1}`}
                  style={{ maxWidth: '100%', maxHeight: '100%', width: '100%', height: '100%', objectFit: 'contain' }}
                />
                {idx === 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 4,
                      left: 4,
                      backgroundColor: 'var(--color-primary)',
                      color: 'white',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    CAPA
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BLOCO 5: Dados Avançados e Registro (Opcional / Expansível) */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={20} color="var(--color-primary)" />
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                Dados Avançados e Registro
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Opcionais para matching detalhado e controle administrativo (matrícula).
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.84rem',
                fontWeight: 600,
              }}
            >
              {showAdvanced ? 'Recolher' : 'Expandir opcionais'}
              {showAdvanced ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>

        {showAdvanced && (
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Opcionais específicos para Casa e Apartamento */}
            {(propertyType === 'Casa' || propertyType === 'Apartamento') && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                    Piscina
                  </label>
                  <select
                    value={hasPool === null ? '' : hasPool ? 'true' : 'false'}
                    onChange={(e) => setHasPool(e.target.value === '' ? null : e.target.value === 'true')}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-light)',
                      backgroundColor: 'var(--bg-subtle)',
                    }}
                  >
                    <option value="">Não informado</option>
                    <option value="true">Sim, possui piscina</option>
                    <option value="false">Não possui</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                    Academia / Fitness
                  </label>
                  <select
                    value={hasGym === null ? '' : hasGym ? 'true' : 'false'}
                    onChange={(e) => setHasGym(e.target.value === '' ? null : e.target.value === 'true')}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-light)',
                      backgroundColor: 'var(--bg-subtle)',
                    }}
                  >
                    <option value="">Não informado</option>
                    <option value="true">Sim, possui academia</option>
                    <option value="false">Não possui</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                    Churrasqueira
                  </label>
                  <select
                    value={hasBarbecue === null ? '' : hasBarbecue ? 'true' : 'false'}
                    onChange={(e) => setHasBarbecue(e.target.value === '' ? null : e.target.value === 'true')}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-light)',
                      backgroundColor: 'var(--bg-subtle)',
                    }}
                  >
                    <option value="">Não informado</option>
                    <option value="true">Sim, possui churrasqueira</option>
                    <option value="false">Não possui</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                    Mobília
                  </label>
                  <select
                    value={furniture || ''}
                    onChange={(e) => setFurniture(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-light)',
                      backgroundColor: 'var(--bg-subtle)',
                    }}
                  >
                    <option value="">Não informado</option>
                    <option value="Completa">Mobiliado Completo</option>
                    <option value="Semi">Semi-mobiliado</option>
                    <option value="Não">Sem mobília / Vazio</option>
                  </select>
                </div>

                {/* Exclusivos de Apartamento */}
                {propertyType === 'Apartamento' && (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                        Salão de Festas
                      </label>
                      <select
                        value={hasPartyHall === null ? '' : hasPartyHall ? 'true' : 'false'}
                        onChange={(e) => setHasPartyHall(e.target.value === '' ? null : e.target.value === 'true')}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-light)',
                          backgroundColor: 'var(--bg-subtle)',
                        }}
                      >
                        <option value="">Não informado</option>
                        <option value="true">Sim, possui salão</option>
                        <option value="false">Não possui</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                        Elevador
                      </label>
                      <select
                        value={hasElevator === null ? '' : hasElevator ? 'true' : 'false'}
                        onChange={(e) => setHasElevator(e.target.value === '' ? null : e.target.value === 'true')}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-light)',
                          backgroundColor: 'var(--bg-subtle)',
                        }}
                      >
                        <option value="">Não informado</option>
                        <option value="true">Sim, edifício com elevador</option>
                        <option value="false">Não possui elevador</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                        Espaço Pet
                      </label>
                      <select
                        value={hasPetSpace === null ? '' : hasPetSpace ? 'true' : 'false'}
                        onChange={(e) => setHasPetSpace(e.target.value === '' ? null : e.target.value === 'true')}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-light)',
                          backgroundColor: 'var(--bg-subtle)',
                        }}
                      >
                        <option value="">Não informado</option>
                        <option value="true">Sim, possui espaço pet</option>
                        <option value="false">Não possui</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Número da Matrícula (Informativo / Administrativo) */}
            <div style={{ borderTop: '1px dashed var(--border-light)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <ShieldCheck size={17} color="var(--color-primary)" />
                <label style={{ fontSize: '0.86rem', fontWeight: 700, margin: 0 }}>
                  Número da Matrícula / Registro de Imóveis (Informativo)
                </label>
              </div>
              <input
                type="text"
                value={registryNumber}
                onChange={(e) => setRegistryNumber(e.target.value)}
                placeholder="Ex: 48.912 - 1º Ofício de Registro de Imóveis de Criciúma"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              />
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                Dado puramente administrativo e informativo. Não afeta a pontuação do matching.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* BLOCO 6: Descrição e Observações */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
          <FileText size={20} color="var(--color-primary)" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Descrição e Observações</h2>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
            Descrição do Imóvel
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva os principais destaques, iluminação, acabamento, vista..."
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              backgroundColor: 'var(--bg-subtle)',
              resize: 'vertical',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
            Observações Internas (Visível apenas para você)
          </label>
          <textarea
            rows={2}
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="Ex: Proprietário aceita negociar até R$ 620k à vista..."
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              backgroundColor: 'var(--bg-subtle)',
              resize: 'vertical',
            }}
          />
        </div>
      </div>

      {/* Ações Finais */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '12px',
          paddingBottom: '32px',
        }}
      >
        <button
          type="button"
          disabled={loading}
          onClick={() => handleSubmit('Inativo')}
          className="btn-secondary"
          style={{ padding: '12px 20px' }}
        >
          Salvar como Inativo
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => handleSubmit('Disponível')}
          className="btn-primary"
          style={{ padding: '12px 24px' }}
        >
          <Check size={18} />
          <span>{loading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Publicar Imóvel'}</span>
        </button>
      </div>
    </div>
  );
}
