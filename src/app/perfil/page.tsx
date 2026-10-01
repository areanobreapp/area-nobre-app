'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Shield,
  Key,
  Camera,
  Image as ImageIcon,
  Building,
  Phone,
  FileBadge,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Eye,
  Loader2,
  Sparkles,
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dados da Conta
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('BROKER');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Identidade Profissional
  const [commercialName, setCommercialName] = useState('');
  const [phone, setPhone] = useState('');
  const [creci, setCreci] = useState('');
  const [tagline, setTagline] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/profile')
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) {
            router.push('/login');
          }
          throw new Error('Falha ao carregar perfil.');
        }
        return res.json();
      })
      .then((data) => {
        if (data.user) {
          setUserId(data.user.id || '');
          setName(data.user.name || '');
          setEmail(data.user.email || '');
          setRole(data.user.role || 'BROKER');

          const prof = data.user.profile || {};
          setCommercialName(prof.commercialName || '');
          setPhone(prof.phone || '');
          setCreci(prof.creci || '');
          setTagline(prof.tagline || '');
          setBio(prof.bio || '');
          setCity(prof.city || 'Criciúma - SC');
          setAvatarUrl(prof.avatarUrl || null);
          setLogoUrl(prof.logoUrl || null);
        }
      })
      .catch((err) => {
        console.error(err);
        setMessage({ type: 'error', text: 'Não foi possível carregar as informações do seu perfil.' });
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleFileUpload(file: File, type: 'avatar' | 'logo') {
    if (!file) return;
    if (type === 'avatar') setUploadingAvatar(true);
    if (type === 'logo') setUploadingLogo(true);

    try {
      const formData = new FormData();
      formData.append('files', file);
      formData.append('entityType', type);
      if (userId) {
        formData.append('entityId', userId);
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.urls?.[0]) {
        throw new Error(data.error || 'Falha no upload da imagem.');
      }

      const uploadedUrl = data.urls[0];
      if (type === 'avatar') setAvatarUrl(uploadedUrl);
      if (type === 'logo') setLogoUrl(uploadedUrl);
      setMessage({ type: 'success', text: `${type === 'avatar' ? 'Foto de perfil' : 'Logo da marca'} atualizada.` });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Erro ao enviar arquivo.' });
    } finally {
      if (type === 'avatar') setUploadingAvatar(false);
      if (type === 'logo') setUploadingLogo(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (newPassword && newPassword !== confirmNewPassword) {
      setMessage({ type: 'error', text: 'A confirmação da nova senha não confere.' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
          commercialName,
          phone,
          creci,
          tagline,
          bio,
          city,
          avatarUrl,
          logoUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar alterações.');
      }

      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Falha ao salvar perfil.' });
    } finally {
      setSaving(false);
    }
  }

  const getInitials = (str: string) => {
    if (!str) return 'AN';
    const parts = str.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 className="animate-spin" size={32} color="#1E4620" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '32px 20px 80px 20px' }}>
      {/* Cabeçalho */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            Meu Perfil
          </h1>
          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: role === 'ADMIN' ? '#FEF3C7' : '#DCFCE7',
              color: role === 'ADMIN' ? '#92400E' : '#166534',
              letterSpacing: '0.5px',
            }}
          >
            {role === 'ADMIN' ? 'ADMINISTRADOR' : 'CORRETOR'}
          </span>
        </div>
        <p style={{ color: '#4B5563', fontSize: '0.92rem', margin: 0 }}>
          Gerencie suas credenciais de acesso e a identidade profissional apresentada aos seus clientes.
        </p>
      </div>

      {message && (
        <div
          style={{
            marginBottom: '24px',
            padding: '14px 18px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: message.type === 'success' ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${message.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
            color: message.type === 'success' ? '#166534' : '#991B1B',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
          {/* Coluna Esquerda: Formulários */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Bloco 1: Identidade Profissional */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <Building size={20} color="#1E4620" />
                <h2 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                  Identidade Profissional
                </h2>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '0 0 20px 0' }}>
                Estes dados são exibidos na apresentação pública do imóvel compartilhada com seus clientes.
              </p>

              {/* Uploads: Foto do Corretor e Logo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                {/* Foto do Corretor */}
                <div style={{ border: '1px dashed #D1D5DB', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ position: 'relative', width: '64px', height: '64px', margin: '0 auto 8px auto' }}>
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '50%',
                          backgroundColor: '#1E4620',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '1.2rem',
                        }}
                      >
                        {getInitials(name)}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                    Foto do Corretor
                  </div>
                  <label
                    style={{
                      display: 'inline-block',
                      padding: '5px 12px',
                      backgroundColor: '#F3F4F6',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#4B5563',
                      cursor: 'pointer',
                    }}
                  >
                    {uploadingAvatar ? 'Enviando...' : 'Alterar Foto'}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'avatar')}
                      disabled={uploadingAvatar}
                    />
                  </label>
                </div>

                {/* Logo da Marca */}
                <div style={{ border: '1px dashed #D1D5DB', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ position: 'relative', width: '64px', height: '64px', margin: '0 auto 8px auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logo"
                        style={{ maxWidth: '64px', maxHeight: '64px', objectFit: 'contain' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '10px',
                          backgroundColor: '#F3F4F6',
                          color: '#6B7280',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                        }}
                      >
                        LOGO
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                    Logo da Imobiliária
                  </div>
                  <label
                    style={{
                      display: 'inline-block',
                      padding: '5px 12px',
                      backgroundColor: '#F3F4F6',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#4B5563',
                      cursor: 'pointer',
                    }}
                  >
                    {uploadingLogo ? 'Enviando...' : 'Alterar Logo'}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'logo')}
                      disabled={uploadingLogo}
                    />
                  </label>
                </div>
              </div>

              {/* Campos de texto */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '5px' }}>
                    Nome Comercial / Marca
                  </label>
                  <input
                    type="text"
                    value={commercialName}
                    onChange={(e) => setCommercialName(e.target.value)}
                    placeholder="Ex: Daiane Corrêa Imóveis"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '5px' }}>
                      Telefone / WhatsApp Profissional
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="48999887766"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #D1D5DB',
                        fontSize: '0.9rem',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '5px' }}>
                      Registro CRECI
                    </label>
                    <input
                      type="text"
                      value={creci}
                      onChange={(e) => setCreci(e.target.value)}
                      placeholder="Ex: CRECI-SC 48.912"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #D1D5DB',
                        fontSize: '0.9rem',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '5px' }}>
                    Slogan / Subtítulo da Marca
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="Ex: Consultoria Imobiliária Exclusiva em Criciúma e Região"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '5px' }}>
                    Cidade / Região de Atuação
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Criciúma - SC"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '5px' }}>
                    Apresentação Curta (Bio)
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Conte resumidamente seu foco de atendimento e diferenciais."
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      fontSize: '0.9rem',
                      resize: 'vertical',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Bloco 2: Dados da Conta */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <Key size={20} color="#1E4620" />
                <h2 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                  Dados da Conta e Segurança
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '5px' }}>
                    Nome Pessoal
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '5px' }}>
                    Endereço de E-mail (Login)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>

                <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '16px', marginTop: '6px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#374151', marginBottom: '10px' }}>
                    Alterar Senha (opcional)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input
                      type="password"
                      placeholder="Senha atual"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 14px',
                        borderRadius: '8px',
                        border: '1px solid #D1D5DB',
                        fontSize: '0.88rem',
                      }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <input
                        type="password"
                        placeholder="Nova senha (min. 6 dígitos)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 14px',
                          borderRadius: '8px',
                          border: '1px solid #D1D5DB',
                          fontSize: '0.88rem',
                        }}
                      />
                      <input
                        type="password"
                        placeholder="Confirmar nova senha"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 14px',
                          borderRadius: '8px',
                          border: '1px solid #D1D5DB',
                          fontSize: '0.88rem',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Botão de Salvar */}
            <button
              type="submit"
              disabled={saving}
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: '12px',
                backgroundColor: '#1E4620',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '1rem',
                border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(30, 70, 32, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
              <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>

          {/* Coluna Direita: Prévia da Identidade Profissional */}
          <div>
            <div style={{ position: 'sticky', top: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Eye size={18} color="#059669" />
                <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                  Prévia da Apresentação ao Cliente
                </h3>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: '0 0 16px 0' }}>
                Veja como sua marca e contato aparecerão nos anúncios compartilhados com seus clientes.
              </p>

              {/* Card de Prévia Visual */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '18px',
                  padding: '24px',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)',
                }}
              >
                {/* Header da Apresentação */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={name}
                      style={{
                        width: '58px',
                        height: '58px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '58px',
                        height: '58px',
                        borderRadius: '50%',
                        backgroundColor: '#1E4620',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '1.25rem',
                        boxShadow: '0 4px 10px rgba(30, 70, 32, 0.25)',
                      }}
                    >
                      {getInitials(name)}
                    </div>
                  )}

                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#111827', lineHeight: 1.2 }}>
                      {commercialName || `${name || 'Corretor'} Imóveis`}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
                      {creci || 'CRECI em verificação'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#6B7280' }}>
                      {name || 'Nome do Profissional'}
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: '0.82rem', color: '#4B5563', lineHeight: 1.5, margin: '0 0 18px 0' }}>
                  {tagline || 'Consultoria imobiliária personalizada e atendimento com máxima transparência.'}
                </p>

                {/* Botão de WhatsApp */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '12px 18px',
                    borderRadius: '10px',
                    backgroundColor: '#25D366',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)',
                    marginBottom: '14px',
                  }}
                >
                  <Phone size={16} />
                  <span>Falar com {name ? name.split(' ')[0] : 'Corretor'}</span>
                </div>

                {/* Informações detalhadas */}
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    backgroundColor: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    fontSize: '0.78rem',
                    color: '#4B5563',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div>
                    <strong>WhatsApp:</strong> {phone || 'Não informado'}
                  </div>
                  <div>
                    <strong>Cidade:</strong> {city || 'Criciúma - SC'}
                  </div>
                  <div>
                    <strong>E-mail:</strong> {email}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '16px',
                    paddingTop: '12px',
                    borderTop: '1px solid #F3F4F6',
                    textAlign: 'center',
                    fontSize: '0.72rem',
                    color: '#9CA3AF',
                  }}
                >
                  Tecnologia Área Nobre
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
