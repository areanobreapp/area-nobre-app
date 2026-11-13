'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Briefcase,
  Layers,
  Users,
  MapPin,
  Calendar,
  Shield,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Star,
  Phone,
  MessageCircle,
  Building,
  X,
} from 'lucide-react';
import AdminNavTabs from '@/components/admin/AdminNavTabs';
import BlockModal from '@/components/admin/BlockModal';
import BuildingLinkModal from '@/components/admin/BuildingLinkModal';

interface DevelopmentAdminPageProps {
  params: Promise<{ id: string }>;
}

export default function DevelopmentAdminPage({ params }: DevelopmentAdminPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [loadingUser, setLoadingUser] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loadingDev, setLoadingDev] = useState(true);
  const [dev, setDev] = useState<any>(null);
  const [companyContacts, setCompanyContacts] = useState<any[]>([]);

  // Modais
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<any>(null);

  const [buildingModalOpen, setBuildingModalOpen] = useState(false);

  // Modal para associar novo gerente da construtora
  const [assignContactModal, setAssignContactModal] = useState<{
    open: boolean;
    contactId: string;
    isPrimary: boolean;
    customRole: string;
    submitting: boolean;
    error: string | null;
  }>({
    open: false,
    contactId: '',
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
        await loadDevelopment();
      } catch (err) {
        router.replace('/login');
      } finally {
        setLoadingUser(false);
      }
    }
    checkAuthAndLoad();
  }, [id, router]);

  async function loadDevelopment() {
    setLoadingDev(true);
    try {
      const res = await fetch(`/api/admin/developments/${id}`);
      if (!res.ok) throw new Error('Empreendimento não encontrado.');
      const data = await res.json();
      setDev(data.development);

      // Carrega todos os contatos da mesma construtora para o seletor de atribuição
      if (data.development?.companyId) {
        const resContacts = await fetch(`/api/admin/companies/${data.development.companyId}/contacts`);
        if (resContacts.ok) {
          const cData = await resContacts.json();
          setCompanyContacts(cData.contacts || []);
        }
      }
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', text: err.message || 'Falha ao carregar empreendimento.' });
    } finally {
      setLoadingDev(false);
    }
  }

  // Alternar status
  async function handleToggleStatus() {
    try {
      const res = await fetch(`/api/admin/developments/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao alterar status.');

      setFeedback({ type: 'success', text: `Status alterado para ${data.development?.status} com sucesso!` });
      loadDevelopment();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Falha ao alterar status.' });
    }
  }

  // Excluir bloco
  async function handleDeleteBlock(blockId: string, blockName: string) {
    if (!confirm(`Deseja realmente excluir a torre/quadra "${blockName}"?`)) return;
    try {
      const res = await fetch(`/api/admin/blocks/${blockId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir torre/quadra.');

      setFeedback({ type: 'success', text: `Bloco "${blockName}" excluído com sucesso.` });
      loadDevelopment();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Falha ao excluir bloco.' });
    }
  }

  // Desvincular gerente
  async function handleUnlinkContact(contactId: string, contactName: string) {
    if (!confirm(`Deseja desvincular o gerente "${contactName}" deste empreendimento?`)) return;
    try {
      const res = await fetch(`/api/admin/developments/${id}/contacts/${contactId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao desvincular gerente.');

      setFeedback({ type: 'success', text: `Gerente "${contactName}" desvinculado com sucesso.` });
      loadDevelopment();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Falha ao desvincular gerente.' });
    }
  }

  // Salvar novo vínculo de gerente
  async function handleAssignContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assignContactModal.contactId) return;

    setAssignContactModal((prev) => ({ ...prev, submitting: true, error: null }));
    try {
      const res = await fetch(`/api/admin/developments/${id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: assignContactModal.contactId,
          isPrimary: assignContactModal.isPrimary,
          customRole: assignContactModal.customRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao atribuir gerente.');

      setFeedback({ type: 'success', text: 'Gerente atribuído com sucesso!' });
      setAssignContactModal({ open: false, contactId: '', isPrimary: false, customRole: '', submitting: false, error: null });
      loadDevelopment();
    } catch (err: any) {
      console.error(err);
      setAssignContactModal((prev) => ({ ...prev, submitting: false, error: err.message || 'Falha ao atribuir.' }));
    }
  }

  if (loadingUser || loadingDev) {
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
          Carregando dados do empreendimento...
        </span>
      </div>
    );
  }

  if (!dev) {
    return (
      <div style={{ maxWidth: '600px', margin: '60px auto', textAlign: 'center', padding: '30px' }}>
        <AlertTriangle size={44} style={{ color: '#DC2626', margin: '0 auto 16px auto' }} />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>
          Empreendimento não encontrado
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
          Voltar às Construtoras
        </Link>
      </div>
    );
  }

  const primaryContact = (dev.contacts || []).find((c: any) => c.isPrimary);

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '24px 20px 60px 20px' }}>
      {/* Navegação Superior */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <Link
            href={dev.companyId ? `/admin/construtoras/${dev.companyId}` : '/admin/construtoras'}
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
            <span>Voltar para Construtora {dev.company?.tradeName || ''}</span>
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

      {/* CABEÇALHO DO EMPREENDIMENTO */}
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
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                {dev.name}
              </h1>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: '16px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  backgroundColor:
                    dev.status === 'Ativo'
                      ? '#DEF7EC'
                      : dev.status === 'Rascunho'
                      ? '#FEF3C7'
                      : '#F3F4F6',
                  color:
                    dev.status === 'Ativo'
                      ? '#03543F'
                      : dev.status === 'Rascunho'
                      ? '#92400E'
                      : '#6B7280',
                }}
              >
                {dev.publicationStatus || (dev.status === 'Ativo' ? 'PUBLICADO' : dev.status === 'Rascunho' ? 'RASCUNHO' : 'ARQUIVADO')}
              </span>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: '16px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  backgroundColor: '#E0E7FF',
                  color: '#3730A3',
                }}
              >
                {dev.stage}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: '#4B5563' }}>
              <span>Construtora Responsável: </span>
              {dev.company ? (
                <Link
                  href={`/admin/construtoras/${dev.company.id}`}
                  style={{ fontWeight: 800, color: '#1E4620', textDecoration: 'none' }}
                >
                  {dev.company.tradeName}
                </Link>
              ) : (
                <strong>{dev.developer}</strong>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.80rem', color: '#6B7280', marginTop: '6px', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <MapPin size={13} />
                {dev.address ? `${dev.address}, ` : ''}{dev.neighborhood ? `${dev.neighborhood} - ` : ''}{dev.city}/{dev.state}
              </span>
              <span>•</span>
              <span>Tipo: <strong>{dev.projectType || 'VERTICAL'}</strong></span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link
              href={`/empreendimentos/${dev.id}`}
              id="btn-ver-ficha-corretor"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px solid #BFDBFE',
                backgroundColor: '#EFF6FF',
                color: '#1E40AF',
                fontSize: '0.84rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <ExternalLink size={15} />
              <span>Ver Visão do Corretor</span>
            </Link>

            <Link
              href={`/empreendimentos/${dev.id}/editar?returnTo=admin`}
              id="btn-editar-empreendimento-admin"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                color: '#374151',
                fontSize: '0.84rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <Edit size={15} />
              <span>Editar Empreendimento</span>
            </Link>

            <button
              type="button"
              onClick={handleToggleStatus}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                backgroundColor: dev.status === 'Ativo' ? '#FEF2F2' : '#F0FDF4',
                color: dev.status === 'Ativo' ? '#991B1B' : '#166534',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {dev.status === 'Ativo' ? 'Desativar Divulgação' : 'Ativar Divulgação'}
            </button>
          </div>
        </div>
      </div>

      {/* CARDS RESUMO DO EMPREENDIMENTO */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '16px 20px', border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>
            Torres / Quadras
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827' }}>
            {(dev.blocks || []).length}
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '16px 20px', border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>
            Total de Unidades
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1E4620' }}>
            {dev.totalUnits || 'Não informado'}
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '16px 20px', border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>
            Previsão de Entrega
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#374151', marginTop: '6px' }}>
            {dev.deliveryMonth && dev.deliveryYear
              ? `${String(dev.deliveryMonth).padStart(2, '0')}/${dev.deliveryYear}`
              : dev.deliveryDate || 'A definir'}
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '16px 20px', border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>
            Edifício Conectado
          </div>
          <div style={{ fontSize: '0.92rem', fontWeight: 800, color: dev.building ? '#1E4620' : '#6B7280', marginTop: '8px' }}>
            {dev.building ? dev.building.name : 'Nenhum associado'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* COLUNA ESQUERDA: GESTÃO DE TORRES E QUADRAS */}
        <div>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E5E7EB',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={20} style={{ color: '#1E4620' }} />
                <h3 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                  Torres e Quadras ({ (dev.blocks || []).length })
                </h3>
              </div>

              <button
                type="button"
                id="btn-nova-torre-quadra"
                onClick={() => {
                  setEditingBlock(null);
                  setBlockModalOpen(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  backgroundColor: '#1E4620',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Plus size={14} />
                <span>Adicionar Bloco</span>
              </button>
            </div>

            {(dev.blocks || []).length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', backgroundColor: '#F9FAFB', borderRadius: '10px' }}>
                <p style={{ fontSize: '0.84rem', color: '#6B7280', margin: '0 0 12px 0' }}>
                  Nenhuma torre ou quadra cadastrada para este empreendimento.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingBlock(null);
                    setBlockModalOpen(true);
                  }}
                  style={{
                    padding: '7px 14px',
                    backgroundColor: '#1E4620',
                    color: '#FFFFFF',
                    borderRadius: '6px',
                    fontSize: '0.80rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Cadastrar Primeira Torre / Quadra
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {dev.blocks.map((block: any) => (
                  <div
                    key={block.id}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      border: '1px solid #E5E7EB',
                      backgroundColor: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            backgroundColor: block.blockType === 'TOWER' ? '#DCFCE7' : '#FEF3C7',
                            color: block.blockType === 'TOWER' ? '#166534' : '#92400E',
                          }}
                        >
                          {block.blockType === 'TOWER' ? 'TORRE' : block.blockType === 'QUADRA' ? 'QUADRA' : 'BLOCO'}
                        </span>
                        <span style={{ fontSize: '0.94rem', fontWeight: 800, color: '#111827' }}>
                          {block.name}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem', color: '#6B7280', marginTop: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {block.totalFloors && <span>{block.totalFloors} pavimentos</span>}
                        {block.unitsPerFloor && <span>{block.unitsPerFloor} un/andar</span>}
                        <span>Ordem: {block.displayOrder}</span>
                        <span
                          style={{
                            padding: '1px 7px',
                            borderRadius: '999px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            backgroundColor: '#F3F4F6',
                            color: '#4B5563',
                            border: '1px solid #E5E7EB',
                          }}
                        >
                          Estoque de Unidades (Bloco 6B)
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBlock(block);
                          setBlockModalOpen(true);
                        }}
                        style={{
                          padding: '5px 8px',
                          borderRadius: '6px',
                          border: '1px solid #D1D5DB',
                          backgroundColor: '#FFFFFF',
                          color: '#374151',
                          cursor: 'pointer',
                        }}
                      >
                        <Edit size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBlock(block.id, block.name)}
                        style={{
                          padding: '5px 8px',
                          borderRadius: '6px',
                          border: '1px solid #FCA5A5',
                          backgroundColor: '#FEF2F2',
                          color: '#DC2626',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* VÍNCULO COM EDIFÍCIO PREDIAL */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E5E7EB',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building size={20} style={{ color: '#1E4620' }} />
                <h3 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                  Edifício Predial do Acervo
                </h3>
              </div>

              <button
                type="button"
                id="btn-associar-edificio"
                onClick={() => setBuildingModalOpen(true)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #1E4620',
                  backgroundColor: '#F0FDF4',
                  color: '#1E4620',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {dev.building ? 'Alterar Edifício' : '+ Associar Edifício'}
              </button>
            </div>

            {dev.building ? (
              <div
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  border: '1px solid #BBF7D0',
                  backgroundColor: '#F0FDF4',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                {dev.building.coverImageUrl ? (
                  <img
                    src={dev.building.coverImageUrl}
                    alt={dev.building.name}
                    style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '8px',
                      backgroundColor: '#DCFCE7',
                      color: '#166534',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Building size={24} />
                  </div>
                )}
                <div>
                  <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#166534' }}>
                    {dev.building.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#4B5563', marginTop: '2px' }}>
                    {dev.building.address}
                  </div>
                  <Link
                    href={`/edificios/${dev.building.id}`}
                    target="_blank"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      color: '#1E4620',
                      marginTop: '6px',
                      textDecoration: 'none',
                    }}
                  >
                    <ExternalLink size={12} />
                    <span>Ver Página Pública do Edifício</span>
                  </Link>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.84rem', color: '#6B7280', margin: 0 }}>
                Este empreendimento não está conectado a um condomínio da base predial. A conexão permite reutilizar o polígono territorial, fotos e agrupamentos no mapa.
              </p>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: GERENTES DO EMPREENDIMENTO */}
        <div>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E5E7EB',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} style={{ color: '#1E4620' }} />
                <h3 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                  Gerentes Atribuídos ({ (dev.contacts || []).length })
                </h3>
              </div>

              <button
                type="button"
                id="btn-atribuir-gerente-dev"
                onClick={() => {
                  setAssignContactModal({
                    open: true,
                    contactId: companyContacts[0]?.id || '',
                    isPrimary: (dev.contacts || []).length === 0,
                    customRole: '',
                    submitting: false,
                    error: null,
                  });
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  backgroundColor: '#1E4620',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Plus size={14} />
                <span>Atribuir Gerente</span>
              </button>
            </div>

            {(dev.contacts || []).length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', backgroundColor: '#F9FAFB', borderRadius: '10px' }}>
                <p style={{ fontSize: '0.84rem', color: '#6B7280', margin: '0 0 12px 0' }}>
                  Nenhum gerente comercial atribuído a este empreendimento.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAssignContactModal({
                      open: true,
                      contactId: companyContacts[0]?.id || '',
                      isPrimary: true,
                      customRole: '',
                      submitting: false,
                      error: null,
                    });
                  }}
                  style={{
                    padding: '7px 14px',
                    backgroundColor: '#1E4620',
                    color: '#FFFFFF',
                    borderRadius: '6px',
                    fontSize: '0.80rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Atribuir Primeiro Gerente
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dev.contacts.map((cLink: any) => {
                  const contact = cLink.contact;
                  return (
                    <div
                      key={cLink.id}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        border: cLink.isPrimary ? '2px solid #F59E0B' : '1px solid #E5E7EB',
                        backgroundColor: cLink.isPrimary ? '#FFFBEB' : '#FFFFFF',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.98rem', fontWeight: 800, color: '#111827' }}>
                              {contact?.name}
                            </span>
                            {cLink.isPrimary && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.70rem',
                                  fontWeight: 800,
                                  backgroundColor: '#FEF3C7',
                                  color: '#92400E',
                                  border: '1px solid #FDE68A',
                                }}
                              >
                                <Star size={11} fill="#D97706" color="#D97706" />
                                <span>GERENTE PRINCIPAL</span>
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: '1px' }}>
                            {cLink.customRole || contact?.role}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleUnlinkContact(contact.id, contact.name)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#EF4444',
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                          title="Desvincular deste empreendimento"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Canais */}
                      <div style={{ display: 'flex', gap: '14px', fontSize: '0.78rem', color: '#4B5563', flexWrap: 'wrap' }}>
                        {contact?.whatsapp && (
                          <a
                            href={`https://wa.me/55${contact.whatsapp.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#166534', textDecoration: 'none', fontWeight: 600 }}
                          >
                            <MessageCircle size={13} color="#16A34A" />
                            <span>{contact.whatsapp}</span>
                          </a>
                        )}
                        {contact?.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={13} />
                            <span>{contact.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: CRIAR / EDITAR BLOCO */}
      <BlockModal
        open={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        onSaved={() => {
          setFeedback({ type: 'success', text: 'Torre/Quadra salva com sucesso!' });
          loadDevelopment();
        }}
        developmentId={id}
        initialBlock={editingBlock}
      />

      {/* MODAL: ASSOCIAR EDIFÍCIO PREDIAL */}
      <BuildingLinkModal
        open={buildingModalOpen}
        onClose={() => setBuildingModalOpen(false)}
        onLinked={(building) => {
          setFeedback({
            type: 'success',
            text: building ? `Edifício "${building.name}" associado com sucesso!` : 'Edifício desvinculado com sucesso.',
          });
          loadDevelopment();
        }}
        developmentId={id}
        currentBuildingId={dev.buildingId}
      />

      {/* MODAL: ATRIBUIR GERENTE DA CONSTRUTORA */}
      {assignContactModal.open && (
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
              maxWidth: '460px',
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
                onClick={() => setAssignContactModal((prev) => ({ ...prev, open: false }))}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: '#6B7280', marginBottom: '16px' }}>
              Selecione um dos contatos cadastrados na construtora <strong>{dev.company?.tradeName}</strong>.
            </p>

            {assignContactModal.error && (
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
                {assignContactModal.error}
              </div>
            )}

            {companyContacts.length === 0 ? (
              <div>
                <p style={{ fontSize: '0.84rem', color: '#6B7280' }}>
                  Esta construtora ainda não possui contatos cadastrados. Cadastre contatos no perfil da construtora primeiro.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button
                    type="button"
                    onClick={() => setAssignContactModal((prev) => ({ ...prev, open: false }))}
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
                    Fechar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAssignContactSubmit}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Contato / Gerente Comercial
                  </label>
                  <select
                    value={assignContactModal.contactId}
                    onChange={(e) => setAssignContactModal((prev) => ({ ...prev, contactId: e.target.value }))}
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
                    {companyContacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.role} ({c.visibility === 'PUBLIC' ? 'Público' : c.visibility === 'BROKERS_ONLY' ? 'Corretores' : 'Admin'})
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
                    placeholder="Ex: Gestor Comercial / Plantonista"
                    value={assignContactModal.customRole}
                    onChange={(e) => setAssignContactModal((prev) => ({ ...prev, customRole: e.target.value }))}
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
                    id="chk-assign-is-primary"
                    checked={assignContactModal.isPrimary}
                    onChange={(e) => setAssignContactModal((prev) => ({ ...prev, isPrimary: e.target.checked }))}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="chk-assign-is-primary" style={{ fontSize: '0.84rem', fontWeight: 600, color: '#111827', cursor: 'pointer' }}>
                    Definir como <strong>Gerente Principal</strong> deste empreendimento
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    disabled={assignContactModal.submitting}
                    onClick={() => setAssignContactModal((prev) => ({ ...prev, open: false }))}
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
                    id="btn-confirmar-atribuir-gerente"
                    disabled={assignContactModal.submitting}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '8px',
                      backgroundColor: '#1E4620',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      border: 'none',
                      cursor: assignContactModal.submitting ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {assignContactModal.submitting && <Loader2 size={14} className="animate-spin" />}
                    <span>Atribuir Gerente</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

