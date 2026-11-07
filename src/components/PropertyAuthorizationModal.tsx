'use client';

import React, { useEffect, useState } from 'react';
import { X, FileText, ShieldCheck } from 'lucide-react';

interface PropertyAuthorizationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PropertyAuthorizationModal({
  isOpen,
  onClose,
}: PropertyAuthorizationModalProps) {
  const [doc, setDoc] = useState<{
    title: string;
    version: string;
    content: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setLoading(true);

    fetch('/api/legal/declaration')
      .then((res) => res.json())
      .then((data) => {
        if (mounted && data && !data.error) {
          setDoc(data);
        }
      })
      .catch((err) => console.error('Erro ao carregar declaração:', err))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          maxWidth: '720px',
          width: '100%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F9FAFB',
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
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                {doc?.title || 'Declaração de Autorização para Divulgação'}
              </h2>
              <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                Versão {doc?.version || '1.0'} | Documento para revisão
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6B7280',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo com scroll */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            fontSize: '0.90rem',
            lineHeight: 1.65,
            color: '#374151',
          }}
        >
          {loading ? (
            <p style={{ textAlign: 'center', color: '#6B7280', padding: '32px 0' }}>
              Carregando o texto da declaração...
            </p>
          ) : doc?.content ? (
            <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
              {doc.content}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: '#6B7280', padding: '32px 0' }}>
              Não foi possível carregar a declaração no momento.
            </p>
          )}
        </div>

        {/* Rodapé */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: '#F9FAFB',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn-primary"
            style={{ padding: '8px 20px', fontSize: '0.88rem' }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
