'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  FolderOpen,
  Download,
  Eye,
  Share2,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Copy,
  Check,
  Building,
  Lock,
  Layers,
  Loader2,
} from 'lucide-react';
import {
  MATERIAL_CATEGORIES,
} from '@/lib/commercial-material-service';

interface BrokerMaterial {
  id: string;
  developmentId: string;
  title: string;
  category: string;
  description: string | null;
  fileUrl: string;
  fileType: string | null;
  fileExtension: string | null;
  fileSizeBytes: number | null;
  versionLabel: string | null;
  visibility: 'PUBLIC' | 'BROKERS_ONLY';
  allowDownload: boolean;
  allowBrokerShare: boolean;
  displayOrder: number;
  typologyId: string | null;
  typology?: { id: string; name: string; propertyType: string } | null;
  blockId: string | null;
  block?: { id: string; name: string; blockType: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface CommercialMaterialsBrokerViewProps {
  developmentId: string;
  developmentName: string;
}

function getCategoryLabel(val: string): string {
  const found = MATERIAL_CATEGORIES.find((c) => c.value === val);
  return found ? found.label : val;
}

function getFileIcon(extension: string | null, mime: string | null) {
  const ext = (extension || '').toLowerCase();
  const m = (mime || '').toLowerCase();

  if (ext === 'pdf' || m.includes('pdf')) {
    return <FileText size={22} color="#DC2626" />;
  }
  if (['xlsx', 'xls', 'csv'].includes(ext) || m.includes('spreadsheet') || m.includes('excel') || m.includes('csv')) {
    return <FileSpreadsheet size={22} color="#16A34A" />;
  }
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext) || m.includes('image')) {
    return <ImageIcon size={22} color="#2563EB" />;
  }
  return <FolderOpen size={22} color="#D97706" />;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR');
  } catch {
    return '';
  }
}

export function CommercialMaterialsBrokerView({
  developmentId,
  developmentName,
}: CommercialMaterialsBrokerViewProps) {
  const [materials, setMaterials] = useState<BrokerMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  // Por padrão, todas as categorias iniciam recolhidas
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function handleDownloadFile(mat: BrokerMaterial) {
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

  useEffect(() => {
    async function fetchMaterials() {
      setLoading(true);
      try {
        const res = await fetch(`/api/developments/${developmentId}/materials`);
        if (res.ok) {
          const data = await res.json();
          setMaterials(data.materials || []);
        }
      } catch (err) {
        console.error('Erro ao consultar materiais:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMaterials();
  }, [developmentId]);

  // Agrupa materiais pelas categorias cadastradas
  const groupedCategories = MATERIAL_CATEGORIES.map((cat) => {
    const items = materials.filter((m) => m.category === cat.value);
    return {
      categoryKey: cat.value,
      categoryLabel: cat.label,
      items,
    };
  }).filter((group) => group.items.length > 0);

  function toggleCategory(catKey: string) {
    setExpandedCategories((prev) => ({ ...prev, [catKey]: !prev[catKey] }));
  }

  function handleExpandAll() {
    const all: Record<string, boolean> = {};
    groupedCategories.forEach((g) => {
      all[g.categoryKey] = true;
    });
    setExpandedCategories(all);
  }

  function handleCollapseAll() {
    setExpandedCategories({});
  }

  function getPublicShareUrl(matId: string): string {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api/public/materials/${matId}/download`;
    }
    return `/api/public/materials/${matId}/download`;
  }

  function handleCopyShareLink(mat: BrokerMaterial) {
    const link = getPublicShareUrl(mat.id);
    navigator.clipboard.writeText(link);
    setCopiedId(mat.id);
    setTimeout(() => setCopiedId(null), 2500);
  }

  function handleShareWhatsApp(mat: BrokerMaterial) {
    const link = getPublicShareUrl(mat.id);
    const text = `Olá! Segue o material comercial do empreendimento *${developmentName}*:\n\n📄 *${mat.title}*\n${link}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  }

  if (loading) {
    return (
      <div className="card" style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>
        <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 10px' }} />
        <span>Carregando materiais do empreendimento...</span>
      </div>
    );
  }

  if (materials.length === 0) {
    return null; // Não exibe seção vazia se não houver materiais cadastrados
  }

  return (
    <div
      className="card"
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        backgroundColor: '#FFFFFF',
      }}
    >
      {/* Cabeçalho da Seção */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-light)',
          paddingBottom: '14px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: '#DCFCE7',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Materiais do Empreendimento
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              Apresentações, tabelas de preços, plantas e documentos disponibilizados pela construtora
            </p>
          </div>
        </div>

        {groupedCategories.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleExpandAll}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                color: '#4B5563',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Expandir todas
            </button>
            <button
              type="button"
              onClick={handleCollapseAll}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                color: '#4B5563',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Recolher todas
            </button>
          </div>
        )}
      </div>

      {/* Lista de Categorias Agrupadas (Acordeão) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {groupedCategories.map((group) => {
          const isExpanded = Boolean(expandedCategories[group.categoryKey]);
          const totalCount = group.items.length;

          return (
            <div
              key={group.categoryKey}
              style={{
                borderRadius: '10px',
                border: isExpanded ? '1px solid #1E4620' : '1px solid #E5E7EB',
                backgroundColor: '#FFFFFF',
                overflow: 'hidden',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Barra da Categoria (Cabeçalho Clicável) */}
              <div
                onClick={() => toggleCategory(group.categoryKey)}
                style={{
                  padding: '12px 18px',
                  backgroundColor: isExpanded ? '#F0FDF4' : '#F9FAFB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  userSelect: 'none',
                  borderBottom: isExpanded ? '1px solid #E5E7EB' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.94rem', fontWeight: 800, color: '#111827' }}>
                    {group.categoryLabel}
                  </span>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      backgroundColor: isExpanded ? '#DCFCE7' : '#E5E7EB',
                      color: isExpanded ? '#166534' : '#4B5563',
                      padding: '2px 8px',
                      borderRadius: '999px',
                    }}
                  >
                    {totalCount} {totalCount === 1 ? 'material' : 'materiais'}
                  </span>
                </div>

                <div style={{ color: '#6B7280' }}>
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>

              {/* Itens da Categoria */}
              {isExpanded && (
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {group.items.map((mat) => {
                    const isPublic = mat.visibility === 'PUBLIC';
                    const canShare = isPublic && mat.allowBrokerShare;
                    const canDownload = mat.allowDownload;

                    return (
                      <div
                        key={mat.id}
                        style={{
                          padding: '14px 16px',
                          borderRadius: '8px',
                          border: '1px solid #E5E7EB',
                          backgroundColor: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}
                      >
                        {/* Identificação do Material */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: '240px' }}>
                          <div style={{ marginTop: '2px', flexShrink: 0 }}>
                            {getFileIcon(mat.fileExtension, mat.fileType)}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <h4 style={{ fontSize: '0.94rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                                {mat.title}
                              </h4>
                              {mat.typology && (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    fontSize: '0.70rem',
                                    fontWeight: 700,
                                    backgroundColor: '#EFF6FF',
                                    color: '#1D4ED8',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  <Building size={11} />
                                  <span>Planta: {mat.typology.name}</span>
                                </span>
                              )}
                              {mat.versionLabel && (
                                <span
                                  style={{
                                    fontSize: '0.70rem',
                                    color: '#6B7280',
                                    backgroundColor: '#F3F4F6',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  {mat.versionLabel}
                                </span>
                              )}
                            </div>

                            {mat.description && (
                              <p style={{ fontSize: '0.80rem', color: '#4B5563', margin: '4px 0 0', lineHeight: 1.4 }}>
                                {mat.description}
                              </p>
                            )}

                            <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span>Atualizado em: {formatDate(mat.updatedAt)}</span>
                              {mat.fileSizeBytes && <span>• {formatFileSize(mat.fileSizeBytes)}</span>}
                              {!isPublic && (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    color: '#B45309',
                                    fontWeight: 600,
                                  }}
                                >
                                  <Lock size={10} />
                                  <span>Uso interno de corretores</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Ações: Visualizar, Baixar e Compartilhar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          {/* Visualizar em Nova Aba */}
                          <a
                            href={`/api/materials/${mat.id}/view`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Visualizar documento em nova aba"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              backgroundColor: '#F3F4F6',
                              color: '#374151',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              textDecoration: 'none',
                            }}
                          >
                            <Eye size={14} />
                            <span>Visualizar</span>
                          </a>

                          {/* Baixar diretamente sem sair da página */}
                          {canDownload && (
                            <button
                              type="button"
                              onClick={() => handleDownloadFile(mat)}
                              disabled={downloadingId === mat.id}
                              title={downloadingId === mat.id ? 'Baixando...' : 'Baixar arquivo'}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                backgroundColor: '#F3F4F6',
                                border: '1px solid #E5E7EB',
                                color: '#374151',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: downloadingId === mat.id ? 'wait' : 'pointer',
                              }}
                            >
                              {downloadingId === mat.id ? (
                                <Loader2 size={14} className="animate-spin" color="#1E4620" />
                              ) : (
                                <Download size={14} />
                              )}
                              <span>{downloadingId === mat.id ? 'Baixando...' : 'Baixar'}</span>
                            </button>
                          )}

                          {/* Compartilhar WhatsApp (Exclusivo para Público) */}
                          {canShare && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleShareWhatsApp(mat)}
                                title="Compartilhar material pelo WhatsApp"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  backgroundColor: '#DCFCE7',
                                  color: '#166534',
                                  border: '1px solid #BBF7D0',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                <MessageCircle size={14} color="#166534" />
                                <span>WhatsApp</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCopyShareLink(mat)}
                                title="Copiar link público para clientes"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  backgroundColor: copiedId === mat.id ? '#1E4620' : '#FFFFFF',
                                  color: copiedId === mat.id ? '#FFFFFF' : '#4B5563',
                                  border: '1px solid #D1D5DB',
                                  fontSize: '0.76rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                {copiedId === mat.id ? <Check size={13} /> : <Copy size={13} />}
                                <span>{copiedId === mat.id ? 'Copiado!' : 'Copiar link'}</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
