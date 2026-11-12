'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, Loader2 } from 'lucide-react';
import CompanyForm from '@/components/admin/CompanyForm';
import AdminNavTabs from '@/components/admin/AdminNavTabs';

export default function NewCompanyPage() {
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
      <div style={{ padding: '60px 20px', textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
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
          Voltar ao Início
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 20px 60px 20px' }}>
      <div style={{ marginBottom: '16px' }}>
        <AdminNavTabs currentTab="companies" />
      </div>

      <CompanyForm mode="create" />
    </div>
  );
}

