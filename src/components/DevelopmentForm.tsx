'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Building,
  HardHat,
  MapPin,
  FileText,
  Upload,
  X,
  Plus,
  Trash2,
  Image as ImageIcon,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  Layers,
  Bed,
  Bath,
  Car,
  Maximize2,
  Compass,
} from 'lucide-react';
import FieldHelper from './FieldHelper';

const LocationPickerModal = dynamic(() => import('./LocationPickerModal'), { ssr: false });

interface TypologyInput {
  id?: string;
  name: string;
  propertyType: string;
  price: string;
  privateArea: string;
  builtArea?: string;
  totalArea?: string;
  bedrooms: number;
  suites: number;
  otherBedrooms?: string | number;
  bathrooms: number;
  socialBathrooms?: string;
  lavabos?: string;
  parkingSpaces: number;
  coveredParkingSpaces?: string;
  uncoveredParkingSpaces?: string;
  status: string;
  notes?: string;

  // Estados de controle legado por tipologia
  isLegacyUnclassifiedBaths?: boolean;
  isClassifyingBaths?: boolean;
  legacyBathrooms?: number | null;

  isLegacyUnclassifiedParking?: boolean;
  isClassifyingParking?: boolean;
  legacyParkingSpaces?: number | null;

  isLegacyHouseWithPrivateArea?: boolean;
  legacyAreaConfirmed?: boolean;
}

interface DevelopmentFormProps {
  initialData?: any;
  isEditing?: boolean;
}

const STAGES = [
  'Lançamento',
  'Na planta',
  'Em construção',
  'Próximo da entrega',
];

const PROPERTY_TYPES = [
  'Apartamento',
  'Cobertura',
  'Studio / Loft',
  'Casa em Condomínio',
  'Sala Comercial',
  'Outro',
];

const TYPOLOGY_STATUSES = ['Disponível', 'Reservada', 'Esgotada'];

export default function DevelopmentForm({ initialData, isEditing = false }: DevelopmentFormProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Informações do Empreendimento
  const [name, setName] = useState(initialData?.name || '');
  const [developer, setDeveloper] = useState(initialData?.developer || '');
  const [stage, setStage] = useState(initialData?.stage || 'Em construção');
  const [deliveryDate, setDeliveryDate] = useState(initialData?.deliveryDate || '');
  const [status, setStatus] = useState(initialData?.status || 'Ativo');
  const [description, setDescription] = useState(initialData?.description || '');
  const [internalNotes, setInternalNotes] = useState(initialData?.internalNotes || '');

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

  // Fotos
  const [images, setImages] = useState<string[]>(
    initialData?.images?.map((img: any) => img.url) || []
  );

  // Tipologias dinâmicas
  const [typologies, setTypologies] = useState<TypologyInput[]>(() => {
    if (initialData?.typologies && initialData.typologies.length > 0) {
      return initialData.typologies.map((t: any) => {
        const isLegacyBaths = Boolean(
          isEditing &&
          t.socialBathrooms == null &&
          t.lavabos == null &&
          (t.bathrooms ?? 0) > (t.suites ?? 0)
        );

        const isLegacyParking = Boolean(
          isEditing &&
          t.coveredParkingSpaces == null &&
          t.uncoveredParkingSpaces == null &&
          (t.parkingSpaces ?? 0) > 0
        );

        const isLegacyHouse = Boolean(
          isEditing &&
          (t.propertyType === 'Casa em Condomínio' || t.propertyType === 'Casa') &&
          !t.builtArea &&
          t.privateArea
        );

        const suitesVal = t.suites !== undefined ? Number(t.suites) : 0;
        const otherBedVal = t.otherBedrooms !== undefined && t.otherBedrooms !== null
          ? String(t.otherBedrooms)
          : (isEditing && t.bedrooms !== undefined
              ? String(Math.max(0, (t.bedrooms || 0) - suitesVal))
              : '1');

        return {
          id: t.id,
          name: t.name || '',
          propertyType: t.propertyType || 'Apartamento',
          price: t.price ? String(t.price) : '',
          privateArea: t.privateArea ? String(t.privateArea) : '',
          builtArea: t.builtArea ? String(t.builtArea) : '',
          totalArea: t.totalArea ? String(t.totalArea) : '',
          suites: suitesVal,
          otherBedrooms: otherBedVal,
          bedrooms: t.bedrooms !== undefined ? Number(t.bedrooms) : suitesVal + (parseInt(otherBedVal, 10) || 0),

          socialBathrooms: t.socialBathrooms != null ? String(t.socialBathrooms) : '',
          lavabos: t.lavabos != null ? String(t.lavabos) : '',
          bathrooms: t.bathrooms !== undefined ? Number(t.bathrooms) : 0,
          isLegacyUnclassifiedBaths: isLegacyBaths,
          isClassifyingBaths: !isLegacyBaths,
          legacyBathrooms: t.bathrooms != null ? Number(t.bathrooms) : null,

          coveredParkingSpaces: t.coveredParkingSpaces != null ? String(t.coveredParkingSpaces) : '',
          uncoveredParkingSpaces: t.uncoveredParkingSpaces != null ? String(t.uncoveredParkingSpaces) : '',
          parkingSpaces: t.parkingSpaces !== undefined ? Number(t.parkingSpaces) : 0,
          isLegacyUnclassifiedParking: isLegacyParking,
          isClassifyingParking: !isLegacyParking,
          legacyParkingSpaces: t.parkingSpaces != null ? Number(t.parkingSpaces) : null,

          isLegacyHouseWithPrivateArea: isLegacyHouse,
          legacyAreaConfirmed: false,

          status: t.status || 'Disponível',
          notes: t.notes || '',
        };
      });
    }
    // Estado inicial padrão com 1 tipologia de exemplo
    return [
      {
        name: 'Tipo A — 2 Dormitórios',
        propertyType: 'Apartamento',
        price: '',
        privateArea: '',
        builtArea: '',
        totalArea: '',
        suites: 1,
        otherBedrooms: '1',
        bedrooms: 2,
        socialBathrooms: '1',
        lavabos: '0',
        bathrooms: 2,
        coveredParkingSpaces: '1',
        uncoveredParkingSpaces: '0',
        parkingSpaces: 1,
        isLegacyUnclassifiedBaths: false,
        isClassifyingBaths: true,
        legacyBathrooms: null,
        isLegacyUnclassifiedParking: false,
        isClassifyingParking: true,
        legacyParkingSpaces: null,
        isLegacyHouseWithPrivateArea: false,
        legacyAreaConfirmed: false,
        status: 'Disponível',
        notes: '',
      },
    ];
  });

  // Helpers para formatação de moeda
  function formatCurrency(val: string) {
    const clean = val.replace(/\D/g, '');
    if (!clean) return '';
    const num = Number(clean);
    return num.toLocaleString('pt-BR');
  }

  // Upload de Imagens
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('entityType', 'development');
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
          // Preserva coordenadas existentes
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

  // Gerenciamento de Tipologias
  function handleAddTypology() {
    setTypologies((prev) => [
      ...prev,
      {
        name: `Tipo ${String.fromCharCode(65 + prev.length)}`,
        propertyType: 'Apartamento',
        price: '',
        privateArea: '',
        builtArea: '',
        totalArea: '',
        suites: 1,
        otherBedrooms: '1',
        bedrooms: 2,
        socialBathrooms: '1',
        lavabos: '0',
        bathrooms: 2,
        coveredParkingSpaces: '1',
        uncoveredParkingSpaces: '0',
        parkingSpaces: 1,
        isLegacyUnclassifiedBaths: false,
        isClassifyingBaths: true,
        legacyBathrooms: null,
        isLegacyUnclassifiedParking: false,
        isClassifyingParking: true,
        legacyParkingSpaces: null,
        isLegacyHouseWithPrivateArea: false,
        legacyAreaConfirmed: false,
        status: 'Disponível',
        notes: '',
      },
    ]);
  }

  function handleRemoveTypology(index: number) {
    if (typologies.length === 1) {
      alert('O empreendimento deve conter pelo menos uma tipologia.');
      return;
    }
    setTypologies((prev) => prev.filter((_, idx) => idx !== index));
  }

  function handleUpdateTypology(index: number, field: keyof TypologyInput, value: any) {
    setTypologies((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  // Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Por favor, informe o nome do empreendimento.');
      return;
    }
    if (!developer.trim()) {
      setError('Por favor, informe a construtora responsável.');
      return;
    }
    if (!stage.trim()) {
      setError('Por favor, selecione o estágio da obra.');
      return;
    }

    // Valida tipologias
    for (let i = 0; i < typologies.length; i++) {
      const t = typologies[i];
      if (!t.name.trim()) {
        setError(`Por favor, dê um nome à tipologia #${i + 1} (ex: 2 dormitórios).`);
        return;
      }
      const rawPrice = t.price.replace(/\D/g, '');
      if (!rawPrice || Number(rawPrice) <= 0) {
        setError(`Por favor, informe o valor ou valor inicial da tipologia "${t.name}".`);
        return;
      }
    }

    // Validação de divergência de totais para tipologias legadas
    for (let i = 0; i < typologies.length; i++) {
      const t = typologies[i];
      const parsedSuites = Math.max(0, Number(t.suites) || 0);
      const parsedSocial = Math.max(0, parseInt(String(t.socialBathrooms ?? 0), 10) || 0);
      const parsedLavabos = Math.max(0, parseInt(String(t.lavabos ?? 0), 10) || 0);
      const totalBathroomsCalc = t.isClassifyingBaths
        ? parsedSuites + parsedSocial + parsedLavabos
        : (t.legacyBathrooms ?? (parsedSuites + parsedSocial + parsedLavabos));

      if (t.isLegacyUnclassifiedBaths && t.isClassifyingBaths && t.legacyBathrooms !== null && totalBathroomsCalc !== t.legacyBathrooms) {
        const confirmBaths = window.confirm(
          `Na tipologia "${t.name}", a soma dos banheiros (${totalBathroomsCalc}: ${parsedSuites} suíte(s) + ${parsedSocial} social + ${parsedLavabos} lavabo) difere do total cadastrado anteriormente (${t.legacyBathrooms} banheiros).\n\nDeseja confirmar a alteração do total para ${totalBathroomsCalc}?`
        );
        if (!confirmBaths) return;
      }

      const parsedCovered = Math.max(0, parseInt(String(t.coveredParkingSpaces ?? 0), 10) || 0);
      const parsedUncovered = Math.max(0, parseInt(String(t.uncoveredParkingSpaces ?? 0), 10) || 0);
      const totalParkingCalc = t.isClassifyingParking
        ? parsedCovered + parsedUncovered
        : (t.legacyParkingSpaces ?? (parsedCovered + parsedUncovered));

      if (t.isLegacyUnclassifiedParking && t.isClassifyingParking && t.legacyParkingSpaces !== null && totalParkingCalc !== t.legacyParkingSpaces) {
        const confirmParking = window.confirm(
          `Na tipologia "${t.name}", a soma das vagas (${totalParkingCalc}: ${parsedCovered} coberta(s) + ${parsedUncovered} descoberta(s)) difere do total cadastrado anteriormente (${t.legacyParkingSpaces} vagas).\n\nDeseja confirmar a alteração do total para ${totalParkingCalc}?`
        );
        if (!confirmParking) return;
      }
    }

    setLoading(true);

    let finalLat: number | null = latitude !== '' && !isNaN(Number(latitude)) ? Number(latitude) : null;
    let finalLng: number | null = longitude !== '' && !isNaN(Number(longitude)) ? Number(longitude) : null;

    // Failsafe se houver endereço/CEP mas não houver coordenadas
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

    const payload = {
      name: name.trim(),
      developer: developer.trim(),
      stage,
      deliveryDate: deliveryDate.trim() || null,
      status,
      description: description.trim() || null,
      internalNotes: internalNotes.trim() || null,
      zipcode,
      address,
      number,
      complement,
      neighborhood,
      city,
      state,
      latitude: finalLat,
      longitude: finalLng,
      images,
      typologies: typologies.map((t) => {
        const parsedSuites = Math.max(0, Number(t.suites) || 0);
        const hasOtherBed = t.otherBedrooms !== undefined && t.otherBedrooms !== null && t.otherBedrooms !== '';
        const parsedOtherBed = hasOtherBed ? Math.max(0, parseInt(String(t.otherBedrooms), 10) || 0) : null;
        const bedrooms = parsedOtherBed !== null ? parsedSuites + parsedOtherBed : Number(t.bedrooms) || parsedSuites;

        const hasSocial = t.isClassifyingBaths && t.socialBathrooms !== undefined && t.socialBathrooms !== null && t.socialBathrooms !== '';
        const hasLavabos = t.isClassifyingBaths && t.lavabos !== undefined && t.lavabos !== null && t.lavabos !== '';
        const socialBathrooms = hasSocial ? Math.max(0, parseInt(String(t.socialBathrooms), 10) || 0) : null;
        const lavabos = hasLavabos ? Math.max(0, parseInt(String(t.lavabos), 10) || 0) : null;

        let bathrooms = Number(t.bathrooms) || parsedSuites;
        if (t.isClassifyingBaths && (hasSocial || hasLavabos)) {
          bathrooms = parsedSuites + (socialBathrooms ?? 0) + (lavabos ?? 0);
        } else if (!t.isClassifyingBaths && t.legacyBathrooms != null) {
          bathrooms = t.legacyBathrooms;
        }

        const hasCovered = t.isClassifyingParking && t.coveredParkingSpaces !== undefined && t.coveredParkingSpaces !== null && t.coveredParkingSpaces !== '';
        const hasUncovered = t.isClassifyingParking && t.uncoveredParkingSpaces !== undefined && t.uncoveredParkingSpaces !== null && t.uncoveredParkingSpaces !== '';
        const coveredParkingSpaces = hasCovered ? Math.max(0, parseInt(String(t.coveredParkingSpaces), 10) || 0) : null;
        const uncoveredParkingSpaces = hasUncovered ? Math.max(0, parseInt(String(t.uncoveredParkingSpaces), 10) || 0) : null;

        let parkingSpaces = Number(t.parkingSpaces) || 0;
        if (t.isClassifyingParking && (hasCovered || hasUncovered)) {
          parkingSpaces = (coveredParkingSpaces ?? 0) + (uncoveredParkingSpaces ?? 0);
        } else if (!t.isClassifyingParking && t.legacyParkingSpaces != null) {
          parkingSpaces = t.legacyParkingSpaces;
        }

        const builtArea = t.builtArea ? parseFloat(String(t.builtArea)) : null;
        const privateArea = t.privateArea ? parseFloat(String(t.privateArea)) : null;
        const totalArea = t.totalArea ? parseFloat(String(t.totalArea)) : null;

        return {
          id: t.id,
          name: t.name.trim(),
          propertyType: t.propertyType,
          price: parseFloat(t.price.replace(/\D/g, '')) || 0,
          privateArea,
          builtArea,
          totalArea,
          bedrooms,
          suites: parsedSuites,
          otherBedrooms: parsedOtherBed,
          bathrooms,
          socialBathrooms,
          lavabos,
          parkingSpaces,
          coveredParkingSpaces,
          uncoveredParkingSpaces,
          status: t.status,
          notes: t.notes?.trim() || null,
        };
      }),
    };

    try {
      const url = isEditing ? `/api/developments/${initialData.id}` : '/api/developments';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar empreendimento.');
      }

      router.push(`/empreendimentos/${data.development.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar empreendimento.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '880px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Botão Voltar */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Imóveis em construção
            </span>
            <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
              Estoque da Construtora
            </span>
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {isEditing ? 'Editar Empreendimento' : 'Cadastrar Empreendimento'}
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Organize os lançamentos das construtoras parceiras para cruzá-los futuramente com as buscas de clientes.
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

      {/* BLOCO 1: Informações Gerais do Empreendimento */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
          <Building size={20} color="var(--color-primary)" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Dados do Empreendimento
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* Nome */}
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Nome do empreendimento *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Residencial Aurora"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                fontSize: '0.92rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Construtora */}
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Construtora parceira *
            </label>
            <input
              type="text"
              required
              value={developer}
              onChange={(e) => setDeveloper(e.target.value)}
              placeholder="Ex: Construtora XYZ ou Fontana"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                fontSize: '0.92rem',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              A construtora é informação cadastral do empreendimento.
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {/* Estágio da Obra */}
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Estágio da obra *
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                fontSize: '0.92rem',
                backgroundColor: 'white',
                outline: 'none',
              }}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Previsão de Entrega */}
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Previsão de entrega
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                placeholder="Ex: Março/2028 ou 2º Sem/2027"
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 36px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  fontSize: '0.92rem',
                  outline: 'none',
                }}
              />
              <Calendar
                size={16}
                color="#9CA3AF"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Status do empreendimento
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                fontSize: '0.92rem',
                backgroundColor: 'white',
                outline: 'none',
              }}
            >
              <option value="Ativo">Ativo na carteira</option>
              <option value="Inativo">Inativo / Desativado</option>
            </select>
          </div>
        </div>
      </div>

      {/* BLOCO 2: Localização */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
          <MapPin size={20} color="var(--color-primary)" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Localização do Empreendimento
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
              CEP
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={zipcode}
                onChange={(e) => setZipcode(e.target.value)}
                onBlur={handleCepLookup}
                placeholder="88800-000"
                maxLength={9}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  fontSize: '0.92rem',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={handleCepLookup}
                className="btn-secondary"
                style={{ padding: '8px 12px', fontSize: '0.82rem' }}
              >
                Buscar
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Bairro
            </label>
            <input
              type="text"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="Ex: Centro, Pio Corrêa..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                fontSize: '0.92rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Cidade
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
                fontSize: '0.92rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Estado
            </label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              maxLength={2}
              placeholder="SC"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                fontSize: '0.92rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
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
                fontSize: '0.92rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Número
            </label>
            <input
              type="text"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="Ex: 500"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                fontSize: '0.92rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Complemento
            </label>
            <input
              type="text"
              value={complement}
              onChange={(e) => setComplement(e.target.value)}
              placeholder="Ex: Esquina com Av. Centenário"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                fontSize: '0.92rem',
                outline: 'none',
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
                        Coordenadas: {Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)} (Ponto compartilhado por todas as tipologias)
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
            // Estado A: Endereço Identificado pelo CEP (Aguardando confirmação no mapa)
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
                      Empreendimento sem coordenadas no mapa
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Preencha o CEP ou endereço acima para localizar automaticamente o empreendimento no mapa.
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
            title="Localização do Empreendimento no Mapa"
          />
        )}
      </div>

      {/* BLOCO 3: Fotos do Empreendimento */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
          <ImageIcon size={20} color="var(--color-primary)" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Fotos e Fachada
          </h2>
        </div>

        <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
          Adicione a imagem principal (fachada/perspectiva 3D) e imagens adicionais do empreendimento ou plantas.
        </p>

        {/* Upload Box */}
        <label
          style={{
            border: '2px dashed var(--border-light)',
            borderRadius: 'var(--radius-md)',
            padding: '30px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: 'var(--bg-subtle)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'border-color var(--transition-fast)',
          }}
        >
          <Upload size={28} color="var(--color-primary)" />
          <span style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
            {uploading ? 'Enviando imagens...' : 'Clique ou arraste para adicionar fotos'}
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            JPG, PNG ou WebP (A primeira foto será a capa)
          </span>
          <input
            type="file"
            multiple
            accept="image/*"
            disabled={uploading}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </label>

        {/* Grid de Imagens */}
        {images.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: '12px',
              marginTop: '10px',
            }}
          >
            {images.map((url, idx) => (
              <div
                key={url + idx}
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '110px',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden',
                  backgroundColor: '#F3F4F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: idx === 0 ? '2px solid var(--color-primary)' : '1px solid var(--border-light)',
                }}
              >
                <img src={url} alt={`Foto ${idx + 1}`} style={{ maxWidth: '100%', maxHeight: '100%', width: '100%', height: '100%', objectFit: 'contain' }} />
                {idx === 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 4,
                      left: 4,
                      backgroundColor: 'var(--color-primary)',
                      color: 'white',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
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
                    backgroundColor: 'rgba(0, 0, 0, 0.65)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BLOCO 4: Tipologias / Unidades Disponíveis */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={20} color="var(--color-primary)" />
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Tipologias / Unidades Disponíveis
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Cadastre os tipos de unidades ofertadas no empreendimento com valores a partir de e metragens.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddTypology}
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.86rem' }}
          >
            <Plus size={16} />
            <span>Adicionar Tipologia</span>
          </button>
        </div>

        {/* Lista de Tipologias */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {typologies.map((t, idx) => {
            const parsedSuites = Math.max(0, Number(t.suites) || 0);
            const parsedOtherBed = Math.max(0, parseInt(String(t.otherBedrooms ?? 0), 10) || 0);
            const totalBedrooms = parsedSuites + parsedOtherBed;

            const parsedSocial = Math.max(0, parseInt(String(t.socialBathrooms ?? 0), 10) || 0);
            const parsedLavabos = Math.max(0, parseInt(String(t.lavabos ?? 0), 10) || 0);
            const totalBathrooms = t.isClassifyingBaths
              ? parsedSuites + parsedSocial + parsedLavabos
              : (t.legacyBathrooms ?? (parsedSuites + parsedSocial + parsedLavabos));

            const parsedCovered = Math.max(0, parseInt(String(t.coveredParkingSpaces ?? 0), 10) || 0);
            const parsedUncovered = Math.max(0, parseInt(String(t.uncoveredParkingSpaces ?? 0), 10) || 0);
            const totalParking = t.isClassifyingParking
              ? parsedCovered + parsedUncovered
              : (t.legacyParkingSpaces ?? (parsedCovered + parsedUncovered));

            const isHouseType = t.propertyType === 'Casa em Condomínio' || t.propertyType === 'Casa';

            return (
              <div
                key={t.id || idx}
                style={{
                  padding: '20px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                  position: 'relative',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                {/* Topo do Card da Tipologia */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--border-light)', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Tipologia #{idx + 1}
                    </span>
                    {t.id && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', backgroundColor: '#F3F4F6', padding: '2px 6px', borderRadius: '4px' }}>
                        ID: {t.id}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <select
                      value={t.status}
                      onChange={(e) => handleUpdateTypology(idx, 'status', e.target.value)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-light)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        backgroundColor: '#F9FAFB',
                      }}
                    >
                      {TYPOLOGY_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>

                    {typologies.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTypology(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-danger)',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="Excluir tipologia"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Linha 1: Nome, Tipo e Preço */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                      Identificação / Nome da Planta *
                    </label>
                    <input
                      type="text"
                      required
                      value={t.name}
                      onChange={(e) => handleUpdateTypology(idx, 'name', e.target.value)}
                      placeholder="Ex: 2 dormitórios ou Tipo A"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-light)',
                        fontSize: '0.88rem',
                        backgroundColor: 'white',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                      Tipo da Unidade
                    </label>
                    <select
                      value={t.propertyType}
                      onChange={(e) => handleUpdateTypology(idx, 'propertyType', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-light)',
                        fontSize: '0.88rem',
                        backgroundColor: 'white',
                      }}
                    >
                      {PROPERTY_TYPES.map((pt) => (
                        <option key={pt} value={pt}>
                          {pt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                      Valor inicial (A partir de) *
                    </label>
                    <input
                      type="text"
                      required
                      value={t.price ? formatCurrency(t.price) : ''}
                      onChange={(e) => handleUpdateTypology(idx, 'price', e.target.value.replace(/\D/g, ''))}
                      placeholder="Ex: R$ 620.000"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-light)',
                        fontSize: '0.88rem',
                        backgroundColor: 'white',
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                      }}
                    />
                  </div>
                </div>

                {/* GRUPO 1: Quartos & Suítes */}
                <div style={{ padding: '14px', backgroundColor: '#F9FAFB', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      1. Quartos e Suítes
                    </span>
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, backgroundColor: '#EFF6FF', color: '#1E40AF', padding: '2px 8px', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
                      Total: {totalBedrooms} quarto(s)
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <label htmlFor={`field-suites-${idx}`} style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                          Suítes
                        </label>
                        <FieldHelper helpKey="suites" />
                      </div>
                      <input
                        id={`field-suites-${idx}`}
                        type="number"
                        min="0"
                        value={t.suites}
                        onChange={(e) => handleUpdateTypology(idx, 'suites', Math.max(0, parseInt(e.target.value, 10) || 0))}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-light)',
                          fontSize: '0.86rem',
                          backgroundColor: 'white',
                        }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <label htmlFor={`field-dormitories-${idx}`} style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                          Dormitórios (sem suíte)
                        </label>
                        <FieldHelper helpKey="dormitories" />
                      </div>
                      <input
                        id={`field-dormitories-${idx}`}
                        type="number"
                        min="0"
                        value={t.otherBedrooms ?? ''}
                        onChange={(e) => handleUpdateTypology(idx, 'otherBedrooms', e.target.value)}
                        placeholder="Ex: 1"
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-light)',
                          fontSize: '0.86rem',
                          backgroundColor: 'white',
                        }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <label htmlFor={`field-total-bedrooms-${idx}`} style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1E40AF' }}>
                          Total de quartos (calculado)
                        </label>
                        <FieldHelper helpKey="totalBedrooms" />
                      </div>
                      <input
                        id={`field-total-bedrooms-${idx}`}
                        type="number"
                        disabled
                        value={totalBedrooms}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid #BFDBFE',
                          backgroundColor: '#EFF6FF',
                          color: '#1E40AF',
                          fontWeight: 700,
                          cursor: 'not-allowed',
                          fontSize: '0.86rem',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* GRUPO 2: Banheiros & Lavabos */}
                <div style={{ padding: '14px', backgroundColor: '#F9FAFB', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      2. Banheiros e Lavabos
                    </span>
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, backgroundColor: '#EFF6FF', color: '#1E40AF', padding: '2px 8px', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
                      Total: {totalBathrooms} banheiro(s)
                    </span>
                  </div>

                  {/* Aviso para tipologia legada sem classificação */}
                  {!t.isClassifyingBaths && t.isLegacyUnclassifiedBaths ? (
                    <div style={{ padding: '10px 12px', backgroundColor: '#FEF3C7', borderRadius: 'var(--radius-sm)', border: '1px solid #FDE68A', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <AlertTriangle size={16} color="#B45309" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ fontSize: '0.8rem', color: '#92400E', lineHeight: 1.4 }}>
                          <strong>Classificação detalhada não informada no cadastro anterior desta tipologia.</strong>
                          <br />
                          Total registrado: <strong>{t.legacyBathrooms} banheiros</strong> ({parsedSuites} de suíte + {Math.max(0, (t.legacyBathrooms || 0) - parsedSuites)} adicional não classificado entre social ou lavabo).
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                        <span style={{ fontSize: '0.74rem', color: '#78350F' }}>
                          O total legado será preservado normalmente ao salvar outros dados.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateTypology(idx, 'isClassifyingBaths', true);
                            const residual = Math.max(0, (t.legacyBathrooms || 0) - parsedSuites);
                            handleUpdateTypology(idx, 'socialBathrooms', String(residual));
                            handleUpdateTypology(idx, 'lavabos', '0');
                          }}
                          className="btn-secondary"
                          style={{ padding: '3px 8px', fontSize: '0.76rem', backgroundColor: '#FFFFFF', borderColor: '#F59E0B', color: '#B45309', fontWeight: 600 }}
                        >
                          Classificar banheiros agora
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <label htmlFor={`field-social-bathrooms-${idx}`} style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                          Banheiros sociais
                        </label>
                        <FieldHelper helpKey="socialBathrooms" />
                      </div>
                      <input
                        id={`field-social-bathrooms-${idx}`}
                        type="number"
                        min="0"
                        disabled={!t.isClassifyingBaths && t.isLegacyUnclassifiedBaths}
                        value={t.socialBathrooms ?? ''}
                        onChange={(e) => handleUpdateTypology(idx, 'socialBathrooms', e.target.value)}
                        placeholder={!t.isClassifyingBaths ? 'Não classificado' : 'Ex: 1'}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-light)',
                          fontSize: '0.86rem',
                          backgroundColor: !t.isClassifyingBaths && t.isLegacyUnclassifiedBaths ? '#F3F4F6' : 'white',
                        }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <label htmlFor={`field-lavabos-${idx}`} style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                          Lavabos
                        </label>
                        <FieldHelper helpKey="lavabos" />
                      </div>
                      <input
                        id={`field-lavabos-${idx}`}
                        type="number"
                        min="0"
                        disabled={!t.isClassifyingBaths && t.isLegacyUnclassifiedBaths}
                        value={t.lavabos ?? ''}
                        onChange={(e) => handleUpdateTypology(idx, 'lavabos', e.target.value)}
                        placeholder={!t.isClassifyingBaths ? 'Não classificado' : 'Ex: 1'}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-light)',
                          fontSize: '0.86rem',
                          backgroundColor: !t.isClassifyingBaths && t.isLegacyUnclassifiedBaths ? '#F3F4F6' : 'white',
                        }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <label htmlFor={`field-total-bathrooms-${idx}`} style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1E40AF' }}>
                          Total de banheiros (calculado)
                        </label>
                        <FieldHelper helpKey="totalBathrooms" />
                      </div>
                      <input
                        id={`field-total-bathrooms-${idx}`}
                        type="number"
                        disabled
                        value={totalBathrooms}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid #BFDBFE',
                          backgroundColor: '#EFF6FF',
                          color: '#1E40AF',
                          fontWeight: 700,
                          cursor: 'not-allowed',
                          fontSize: '0.86rem',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* GRUPO 3: Vagas de Garagem */}
                <div style={{ padding: '14px', backgroundColor: '#F9FAFB', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      3. Vagas de Garagem
                    </span>
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, backgroundColor: '#F3F4F6', color: '#374151', padding: '2px 8px', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
                      Total: {totalParking} vaga(s)
                    </span>
                  </div>

                  {/* Aviso para tipologia legada sem especificação de cobertura */}
                  {!t.isClassifyingParking && t.isLegacyUnclassifiedParking ? (
                    <div style={{ padding: '10px 12px', backgroundColor: '#FEF3C7', borderRadius: 'var(--radius-sm)', border: '1px solid #FDE68A', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <AlertTriangle size={16} color="#B45309" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ fontSize: '0.8rem', color: '#92400E', lineHeight: 1.4 }}>
                          <strong>Cobertura das vagas não especificada no cadastro anterior desta tipologia.</strong>
                          <br />
                          Total registrado: <strong>{t.legacyParkingSpaces} vaga(s)</strong>.
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                        <span style={{ fontSize: '0.74rem', color: '#78350F' }}>
                          O total legado será preservado normalmente ao salvar outros dados.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateTypology(idx, 'isClassifyingParking', true);
                            handleUpdateTypology(idx, 'coveredParkingSpaces', String(t.legacyParkingSpaces || 0));
                            handleUpdateTypology(idx, 'uncoveredParkingSpaces', '0');
                          }}
                          className="btn-secondary"
                          style={{ padding: '3px 8px', fontSize: '0.76rem', backgroundColor: '#FFFFFF', borderColor: '#F59E0B', color: '#B45309', fontWeight: 600 }}
                        >
                          Especificar cobertura agora
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <label htmlFor={`field-covered-parking-${idx}`} style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                          Vagas cobertas
                        </label>
                        <FieldHelper helpKey="coveredParkingSpaces" />
                      </div>
                      <input
                        id={`field-covered-parking-${idx}`}
                        type="number"
                        min="0"
                        disabled={!t.isClassifyingParking && t.isLegacyUnclassifiedParking}
                        value={t.coveredParkingSpaces ?? ''}
                        onChange={(e) => handleUpdateTypology(idx, 'coveredParkingSpaces', e.target.value)}
                        placeholder={!t.isClassifyingParking ? 'Não especificado' : 'Ex: 1'}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-light)',
                          fontSize: '0.86rem',
                          backgroundColor: !t.isClassifyingParking && t.isLegacyUnclassifiedParking ? '#F3F4F6' : 'white',
                        }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <label htmlFor={`field-uncovered-parking-${idx}`} style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                          Vagas descobertas
                        </label>
                        <FieldHelper helpKey="uncoveredParkingSpaces" />
                      </div>
                      <input
                        id={`field-uncovered-parking-${idx}`}
                        type="number"
                        min="0"
                        disabled={!t.isClassifyingParking && t.isLegacyUnclassifiedParking}
                        value={t.uncoveredParkingSpaces ?? ''}
                        onChange={(e) => handleUpdateTypology(idx, 'uncoveredParkingSpaces', e.target.value)}
                        placeholder={!t.isClassifyingParking ? 'Não especificado' : 'Ex: 0'}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-light)',
                          fontSize: '0.86rem',
                          backgroundColor: !t.isClassifyingParking && t.isLegacyUnclassifiedParking ? '#F3F4F6' : 'white',
                        }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <label htmlFor={`field-total-parking-${idx}`} style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                          Vagas totais (calculado)
                        </label>
                        <FieldHelper helpKey="totalParkingSpaces" />
                      </div>
                      <input
                        id={`field-total-parking-${idx}`}
                        type="number"
                        disabled
                        value={totalParking}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid #D1D5DB',
                          backgroundColor: '#F3F4F6',
                          color: '#374151',
                          fontWeight: 700,
                          cursor: 'not-allowed',
                          fontSize: '0.86rem',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* GRUPO 4: Áreas e Metragens */}
                <div style={{ padding: '14px', backgroundColor: '#F9FAFB', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      4. Metragem da Planta
                    </span>
                  </div>

                  {/* Banner para casa antiga com metragem em privateArea */}
                  {isHouseType && t.isLegacyHouseWithPrivateArea && !t.legacyAreaConfirmed ? (
                    <div style={{ padding: '10px 12px', backgroundColor: '#FEF3C7', borderRadius: 'var(--radius-sm)', border: '1px solid #FDE68A', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <AlertTriangle size={16} color="#B45309" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ fontSize: '0.8rem', color: '#92400E', lineHeight: 1.4 }}>
                          <strong>Esta tipologia de casa possui metragem anteriormente cadastrada como área privativa ({t.privateArea} m²).</strong>
                          <br />
                          Para casas, o padrão recomendado é informar como <strong>Área Construída</strong>.
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateTypology(idx, 'builtArea', t.privateArea);
                            handleUpdateTypology(idx, 'legacyAreaConfirmed', true);
                          }}
                          className="btn-secondary"
                          style={{ padding: '3px 8px', fontSize: '0.76rem', backgroundColor: '#FFFFFF', borderColor: '#F59E0B', color: '#B45309', fontWeight: 600 }}
                        >
                          Confirmar como Área Construída
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                    {isHouseType ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                          <label htmlFor={`field-built-area-${idx}`} style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                            Área Construída (m²)
                          </label>
                          <FieldHelper helpKey="builtArea" />
                        </div>
                        <input
                          id={`field-built-area-${idx}`}
                          type="number"
                          step="any"
                          value={t.builtArea ?? ''}
                          onChange={(e) => handleUpdateTypology(idx, 'builtArea', e.target.value)}
                          placeholder="Ex: 180"
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-light)',
                            fontSize: '0.86rem',
                            backgroundColor: 'white',
                          }}
                        />
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                          <label htmlFor={`field-private-area-${idx}`} style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                            Área Privativa (m²)
                          </label>
                          <FieldHelper helpKey="privateArea" />
                        </div>
                        <input
                          id={`field-private-area-${idx}`}
                          type="number"
                          step="any"
                          value={t.privateArea}
                          onChange={(e) => handleUpdateTypology(idx, 'privateArea', e.target.value)}
                          placeholder="Ex: 72"
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-light)',
                            fontSize: '0.86rem',
                            backgroundColor: 'white',
                          }}
                        />
                      </div>
                    )}

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <label htmlFor={`field-total-area-${idx}`} style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                          Área Total (m²)
                        </label>
                        <FieldHelper helpKey="totalArea" />
                      </div>
                      <input
                        id={`field-total-area-${idx}`}
                        type="number"
                        step="any"
                        value={t.totalArea ?? ''}
                        onChange={(e) => handleUpdateTypology(idx, 'totalArea', e.target.value)}
                        placeholder="Ex: 95"
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-light)',
                          fontSize: '0.86rem',
                          backgroundColor: 'white',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Observação opcional da planta */}
                <div>
                  <label htmlFor={`field-notes-${idx}`} style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Observação opcional da planta
                  </label>
                  <input
                    id={`field-notes-${idx}`}
                    type="text"
                    value={t.notes || ''}
                    onChange={(e) => handleUpdateTypology(idx, 'notes', e.target.value)}
                    placeholder="Ex: Sacada com churrasqueira a carvão e vista livre"
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-light)',
                      fontSize: '0.86rem',
                      backgroundColor: 'white',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BLOCO 5: Descrição e Notas Internas */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
          <FileText size={20} color="var(--color-primary)" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Descrição e Notas do Corretor
          </h2>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
            Descrição curta de apresentação
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Apresentação do empreendimento: infraestrutura do condomínio, áreas de lazer, diferenciais de acabamento..."
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              fontSize: '0.92rem',
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
            Observações internas da corretora (Confidencial)
          </label>
          <textarea
            rows={3}
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="Anotações internas: comissão negociada com a construtora, contato do gerente comercial, condições de fluxo..."
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              fontSize: '0.92rem',
              outline: 'none',
              resize: 'vertical',
              backgroundColor: '#F9FAFB',
            }}
          />
        </div>
      </div>

      {/* Ações / Botões do Rodapé */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingBottom: '32px' }}>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
          style={{ padding: '12px 20px' }}
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={loading || uploading}
          className="btn-primary"
          style={{ padding: '12px 28px', fontSize: '0.96rem' }}
        >
          <Check size={18} strokeWidth={2.4} />
          <span>{loading ? 'Salvando...' : isEditing ? 'Atualizar Empreendimento' : 'Cadastrar Empreendimento'}</span>
        </button>
      </div>
    </form>
  );
}
