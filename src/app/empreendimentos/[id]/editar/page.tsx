'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import DevelopmentForm from '@/components/DevelopmentForm';

export default function EditarEmpreendimentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [development, setDevelopment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDevelopment() {
      try {
        const res = await fetch(`/api/developments/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao carregar dados do empreendimento.');
        setDevelopment(data.development);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadDevelopment();
  }, [id]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        Carregando dados do empreendimento...
      </div>
    );
  }

  if (error || !development) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Erro ao carregar</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>{error || 'Empreendimento não encontrado.'}</p>
        <Link href="/empreendimentos" className="btn-primary">
          Voltar para lista
        </Link>
      </div>
    );
  }

  return <DevelopmentForm initialData={development} isEditing={true} />;
}
