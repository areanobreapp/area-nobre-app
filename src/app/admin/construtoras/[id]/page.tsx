'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Briefcase,
  Building2,
  Users,
  MapPin,
  Phone,
  Mail,
  Globe,
  Edit,
  Plus,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Calendar,
  Layers,
  Shield,
  ExternalLink,
  MessageCircle,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import AdminNavTabs from '@/components/admin/AdminNavTabs';
import CompanyContactModal from '@/components/admin/CompanyContactModal';
import DevelopmentModal from '@/components/admin/DevelopmentModal';
import { formatCnpj } from '@/lib/company-service';

interface CompanyProfilePageProps {
  params: Promise<{ id: string }>;
}

export default function CompanyProfilePage({ params }: CompanyProfilePageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [loadingUser, setLoadingUser] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loadingCompany, setLoadingCompany] = useState(true);
  const [company, setCompany] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'developments' | 'contacts' | 'details' | 'identity'>('developments');

  // Modais
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);

  const [devModalOpen, setDevModalOpen] = useState(false);

  // Modal para associar gerente a empreendimentos
  const [linkModal, setLinkModal] = useState<{
    open: boolean;
    contact: any | null;
    selectedDevId: string;
    isPrimary: boolean;
    customRole: string;
    submitting: boolean;
    error: string | null;
  }>({
    open: false,
    contact: null,
    selectedDevId: '',
    isPrimary: false,
    customRole: '',
    submitting: false,
    error: null,
  });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function checkAuthAndLoad() {
      try {
        const resAuth = await fetch('/api/auth/me');
        if (!resAuth.ok) {
          router.replace('/login');
          return;
        }
        const dataAuth = await resAuth.json();
        if (!dataAuth.user || dataAuth.user.role !== 'ADMIN') {
          router.replace('/admin');
          return;
        }
        setIsAdmin(true);
        await loadCompanyData();
      } catch (err) {
        router.replace('/login');
      } finally {
        setLoadingUser(false);
      }
    }
    checkAuthAndLoad();
  }, [id, router]);

  async function loadCompanyData() {
    setLoadingCompany(true);
    try {
      const res = await fetch(`/api/admin/companies/${id}`);
      if (!res.ok) {
        throw new Error('Falha ao consultar construtora.');
      }
      const data = await res.json();
      setCompany(data.company);
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', text: err.message || 'Erro ao carregar dados da construtora.' });
    } finally {
      setLoadingCompany(false);
    }
  }

  // Alternar status de um empreendimento
  async function handleToggleDevStatus(devId: string, currentStatus: string) {
    try {
      const res = await fetch(`/api/admin/developments/${devId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao alterar status do empreendimento.');

      setFeedback({ type: 'success', text: 'Status do empreendimento atualizado com sucesso!' });
      loadCompanyData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Falha ao atualizar empreendimento.' });
    }
  }

  // Abrir modal de vínculo de gerente ao empreendimento
  function handleOpenLinkModal(contact: any) {
    setLinkModal({
      open: true,
      contact,
      selectedDevId: company?.developments?.[0]?.id || '',
      isPrimary: false,
      customRole: contact.role || '',
      submitting: false,
      error: null,
    });
  }

  // Salvar vínculo de gerente ao empreendimento
  async function handleSaveContactLink(e: React.FormEvent) {
    e.preventDefault();
    if (!linkModal.contact || !linkModal.selectedDevId) return;

    setLinkModal((prev) => ({ ...prev, submitting: true, error: null }));
    try {
      const res = await fetch(`/api/admin/developments/${linkModal.selectedDevId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: linkModal.contact.id,
          isPrimary: linkModal.isPrimary,
          customRole: linkModal.customRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao vincular gerente ao empreendimento.');
      }

      setFeedback({ type: 'success', text: `Gerente vinculado com sucesso ao empreendimento!` });
      setLinkModal({ open: false, contact: null, selectedDevId: '', isPrimary: false, customRole: '', submitting: false, error: null });
      loadCompanyData();
    } catch (err: any) {
      console.error(err);
      setLinkModal((prev) => ({ ...prev, submitting: false, error: err.message || 'Falha ao vincular.' }));
    }
  }

  // Desvincular gerente de um empreendimento
  async function handleUnlinkContact(devId: string, contactId: string) {
    if (!confirm('Deseja realmente desvincular este gerente deste empreendimento?')) return;
    try {
      const res = await fetch(`/api/admin/developments/${devId}/contacts/${contactId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao desvincular.');

      setFeedback({ type: 'success', text: 'Vínculo removido com sucesso!' });
      loadCompanyData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Falha ao desvincular.' });
    }
  }

  // Excluir contato
  async function handleDeleteContact(contactId: string, contactName: string) {
    if (!confirm(`Tem certeza que deseja excluir o contato "${contactName}"? Ele será desvinculado de todos os empreendimentos.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/contacts/${contactId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir contato.');

      setFeedback({ type: 'success', text: `Contato "${contactName}" excluído com sucesso.` });
      loadCompanyData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Falha ao excluir contato.' });
    }
  }

  if (loadingUser || loadingCompany) {
    return (
      <div
        style={{
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <Loader2 size={32} className="animate-spin" style={{ color: '#1E4620' }} />
        <span style={{ fontSize: '0.88rem', color: '#6B7280', fontWeight: 600 }}>
          Carregando perfil da construtora...
        </span>
      </div>
    );
  }

  if (!company) {
    return (
      <div style={{ maxWidth: '600px', margin: '60px auto', textAlign: 'center', padding: '30px' }}>
        <AlertTriangle size={44} style={{ color: '#DC2626', margin: '0 auto 16px auto' }} />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>
          Construtora não encontrada
        </h2>
        <Link
          href="/admin/construtoras"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            backgroundColor: '#1E4620',
            color: '#FFFFFF',
            borderRadius: '8px',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Voltar para Lista
        </Link>
      </div>
    );
  }

  const initials = company.tradeName
    ? company.tradeName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
    : 'CO';

  const activeDevsCount = (company.developments || []).filter((d: any) => d.status === 'Ativo').length;

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '24px 20px 60px 20px' }}>
      {/* Navegação Superior */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <Link
            href="/admin/construtoras"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.84rem',
              color: '#6B7280',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={16} />
            <span>Voltar para Lista de Construtoras</span>
          </Link>
        </div>

        <AdminNavTabs currentTab="companies" />
      </div>

      {/* Alerta de Feedback */}
      {feedback && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '10px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.88rem',
            fontWeight: 600,
            backgroundColor: feedback.type === 'success' ? '#F0FDF4' : '#FEF2F2',
            color: feedback.type === 'success' ? '#166534' : '#991B1B',
            border: `1px solid ${feedback.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* CABEÇALHO PRINCIPAL DA CONSTRUTORA */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E5E7EB',
          padding: '24px 28px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '20px',
            flexWrap: 'wrap',
          }}
        >
          {/* Identidade Visual + Nomes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={company.tradeName}
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '12px',
                  objectFit: 'contain',
                  backgroundColor: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  padding: '4px',
                }}
              />
            ) : (
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '12px',
                  backgroundColor: '#E0E7FF',
                  color: '#3730A3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.3rem',
                  border: '1px solid #C7D2FE',
                }}
              >
                {initials}
              </div>
            )}

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                  {company.tradeName}
                </h1>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    borderRadius: '16px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    backgroundColor: company.status === 'ACTIVE' ? '#DEF7EC' : '#F3F4F6',
                    color: company.status === 'ACTIVE' ? '#03543F' : '#6B7280',
                  }}
                >
                  {company.status === 'ACTIVE' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  <span>{company.status === 'ACTIVE' ? 'CONSTRUTORA ATIVA' : 'INATIVA'}</span>
                </span>
              </div>

              <div style={{ fontSize: '0.86rem', color: '#4B5563', marginTop: '2px' }}>
                {company.name}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.80rem', color: '#6B7280', marginTop: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, color: '#111827' }}>
                  CNPJ: {company.cnpj || 'Não cadastrado'}
                </span>
                <span>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <MapPin size={13} />
                  {company.city} - {company.state}
                </span>
                {company.website && (
                  <>
                    <span>•</span>
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#1E4620', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}
                    >
                      <Globe size={13} />
                      Website Oficial
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              href={`/admin/construtoras/${company.id}/editar`}
              id="btn-editar-perfil-construtora"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                color: '#374151',
                fontSize: '0.86rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <Edit size={15} />
              <span>Editar Cadastro</span>
            </Link>

            <Link
              href={`/empreendimentos/novo?companyId=${company.id}&returnTo=admin`}
              id="btn-novo-empreendimento-completo"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '8px',
                backgroundColor: '#F0FDF4',
                color: '#1E4620',
                border: '1px solid #1E4620',
                fontSize: '0.86rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <Plus size={15} strokeWidth={2.6} />
              <span>Cadastro Completo</span>
            </Link>

            <button
              type="button"
              id="btn-novo-empreendimento-header"
              onClick={() => setDevModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 18px',
                borderRadius: '8px',
                backgroundColor: '#1E4620',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '0.86rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(30,70,32,0.18)',
              }}
            >
              <Plus size={15} strokeWidth={2.6} />
              <span>Novo Empreendimento</span>
            </button>
          </div>
        </div>
      </div>

      {/* CARDS DE RESUMO OPERACIONAL */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '16px 20px', border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>
            Total de Empreendimentos
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827' }}>
            {(company.developments || []).length}
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '16px 20px', border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>
            Empreendimentos Ativos
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669' }}>
            {activeDevsCount}
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '16px 20px', border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>
            Gerentes e Contatos
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1E4620' }}>
            {(company.contacts || []).length}
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '16px 20px', border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>
            Última Atualização
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#374151', marginTop: '6px' }}>
            {new Date(company.updatedAt).toLocaleDateString('pt-BR')}
          </div>
        </div>
      </div>

      {/* NAVEGAÇÃO POR ABAS DA CONSTRUTORA */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid #E5E7EB',
          marginBottom: '24px',
          overflowX: 'auto',
        }}
      >
        <button
          type="button"
          id="tab-btn-developments"
          onClick={() => setActiveTab('developments')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'developments' ? '3px solid #1E4620' : '3px solid transparent',
            color: activeTab === 'developments' ? '#1E4620' : '#6B7280',
            fontWeight: 800,
            fontSize: '0.90rem',
            cursor: 'pointer',
            marginBottom: '-2px',
            whiteSpace: 'nowrap',
          }}
        >
          <Building2 size={17} />
          <span>Empreendimentos ({(company.developments || []).length})</span>
        </button>

        <button
          type="button"
          id="tab-btn-contacts"
          onClick={() => setActiveTab('contacts')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'contacts' ? '3px solid #1E4620' : '3px solid transparent',
            color: activeTab === 'contacts' ? '#1E4620' : '#6B7280',
            fontWeight: 800,
            fontSize: '0.90rem',
            cursor: 'pointer',
            marginBottom: '-2px',
            whiteSpace: 'nowrap',
          }}
        >
          <Users size={17} />
          <span>Gerentes e Contatos ({(company.contacts || []).length})</span>
        </button>

        <button
          type="button"
          id="tab-btn-details"
          onClick={() => setActiveTab('details')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'details' ? '3px solid #1E4620' : '3px solid transparent',
            color: activeTab === 'details' ? '#1E4620' : '#6B7280',
            fontWeight: 800,
            fontSize: '0.90rem',
            cursor: 'pointer',
            marginBottom: '-2px',
            whiteSpace: 'nowrap',
          }}
        >
          <Briefcase size={17} />
          <span>Dados Cadastrais & Contato Geral</span>
        </button>
      </div>

      {/* CONTEÚDO DA ABA 1: EMPREENDIMENTOS */}
      {activeTab === 'developments' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0 }}>
              Lançamentos e Empreendimentos de {company.tradeName}
            </h3>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Link
                href={`/empreendimentos/novo?companyId=${company.id}&returnTo=admin`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  backgroundColor: '#F0FDF4',
                  color: '#1E4620',
                  border: '1px solid #1E4620',
                  borderRadius: '8px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <Plus size={15} />
                <span>Cadastro Completo</span>
              </Link>

              <button
                type="button"
                id="btn-cadastrar-dev-tab"
                onClick={() => setDevModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  backgroundColor: '#1E4620',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Plus size={15} />
                <span>Novo Empreendimento</span>
              </button>
            </div>
          </div>

          {(company.developments || []).length === 0 ? (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E5E7EB',
                padding: '50px 20px',
                textAlign: 'center',
              }}
            >
              <Building2 size={36} style={{ color: '#9CA3AF', margin: '0 auto 12px auto' }} />
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827', marginBottom: '4px' }}>
                Nenhum empreendimento cadastrado
              </h4>
              <p style={{ fontSize: '0.84rem', color: '#6B7280', marginBottom: '16px' }}>
                Cadastre os edifícios, condomínios ou lançamentos imobiliários desta construtora.
              </p>
              <button
                type="button"
                onClick={() => setDevModalOpen(true)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#1E4620',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Cadastrar Primeiro Empreendimento
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {(company.developments || []).map((dev: any) => (
                <div
                  key={dev.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '14px',
                    border: '1px solid #E5E7EB',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                      <Link
                        href={`/admin/empreendimentos/${dev.id}`}
                        style={{
                          fontSize: '1.05rem',
                          fontWeight: 800,
                          color: '#111827',
                          textDecoration: 'none',
                        }}
                      >
                        {dev.name}
                      </Link>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          backgroundColor: dev.status === 'Ativo' ? '#DEF7EC' : '#F3F4F6',
                          color: dev.status === 'Ativo' ? '#03543F' : '#6B7280',
                        }}
                      >
                        {dev.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.80rem', color: '#6B7280', marginBottom: '12px' }}>
                      <MapPin size={13} />
                      <span>{dev.neighborhood ? `${dev.neighborhood}, ` : ''}{dev.city}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                      <span style={{ fontSize: '0.74rem', backgroundColor: '#F3F4F6', padding: '3px 8px', borderRadius: '6px', fontWeight: 600, color: '#374151' }}>
                        Estágio: <strong>{dev.stage}</strong>
                      </span>
                      {dev.totalUnits && (
                        <span style={{ fontSize: '0.74rem', backgroundColor: '#F3F4F6', padding: '3px 8px', borderRadius: '6px', fontWeight: 600, color: '#374151' }}>
                          Unidades: <strong>{dev.totalUnits}</strong>
                        </span>
                      )}
                      {dev.totalTowers && (
                        <span style={{ fontSize: '0.74rem', backgroundColor: '#F3F4F6', padding: '3px 8px', borderRadius: '6px', fontWeight: 600, color: '#374151' }}>
                          Torres: <strong>{dev.totalTowers}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F3F4F6', paddingTop: '14px' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleDevStatus(dev.id, dev.status)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        color: dev.status === 'Ativo' ? '#DC2626' : '#166534',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      {dev.status === 'Ativo' ? 'Pausar / Inativar' : 'Ativar Empreendimento'}
                    </button>

                    <Link
                      href={`/admin/empreendimentos/${dev.id}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        backgroundColor: '#1E4620',
                        color: '#FFFFFF',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      <Layers size={13} />
                      <span>Gerenciar Torres e Contatos</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONTEÚDO DA ABA 2: GERENTES E CONTATOS */}
      {activeTab === 'contacts' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                Gerentes e Contatos Comerciais
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '2px 0 0 0' }}>
                Gerentes de parcerias com imobiliárias, plantonistas e executivos cadastrados.
              </p>
            </div>

            <button
              type="button"
              id="btn-adicionar-contato"
              onClick={() => {
                setEditingContact(null);
                setContactModalOpen(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: '#1E4620',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Plus size={15} />
              <span>Adicionar Contato</span>
            </button>
          </div>

          {(company.contacts || []).length === 0 ? (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E5E7EB',
                padding: '50px 20px',
                textAlign: 'center',
              }}
            >
              <Users size={36} style={{ color: '#9CA3AF', margin: '0 auto 12px auto' }} />
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827', marginBottom: '4px' }}>
                Nenhum gerente ou contato cadastrado
              </h4>
              <p style={{ fontSize: '0.84rem', color: '#6B7280', marginBottom: '16px' }}>
                Cadastre os gerentes comerciais para que os corretores parceiros tenham canais diretos de negociação.
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingContact(null);
                  setContactModalOpen(true);
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#1E4620',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Cadastrar Primeiro Contato
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
              {(company.contacts || []).map((contact: any) => (
                <div
                  key={contact.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '14px',
                    border: '1px solid #E5E7EB',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    {/* Header do Contato */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            backgroundColor: '#DCFCE7',
                            color: '#166534',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.90rem',
                          }}
                        >
                          {contact.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#111827' }}>
                            {contact.name}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                            {contact.role}
                          </div>
                        </div>
                      </div>

                      {/* Badge de Visibilidade */}
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          backgroundColor:
                            contact.visibility === 'PUBLIC'
                              ? '#E0F2FE'
                              : contact.visibility === 'BROKERS_ONLY'
                              ? '#DEF7EC'
                              : '#FEF3C7',
                          color:
                            contact.visibility === 'PUBLIC'
                              ? '#0369A1'
                              : contact.visibility === 'BROKERS_ONLY'
                              ? '#03543F'
                              : '#92400E',
                        }}
                      >
                        {contact.visibility === 'PUBLIC'
                          ? 'Público'
                          : contact.visibility === 'BROKERS_ONLY'
                          ? 'Somente corretores'
                          : 'Somente administrativo'}
                      </span>
                    </div>

                    {/* Canais de Comunicação */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.80rem', color: '#4B5563', marginBottom: '14px' }}>
                      {contact.whatsapp && (
                        <a
                          href={`https://wa.me/55${contact.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#166534',
                            textDecoration: 'none',
                            fontWeight: 600,
                          }}
                        >
                          <MessageCircle size={14} color="#16A34A" />
                          <span>WhatsApp: {contact.whatsapp}</span>
                        </a>
                      )}
                      {contact.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={14} color="#6B7280" />
                          <span>Telefone: {contact.phone}</span>
                        </div>
                      )}
                      {contact.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Mail size={14} color="#6B7280" />
                          <span>E-mail: {contact.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Vínculos com Empreendimentos */}
                    {contact.developments && contact.developments.length > 0 && (
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>
                          Empreendimentos Atribuídos:
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {contact.developments.map((dLink: any) => (
                            <span
                              key={dLink.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.70rem',
                                backgroundColor: dLink.isPrimary ? '#FEF3C7' : '#F3F4F6',
                                color: dLink.isPrimary ? '#92400E' : '#374151',
                                border: dLink.isPrimary ? '1px solid #FDE68A' : '1px solid #E5E7EB',
                                padding: '2px 7px',
                                borderRadius: '6px',
                                fontWeight: 700,
                              }}
                            >
                              {dLink.isPrimary && <Star size={10} color="#D97706" fill="#D97706" />}
                              <span>{dLink.development?.name || 'Empreendimento'}</span>
                              <button
                                type="button"
                                title="Desvincular deste empreendimento"
                                onClick={() => handleUnlinkContact(dLink.developmentId, contact.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: '2px', color: '#9CA3AF' }}
                              >
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ações do Contato */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F3F4F6', paddingTop: '12px' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenLinkModal(contact)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        border: '1px solid #1E4620',
                        backgroundColor: '#F0FDF4',
                        color: '#1E4620',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      + Atribuir Empreendimento
                    </button>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingContact(contact);
                          setContactModalOpen(true);
                        }}
                        style={{
                          padding: '5px 8px',
                          borderRadius: '6px',
                          border: '1px solid #D1D5DB',
                          backgroundColor: '#FFFFFF',
                          color: '#374151',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteContact(contact.id, contact.name)}
                        style={{
                          padding: '5px 8px',
                          borderRadius: '6px',
                          border: '1px solid #FCA5A5',
                          backgroundColor: '#FEF2F2',
                          color: '#DC2626',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONTEÚDO DA ABA 3: DADOS CADASTRAIS & CONTATO GERAL */}
      {activeTab === 'details' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {/* Card: Endereço & Sede */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E5E7EB',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={18} style={{ color: '#1E4620' }} />
              <span>Endereço da Sede</span>
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.86rem', color: '#374151' }}>
              <div>
                <span style={{ fontWeight: 700, color: '#6B7280' }}>Logradouro: </span>
                {company.address || 'Não informado'}{company.number ? `, nº ${company.number}` : ''}
              </div>
              {company.complement && (
                <div>
                  <span style={{ fontWeight: 700, color: '#6B7280' }}>Complemento: </span>
                  {company.complement}
                </div>
              )}
              <div>
                <span style={{ fontWeight: 700, color: '#6B7280' }}>Bairro: </span>
                {company.neighborhood || 'Não informado'}
              </div>
              <div>
                <span style={{ fontWeight: 700, color: '#6B7280' }}>Cidade / UF: </span>
                {company.city} - {company.state}
              </div>
              <div>
                <span style={{ fontWeight: 700, color: '#6B7280' }}>CEP: </span>
                {company.zipcode || 'Não informado'}
              </div>
            </div>
          </div>

          {/* Card: Canais Oficiais da Sede */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E5E7EB',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Phone size={18} style={{ color: '#1E4620' }} />
              <span>Canais de Atendimento Geral</span>
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.86rem', color: '#374151' }}>
              <div>
                <span style={{ fontWeight: 700, color: '#6B7280' }}>Telefone Geral: </span>
                {company.phone || 'Não informado'}
              </div>
              <div>
                <span style={{ fontWeight: 700, color: '#6B7280' }}>WhatsApp Institucional: </span>
                {company.whatsapp || 'Não informado'}
              </div>
              <div>
                <span style={{ fontWeight: 700, color: '#6B7280' }}>E-mail: </span>
                {company.email || 'Não informado'}
              </div>
              <div>
                <span style={{ fontWeight: 700, color: '#6B7280' }}>Website: </span>
                {company.website ? (
                  <a href={company.website} target="_blank" rel="noopener noreferrer" style={{ color: '#1E4620', fontWeight: 600 }}>
                    {company.website}
                  </a>
                ) : (
                  'Não informado'
                )}
              </div>
              <div>
                <span style={{ fontWeight: 700, color: '#6B7280' }}>Inscrição Estadual: </span>
                {company.stateRegistration || 'Isento / Não informada'}
              </div>
            </div>
          </div>

          {/* Card: Observações Administrativas Confidenciais */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E5E7EB',
              padding: '24px',
              gridColumn: '1 / -1',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} style={{ color: '#D97706' }} />
              <span>Notas e Observações Administrativas Internas</span>
            </h4>
            <p style={{ fontSize: '0.80rem', color: '#6B7280', margin: '0 0 12px 0' }}>
              Visível exclusivamente aos administradores do Área Nobre.
            </p>

            <div
              style={{
                backgroundColor: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                padding: '14px 16px',
                fontSize: '0.86rem',
                color: '#374151',
                lineHeight: 1.5,
              }}
            >
              {company.internalNotes || 'Nenhuma observação interna cadastrada para esta construtora.'}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR / EDITAR CONTATO */}
      <CompanyContactModal
        open={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        onSaved={() => {
          setFeedback({ type: 'success', text: 'Contato salvo com sucesso!' });
          loadCompanyData();
        }}
        companyId={id}
        initialContact={editingContact}
      />

      {/* MODAL: CRIAR EMPREENDIMENTO */}
      <DevelopmentModal
        open={devModalOpen}
        onClose={() => setDevModalOpen(false)}
        onSaved={(newDev) => {
          setFeedback({ type: 'success', text: `Empreendimento "${newDev.name}" cadastrado com sucesso!` });
          loadCompanyData();
        }}
        companyId={id}
        companyName={company.tradeName}
      />

      {/* MODAL: ATRIBUIR GERENTE AO EMPREENDIMENTO */}
      {linkModal.open && linkModal.contact && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                Atribuir Gerente ao Empreendimento
              </h4>
              <button
                type="button"
                onClick={() => setLinkModal((prev) => ({ ...prev, open: false }))}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: '#6B7280', marginBottom: '16px' }}>
              Vincule o gerente <strong>{linkModal.contact.name}</strong> a um dos lançamentos de {company.tradeName}.
            </p>

            {linkModal.error && (
              <div
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  backgroundColor: '#FEF2F2',
                  color: '#991B1B',
                  fontSize: '0.82rem',
                  marginBottom: '12px',
                  border: '1px solid #FECACA',
                }}
              >
                {linkModal.error}
              </div>
            )}

            <form onSubmit={handleSaveContactLink}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Selecione o Empreendimento
                </label>
                <select
                  value={linkModal.selectedDevId}
                  onChange={(e) => setLinkModal((prev) => ({ ...prev, selectedDevId: e.target.value }))}
                  required
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
                  {(company.developments || []).map((dev: any) => (
                    <option key={dev.id} value={dev.id}>
                      {dev.name} ({dev.stage})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Função Específica no Empreendimento
                </label>
                <input
                  type="text"
                  placeholder="Ex: Gestor Comercial da Torre / Plantonista"
                  value={linkModal.customRole}
                  onChange={(e) => setLinkModal((prev) => ({ ...prev, customRole: e.target.value }))}
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

              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="chk-is-primary"
                  checked={linkModal.isPrimary}
                  onChange={(e) => setLinkModal((prev) => ({ ...prev, isPrimary: e.target.checked }))}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="chk-is-primary" style={{ fontSize: '0.84rem', fontWeight: 600, color: '#111827', cursor: 'pointer' }}>
                  Definir como <strong>Gerente Principal</strong> deste empreendimento
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  disabled={linkModal.submitting}
                  onClick={() => setLinkModal((prev) => ({ ...prev, open: false }))}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#374151',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={linkModal.submitting}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    backgroundColor: '#1E4620',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    border: 'none',
                    cursor: linkModal.submitting ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {linkModal.submitting && <Loader2 size={14} className="animate-spin" />}
                  <span>Salvar Vínculo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

