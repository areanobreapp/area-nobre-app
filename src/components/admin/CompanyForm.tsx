'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Briefcase,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Image,
  Shield,
  Save,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Search,
  Upload,
  ExternalLink,
} from 'lucide-react';
import { validateCnpj, formatCnpj, normalizeCnpj } from '@/lib/company-service';

interface CompanyFormProps {
  mode: 'create' | 'edit';
  initialData?: any;
  companyId?: string;
}

export default function CompanyForm({ mode, initialData, companyId }: CompanyFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [searchingCep, setSearchingCep] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estados do formulário
  const [name, setName] = useState(initialData?.name || '');
  const [tradeName, setTradeName] = useState(initialData?.tradeName || '');
  const [cnpj, setCnpj] = useState(initialData?.cnpj ? formatCnpj(initialData.cnpj) || '' : '');
  const [stateRegistration, setStateRegistration] = useState(initialData?.stateRegistration || '');
  const [description, setDescription] = useState(initialData?.description || '');

  // Endereço
  const [zipcode, setZipcode] = useState(initialData?.zipcode || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [number, setNumber] = useState(initialData?.number || '');
  const [complement, setComplement] = useState(initialData?.complement || '');
  const [neighborhood, setNeighborhood] = useState(initialData?.neighborhood || '');
  const [city, setCity] = useState(initialData?.city || 'Criciúma');
  const [state, setState] = useState(initialData?.state || 'SC');

  // Contato Comercial Geral
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [whatsapp, setWhatsapp] = useState(initialData?.whatsapp || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [website, setWebsite] = useState(initialData?.website || '');

  // Identidade Visual
  const [logoUrl, setLogoUrl] = useState(initialData?.logoUrl || '');
  const [bannerUrl, setBannerUrl] = useState(initialData?.bannerUrl || '');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Administração
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>(initialData?.status || 'ACTIVE');
  const [displayOrder, setDisplayOrder] = useState<number>(initialData?.displayOrder ?? 0);
  const [internalNotes, setInternalNotes] = useState(initialData?.internalNotes || '');

  // Preenche dados se initialData mudar posteriormente
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setTradeName(initialData.tradeName || '');
      setCnpj(initialData.cnpj ? formatCnpj(initialData.cnpj) || '' : '');
      setStateRegistration(initialData.stateRegistration || '');
      setDescription(initialData.description || '');
      setZipcode(initialData.zipcode || '');
      setAddress(initialData.address || '');
      setNumber(initialData.number || '');
      setComplement(initialData.complement || '');
      setNeighborhood(initialData.neighborhood || '');
      setCity(initialData.city || 'Criciúma');
      setState(initialData.state || 'SC');
      setPhone(initialData.phone || '');
      setWhatsapp(initialData.whatsapp || '');
      setEmail(initialData.email || '');
      setWebsite(initialData.website || '');
      setLogoUrl(initialData.logoUrl || '');
      setBannerUrl(initialData.bannerUrl || '');
      setStatus(initialData.status || 'ACTIVE');
      setDisplayOrder(initialData.displayOrder ?? 0);
      setInternalNotes(initialData.internalNotes || '');
    }
  }, [initialData]);

  // Busca automática de endereço por CEP
  async function handleCepBlur() {
    const clean = zipcode.replace(/\D/g, '');
    if (clean.length !== 8) return;

    setSearchingCep(true);
    try {
      const res = await fetch(`/api/geo/cep/${clean}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          if (json.data.logradouro && !address) setAddress(json.data.logradouro);
          if (json.data.bairro && !neighborhood) setNeighborhood(json.data.bairro);
          if (json.data.localidade) setCity(json.data.localidade);
          if (json.data.uf) setState(json.data.uf);
        }
      }
    } catch (err) {
      console.warn('Erro ao consultar CEP:', err);
    } finally {
      setSearchingCep(false);
    }
  }

  // Upload de logomarca via /api/upload
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.append('files', file);
      formData.append('entityType', 'logo');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar imagem de logo.');

      if (data.urls && data.urls[0]) {
        setLogoUrl(data.urls[0]);
        setFeedback({ type: 'success', text: 'Logomarca enviada com sucesso!' });
      }
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', text: err.message || 'Falha ao processar upload.' });
    } finally {
      setUploadingLogo(false);
    }
  }

  // Máscara dinâmica de CNPJ
  function handleCnpjChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 14);
    if (raw.length <= 2) {
      setCnpj(raw);
    } else if (raw.length <= 5) {
      setCnpj(`${raw.slice(0, 2)}.${raw.slice(2)}`);
    } else if (raw.length <= 8) {
      setCnpj(`${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5)}`);
    } else if (raw.length <= 12) {
      setCnpj(`${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8)}`);
    } else {
      setCnpj(`${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8, 12)}-${raw.slice(12, 14)}`);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    // Validações básicas de frontend
    if (!name.trim()) {
      setFeedback({ type: 'error', text: 'Razão social é obrigatória.' });
      return;
    }
    if (!tradeName.trim()) {
      setFeedback({ type: 'error', text: 'Nome fantasia é obrigatório.' });
      return;
    }

    if (cnpj.trim()) {
      const cleanDigits = normalizeCnpj(cnpj);
      if (cleanDigits && !validateCnpj(cleanDigits)) {
        setFeedback({ type: 'error', text: 'CNPJ inválido de acordo com o cálculo de dígitos verificadores.' });
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        tradeName: tradeName.trim(),
        cnpj: cnpj.trim() || null,
        stateRegistration: stateRegistration.trim() || null,
        description: description.trim() || null,
        zipcode: zipcode.trim() || null,
        address: address.trim() || null,
        number: number.trim() || null,
        complement: complement.trim() || null,
        neighborhood: neighborhood.trim() || null,
        city: city.trim() || 'Criciúma',
        state: state.trim() || 'SC',
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        email: email.trim() || null,
        website: website.trim() || null,
        logoUrl: logoUrl.trim() || null,
        bannerUrl: bannerUrl.trim() || null,
        status,
        displayOrder: Number(displayOrder) || 0,
        internalNotes: internalNotes.trim() || null,
      };

      const endpoint = mode === 'create' ? '/api/admin/companies' : `/api/admin/companies/${companyId}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar dados da construtora.');
      }

      const targetId = mode === 'create' ? data.company?.id : companyId;
      setFeedback({
        type: 'success',
        text: `Construtora ${mode === 'create' ? 'cadastrada' : 'atualizada'} com sucesso! Redirecionando...`,
      });

      setTimeout(() => {
        router.push(`/admin/construtoras/${targetId}`);
      }, 800);
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', text: err.message || 'Falha ao salvar construtora.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '960px', margin: '0 auto' }}>
      {/* Barra de Ação Superior */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            href={mode === 'edit' && companyId ? `/admin/construtoras/${companyId}` : '/admin/construtoras'}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #D1D5DB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#374151',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#111827', margin: 0 }}>
              {mode === 'create' ? 'Cadastrar Nova Construtora' : `Editar Construtora: ${initialData?.tradeName || ''}`}
            </h1>
            <span style={{ fontSize: '0.84rem', color: '#6B7280' }}>
              {mode === 'create'
                ? 'Preencha as informações cadastrais e comerciais da construtora.'
                : 'Atualize os dados institucionais, endereço e canais de contato.'}
            </span>
          </div>
        </div>

        <button
          type="submit"
          id="btn-salvar-construtora"
          disabled={submitting}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 22px',
            backgroundColor: '#1E4620',
            color: '#FFFFFF',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.90rem',
            border: 'none',
            cursor: submitting ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 4px rgba(30,70,32,0.18)',
          }}
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          <span>{mode === 'create' ? 'Cadastrar Construtora' : 'Salvar Alterações'}</span>
        </button>
      </div>

      {/* Alerta de Feedback */}
      {feedback && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: '10px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.90rem',
            fontWeight: 600,
            backgroundColor: feedback.type === 'success' ? '#F0FDF4' : '#FEF2F2',
            color: feedback.type === 'success' ? '#166534' : '#991B1B',
            border: `1px solid ${feedback.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* 1. SEÇÃO: IDENTIFICAÇÃO */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E5E7EB',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
          <Briefcase size={20} style={{ color: '#1E4620' }} />
          <h2 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            1. Identificação Jurídica e Comercial
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
              Razão Social <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              type="text"
              id="input-company-name"
              required
              placeholder="Ex: Construtora e Incorporadora Fontana LTDA"
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
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
              Nome Fantasia <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              type="text"
              id="input-company-tradename"
              required
              placeholder="Ex: Construtora Fontana"
              value={tradeName}
              onChange={(e) => setTradeName(e.target.value)}
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
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
              CNPJ (apenas números ou formatado)
            </label>
            <input
              type="text"
              id="input-company-cnpj"
              placeholder="00.000.000/0001-00"
              value={cnpj}
              onChange={handleCnpjChange}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '3px', display: 'block' }}>
              O CNPJ é validado pelo algoritmo oficial e restrito ao ADMIN.
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
              Inscrição Estadual (opcional)
            </label>
            <input
              type="text"
              id="input-company-ie"
              placeholder="Ex: 254.891.002"
              value={stateRegistration}
              onChange={(e) => setStateRegistration(e.target.value)}
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
        </div>

        <div style={{ marginTop: '18px' }}>
          <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
            Descrição Institucional
          </label>
          <textarea
            id="textarea-company-description"
            rows={3}
            placeholder="Breve histórico, diferenciais construtivos e presença de mercado..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '0.88rem',
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>
      </div>

      {/* 2. SEÇÃO: ENDEREÇO DA SEDE */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E5E7EB',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
          <MapPin size={20} style={{ color: '#1E4620' }} />
          <h2 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            2. Endereço da Sede
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
              CEP
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                id="input-company-cep"
                placeholder="88800-000"
                value={zipcode}
                onChange={(e) => setZipcode(e.target.value)}
                onBlur={handleCepBlur}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
              {searchingCep && (
                <Loader2
                  size={16}
                  className="animate-spin"
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#1E4620' }}
                />
              )}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '3px', display: 'block' }}>
              Preencha o CEP para autocompletar logradouro e bairro.
            </span>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
              Logradouro (Rua / Av.)
            </label>
            <input
              type="text"
              id="input-company-address"
              placeholder="Ex: Rua Coronel Pedro Benedet"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
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
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
              Número
            </label>
            <input
              type="text"
              id="input-company-number"
              placeholder="Ex: 500"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
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
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
              Complemento
            </label>
            <input
              type="text"
              id="input-company-complement"
              placeholder="Ex: Sala 402 - Ed. Centro Comercial"
              value={complement}
              onChange={(e) => setComplement(e.target.value)}
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
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
              Bairro
            </label>
            <input
              type="text"
              id="input-company-neighborhood"
              placeholder="Ex: Centro"
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
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
              Cidade
            </label>
            <input
              type="text"
              id="input-company-city"
              placeholder="Criciúma"
              value={city}
              onChange={(e) => setCity(e.target.value)}
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
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
              UF (Estado)
            </label>
            <input
              type="text"
              id="input-company-state"
              placeholder="SC"
              maxLength={2}
              value={state}
              onChange={(e) => setState(e.target.value.toUpperCase())}
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
        </div>
      </div>

      {/* 3. SEÇÃO: CONTATO COMERCIAL GERAL DA CONSTRUTORA */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E5E7EB',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
          <Phone size={20} style={{ color: '#1E4620' }} />
          <h2 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            3. Contato Comercial Geral (Sede Institucional)
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
              Telefone Fixo / Geral
            </label>
            <input
              type="text"
              id="input-company-phone"
              placeholder="(48) 3433-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
              WhatsApp Comercial da Sede
            </label>
            <input
              type="text"
              id="input-company-whatsapp"
              placeholder="(48) 99999-0000"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
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
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
              E-mail Comercial
            </label>
            <input
              type="email"
              id="input-company-email"
              placeholder="comercial@construtora.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
              Website Oficial
            </label>
            <input
              type="url"
              id="input-company-website"
              placeholder="https://www.construtora.com.br"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
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
        </div>
      </div>

      {/* 4. SEÇÃO: IDENTIDADE VISUAL */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E5E7EB',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
          <Image size={20} style={{ color: '#1E4620' }} />
          <h2 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            4. Identidade Visual
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          {/* Logo */}
          <div>
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
              Logomarca da Construtora
            </label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Pré-visualização do logo"
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '8px',
                    objectFit: 'contain',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#F9FAFB',
                    padding: '4px',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '8px',
                    backgroundColor: '#F3F4F6',
                    border: '1px dashed #D1D5DB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9CA3AF',
                  }}
                >
                  <Building2 size={24} />
                </div>
              )}

              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  id="input-company-logo-url"
                  placeholder="URL da imagem ou envie abaixo..."
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.82rem',
                    outline: 'none',
                    marginBottom: '6px',
                  }}
                />
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#F3F4F6',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#374151',
                    cursor: uploadingLogo ? 'not-allowed' : 'pointer',
                  }}
                >
                  {uploadingLogo ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                  <span>{uploadingLogo ? 'Enviando...' : 'Enviar arquivo do logo'}</span>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    disabled={uploadingLogo}
                    onChange={handleLogoUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Banner */}
          <div>
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
              Banner Institucional (URL da Imagem)
            </label>
            <input
              type="text"
              id="input-company-banner-url"
              placeholder="https://exemplo.com/banner-institucional.jpg"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
            {bannerUrl && (
              <div style={{ marginTop: '8px' }}>
                <img
                  src={bannerUrl}
                  alt="Pré-visualização do banner"
                  style={{
                    width: '100%',
                    height: '70px',
                    borderRadius: '8px',
                    objectFit: 'cover',
                    border: '1px solid #D1D5DB',
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. SEÇÃO: ADMINISTRAÇÃO E NOTAS INTERNAS */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E5E7EB',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
          <Shield size={20} style={{ color: '#1E4620' }} />
          <h2 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            5. Parâmetros Administrativos e Confidencialidade
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
              Situação do Cadastro
            </label>
            <select
              id="select-company-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '0.88rem',
                backgroundColor: '#FFFFFF',
                color: '#111827',
                fontWeight: 600,
                outline: 'none',
              }}
            >
              <option value="ACTIVE">Ativa (Visível para Corretores e Público)</option>
              <option value="INACTIVE">Inativa (Pausada administrativamente)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
              Ordem de Exibição
            </label>
            <input
              type="number"
              id="input-company-order"
              min={0}
              value={displayOrder}
              onChange={(e) => setDisplayOrder(parseInt(e.target.value || '0', 10))}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '3px', display: 'block' }}>
              Valores menores aparecem primeiro nas listagens.
            </span>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
            Observações Administrativas Internas
          </label>
          <textarea
            id="textarea-company-internal-notes"
            rows={3}
            placeholder="Informações confidenciais, acordos de comissionamento de diretoria, contatos restritos..."
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '0.88rem',
              outline: 'none',
              resize: 'vertical',
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '6px',
              fontSize: '0.74rem',
              color: '#92400E',
              backgroundColor: '#FEF3C7',
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #FDE68A',
            }}
          >
            <Shield size={13} />
            <span>
              <strong>CONFIDENCIAL:</strong> Estas notas são criptograficamente restritas e NUNCA serão enviadas a corretores ou visitantes.
            </span>
          </div>
        </div>
      </div>

      {/* Botões de Ação Inferiores */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '60px' }}>
        <Link
          href={mode === 'edit' && companyId ? `/admin/construtoras/${companyId}` : '/admin/construtoras'}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: '1px solid #D1D5DB',
            backgroundColor: '#FFFFFF',
            color: '#374151',
            fontWeight: 700,
            fontSize: '0.88rem',
            textDecoration: 'none',
          }}
        >
          Cancelar
        </Link>

        <button
          type="submit"
          id="btn-salvar-construtora-bottom"
          disabled={submitting}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 24px',
            backgroundColor: '#1E4620',
            color: '#FFFFFF',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.90rem',
            border: 'none',
            cursor: submitting ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 4px rgba(30,70,32,0.18)',
          }}
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          <span>{mode === 'create' ? 'Cadastrar Construtora' : 'Salvar Alterações'}</span>
        </button>
      </div>
    </form>
  );
}

