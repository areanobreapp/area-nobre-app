'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  ShieldCheck,
  Plus,
  Eye,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
  Archive,
  X,
  FileCheck2,
  BookOpen,
} from 'lucide-react';

interface LegalDoc {
  id: string;
  type: string;
  version: string;
  title: string;
  content: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt: string | null;
  effectiveDate: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    acceptances: number;
    authorizations: number;
  };
}

const DOCUMENT_METADATA: Record<
  string,
  { label: string; description: string; iconBg: string; iconColor: string }
> = {
  TERMS_OF_USE: {
    label: 'Termos de Uso e Responsabilidade',
    description:
      'Regras gerais de utilização da plataforma, responsabilidades e obrigações operacionais dos corretores.',
    iconBg: '#DCFCE7',
    iconColor: '#166534',
  },
  PRIVACY_POLICY: {
    label: 'Política de Privacidade',
    description:
      'Diretrizes de proteção de dados, privacidade e conformidade com a LGPD para todos os usuários cadastrados.',
    iconBg: '#EFF6FF',
    iconColor: '#1D4ED8',
  },
  PROPERTY_AUTHORIZATION: {
    label: 'Declaração de Autorização de Imóvel',
    description:
      'Termo individual firmado pelo corretor declarando possuir autorização expressa do proprietário para anúncio.',
    iconBg: '#FEF3C7',
    iconColor: '#B45309',
  },
};

export default function LegalDocumentsManager() {
  const [documents, setDocuments] = useState<LegalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal de Leitura Integral
  const [viewingDoc, setViewingDoc] = useState<LegalDoc | null>(null);

  // Modal de Criação de Rascunho
  const [creatingForType, setCreatingForType] = useState<string | null>(null);
  const [newVersion, setNewVersion] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/legal');
      if (!res.ok) throw new Error('Falha ao consultar documentos jurídicos.');
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erro ao carregar documentos.' });
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreateModal(type: string) {
    const meta = DOCUMENT_METADATA[type];
    setCreatingForType(type);
    setNewVersion('');
    setNewTitle(meta?.label || '');
    setNewContent('');
    setDraftError(null);
  }

  async function handleSaveNewDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!creatingForType) return;

    if (!newVersion.trim() || !newTitle.trim() || !newContent.trim()) {
      setDraftError('Todos os campos são obrigatórios (versão, título e conteúdo).');
      return;
    }

    setSavingDraft(true);
    setDraftError(null);

    try {
      const res = await fetch('/api/admin/legal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: creatingForType,
          version: newVersion.trim(),
          title: newTitle.trim(),
          content: newContent.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar rascunho.');
      }

      setFeedback({
        type: 'success',
        text: `Rascunho da versão ${newVersion} cadastrado com sucesso!`,
      });
      setCreatingForType(null);
      await loadDocuments();
    } catch (err: any) {
      setDraftError(err.message || 'Falha ao salvar rascunho.');
    } finally {
      setSavingDraft(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <Loader2 className="animate-spin" size={28} color="#1E4620" />
      </div>
    );
  }

  const documentTypes = ['TERMS_OF_USE', 'PRIVACY_POLICY', 'PROPERTY_AUTHORIZATION'];

  return (
    <div>
      {/* Banner de Governança */}
      <div
        style={{
          backgroundColor: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        <ShieldCheck size={20} color="#166534" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#166534', marginBottom: '2px' }}>
            Controle de Governança Jurídica (Etapa 1.5)
          </div>
          <p style={{ fontSize: '0.82rem', color: '#15803D', margin: 0, lineHeight: 1.45 }}>
            Os três documentos jurídicos da Área Nobre estão cadastrados como <strong>RASCUNHOS (DRAFT)</strong> no
            ambiente de homologação. A publicação oficial de novos documentos permanece protegida até autorização expressa do responsável pelo produto.
          </p>
        </div>
      </div>

      {feedback && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 16px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: feedback.type === 'success' ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${feedback.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
            color: feedback.type === 'success' ? '#166534' : '#991B1B',
            fontSize: '0.86rem',
            fontWeight: 600,
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Grid com os 3 Documentos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {documentTypes.map((type) => {
          const meta = DOCUMENT_METADATA[type];
          const docsOfType = documents.filter((d) => d.type === type);
          const published = docsOfType.find((d) => d.status === 'PUBLISHED');
          const drafts = docsOfType.filter((d) => d.status === 'DRAFT');
          const archived = docsOfType.filter((d) => d.status === 'ARCHIVED');

          return (
            <div
              key={type}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E5E7EB',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              {/* Header do Card */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '16px',
                  marginBottom: '18px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', maxWidth: '720px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      backgroundColor: meta.iconBg,
                      color: meta.iconColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                      {meta.label}
                    </h3>
                    <p style={{ fontSize: '0.84rem', color: '#6B7280', margin: '4px 0 0 0', lineHeight: 1.45 }}>
                      {meta.description}
                    </p>
                  </div>
                </div>

                {/* Botão Novo Rascunho */}
                <button
                  type="button"
                  onClick={() => handleOpenCreateModal(type)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#1E4620',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Plus size={16} />
                  <span>Novo Rascunho (DRAFT)</span>
                </button>
              </div>

              {/* Status de Publicação Vigente */}
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: published ? '#F0FDF4' : '#F9FAFB',
                  border: `1px solid ${published ? '#BBF7D0' : '#E5E7EB'}`,
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: published ? '#16A34A' : '#9CA3AF',
                    }}
                  ></span>
                  <span style={{ fontSize: '0.86rem', color: published ? '#166534' : '#4B5563', fontWeight: 600 }}>
                    {published ? (
                      <>
                        Versão Vigente Publicada: <strong>v{published.version}</strong> ({published.title}) — Vigência desde{' '}
                        {new Date(published.publishedAt || published.createdAt).toLocaleDateString('pt-BR')}
                      </>
                    ) : (
                      <>Nenhuma versão oficial publicada (fase preliminar de desenvolvimento)</>
                    )}
                  </span>
                </div>

                {published && (
                  <button
                    type="button"
                    onClick={() => setViewingDoc(published)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #BBF7D0',
                      backgroundColor: '#FFFFFF',
                      color: '#166534',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <Eye size={14} />
                    <span>Ver Texto Oficial</span>
                  </button>
                )}
              </div>

              {/* Tabela de Versões Existentes */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', fontWeight: 700 }}>Versão</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700 }}>Status</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700 }}>Criado em</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700 }}>Publicação / Vigência</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700 }}>Vínculos Registrados</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docsOfType.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '16px 12px', color: '#9CA3AF', textAlign: 'center' }}>
                          Nenhuma versão registrada para este documento.
                        </td>
                      </tr>
                    ) : (
                      docsOfType.map((doc) => {
                        const isPublished = doc.status === 'PUBLISHED';
                        const isDraft = doc.status === 'DRAFT';
                        const totalRecords =
                          (doc._count?.acceptances || 0) + (doc._count?.authorizations || 0);

                        return (
                          <tr key={doc.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#111827' }}>
                              v{doc.version}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  backgroundColor: isPublished
                                    ? '#DCFCE7'
                                    : isDraft
                                    ? '#FEF3C7'
                                    : '#F3F4F6',
                                  color: isPublished
                                    ? '#166534'
                                    : isDraft
                                    ? '#B45309'
                                    : '#4B5563',
                                }}
                              >
                                {isPublished ? 'PUBLICADO' : isDraft ? 'RASCUNHO (DRAFT)' : 'ARQUIVADO'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', color: '#4B5563' }}>
                              {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                            </td>
                            <td style={{ padding: '10px 12px', color: '#4B5563' }}>
                              {doc.publishedAt
                                ? new Date(doc.publishedAt).toLocaleDateString('pt-BR')
                                : '—'}
                            </td>
                            <td style={{ padding: '10px 12px', color: '#4B5563' }}>
                              {type === 'PROPERTY_AUTHORIZATION'
                                ? `${doc._count?.authorizations || 0} autorizações`
                                : `${doc._count?.acceptances || 0} aceites/ciências`}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                  type="button"
                                  onClick={() => setViewingDoc(doc)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid #D1D5DB',
                                    backgroundColor: '#FFFFFF',
                                    color: '#374151',
                                    fontSize: '0.76rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Eye size={13} />
                                  <span>Visualizar</span>
                                </button>

                                {isDraft && (
                                  <div
                                    title="Publicação oficial bloqueada nesta etapa conforme diretrizes de governança (autorização expressa pendente)"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '5px 10px',
                                      borderRadius: '6px',
                                      backgroundColor: '#F3F4F6',
                                      color: '#9CA3AF',
                                      fontSize: '0.76rem',
                                      fontWeight: 600,
                                      cursor: 'not-allowed',
                                    }}
                                  >
                                    <Lock size={12} />
                                    <span>Publicação Protegida</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal 1: Visualização Integral de Documento */}
      {viewingDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setViewingDoc(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '820px',
              maxHeight: '90vh',
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '28px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                paddingBottom: '16px',
                borderBottom: '1px solid #E5E7EB',
                marginBottom: '18px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      backgroundColor: viewingDoc.status === 'PUBLISHED' ? '#DCFCE7' : '#FEF3C7',
                      color: viewingDoc.status === 'PUBLISHED' ? '#166534' : '#B45309',
                    }}
                  >
                    {viewingDoc.status === 'PUBLISHED' ? 'OFICIAL PUBLICADO' : 'RASCUNHO (DRAFT)'}
                  </span>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#6B7280' }}>
                    Versão {viewingDoc.version}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                  {viewingDoc.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingDoc(null)}
                style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Conteúdo com Rolagem */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                backgroundColor: '#F9FAFB',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #E5E7EB',
                fontSize: '0.86rem',
                lineHeight: 1.6,
                color: '#374151',
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit',
              }}
            >
              {viewingDoc.content}
            </div>

            {/* Rodapé */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '16px',
                marginTop: '16px',
                borderTop: '1px solid #E5E7EB',
                fontSize: '0.80rem',
                color: '#6B7280',
              }}
            >
              <div>
                Cadastrado em {new Date(viewingDoc.createdAt).toLocaleString('pt-BR')} | ID: <code>{viewingDoc.id}</code>
              </div>
              <button
                type="button"
                onClick={() => setViewingDoc(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  backgroundColor: '#1E4620',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Cadastro de Novo Rascunho */}
      {creatingForType && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => !savingDraft && setCreatingForType(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '740px',
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '28px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '14px',
                borderBottom: '1px solid #E5E7EB',
                marginBottom: '18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Plus size={22} color="#1E4620" />
                <h3 style={{ fontSize: '1.20rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                  Criar Novo Rascunho (DRAFT)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCreatingForType(null)}
                style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {draftError && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  color: '#991B1B',
                  fontSize: '0.84rem',
                  marginBottom: '16px',
                }}
              >
                {draftError}
              </div>
            )}

            <form onSubmit={handleSaveNewDraft}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Identificação de Versão *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 1.1, 2.0"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      fontSize: '0.88rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Título do Documento *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      fontSize: '0.88rem',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Texto Integral do Documento *
                </label>
                <textarea
                  required
                  rows={10}
                  placeholder="Cole aqui o texto jurídico completo revisado..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.84rem',
                    lineHeight: 1.5,
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  disabled={savingDraft}
                  onClick={() => setCreatingForType(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#4B5563',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingDraft}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    backgroundColor: '#1E4620',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: savingDraft ? 'not-allowed' : 'pointer',
                  }}
                >
                  {savingDraft && <Loader2 size={14} className="animate-spin" />}
                  <span>{savingDraft ? 'Salvando...' : 'Salvar Rascunho'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
