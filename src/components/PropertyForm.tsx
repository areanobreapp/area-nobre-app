'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import FieldHelper from './FieldHelper';
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
  AlertTriangle,
  Info,
  Compass,
  Pentagon,
  ChevronDown,
  ChevronUp,
  Sliders,
  ShieldCheck,
  Sparkles,
  GripVertical,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const LocationPickerModal = dynamic(() => import('./LocationPickerModal'), { ssr: false });
const ParcelBoundaryModal = dynamic(() => import('./ParcelBoundaryModal'), { ssr: false });
import PropertyAuthorizationModal from './PropertyAuthorizationModal';

interface PropertyFormProps {
  initialData?: any;
  isEditing?: boolean;
}

export default function PropertyForm({ initialData, isEditing = false }: PropertyFormProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Autorização do Proprietário (Fase 1 / Ponto 20 / Etapa 1.4)
  const [hasOwnerAuthorization, setHasOwnerAuthorization] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authDetails, setAuthDetails] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [revoking, setRevoking] = useState(false);

  React.useEffect(() => {
    if (isEditing && initialData?.id) {
      setLoadingAuth(true);
      fetch(`/api/properties/${initialData.id}/authorization`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            setAuthDetails(data);
          }
        })
        .catch((err) => console.error('Erro ao consultar autorização do imóvel:', err))
        .finally(() => setLoadingAuth(false));
    }
  }, [isEditing, initialData?.id]);

  async function handleRevokeAuthorization() {
    if (!initialData?.id) return;
    const confirm = window.confirm(
      'Tem certeza de que deseja revogar a autorização de divulgação deste imóvel?\n\nA divulgação pública e os links compartilhados serão suspensos imediatamente e o imóvel ficará inativo.'
    );
    if (!confirm) return;

    setRevoking(true);
    try {
      const res = await fetch(`/api/properties/${initialData.id}/authorization`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao revogar autorização.');

      // Atualiza detalhes locais
      setAuthDetails((prev: any) => ({
        ...prev,
        currentStatus: 'REVOKED',
        canBePubliclyExposed: false,
        isPublic: false,
      }));
      setStatus('Inativo');
      alert('Autorização revogada com sucesso. A divulgação foi suspensa.');
    } catch (err: any) {
      alert(err.message || 'Falha ao revogar autorização.');
    } finally {
      setRevoking(false);
    }
  }

  // Campos do formulário
  const [title, setTitle] = useState(initialData?.title || '');
  const [internalCode, setInternalCode] = useState(initialData?.internalCode || '');
  const [propertyType, setPropertyType] = useState(initialData?.propertyType || 'Apartamento');
  const [purpose, setPurpose] = useState(initialData?.purpose || 'Venda');
  const [status, setStatus] = useState(initialData?.status || 'Disponível');
  const [price, setPrice] = useState(initialData?.price ? String(initialData.price) : '');

  // Suítes e Quartos (Pontos 14, 17 e 28 / Fase 1 Bloco 2)
  const initialSuites = initialData?.suites !== undefined ? String(initialData.suites) : (isEditing ? '0' : '1');
  const initialOtherBedrooms = initialData?.otherBedrooms !== undefined && initialData?.otherBedrooms !== null
    ? String(initialData.otherBedrooms)
    : (isEditing && initialData?.bedrooms !== undefined
        ? String(Math.max(0, (initialData.bedrooms || 0) - (initialData.suites || 0)))
        : (isEditing ? '0' : '1'));

  const [suites, setSuites] = useState(initialSuites);
  const [otherBedrooms, setOtherBedrooms] = useState(initialOtherBedrooms);

  // Banheiros Sociais e Lavabos
  // Identifica se é um imóvel legado sem discriminação de banheiros
  const isLegacyUnclassifiedBaths = Boolean(
    isEditing &&
    initialData &&
    initialData.socialBathrooms == null &&
    initialData.lavabos == null &&
    (initialData.bathrooms ?? 0) > (initialData.suites ?? 0)
  );

  const [isClassifyingBaths, setIsClassifyingBaths] = useState<boolean>(!isLegacyUnclassifiedBaths);
  const [socialBathrooms, setSocialBathrooms] = useState<string>(
    initialData?.socialBathrooms !== undefined && initialData?.socialBathrooms !== null
      ? String(initialData.socialBathrooms)
      : ''
  );
  const [lavabos, setLavabos] = useState<string>(
    initialData?.lavabos !== undefined && initialData?.lavabos !== null
      ? String(initialData.lavabos)
      : ''
  );
  const legacyBathrooms = initialData?.bathrooms !== undefined ? Number(initialData.bathrooms) : null;

  // Vagas de Garagem (Cobertas e Descobertas)
  // Identifica se é um imóvel legado sem discriminação de cobertura de vagas
  const isLegacyUnclassifiedParking = Boolean(
    isEditing &&
    initialData &&
    initialData.coveredParkingSpaces == null &&
    initialData.uncoveredParkingSpaces == null &&
    (initialData.parkingSpaces ?? 0) > 0
  );

  const [isClassifyingParking, setIsClassifyingParking] = useState<boolean>(!isLegacyUnclassifiedParking);
  const [coveredParkingSpaces, setCoveredParkingSpaces] = useState<string>(
    initialData?.coveredParkingSpaces !== undefined && initialData?.coveredParkingSpaces !== null
      ? String(initialData.coveredParkingSpaces)
      : ''
  );
  const [uncoveredParkingSpaces, setUncoveredParkingSpaces] = useState<string>(
    initialData?.uncoveredParkingSpaces !== undefined && initialData?.uncoveredParkingSpaces !== null
      ? String(initialData.uncoveredParkingSpaces)
      : ''
  );
  const legacyParkingSpaces = initialData?.parkingSpaces !== undefined ? Number(initialData.parkingSpaces) : null;

  // Áreas
  const [builtArea, setBuiltArea] = useState(initialData?.builtArea ? String(initialData.builtArea) : '');
  const [privateArea, setPrivateArea] = useState(initialData?.privateArea ? String(initialData.privateArea) : '');
  const [totalArea, setTotalArea] = useState(initialData?.totalArea ? String(initialData.totalArea) : '');
  const [landArea, setLandArea] = useState(initialData?.landArea ? String(initialData.landArea) : '');

  // Flag para alertar casa antiga com metragem em privateArea
  const isLegacyHouseWithPrivateArea = Boolean(
    isEditing &&
    propertyType === 'Casa' &&
    !initialData?.builtArea &&
    initialData?.privateArea
  );
  const [legacyAreaConfirmed, setLegacyAreaConfirmed] = useState<boolean>(false);

  // Cálculos Automáticos Derivados em Tempo Real
  const parsedSuitesCount = Math.max(0, parseInt(suites, 10) || 0);
  const parsedOtherBedCount = Math.max(0, parseInt(otherBedrooms, 10) || 0);
  const totalBedroomsCalculated = parsedSuitesCount + parsedOtherBedCount;

  const parsedSocialCount = Math.max(0, parseInt(socialBathrooms, 10) || 0);
  const parsedLavabosCount = Math.max(0, parseInt(lavabos, 10) || 0);
  const totalBathroomsCalculated = isClassifyingBaths
    ? parsedSuitesCount + parsedSocialCount + parsedLavabosCount
    : (legacyBathrooms ?? (parsedSuitesCount + parsedSocialCount + parsedLavabosCount));

  const parsedCoveredCount = Math.max(0, parseInt(coveredParkingSpaces, 10) || 0);
  const parsedUncoveredCount = Math.max(0, parseInt(uncoveredParkingSpaces, 10) || 0);
  const totalParkingCalculated = isClassifyingParking
    ? parsedCoveredCount + parsedUncoveredCount
    : (legacyParkingSpaces ?? (parsedCoveredCount + parsedUncoveredCount));
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

  // Estados para reordenação manual de fotos (Desktop Drag & Drop + Mobile Touch)
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  function moveImage(fromIndex: number, toIndex: number) {
    if (
      fromIndex < 0 ||
      fromIndex >= images.length ||
      toIndex < 0 ||
      toIndex >= images.length ||
      fromIndex === toIndex
    ) {
      return;
    }
    setImages((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  }

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

  // Otimização de imagem antes de envio para manter o payload sob o limite de 4.5MB da Vercel
  async function ensureSafePayloadSize(file: File): Promise<Blob | File> {
    if (file.size <= 3.8 * 1024 * 1024) {
      return file;
    }

    try {
      return await new Promise<Blob | File>((resolve) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          const maxDim = 2048;
          let { width, height } = img;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(file);
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob && blob.size < file.size) {
                resolve(blob);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.85
          );
        };

        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(file);
        };

        img.src = objectUrl;
      });
    } catch {
      return file;
    }
  }

  // Upload Múltiplo de Imagens Seguro (compatível com limites Vercel e feedback contínuo)
  async function uploadFiles(filesToUpload: File[]) {
    if (!filesToUpload || filesToUpload.length === 0) return;

    setUploading(true);
    setError(null);

    const maxSizeBytes = 10 * 1024 * 1024; // 10 MB
    const validFiles: File[] = [];
    const clientErrors: string[] = [];

    for (const file of filesToUpload) {
      if (file.size > maxSizeBytes) {
        clientErrors.push(`"${file.name}" excede o tamanho máximo de 10MB.`);
        continue;
      }
      const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.name);
      if (!isImage) {
        clientErrors.push(`"${file.name}" não é um formato suportado (aceitos: JPG, PNG, WEBP).`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      setUploading(false);
      setUploadProgress(null);
      if (clientErrors.length > 0) {
        setError(clientErrors.join(' | '));
      }
      return;
    }

    const errors: string[] = [...clientErrors];

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      setUploadProgress(
        validFiles.length > 1
          ? `Enviando fotos (${i + 1} de ${validFiles.length})...`
          : 'Enviando foto...'
      );

      try {
        const fileToUpload = await ensureSafePayloadSize(file);

        const formData = new FormData();
        formData.append('entityType', 'property');
        if (initialData?.id) {
          formData.append('entityId', initialData.id);
        }
        formData.append('files', fileToUpload, file.name);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `Falha ao enviar ${file.name}`);
        }

        if (data.urls && data.urls.length > 0) {
          // Incorpora cada imagem recebida sem substituir as anteriores
          setImages((prev) => [...prev, ...data.urls]);
        }

        if (data.failed && data.failed.length > 0) {
          data.failed.forEach((f: any) => {
            errors.push(`"${f.name}": ${f.error}`);
          });
        }
      } catch (err: any) {
        errors.push(`"${file.name}": ${err.message || 'Erro ao carregar imagem'}`);
      }
    }

    setUploading(false);
    setUploadProgress(null);

    if (errors.length > 0) {
      setError(errors.join(' | '));
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const rawFiles = e.target.files;
    if (!rawFiles || rawFiles.length === 0) return;

    const filesArray = Array.from(rawFiles);
    // Limpa imediatamente o valor do input para permitir novas seleções seguidas no celular/desktop
    e.target.value = '';

    await uploadFiles(filesArray);
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

    if (uploading) {
      setError('Aguarde a conclusão do envio das fotos antes de salvar o imóvel.');
      return;
    }

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

    // Confirmação de alteração do total de banheiros em imóveis legados
    if (isLegacyUnclassifiedBaths && isClassifyingBaths && legacyBathrooms !== null && totalBathroomsCalculated !== legacyBathrooms) {
      const confirmChange = window.confirm(
        `A soma dos banheiros (${totalBathroomsCalculated}: ${parsedSuitesCount} suíte(s) + ${parsedSocialCount} social + ${parsedLavabosCount} lavabo) difere do total cadastrado anteriormente (${legacyBathrooms} banheiros).\n\nDeseja confirmar a alteração do total para ${totalBathroomsCalculated}?`
      );
      if (!confirmChange) return;
    }

    // Confirmação de alteração do total de vagas em imóveis legados
    if (isLegacyUnclassifiedParking && isClassifyingParking && legacyParkingSpaces !== null && totalParkingCalculated !== legacyParkingSpaces) {
      const confirmChange = window.confirm(
        `A soma das vagas (${totalParkingCalculated}: ${parsedCoveredCount} coberta(s) + ${parsedUncoveredCount} descoberta(s)) difere do total cadastrado anteriormente (${legacyParkingSpaces} vagas).\n\nDeseja confirmar a alteração do total para ${totalParkingCalculated}?`
      );
      if (!confirmChange) return;
    }

    const parsePositiveFloat = (val: string) => {
      if (!val || !val.trim()) return null;
      const num = parseFloat(val.replace(',', '.'));
      return isNaN(num) || num < 0 ? null : num;
    };

    const payload = {
      title,
      internalCode,
      propertyType,
      purpose,
      status: saveStatus,
      price: Number(price),
      builtArea: parsePositiveFloat(builtArea),
      privateArea: parsePositiveFloat(privateArea),
      totalArea: parsePositiveFloat(totalArea),
      landArea: parsePositiveFloat(landArea),
      suites: parsedSuitesCount,
      otherBedrooms: parsedOtherBedCount,
      bedrooms: totalBedroomsCalculated,
      socialBathrooms: isClassifyingBaths ? parsedSocialCount : null,
      lavabos: isClassifyingBaths ? parsedLavabosCount : null,
      bathrooms: totalBathroomsCalculated,
      otherBathrooms: null,
      coveredParkingSpaces: isClassifyingParking ? parsedCoveredCount : null,
      uncoveredParkingSpaces: isClassifyingParking ? parsedUncoveredCount : null,
      parkingSpaces: totalParkingCalculated,
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
      hasOwnerAuthorization,
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

        {/* Layout Condicional conforme o Tipo de Imóvel */}
        {propertyType === 'Terreno' ? (
          /* TERRENO */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                  <label htmlFor="field-land-area" style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                    Área do Terreno (m²) Documental *
                  </label>
                  <FieldHelper helpKey="landArea" />
                </div>
                <input
                  id="field-land-area"
                  type="number"
                  min="0"
                  step="0.01"
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
          </div>
        ) : (
          /* APARTAMENTO, CASA, COMERCIAL OU OUTROS */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* GRUPO 1: Dormitórios e Suítes */}
            {propertyType !== 'Comercial' && (
              <div style={{ padding: '16px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    1. Dormitórios e Suítes
                  </span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, backgroundColor: '#ECFDF5', color: '#065F46', padding: '3px 10px', borderRadius: '12px', border: '1px solid #A7F3D0' }}>
                    Total: {totalBedroomsCalculated} dormitório(s)
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                      <label htmlFor="field-suites" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                        Suítes
                      </label>
                      <FieldHelper helpKey="suites" />
                    </div>
                    <input
                      id="field-suites"
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
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                      <label htmlFor="field-other-bedrooms" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                        Dormitórios (sem suíte)
                      </label>
                      <FieldHelper helpKey="dormitories" />
                    </div>
                    <input
                      id="field-other-bedrooms"
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
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                      <label htmlFor="field-total-bedrooms" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                        Total de quartos (calculado)
                      </label>
                      <FieldHelper helpKey="totalBedrooms" />
                    </div>
                    <input
                      id="field-total-bedrooms"
                      type="number"
                      disabled
                      value={totalBedroomsCalculated}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-primary-subtle)',
                        backgroundColor: 'var(--color-primary-light)',
                        color: 'var(--color-primary)',
                        fontWeight: 700,
                        cursor: 'not-allowed',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* GRUPO 2: Banheiros Sociais e Lavabos */}
            <div style={{ padding: '16px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {propertyType === 'Comercial' ? '1. Sanitários e Banheiros' : '2. Banheiros e Lavabos'}
                </span>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, backgroundColor: '#EFF6FF', color: '#1E40AF', padding: '3px 10px', borderRadius: '12px', border: '1px solid #BFDBFE' }}>
                  Total: {totalBathroomsCalculated} banheiro(s)
                </span>
              </div>

              {/* Aviso para imóvel legado sem classificação */}
              {!isClassifyingBaths && isLegacyUnclassifiedBaths ? (
                <div style={{ padding: '12px', backgroundColor: '#FEF3C7', borderRadius: 'var(--radius-sm)', border: '1px solid #FDE68A', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <AlertTriangle size={18} color="#B45309" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '0.82rem', color: '#92400E', lineHeight: 1.45 }}>
                      <strong>Classificação detalhada não informada no cadastro anterior.</strong>
                      <br />
                      Total registrado: <strong>{legacyBathrooms} banheiros</strong> ({parsedSuitesCount} de suíte + {Math.max(0, (legacyBathrooms || 0) - parsedSuitesCount)} adicional não classificado entre social ou lavabo).
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.76rem', color: '#78350F' }}>
                      O total legado será preservado normalmente ao salvar outros dados.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsClassifyingBaths(true);
                        const residual = Math.max(0, (legacyBathrooms || 0) - parsedSuitesCount);
                        setSocialBathrooms(String(residual));
                        setLavabos('0');
                      }}
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.78rem', backgroundColor: '#FFFFFF', borderColor: '#F59E0B', color: '#B45309', fontWeight: 600 }}
                    >
                      Classificar banheiros agora
                    </button>
                  </div>
                </div>
              ) : null}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                    <label htmlFor="field-social-bathrooms" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                      Banheiros sociais
                    </label>
                    <FieldHelper helpKey="socialBathrooms" />
                  </div>
                  <input
                    id="field-social-bathrooms"
                    type="number"
                    min="0"
                    disabled={!isClassifyingBaths && isLegacyUnclassifiedBaths}
                    value={socialBathrooms}
                    onChange={(e) => setSocialBathrooms(e.target.value)}
                    placeholder={!isClassifyingBaths ? 'Não classificado' : 'Ex: 1'}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-light)',
                      backgroundColor: !isClassifyingBaths && isLegacyUnclassifiedBaths ? 'var(--bg-subtle)' : 'white',
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                    <label htmlFor="field-lavabos" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                      Lavabos
                    </label>
                    <FieldHelper helpKey="lavabos" />
                  </div>
                  <input
                    id="field-lavabos"
                    type="number"
                    min="0"
                    disabled={!isClassifyingBaths && isLegacyUnclassifiedBaths}
                    value={lavabos}
                    onChange={(e) => setLavabos(e.target.value)}
                    placeholder={!isClassifyingBaths ? 'Não classificado' : 'Ex: 1'}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-light)',
                      backgroundColor: !isClassifyingBaths && isLegacyUnclassifiedBaths ? 'var(--bg-subtle)' : 'white',
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                    <label htmlFor="field-total-bathrooms" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1E40AF' }}>
                      Total de banheiros (calculado)
                    </label>
                    <FieldHelper helpKey="totalBathrooms" />
                  </div>
                  <input
                    id="field-total-bathrooms"
                    type="number"
                    disabled
                    value={totalBathroomsCalculated}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid #BFDBFE',
                      backgroundColor: '#EFF6FF',
                      color: '#1E40AF',
                      fontWeight: 700,
                      cursor: 'not-allowed',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* GRUPO 3: Vagas de Garagem (Cobertas e Descobertas) */}
            <div style={{ padding: '16px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {propertyType === 'Comercial' ? '2. Estacionamento e Vagas' : '3. Vagas de Garagem'}
                </span>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, backgroundColor: '#F3F4F6', color: '#374151', padding: '3px 10px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                  Total: {totalParkingCalculated} vaga(s)
                </span>
              </div>

              {/* Aviso para imóvel legado sem especificação de cobertura */}
              {!isClassifyingParking && isLegacyUnclassifiedParking ? (
                <div style={{ padding: '12px', backgroundColor: '#FEF3C7', borderRadius: 'var(--radius-sm)', border: '1px solid #FDE68A', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <AlertTriangle size={18} color="#B45309" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '0.82rem', color: '#92400E', lineHeight: 1.45 }}>
                      <strong>Cobertura das vagas não especificada no cadastro anterior.</strong>
                      <br />
                      Total registrado: <strong>{legacyParkingSpaces} vaga(s)</strong>.
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.76rem', color: '#78350F' }}>
                      O total legado será preservado normalmente ao salvar outros dados.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsClassifyingParking(true);
                        setCoveredParkingSpaces(String(legacyParkingSpaces || 0));
                        setUncoveredParkingSpaces('0');
                      }}
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.78rem', backgroundColor: '#FFFFFF', borderColor: '#F59E0B', color: '#B45309', fontWeight: 600 }}
                    >
                      Especificar cobertura agora
                    </button>
                  </div>
                </div>
              ) : null}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                    <label htmlFor="field-covered-parking" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                      Vagas cobertas
                    </label>
                    <FieldHelper helpKey="coveredParkingSpaces" />
                  </div>
                  <input
                    id="field-covered-parking"
                    type="number"
                    min="0"
                    disabled={!isClassifyingParking && isLegacyUnclassifiedParking}
                    value={coveredParkingSpaces}
                    onChange={(e) => setCoveredParkingSpaces(e.target.value)}
                    placeholder={!isClassifyingParking ? 'Não especificado' : 'Ex: 2'}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-light)',
                      backgroundColor: !isClassifyingParking && isLegacyUnclassifiedParking ? 'var(--bg-subtle)' : 'white',
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                    <label htmlFor="field-uncovered-parking" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                      Vagas descobertas
                    </label>
                    <FieldHelper helpKey="uncoveredParkingSpaces" />
                  </div>
                  <input
                    id="field-uncovered-parking"
                    type="number"
                    min="0"
                    disabled={!isClassifyingParking && isLegacyUnclassifiedParking}
                    value={uncoveredParkingSpaces}
                    onChange={(e) => setUncoveredParkingSpaces(e.target.value)}
                    placeholder={!isClassifyingParking ? 'Não especificado' : 'Ex: 0'}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-light)',
                      backgroundColor: !isClassifyingParking && isLegacyUnclassifiedParking ? 'var(--bg-subtle)' : 'white',
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                    <label htmlFor="field-total-parking" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>
                      Vagas totais (calculado)
                    </label>
                    <FieldHelper helpKey="totalParkingSpaces" />
                  </div>
                  <input
                    id="field-total-parking"
                    type="number"
                    disabled
                    value={totalParkingCalculated}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid #D1D5DB',
                      backgroundColor: '#F3F4F6',
                      color: '#374151',
                      fontWeight: 700,
                      cursor: 'not-allowed',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* GRUPO 4: Metragens e Áreas (conforme o tipo de imóvel) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {propertyType === 'Comercial' ? '3. Metragens e Áreas' : '4. Metragens e Áreas'}
              </span>

              {/* Layout para Apartamento */}
              {propertyType === 'Apartamento' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                      <label htmlFor="field-apt-private-area" style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                        Área privativa (m²)
                      </label>
                      <FieldHelper helpKey="privateArea" />
                    </div>
                    <input
                      id="field-apt-private-area"
                      type="number"
                      min="0"
                      step="0.01"
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
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                      <label htmlFor="field-apt-total-area" style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                        Área total (m²)
                      </label>
                      <FieldHelper helpKey="totalArea" />
                    </div>
                    <input
                      id="field-apt-total-area"
                      type="number"
                      min="0"
                      step="0.01"
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
                </div>
              )}

              {/* Layout para Casa */}
              {propertyType === 'Casa' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Aviso para casa antiga com metragem em privateArea */}
                  {isLegacyHouseWithPrivateArea && !legacyAreaConfirmed && !builtArea && (
                    <div style={{ padding: '12px', backgroundColor: '#FEF3C7', borderRadius: 'var(--radius-sm)', border: '1px solid #FDE68A', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <Info size={18} color="#B45309" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ fontSize: '0.82rem', color: '#92400E', lineHeight: 1.45 }}>
                          <strong>Metragem de área privativa legada identificada: {initialData.privateArea} m².</strong>
                          <br />
                          No padrão atual de casas, o campo utilizado é <strong>Área construída (m²)</strong>.
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setBuiltArea(String(initialData.privateArea));
                            setLegacyAreaConfirmed(true);
                          }}
                          className="btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.78rem', backgroundColor: '#FFFFFF', borderColor: '#F59E0B', color: '#B45309', fontWeight: 600 }}
                        >
                          Confirmar como Área Construída
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                        <label htmlFor="field-house-built-area" style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                          Área construída (m²) *
                        </label>
                        <FieldHelper helpKey="builtArea" />
                      </div>
                      <input
                        id="field-house-built-area"
                        type="number"
                        min="0"
                        step="0.01"
                        value={builtArea}
                        onChange={(e) => setBuiltArea(e.target.value)}
                        placeholder="Ex: 180"
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
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                        <label htmlFor="field-house-land-area" style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                          Área do terreno (m²)
                        </label>
                        <FieldHelper helpKey="landArea" />
                      </div>
                      <input
                        id="field-house-land-area"
                        type="number"
                        min="0"
                        step="0.01"
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
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                        <label htmlFor="field-house-total-area" style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                          Área total documental (m²)
                        </label>
                        <FieldHelper helpKey="totalArea" />
                      </div>
                      <input
                        id="field-house-total-area"
                        type="number"
                        min="0"
                        step="0.01"
                        value={totalArea}
                        onChange={(e) => setTotalArea(e.target.value)}
                        placeholder="Opcional"
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
                  </div>
                </div>
              )}

              {/* Layout para Comercial */}
              {propertyType === 'Comercial' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
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
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                      <label htmlFor="field-comm-private-area" style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                        Área privativa (m²)
                      </label>
                      <FieldHelper helpKey="privateArea" />
                    </div>
                    <input
                      id="field-comm-private-area"
                      type="number"
                      min="0"
                      step="0.01"
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
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                      <label htmlFor="field-comm-built-area" style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                        Área construída (m²)
                      </label>
                      <FieldHelper helpKey="builtArea" />
                    </div>
                    <input
                      id="field-comm-built-area"
                      type="number"
                      min="0"
                      step="0.01"
                      value={builtArea}
                      onChange={(e) => setBuiltArea(e.target.value)}
                      placeholder="Ex: 80"
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
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                      <label htmlFor="field-comm-total-area" style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                        Área total (m²)
                      </label>
                      <FieldHelper helpKey="totalArea" />
                    </div>
                    <input
                      id="field-comm-total-area"
                      type="number"
                      min="0"
                      step="0.01"
                      value={totalArea}
                      onChange={(e) => setTotalArea(e.target.value)}
                      placeholder="Ex: 95"
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
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                      <label htmlFor="field-comm-land-area" style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                        Área do terreno (m²)
                      </label>
                      <FieldHelper helpKey="landArea" />
                    </div>
                    <input
                      id="field-comm-land-area"
                      type="number"
                      min="0"
                      step="0.01"
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
                </div>
              )}

              {/* Layout para Outros Tipos (Galpão, Rural, Outro) */}
              {!['Apartamento', 'Casa', 'Comercial'].includes(propertyType) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                      <label htmlFor="field-other-built-area" style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                        Área construída (m²)
                      </label>
                      <FieldHelper helpKey="builtArea" />
                    </div>
                    <input
                      id="field-other-built-area"
                      type="number"
                      min="0"
                      step="0.01"
                      value={builtArea}
                      onChange={(e) => setBuiltArea(e.target.value)}
                      placeholder="Ex: 250"
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
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                      <label htmlFor="field-other-total-area" style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                        Área total (m²)
                      </label>
                      <FieldHelper helpKey="totalArea" />
                    </div>
                    <input
                      id="field-other-total-area"
                      type="number"
                      min="0"
                      step="0.01"
                      value={totalArea}
                      onChange={(e) => setTotalArea(e.target.value)}
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
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                      <label htmlFor="field-other-land-area" style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                        Área do terreno (m²)
                      </label>
                      <FieldHelper helpKey="landArea" />
                    </div>
                    <input
                      id="field-other-land-area"
                      type="number"
                      min="0"
                      step="0.01"
                      value={landArea}
                      onChange={(e) => setLandArea(e.target.value)}
                      placeholder="Ex: 500"
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ImageIcon size={20} color="var(--color-primary)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Fotos do Imóvel</h2>
          </div>
          {images.length > 1 && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Arraste ou use as setas para reordenar
            </span>
          )}
        </div>

        <div>
          <label
            htmlFor="file-upload"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (uploading) return;
              const dtFiles = e.dataTransfer?.files;
              if (dtFiles && dtFiles.length > 0) {
                uploadFiles(Array.from(dtFiles));
              }
            }}
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
              {uploading ? uploadProgress || 'Enviando fotos...' : 'Clique para adicionar fotos ou arraste aqui'}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Selecione uma ou mais fotos da galeria (a primeira será a capa)
            </span>
          </label>
          <input
            id="file-upload"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/*"
            disabled={uploading}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>

        {/* Pré-visualização de Imagens */}
        {images.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px', marginTop: '12px' }}>
            {images.map((url, idx) => {
              const isCover = idx === 0;
              const isBeingDragged = draggedIdx === idx;
              const isDragOver = dragOverIdx === idx;

              return (
                <div
                  key={`${url}-${idx}`}
                  data-image-index={idx}
                  draggable={!uploading}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', String(idx));
                    setDraggedIdx(idx);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (dragOverIdx !== idx) setDragOverIdx(idx);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (draggedIdx !== null && draggedIdx !== idx) {
                      moveImage(draggedIdx, idx);
                    }
                    setDraggedIdx(null);
                    setDragOverIdx(null);
                  }}
                  onDragEnd={() => {
                    setDraggedIdx(null);
                    setDragOverIdx(null);
                  }}
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '4/3',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    backgroundColor: isDragOver ? 'rgba(45, 106, 79, 0.08)' : '#F3F4F6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: isDragOver
                      ? '2px dashed var(--color-primary)'
                      : isCover
                      ? '2px solid var(--color-primary)'
                      : '1px solid var(--border-light)',
                    opacity: isBeingDragged ? 0.45 : 1,
                    transition: 'all var(--transition-fast)',
                    boxShadow: isCover ? '0 2px 8px rgba(45, 106, 79, 0.15)' : 'none',
                    userSelect: 'none',
                  }}
                >
                  <img
                    src={url}
                    alt={`Foto ${idx + 1}`}
                    style={{ maxWidth: '100%', maxHeight: '100%', width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                  {/* Handle de Arraste (Desktop + Mobile Touch) */}
                  <div
                    title="Segure e arraste para reordenar"
                    style={{
                      position: 'absolute',
                      top: 6,
                      left: 6,
                      width: 26,
                      height: 26,
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'grab',
                      touchAction: 'none',
                      zIndex: 2,
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      setDraggedIdx(idx);
                    }}
                    onTouchMove={(e) => {
                      e.stopPropagation();
                      const touch = e.touches[0];
                      const element = document.elementFromPoint(touch.clientX, touch.clientY);
                      const card = element?.closest('[data-image-index]');
                      if (card) {
                        const targetIdx = Number(card.getAttribute('data-image-index'));
                        if (!isNaN(targetIdx) && targetIdx !== dragOverIdx) {
                          setDragOverIdx(targetIdx);
                        }
                      }
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      if (draggedIdx !== null && dragOverIdx !== null && draggedIdx !== dragOverIdx) {
                        moveImage(draggedIdx, dragOverIdx);
                      }
                      setDraggedIdx(null);
                      setDragOverIdx(null);
                    }}
                  >
                    <GripVertical size={14} />
                  </div>

                  {/* Botão de Remover Foto */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage(idx);
                    }}
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(0, 0, 0, 0.65)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      cursor: 'pointer',
                      zIndex: 2,
                    }}
                    title="Remover foto"
                  >
                    <X size={13} />
                  </button>

                  {/* Badge de Capa ou Contador de Posição */}
                  {isCover ? (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 6,
                        left: 6,
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-full)',
                        letterSpacing: '0.5px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                        zIndex: 2,
                      }}
                    >
                      CAPA
                    </span>
                  ) : (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 6,
                        left: 6,
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        color: 'white',
                        fontSize: '0.66rem',
                        fontWeight: 600,
                        padding: '2px 7px',
                        borderRadius: 'var(--radius-full)',
                        zIndex: 2,
                      }}
                    >
                      {idx + 1}
                    </span>
                  )}

                  {/* Controles de Reordenação por Toque/Clique (Setas Esquerda e Direita) */}
                  {images.length > 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 6,
                        right: 6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        zIndex: 2,
                      }}
                    >
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveImage(idx, idx - 1);
                          }}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'rgba(0, 0, 0, 0.65)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                          title="Mover foto para a esquerda"
                        >
                          <ChevronLeft size={15} />
                        </button>
                      )}
                      {idx < images.length - 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveImage(idx, idx + 1);
                          }}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'rgba(0, 0, 0, 0.65)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                          title="Mover foto para a direita"
                        >
                          <ChevronRight size={15} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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

      {/* Seção de Autorização do Proprietário (Ponto 20 / Etapa 1.4) */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-light)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} color="#166534" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>
              Autorização para Divulgação do Imóvel
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowAuthModal(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#15803D',
              fontSize: '0.82rem',
              fontWeight: 600,
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Ler texto integral da declaração
          </button>
        </div>

        {!isEditing ? (
          // Fluxo de Cadastro de Novo Imóvel
          <div
            style={{
              backgroundColor: hasOwnerAuthorization ? '#F0FDF4' : '#F9FAFB',
              border: hasOwnerAuthorization ? '1px solid #BBF7D0' : '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '16px 18px',
              transition: 'all 0.2s ease',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={hasOwnerAuthorization}
                onChange={(e) => setHasOwnerAuthorization(e.target.checked)}
                style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#166534' }}
              />
              <div style={{ fontSize: '0.88rem', color: '#1F2937', lineHeight: 1.5 }}>
                <span style={{ fontWeight: 600, color: '#111827' }}>
                  Confirmo que possuo autorização do proprietário ou de seu representante legal para cadastrar e divulgar este imóvel nas condições informadas, incluindo imagens, preço e localização, conforme a Declaração de Autorização para Divulgação de Imóvel.
                </span>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.80rem', color: '#6B7280' }}>
                  Caso desmarcado, o imóvel será salvo como inativo e a publicação poderá ser realizada após a confirmação.
                </p>
              </div>
            </label>
          </div>
        ) : (
          // Fluxo de Edição de Imóvel Existente
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {authDetails?.currentStatus === 'CONFIRMED' ? (
              <div
                style={{
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: 700, fontSize: '0.90rem' }}>
                    <Check size={16} />
                    <span>Autorização de divulgação confirmada</span>
                  </div>
                  <div style={{ fontSize: '0.80rem', color: '#4B5563', marginTop: '4px' }}>
                    Versão {authDetails.activeAuthorization?.documentVersion || '1.0'}
                    {authDetails.activeAuthorization?.confirmedAt && (
                      <> • Confirmada em {new Date(authDetails.activeAuthorization.confirmedAt).toLocaleDateString('pt-BR')}</>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={revoking}
                  onClick={handleRevokeAuthorization}
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    color: '#991B1B',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '0.80rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {revoking ? 'Revogando...' : 'Informar revogação da autorização'}
                </button>
              </div>
            ) : authDetails?.currentStatus === 'LEGACY_EXEMPT' ? (
              <div
                style={{
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1E40AF', fontWeight: 700, fontSize: '0.90rem' }}>
                    <Info size={16} />
                    <span>Imóvel histórico preservado</span>
                  </div>
                  <div style={{ fontSize: '0.80rem', color: '#4B5563', marginTop: '4px' }}>
                    Cadastro pré-existente à exigência formal. Permanece ativo e compartilhado normalmente.
                  </div>
                </div>
                <button
                  type="button"
                  disabled={revoking}
                  onClick={handleRevokeAuthorization}
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    color: '#991B1B',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '0.80rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {revoking ? 'Revogando...' : 'Informar revogação'}
                </button>
              </div>
            ) : authDetails?.currentStatus === 'REVOKED' ? (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#991B1B', fontWeight: 700, fontSize: '0.90rem' }}>
                  <AlertTriangle size={16} />
                  <span>Autorização revogada — divulgação suspensa</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#6B7280' }}>
                  A autorização anterior foi revogada. Para restabelecer a publicação deste imóvel, confirme abaixo que possui uma nova autorização legítima do proprietário.
                </p>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginTop: '4px' }}>
                  <input
                    type="checkbox"
                    checked={hasOwnerAuthorization}
                    onChange={(e) => setHasOwnerAuthorization(e.target.checked)}
                    style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: '#166534' }}
                  />
                  <span style={{ fontSize: '0.84rem', color: '#1F2937', fontWeight: 600 }}>
                    Confirmo que possuo nova autorização válida do proprietário para voltar a divulgar este imóvel.
                  </span>
                </label>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#92400E', fontWeight: 700, fontSize: '0.90rem' }}>
                  <AlertCircle size={16} />
                  <span>Autorização ainda não confirmada — imóvel salvo como inativo</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#6B7280' }}>
                  Este imóvel não possui confirmação registrada e não pode ser publicado. Confirme abaixo para habilitar a publicação.
                </p>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginTop: '4px' }}>
                  <input
                    type="checkbox"
                    checked={hasOwnerAuthorization}
                    onChange={(e) => setHasOwnerAuthorization(e.target.checked)}
                    style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: '#166534' }}
                  />
                  <span style={{ fontSize: '0.84rem', color: '#1F2937', fontWeight: 600 }}>
                    Confirmo que possuo autorização legítima do proprietário conforme a Declaração de Autorização.
                  </span>
                </label>
              </div>
            )}
          </div>
        )}
      </div>

      <PropertyAuthorizationModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

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
          disabled={loading || uploading}
          onClick={() => handleSubmit('Inativo')}
          className="btn-secondary"
          style={{ padding: '12px 20px' }}
        >
          Salvar como Inativo
        </button>

        <button
          type="button"
          disabled={loading || uploading}
          onClick={() => handleSubmit('Disponível')}
          className="btn-primary"
          style={{ padding: '12px 24px' }}
        >
          <Check size={18} />
          <span>{loading ? 'Salvando...' : uploading ? 'Enviando fotos...' : isEditing ? 'Salvar Alterações' : 'Publicar Imóvel'}</span>
        </button>
      </div>
    </div>
  );
}
