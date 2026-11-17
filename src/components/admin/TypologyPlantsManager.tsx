'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  Star,
  Eye,
  Download,
  Trash2,
  Loader2,
  CheckCircle,
  Image as ImageIcon,
  Layers,
  X,
} from 'lucide-react';

interface TypologyPlant {
  id: string;
  title: string;
  fileUrl: string;
  fileType: string | null;
  fileExtension: string | null;
  fileSizeBytes: number | null;
  displayOrder: number;
  visibility: string;
  allowDownload: boolean;
  allowBrokerShare: boolean;
  createdAt: string;
}

interface TypologyPlantsManagerProps {
  developmentId: string;
  typologyId?: string;
  typologyName: string;
  onPlantsChanged?: () => void;
  onSaveTypologyAndEnablePlants?: () => Promise<void> | void;
  isSavingTypology?: boolean;
}

export default function TypologyPlantsManager({
  developmentId,
  typologyId,
  typologyName,
  onPlantsChanged,
  onSaveTypologyAndEnablePlants,
  isSavingTypology,
}: TypologyPlantsManagerProps) {
  const [plants, setPlants] = useState<TypologyPlant[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Formulário de upload
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function loadPlants() {
    if (!typologyId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/typologies/${typologyId}/plants`);
      if (res.ok) {
        const data = await res.json();
        setPlants(data.plants || []);
      }
    } catch (err) {
      console.error('Erro ao carregar plantas da tipologia:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (typologyId) {
      loadPlants();
    }
  }, [typologyId]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!typologyId) return;
    if (!file) {
      setErrorMsg('Selecione um arquivo de planta (PDF, JPG, PNG ou WEBP).');
      return;
    }

    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim() || `Planta — ${typologyName}`);
      formData.append('isPrimary', String(isPrimary || plants.length === 0));
      formData.append('visibility', 'PUBLIC');

      const res = await fetch(`/api/admin/typologies/${typologyId}/plants`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao enviar planta.');
      }

      setFile(null);
      setTitle('');
      setIsPrimary(false);
      setSuccessMsg('Planta vinculada com sucesso!');
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadPlants();
      onPlantsChanged?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro no envio da planta.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSetPrimary(plantId: string) {
    if (!typologyId) return;
    try {
      const res = await fetch(`/api/admin/typologies/${typologyId}/plants`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialId: plantId, isPrimary: true }),
      });
      if (res.ok) {
        await loadPlants();
        onPlantsChanged?.();
      }
    } catch (err) {
      console.error('Erro ao definir planta principal:', err);
    }
  }

  async function handleRemove(plantId: string) {
    if (!typologyId) return;
    if (!confirm('Deseja realmente desvincular esta planta da tipologia?')) return;
    try {
      const res = await fetch(
        `/api/admin/typologies/${typologyId}/plants?materialId=${plantId}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        await loadPlants();
        onPlantsChanged?.();
      }
    } catch (err) {
      console.error('Erro ao remover planta:', err);
    }
  }

  async function handleDownloadFile(plant: TypologyPlant) {
    if (downloadingId) return;
    try {
      setDownloadingId(plant.id);
      const res = await fetch(`/api/materials/${plant.id}/download`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Não foi possível baixar o material.');
        return;
      }
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;

      const disposition = res.headers.get('content-disposition');
      let filename = '';
      if (disposition && disposition.includes('filename')) {
        const match = disposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?;?/i);
        if (match && match[1]) {
          filename = decodeURIComponent(match[1]);
        }
      }
      if (!filename) {
        const ext = plant.fileExtension ? `.${plant.fileExtension.replace(/^\./, '')}` : '';
        filename = `${plant.title}${ext}`;
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(link);
    } catch (err) {
      console.error('Erro ao baixar planta:', err);
      alert('Erro ao iniciar download.');
    } finally {
      setDownloadingId(null);
    }
  }

  if (!typologyId) {
    const canSaveDirectly = Boolean(developmentId && onSaveTypologyAndEnablePlants);

    return (
      <div
        style={{
          marginTop: '14px',
          padding: '16px',
          backgroundColor: '#F8FAFC',
          borderRadius: '10px',
          border: '1px dashed #CBD5E1',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={18} color="#1E4620" />
          <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1E293B' }}>
            Plantas da Tipologia — {typologyName}
          </span>
        </div>

        <p style={{ margin: 0, fontSize: '0.80rem', color: '#64748B', lineHeight: '1.4' }}>
          {canSaveDirectly
            ? 'Para anexar plantas (PDF, imagens) a esta tipologia, salve o registro da tipologia no empreendimento. O upload e visualização das plantas serão liberados imediatamente nesta mesma tela.'
            : 'Para vincular plantas a esta nova tipologia, salve os dados básicos do formulário principal do empreendimento primeiro.'}
        </p>

        {canSaveDirectly && (
          <div>
            <button
              type="button"
              id={`btn-salvar-tipologia-plantas-${typologyName.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={onSaveTypologyAndEnablePlants}
              disabled={isSavingTypology}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                backgroundColor: isSavingTypology ? '#9CA3AF' : '#1E4620',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: 600,
                border: 'none',
                cursor: isSavingTypology ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              {isSavingTypology ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Salvando tipologia...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  <span>Salvar tipologia e adicionar plantas</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  const isImageFormat = (ext?: string | null, mime?: string | null) => {
    if (mime?.startsWith('image/')) return true;
    const cleanExt = (ext || '').toLowerCase().replace('.', '');
    return ['jpg', 'jpeg', 'png', 'webp'].includes(cleanExt);
  };

  return (
    <div
      style={{
        marginTop: '14px',
        padding: '14px',
        backgroundColor: '#F8FAFC',
        borderRadius: '10px',
        border: '1px solid #E2E8F0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={16} color="#1E4620" />
          <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1E293B' }}>
            Plantas da Tipologia ({plants.length})
          </span>
        </div>
        <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
          Formatos: PDF, JPG, PNG, WEBP (até 25MB)
        </span>
      </div>

      {/* Lista de Plantas Já Cadastradas */}
      {loading ? (
        <div style={{ padding: '12px', textAlign: 'center', color: '#64748B', fontSize: '0.80rem' }}>
          <Loader2 size={16} className="animate-spin" style={{ margin: '0 auto 6px' }} />
          <span>Carregando plantas vinculadas...</span>
        </div>
      ) : plants.length === 0 ? (
        <div
          style={{
            padding: '12px',
            textAlign: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: '6px',
            border: '1px dashed #CBD5E1',
            color: '#64748B',
            fontSize: '0.80rem',
            marginBottom: '12px',
          }}
        >
          Nenhuma planta vinculada a esta tipologia. Envie o primeiro arquivo abaixo.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
          {plants.map((p, idx) => {
            const isPrimaryPlant = p.displayOrder === 0 || idx === 0;
            const isImg = isImageFormat(p.fileExtension, p.fileType);

            return (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  border: isPrimaryPlant ? '1.5px solid #1E4620' : '1px solid #E2E8F0',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                  {/* Miniatura ou Ícone */}
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '6px',
                      backgroundColor: '#F1F5F9',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    {isImg ? (
                      <img
                        src={p.fileUrl}
                        alt={p.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <FileText size={20} color="#DC2626" />
                    )}
                  </div>

                  {/* Informações da Planta */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1E293B', wordBreak: 'break-word' }}>
                        {p.title}
                      </span>
                      {isPrimaryPlant && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#DCFCE7',
                            color: '#166534',
                          }}
                        >
                          <Star size={10} fill="#166534" />
                          <span>Principal</span>
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                      {p.fileExtension?.toUpperCase()} • {p.fileSizeBytes ? `${Math.round(p.fileSizeBytes / 1024)} KB` : ''}
                    </div>
                  </div>
                </div>

                {/* Ações da Linha */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  {!isPrimaryPlant && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(p.id)}
                      title="Definir como planta principal"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '4px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        color: '#1D4ED8',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      <Star size={12} />
                      <span>Tornar Principal</span>
                    </button>
                  )}

                  <a
                    href={`/api/materials/${p.id}/view`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Visualizar documento em nova aba"
                    style={{
                      padding: '5px',
                      color: '#475569',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    <Eye size={15} />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleDownloadFile(p)}
                    disabled={downloadingId === p.id}
                    title={downloadingId === p.id ? 'Baixando...' : 'Baixar arquivo'}
                    style={{
                      padding: '5px',
                      border: 'none',
                      background: 'none',
                      color: '#475569',
                      cursor: downloadingId === p.id ? 'wait' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    {downloadingId === p.id ? (
                      <Loader2 size={15} className="animate-spin" color="#1E4620" />
                    ) : (
                      <Download size={15} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemove(p.id)}
                    title="Desvincular planta"
                    style={{
                      padding: '5px',
                      border: 'none',
                      background: 'none',
                      color: '#EF4444',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Formulário de Envio / Vinculação de Nova Planta */}
      <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>
              Arquivo da Planta (PDF ou Imagem)
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setFile(f);
                if (f && !title) {
                  setTitle(`Planta ${typologyName} — ${f.name.replace(/\.[^/.]+$/, '')}`);
                }
              }}
              style={{
                width: '100%',
                fontSize: '0.78rem',
                padding: '4px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>
              Identificação / Título da Planta
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Ex: Planta 2 Dorms — ${typologyName}`}
              style={{
                width: '100%',
                fontSize: '0.78rem',
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#475569', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
            />
            <span>Definir como planta principal da tipologia</span>
          </label>

          <button
            type="submit"
            disabled={uploading || !file}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              backgroundColor: '#1E4620',
              color: '#FFFFFF',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: uploading || !file ? 'not-allowed' : 'pointer',
              opacity: uploading || !file ? 0.6 : 1,
            }}
          >
            {uploading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Upload size={13} />
                <span>Enviar Planta</span>
              </>
            )}
          </button>
        </div>

        {errorMsg && (
          <div style={{ fontSize: '0.76rem', color: '#DC2626', backgroundColor: '#FEE2E2', padding: '6px 10px', borderRadius: '6px' }}>
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{ fontSize: '0.76rem', color: '#166534', backgroundColor: '#DCFCE7', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle size={13} />
            <span>{successMsg}</span>
          </div>
        )}
      </form>
    </div>
  );
}
