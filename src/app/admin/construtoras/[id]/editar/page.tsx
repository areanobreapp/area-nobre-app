'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import CompanyForm from '@/components/admin/CompanyForm';
import AdminNavTabs from '@/components/admin/AdminNavTabs';

interface EditCompanyPageProps {
  params: Promise<{ id: string }>;
}

export default function EditCompanyPage({ params }: EditCompanyPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [loadingUser, setLoadingUser] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loadingCompany, setLoadingCompany] = useState(true);
  const [company, setCompany] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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

        // Carrega dados da construtora
        const resCompany = await fetch(`/api/admin/companies/${id}`);
        if (!resCompany.ok) {
          const errData = await resCompany.json();
          throw new Error(errData.error || 'Construtora não encontrada.');
        }
        const companyData = await resCompany.json();
        setCompany(companyData.company);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Falha ao carregar construtora.');
      } finally {
        setLoadingUser(false);
        setLoadingCompany(false);
      }
    }
    checkAuthAndLoad();
  }, [id, router]);

  if (loadingUser || loadingCompany) {
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
          Carregando dados da construtora...
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

  if (error || !company) {
    return (
      <div style={{ maxWidth: '600px', margin: '60px auto', textAlign: 'center', padding: '30px' }}>
        <AlertTriangle size={44} style={{ color: '#DC2626', margin: '0 auto 16px auto' }} />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>
          Construtora não encontrada
        </h2>
        <p style={{ fontSize: '0.86rem', color: '#6B7280', marginBottom: '20px' }}>
          {error || 'Não foi possível encontrar a construtora solicitada no banco de dados.'}
        </p>
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
            fontSize: '0.86rem',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} />
          <span>Voltar para Listagem de Construtoras</span>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 20px 60px 20px' }}>
      <div style={{ marginBottom: '16px' }}>
        <AdminNavTabs currentTab="companies" />
      </div>

      <CompanyForm mode="edit" initialData={company} companyId={id} />
    </div>
  );
}

