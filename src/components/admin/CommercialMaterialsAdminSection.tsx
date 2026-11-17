'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Sparkles,
  Download,
  Eye,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Layers,
  Building,
  Upload,
  Link as LinkIcon,
  Shield,
  Loader2,
  X,
  FileSpreadsheet,
  Image as ImageIcon,
  FolderOpen,
  Info,
} from 'lucide-react';
import {
  MATERIAL_CATEGORIES,
  MATERIAL_VISIBILITIES,
  MaterialCategoryValue,
  MaterialVisibilityValue,
} from '@/lib/commercial-material-service';

interface MaterialItem {
  id: string;
  developmentId: string;
  title: string;
  category: string;
  description: string | null;
  fileUrl: string;
  storagePath: string | null;
  fileType: string | null;
  fileExtension: string | null;
  fileSizeBytes: number | null;
  versionLabel: string | null;
  visibility: MaterialVisibilityValue;
  allowDownload: boolean;
  allowBrokerShare: boolean;
  isActive: boolean;
  displayOrder: number;
  typologyId: string | null;
  typology?: { id: string; name: string; propertyType: string } | null;
  blockId: string | null;
  block?: { id: string; name: string; blockType: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface CommercialMaterialsAdminSectionProps {
  developmentId: string;
  typologies: Array<{ id: string; name: string; propertyType: string }>;
  blocks: Array<{ id: string; name: string; blockType: string }>;
}

function getCategoryLabel(val: string): string {
  const found = MATERIAL_CATEGORIES.find((c) => c.value === val);
  return found ? found.label : val;
}

function getFileIcon(extension: string | null, mime: string | null) {
  const ext = (extension || '').toLowerCase();
  const m = (mime || '').toLowerCase();

  if (ext === 'pdf' || m.includes('pdf')) {
    return <FileText size={20} color="#DC2626" />;
  }
  if (['xlsx', 'xls', 'csv'].includes(ext) || m.includes('spreadsheet') || m.includes('excel') || m.includes('csv')) {
    return <FileSpreadsheet size={20} color="#16A34A" />;
  }
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext) || m.includes('image')) {
    return <ImageIcon size={20} color="#2563EB" />;
  }
  return <FolderOpen size={20} color="#D97706" />;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CommercialMaterialsAdminSection({
  developmentId,
  typologies,
  blocks,
}: CommercialMaterialsAdminSectionProps) {
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modal de IA (Seção 10)
  const [showAiModal, setShowAiModal] = useState(false);

  // Modal de Cadastro / Edição
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);

  // Formulário do Modal
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<MaterialCategoryValue>('TABELA_PRECOS');
  const [formDescription, setFormDescription] = useState('');
  const [formSourceType, setFormSourceType] = useState<'FILE' | 'URL'>('FILE');
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formExternalUrl, setFormExternalUrl] = useState('');
  const [formVisibility, setFormVisibility] = useState<MaterialVisibilityValue>('BROKERS_ONLY');
  const [formAllowDownload, setFormAllowDownload] = useState(true);
  const [formAllowBrokerShare, setFormAllowBrokerShare] = useState(true);
  const [formTypologyId, setFormTypologyId] = useState<string>('');
  const [formBlockId, setFormBlockId] = useState<string>('');
  const [formVersionLabel, setFormVersionLabel] = useState('');
  const [formDisplayOrder, setFormDisplayOrder] = useState<number>(0);

  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleDownloadFile(mat: MaterialItem) {
    if (downloadingId) return;
    try {
      setDownloadingId(mat.id);
      const res = await fetch(`/api/materials/${mat.id}/download`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Não foi possível baixar o material.');
        return;
      }
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;

      // Extrai nome do arquivo sugerido pelo cabeçalho Content-Disposition
      const disposition = res.headers.get('content-disposition');
      let filename = '';
      if (disposition && disposition.includes('filename')) {
        const match = disposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?;?/i);
        if (match && match[1]) {
          filename = decodeURIComponent(match[1]);
        }
      }
      if (!filename) {
        const ext = mat.fileExtension ? `.${mat.fileExtension.replace(/^\./, '')}` : '';
        filename = `${mat.title}${ext}`;
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(link);
    } catch (err) {
      console.error('Erro ao baixar arquivo:', err);
      alert('Erro ao iniciar download do arquivo.');
    } finally {
      setDownloadingId(null);
    }
  }

  async function loadMaterials() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/developments/${developmentId}/materials`);
      if (res.ok) {
        const data = await res.json();
        setMaterials(data.materials || []);
      }
    } catch (err) {
      console.error('Erro ao carregar materiais:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMaterials();
  }, [developmentId]);

  function openCreateModal(defaultCategory?: MaterialCategoryValue) {
    setEditingMaterial(null);
    setFormTitle('');
    setFormCategory(defaultCategory || 'TABELA_PRECOS');
    setFormDescription('');
    setFormSourceType('FILE');
    setFormFile(null);
    setFormExternalUrl('');
    setFormVisibility('BROKERS_ONLY');
    setFormAllowDownload(true);
    setFormAllowBrokerShare(true);
    setFormTypologyId('');
    setFormBlockId('');
    setFormVersionLabel('');
    setFormDisplayOrder(materials.length);
    setErrorMsg(null);
    setModalOpen(true);
  }

  function openEditModal(mat: MaterialItem) {
    setEditingMaterial(mat);
    setFormTitle(mat.title);
    setFormCategory(mat.category as MaterialCategoryValue);
    setFormDescription(mat.description || '');
    setFormSourceType('FILE');
    setFormFile(null);
    setFormExternalUrl(mat.fileUrl || '');
    setFormVisibility(mat.visibility);
    setFormAllowDownload(mat.allowDownload);
    setFormAllowBrokerShare(mat.allowBrokerShare);
    setFormTypologyId(mat.typologyId || '');
    setFormBlockId(mat.blockId || '');
    setFormVersionLabel(mat.versionLabel || '');
    setFormDisplayOrder(mat.displayOrder || 0);
    setErrorMsg(null);
    setModalOpen(true);
  }

  async function handleToggleActive(mat: MaterialItem) {
    try {
      const res = await fetch(`/api/admin/materials/${mat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !mat.isActive }),
      });
      if (res.ok) {
        setMaterials((prev) =>
          prev.map((m) => (m.id === mat.id ? { ...m, isActive: !m.isActive } : m))
        );
      }
    } catch (err) {
      console.error('Erro ao alternar status do material:', err);
    }
  }

  async function handleDelete(mat: MaterialItem) {
    if (!confirm(`Tem certeza que deseja excluir o material "${mat.title}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/materials/${mat.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMaterials((prev) => prev.filter((m) => m.id !== mat.id));
        setSuccessMsg('Material excluído com sucesso.');
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir material.');
      }
    } catch (err) {
      console.error('Erro ao excluir material:', err);
    }
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim()) {
      setErrorMsg('O título do material é obrigatório.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const isEditing = Boolean(editingMaterial);
      const endpoint = isEditing
        ? `/api/admin/materials/${editingMaterial!.id}`
        : `/api/admin/developments/${developmentId}/materials`;
      const method = isEditing ? 'PATCH' : 'POST';

      let res: Response;

      if (formSourceType === 'FILE' && formFile) {
        const formData = new FormData();
        formData.append('file', formFile);
        formData.append('title', formTitle.trim());
        formData.append('category', formCategory);
        formData.append('description', formDescription.trim());
        formData.append('visibility', formVisibility);
        formData.append('allowDownload', String(formAllowDownload));
        formData.append('allowBrokerShare', String(formAllowBrokerShare));
        formData.append('displayOrder', String(formDisplayOrder));
        if (formTypologyId) formData.append('typologyId', formTypologyId);
        if (formBlockId) formData.append('blockId', formBlockId);
        if (formVersionLabel) formData.append('versionLabel', formVersionLabel.trim());

        res = await fetch(endpoint, {
          method,
          body: formData,
        });
      } else {
        const payload: any = {
          title: formTitle.trim(),
          category: formCategory,
          description: formDescription.trim() || null,
          visibility: formVisibility,
          allowDownload: formAllowDownload,
          allowBrokerShare: formAllowBrokerShare,
          displayOrder: formDisplayOrder,
          typologyId: formTypologyId || null,
          blockId: formBlockId || null,
          versionLabel: formVersionLabel.trim() || null,
        };

        if (formSourceType === 'URL') {
          if (!formExternalUrl.trim()) {
            throw new Error('Informe o endereço (URL) do material.');
          }
          payload.fileUrl = formExternalUrl.trim();
        } else if (!isEditing) {
          throw new Error('Selecione um arquivo para upload ou forneça uma URL externa.');
        }

        res = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar material.');
      }

      setModalOpen(false);
      setSuccessMsg(isEditing ? 'Material atualizado com sucesso!' : 'Material cadastrado com sucesso!');
      setTimeout(() => setSuccessMsg(null), 3000);
      loadMaterials();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Falha ao salvar material.');
    } finally {
      setSaving(false);
    }
  }

  const filteredMaterials =
    selectedCategory === 'ALL'
      ? materials
      : materials.filter((m) => m.category === selectedCategory);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Cabeçalho da Seção com Botões de Ação */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E5E7EB',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#DCFCE7',
                color: '#166534',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                Materiais Comerciais
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: '#6B7280' }}>
                Gestão centralizada de apresentações, tabelas de preços, memoriais descritivos, plantas e kits de vendas
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Botão de Atualização com IA (Seção 10) */}
            <button
              type="button"
              id="btn-atualizar-tabela-ia"
              onClick={() => setShowAiModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '8px',
                backgroundColor: '#EFF6FF',
                color: '#1D4ED8',
                border: '1px solid #BFDBFE',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Sparkles size={16} color="#2563EB" />
              <span>Atualizar Tabela com IA</span>
            </button>

            {/* Botão de Novo Material */}
            <button
              type="button"
              id="btn-novo-material-comercial"
              onClick={() => openCreateModal()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 18px',
                borderRadius: '8px',
                backgroundColor: '#1E4620',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.86rem',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <Plus size={16} />
              <span>Novo Material</span>
            </button>
          </div>
        </div>

        {/* Feedback visual de sucesso */}
        {successMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: '#ECFDF5',
              color: '#065F46',
              fontSize: '0.84rem',
              fontWeight: 600,
              border: '1px solid #A7F3D0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle size={16} color="#059669" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Barra de Filtros por Categoria */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            style={{
              padding: '6px 12px',
              borderRadius: '999px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              backgroundColor: selectedCategory === 'ALL' ? '#111827' : '#F3F4F6',
              color: selectedCategory === 'ALL' ? '#FFFFFF' : '#4B5563',
            }}
          >
            Todos ({materials.length})
          </button>
          {MATERIAL_CATEGORIES.map((cat) => {
            const count = materials.filter((m) => m.category === cat.value).length;
            const isSelected = selectedCategory === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setSelectedCategory(cat.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '999px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: isSelected ? 'none' : '1px solid #E5E7EB',
                  backgroundColor: isSelected ? '#1E4620' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#4B5563',
                }}
              >
                {cat.label} {count > 0 ? `(${count})` : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de Materiais */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 10px' }} />
            <span>Carregando materiais comerciais...</span>
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#6B7280' }}>
            <FolderOpen size={40} style={{ color: '#D1D5DB', margin: '0 auto 12px' }} />
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#374151', margin: '0 0 6px' }}>
              Nenhum material cadastrado nesta categoria
            </h4>
            <p style={{ fontSize: '0.84rem', color: '#9CA3AF', margin: '0 0 16px' }}>
              Cadastre tabelas de preços, apresentações, memoriais descritivos ou plantas de tipologias.
            </p>
            <button
              type="button"
              onClick={() => openCreateModal(selectedCategory !== 'ALL' ? (selectedCategory as MaterialCategoryValue) : undefined)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: '#1E4620',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.82rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Plus size={15} />
              <span>Adicionar Material</span>
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '760px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ padding: '12px 16px', fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
                    Documento / Título
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
                    Categoria
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
                    Vinculação
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
                    Visibilidade
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', textAlign: 'center' }}>
                    Situação
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', textAlign: 'right' }}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredMaterials.map((mat) => {
                  const isPublic = mat.visibility === 'PUBLIC';
                  const isBrokers = mat.visibility === 'BROKERS_ONLY';
                  const isAdminOnly = mat.visibility === 'ADMIN_ONLY';

                  return (
                    <tr
                      key={mat.id}
                      style={{
                        borderBottom: '1px solid #F3F4F6',
                        backgroundColor: mat.isActive ? '#FFFFFF' : '#FAFAFA',
                        opacity: mat.isActive ? 1 : 0.65,
                      }}
                    >
                      {/* Documento e Título */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <div style={{ marginTop: '2px', flexShrink: 0 }}>
                            {getFileIcon(mat.fileExtension, mat.fileType)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.90rem', color: '#111827' }}>
                              {mat.title}
                            </div>
                            {mat.description && (
                              <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: '2px', maxWidth: '340px' }}>
                                {mat.description}
                              </div>
                            )}
                            <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '4px', display: 'flex', gap: '8px' }}>
                              {mat.fileExtension && <span>{mat.fileExtension.toUpperCase()}</span>}
                              {mat.fileSizeBytes && <span>• {formatFileSize(mat.fileSizeBytes)}</span>}
                              {mat.versionLabel && <span>• Versão: {mat.versionLabel}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Categoria */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            backgroundColor: '#F3F4F6',
                            color: '#374151',
                          }}
                        >
                          {getCategoryLabel(mat.category)}
                        </span>
                      </td>

                      {/* Vinculação (Tipologia ou Bloco) */}
                      <td style={{ padding: '14px 16px' }}>
                        {mat.typology ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              backgroundColor: '#EFF6FF',
                              color: '#1D4ED8',
                            }}
                          >
                            <Building size={12} />
                            <span>{mat.typology.name}</span>
                          </span>
                        ) : mat.block ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              backgroundColor: '#F0FDF4',
                              color: '#166534',
                            }}
                          >
                            <Layers size={12} />
                            <span>{mat.block.name}</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.76rem', color: '#9CA3AF' }}>Empreendimento geral</span>
                        )}
                      </td>

                      {/* Visibilidade */}
                      <td style={{ padding: '14px 16px' }}>
                        {isPublic ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '999px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              backgroundColor: '#DCFCE7',
                              color: '#166534',
                            }}
                          >
                            PÚBLICO
                          </span>
                        ) : isBrokers ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '999px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              backgroundColor: '#FEF3C7',
                              color: '#92400E',
                            }}
                          >
                            CORRETORES
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '999px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              backgroundColor: '#FEE2E2',
                              color: '#991B1B',
                            }}
                          >
                            <Shield size={11} />
                            ADMIN
                          </span>
                        )}
                      </td>

                      {/* Situação */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(mat)}
                          title={mat.isActive ? 'Clique para desativar' : 'Clique para ativar'}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px',
                          }}
                        >
                          {mat.isActive ? (
                            <CheckCircle size={18} color="#16A34A" />
                          ) : (
                            <XCircle size={18} color="#9CA3AF" />
                          )}
                        </button>
                      </td>

                      {/* Ações */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {/* Visualizar em Nova Aba */}
                          <a
                            href={`/api/materials/${mat.id}/view`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Visualizar documento em nova aba"
                            style={{
                              padding: '5px',
                              borderRadius: '6px',
                              color: '#4B5563',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            <Eye size={16} />
                          </a>

                          {/* Baixar diretamente sem sair da página */}
                          {mat.allowDownload && (
                            <button
                              type="button"
                              onClick={() => handleDownloadFile(mat)}
                              disabled={downloadingId === mat.id}
                              title={downloadingId === mat.id ? 'Baixando arquivo...' : 'Baixar arquivo'}
                              style={{
                                padding: '5px',
                                borderRadius: '6px',
                                border: 'none',
                                background: 'none',
                                color: '#4B5563',
                                display: 'inline-flex',
                                alignItems: 'center',
                                cursor: downloadingId === mat.id ? 'wait' : 'pointer',
                              }}
                            >
                              {downloadingId === mat.id ? (
                                <Loader2 size={16} className="animate-spin" color="#1E4620" />
                              ) : (
                                <Download size={16} />
                              )}
                            </button>
                          )}

                          {/* Editar */}
                          <button
                            type="button"
                            onClick={() => openEditModal(mat)}
                            title="Editar material"
                            style={{
                              padding: '5px',
                              borderRadius: '6px',
                              border: 'none',
                              background: 'none',
                              color: '#2563EB',
                              cursor: 'pointer',
                            }}
                          >
                            <Edit2 size={16} />
                          </button>

                          {/* Excluir */}
                          <button
                            type="button"
                            onClick={() => handleDelete(mat)}
                            title="Excluir material"
                            style={{
                              padding: '5px',
                              borderRadius: '6px',
                              border: 'none',
                              background: 'none',
                              color: '#DC2626',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE ATUALIZAÇÃO DE TABELA COM IA (Seção 10) */}
      {showAiModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.60)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 9999,
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    backgroundColor: '#EFF6FF',
                    color: '#1D4ED8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sparkles size={20} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                  Atualização de Tabela com IA
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                color: '#166534',
                fontSize: '0.86rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Info size={18} style={{ flexShrink: 0 }} />
              <span>Funcionalidade em desenvolvimento.</span>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#4B5563', lineHeight: 1.6, margin: 0 }}>
              Em breve será possível importar tabelas de preços em PDF ou Excel e utilizar inteligência artificial para identificar alterações de valores e disponibilidade, mediante conferência e aprovação do administrador.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="button"
                id="btn-fechar-modal-ia"
                onClick={() => setShowAiModal(false)}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  backgroundColor: '#1E4620',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CADASTRO / EDIÇÃO DE MATERIAL */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.60)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 9999,
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
          >
            {/* Header Fixo do Modal */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
                backgroundColor: '#FFFFFF',
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
                  <FileText size={18} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                  {editingMaterial ? 'Editar Material Comercial' : 'Novo Material Comercial'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Formulário com Scroll */}
            <form
              onSubmit={handleFormSubmit}
              style={{
                padding: '20px 24px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              {errorMsg && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#FEF2F2',
                    color: '#991B1B',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    border: '1px solid #FECACA',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertTriangle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Título do Material */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Nome / Título do Material <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Tabela de Vendas — Novembro 2026, Book de Apresentação, Planta Tipo A"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
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

              {/* Categoria e Versão */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Categoria do Documento <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as MaterialCategoryValue)}
                    style={{
                      width: '100%',
                      padding: '9px 10px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      fontSize: '0.86rem',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                    }}
                  >
                    {MATERIAL_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Identificador de Versão (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: v1.0, Nov/2026, Revisão 3"
                    value={formVersionLabel}
                    onChange={(e) => setFormVersionLabel(e.target.value)}
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

              {/* Origem do Arquivo: Upload ou Link Externo */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  backgroundColor: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setFormSourceType('FILE')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      border: formSourceType === 'FILE' ? '2px solid #1E4620' : '1px solid #D1D5DB',
                      backgroundColor: formSourceType === 'FILE' ? '#F0FDF4' : '#FFFFFF',
                      color: formSourceType === 'FILE' ? '#1E4620' : '#4B5563',
                      fontWeight: 700,
                      fontSize: '0.80rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Upload size={14} />
                    <span>Upload de Arquivo (PDF, XLSX, Imagem)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormSourceType('URL')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      border: formSourceType === 'URL' ? '2px solid #1E4620' : '1px solid #D1D5DB',
                      backgroundColor: formSourceType === 'URL' ? '#F0FDF4' : '#FFFFFF',
                      color: formSourceType === 'URL' ? '#1E4620' : '#4B5563',
                      fontWeight: 700,
                      fontSize: '0.80rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <LinkIcon size={14} />
                    <span>Endereço Externo (Link)</span>
                  </button>
                </div>

                {formSourceType === 'FILE' ? (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      {editingMaterial ? 'Substituir arquivo existente (opcional)' : 'Selecione o arquivo *'}
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.csv"
                      onChange={(e) => setFormFile(e.target.files?.[0] || null)}
                      style={{
                        width: '100%',
                        fontSize: '0.82rem',
                        color: '#4B5563',
                      }}
                    />
                    <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '4px' }}>
                      Formatos aceitos: PDF, XLSX, XLS, CSV, JPG, PNG e WEBP (máx. 25 MB).
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      URL do Documento Externo *
                    </label>
                    <input
                      type="url"
                      placeholder="https://exemplo.com/material.pdf"
                      value={formExternalUrl}
                      onChange={(e) => setFormExternalUrl(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #D1D5DB',
                        fontSize: '0.84rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Vinculação de Tipologia e Bloco */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Tipologia Vinculada (Opcional)
                  </label>
                  <select
                    value={formTypologyId}
                    onChange={(e) => setFormTypologyId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      fontSize: '0.84rem',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                    }}
                  >
                    <option value="">Nenhuma (Geral do Empreendimento)</option>
                    {typologies.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.propertyType})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Bloco / Quadra Vinculada (Opcional)
                  </label>
                  <select
                    value={formBlockId}
                    onChange={(e) => setFormBlockId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      fontSize: '0.84rem',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                    }}
                  >
                    <option value="">Nenhum (Todas as Torres/Quadras)</option>
                    {blocks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.blockType === 'QUADRA' ? 'Quadra' : 'Bloco'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Descrição Opcional */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Descrição / Informações Adicionais (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Informações úteis sobre o material para os corretores..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.84rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Nível de Visibilidade */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Nível de Visibilidade <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {MATERIAL_VISIBILITIES.map((vis) => {
                    const isSelected = formVisibility === vis.value;
                    return (
                      <button
                        key={vis.value}
                        type="button"
                        onClick={() => setFormVisibility(vis.value)}
                        style={{
                          padding: '10px 8px',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #1E4620' : '1px solid #D1D5DB',
                          backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                          color: isSelected ? '#1E4620' : '#4B5563',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textAlign: 'center',
                        }}
                      >
                        {vis.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Opções de Download e Compartilhamento */}
              <div
                style={{
                  display: 'flex',
                  gap: '20px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formAllowDownload}
                    onChange={(e) => setFormAllowDownload(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>Permitir download</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formAllowBrokerShare}
                    onChange={(e) => setFormAllowBrokerShare(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>Permitir compartilhamento (quando público)</span>
                </label>
              </div>

              {/* Botões do Rodapé */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setModalOpen(false)}
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
                  id="btn-salvar-material-comercial"
                  disabled={saving}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 22px',
                    backgroundColor: '#1E4620',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    border: 'none',
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  <span>{editingMaterial ? 'Atualizar Material' : 'Cadastrar Material'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
