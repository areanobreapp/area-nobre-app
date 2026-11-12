'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert, Loader2 } from 'lucide-react';
import ModerationManager from '@/components/admin/ModerationManager';

export default function ModerationPage() {
  const router = useRouter();
  const [loadingUser, setLoadingUser] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.replace('/login');
          return;
        }
        const data = await res.json();
        if (data.user && data.user.role === 'ADMIN') {
          setIsAdmin(true);
        } else {
          router.replace('/admin');
        }
      } catch (err) {
        router.replace('/login');
      } finally {
        setLoadingUser(false);
      }
    }
    checkAuth();
  }, [router]);

  if (loadingUser) {
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
          Verificando permissões administrativas...
        </span>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
        <ShieldAlert size={48} style={{ color: '#DC2626', margin: '0 auto 16px auto' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>
          Acesso Restrito
        </h2>
        <p style={{ fontSize: '0.88rem', color: '#6B7280', marginBottom: '20px' }}>
          Esta área é restrita a administradores da plataforma Área Nobre.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            backgroundColor: '#1E4620',
            color: '#FFFFFF',
            borderRadius: '8px',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} /> Voltar para a Página Inicial
        </Link>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#F9FAFB', minHeight: '100vh', paddingBottom: '60px' }}>
      {/* Barra Superior com Atalho de Retorno */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E5E7EB',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link
          href="/admin"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.84rem',
            fontWeight: 700,
            color: '#4B5563',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} /> Painel Administrativo
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#166534', fontWeight: 700, backgroundColor: '#DCFCE7', padding: '4px 10px', borderRadius: '999px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#166534' }}></span>
          Ambiente Administrativo Seguro
        </div>
      </div>

      <ModerationManager />
    </div>
  );
}

