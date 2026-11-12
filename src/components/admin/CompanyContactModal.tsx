'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  Shield,
  Save,
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
  Users,
} from 'lucide-react';

interface CompanyContactModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (contact: any) => void;
  companyId: string;
  initialContact?: any;
}

export default function CompanyContactModal({
  open,
  onClose,
  onSaved,
  companyId,
  initialContact,
}: CompanyContactModalProps) {
  const isEditing = Boolean(initialContact?.id);

  const [name, setName] = useState(initialContact?.name || '');
  const [role, setRole] = useState(initialContact?.role || '');
  const [phone, setPhone] = useState(initialContact?.phone || '');
  const [whatsapp, setWhatsapp] = useState(initialContact?.whatsapp || '');
  const [email, setEmail] = useState(initialContact?.email || '');
  const [photoUrl, setPhotoUrl] = useState(initialContact?.photoUrl || '');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'BROKERS_ONLY' | 'ADMIN_ONLY'>(
    initialContact?.visibility || 'BROKERS_ONLY'
  );
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>(initialContact?.status || 'ACTIVE');
  const [displayOrder, setDisplayOrder] = useState<number>(initialContact?.displayOrder ?? 0);
  const [internalNotes, setInternalNotes] = useState(initialContact?.internalNotes || '');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initialContact?.name || '');
      setRole(initialContact?.role || '');
      setPhone(initialContact?.phone || '');
      setWhatsapp(initialContact?.whatsapp || '');
      setEmail(initialContact?.email || '');
      setPhotoUrl(initialContact?.photoUrl || '');
      setVisibility(initialContact?.visibility || 'BROKERS_ONLY');
      setStatus(initialContact?.status || 'ACTIVE');
      setDisplayOrder(initialContact?.displayOrder ?? 0);
      setInternalNotes(initialContact?.internalNotes || '');
      setError(null);
    }
  }, [open, initialContact]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nome do contato é obrigatório.');
      return;
    }
    if (!role.trim()) {
      setError('Cargo / Função é obrigatório.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        role: role.trim(),
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        email: email.trim() || null,
        photoUrl: photoUrl.trim() || null,
        visibility,
        status,
        displayOrder: Number(displayOrder) || 0,
        internalNotes: internalNotes.trim() || null,
      };

      const endpoint = isEditing
        ? `/api/admin/contacts/${initialContact.id}`
        : `/api/admin/companies/${companyId}/contacts`;
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar contato comercial.');
      }

      onSaved(data.contact);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Falha ao registrar contato.');
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
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Cabeçalho */}
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
              <User size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                {isEditing ? 'Editar Gerente / Contato' : 'Adicionar Gerente / Contato'}
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                Gerente comercial ou contato de parcerias da construtora
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

        {/* Formulário */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
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
                Nome Completo <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="text"
                id="input-contact-name"
                required
                placeholder="Ex: Carlos Eduardo Silveira"
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

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                Cargo / Função na Construtora <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="text"
                id="input-contact-role"
                required
                placeholder="Ex: Gerente Comercial Regional Sul / Plantão"
                value={role}
                onChange={(e) => setRole(e.target.value)}
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
                Telefone de Ligação
              </label>
              <input
                type="text"
                id="input-contact-phone"
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
              <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                WhatsApp Direto
              </label>
              <input
                type="text"
                id="input-contact-whatsapp"
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

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                E-mail Corporativo
              </label>
              <input
                type="email"
                id="input-contact-email"
                placeholder="carlos@construtora.com.br"
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
          </div>

          {/* Configuração de Visibilidade (Ponto 6 & 9) */}
          <div
            style={{
              padding: '14px',
              borderRadius: '10px',
              backgroundColor: '#F9FAFB',
              border: '1px solid #E5E7EB',
              marginBottom: '16px',
            }}
          >
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 800, color: '#111827', marginBottom: '6px' }}>
              Nível de Visibilidade do Contato
            </label>
            <select
              id="select-contact-visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as any)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '0.86rem',
                backgroundColor: '#FFFFFF',
                color: '#111827',
                fontWeight: 600,
                outline: 'none',
                marginBottom: '6px',
              }}
            >
              <option value="BROKERS_ONLY">Somente Corretores (Recomendado para Gerentes)</option>
              <option value="PUBLIC">Público (Visível para Clientes e Visitantes no site)</option>
              <option value="ADMIN_ONLY">Somente Administrativo (Oculto de Corretores e Público)</option>
            </select>

            <div style={{ fontSize: '0.74rem', color: '#6B7280', lineHeight: 1.4 }}>
              {visibility === 'BROKERS_ONLY' && (
                <span style={{ color: '#166534' }}>
                  ✓ <strong>Visível para corretores logados</strong> nos empreendimentos desta construtora. Oculto para visitantes anônimos.
                </span>
              )}
              {visibility === 'PUBLIC' && (
                <span style={{ color: '#0369A1' }}>
                  ✓ <strong>Visível publicamente</strong> para qualquer visitante ou cliente no portal.
                </span>
              )}
              {visibility === 'ADMIN_ONLY' && (
                <span style={{ color: '#92400E' }}>
                  🔒 <strong>Restrito ao ADMIN</strong>. Não é retornado nas consultas de corretores nem do público geral.
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                Situação
              </label>
              <select
                id="select-contact-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.86rem',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                }}
              >
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo (Desativado)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                Ordem de Apresentação
              </label>
              <input
                type="number"
                id="input-contact-display-order"
                min={0}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(parseInt(e.target.value || '0', 10))}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.86rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
              Observações Administrativas (Restrito ao ADMIN)
            </label>
            <textarea
              id="textarea-contact-internal-notes"
              rows={2}
              placeholder="Anotações internas sobre negociação, disponibilidade ou canais de contato de apoio..."
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
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
              id="btn-salvar-contato-modal"
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
              <span>{isEditing ? 'Atualizar Contato' : 'Salvar Contato'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

