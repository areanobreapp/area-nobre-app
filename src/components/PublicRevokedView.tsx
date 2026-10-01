'use client';

import React from 'react';
import { Building2, MessageCircle, AlertCircle } from 'lucide-react';
import { BROKER_CONFIG, getContactBrokerWhatsAppUrl } from '@/lib/public-sharing';

interface PublicRevokedViewProps {
  publicUrl?: string;
}

export default function PublicRevokedView({ publicUrl = '' }: PublicRevokedViewProps) {
  const contactWhatsAppUrl =
    getContactBrokerWhatsAppUrl('Consulta sobre opções similares', publicUrl);

  return (
    <div
      style={{
        backgroundColor: '#F8FAF9',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header Institucional */}
      <header
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid rgba(0, 0, 0, 0.07)',
          padding: '16px 20px',
        }}
      >
        <div
          style={{
            maxWidth: '680px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: '#1E4620',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.05rem',
            }}
          >
            DC
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#111827' }}>
              {BROKER_CONFIG.brandName}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700 }}>
              {BROKER_CONFIG.creci}
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Central */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
        }}
      >
        <div
          style={{
            maxWidth: '520px',
            width: '100%',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '36px 28px',
            textAlign: 'center',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: '0 8px 30px -4px rgba(0, 0, 0, 0.06)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#FEF3C7',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
            }}
          >
            <AlertCircle size={28} />
          </div>

          <h1
            style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: '#111827',
              marginBottom: '12px',
              lineHeight: 1.3,
            }}
          >
            Este imóvel não está mais disponível para visualização.
          </h1>

          <p
            style={{
              fontSize: '0.92rem',
              color: '#4B5563',
              lineHeight: 1.6,
              marginBottom: '28px',
            }}
          >
            O link de apresentação deste anúncio foi encerrado ou expirou. Caso você tenha interesse em imóveis semelhantes ou deseje uma consultoria personalizada em Criciúma e região, entre em contato diretamente com Daiane Corrêa.
          </p>

          <a
            href={contactWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '10px',
              backgroundColor: '#25D366',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.92rem',
              textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(37, 211, 102, 0.3)',
            }}
          >
            <MessageCircle size={18} />
            <span>Falar com Daiane Corrêa</span>
          </a>
        </div>
      </main>

      {/* Rodapé sutil */}
      <footer
        style={{
          padding: '20px',
          textAlign: 'center',
          fontSize: '0.74rem',
          color: '#9CA3AF',
        }}
      >
        Tecnologia Área Nobre
      </footer>
    </div>
  );
}
