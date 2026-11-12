import React from 'react';
import Link from 'next/link';
import { Building2, ArrowLeft } from 'lucide-react';

export default function BuildingNotFound() {
  return (
    <main
      style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
        backgroundColor: '#F8FAFC',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#F1F5F9',
          color: '#64748B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
        }}
      >
        <Building2 size={32} />
      </div>

      <h1 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#1E293B', margin: '0 0 8px 0' }}>
        Edifício Não Encontrado
      </h1>

      <p style={{ fontSize: '0.90rem', color: '#64748B', maxWidth: '440px', margin: '0 0 24px 0', lineHeight: 1.5 }}>
        O condomínio solicitado não foi localizado no cadastro compartilhado do Área Nobre ou pode ter sido desativado.
      </p>

      <Link
        href="/mapa"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 18px',
          backgroundColor: '#1E4620',
          color: '#FFFFFF',
          borderRadius: '8px',
          fontSize: '0.88rem',
          fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        <ArrowLeft size={16} />
        <span>Voltar ao Mapa de Imóveis</span>
      </Link>
    </main>
  );
}

