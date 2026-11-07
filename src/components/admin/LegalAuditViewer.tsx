'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  FileText,
  Building,
  User,
  Clock,
  AlertCircle,
  Loader2,
  ShieldAlert,
} from 'lucide-react';

interface AcceptanceItem {
  id: string;
  documentType: string;
  documentVersion: string;
  action: string;
  acceptedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  document: {
    id: string;
    title: string;
    version: string;
    status: string;
  };
}

interface AuthorizationItem {
  id: string;
  documentVersion: string;
  status: string;
  confirmedAt: string;
  revokedAt: string | null;
  revocationReason: string | null;
  broker: {
    id: string;
    name: string;
    email: string;
  };
  property: {
    id: string;
    title: string;
    internalCode: string | null;
    city: string | null;
    state: string | null;
    isPublic: boolean;
    status: string;
    publicId: string | null;
  };
  document: {
    id: string;
    title: string;
    version: string;
  };
}

export default function LegalAuditViewer() {
  const [activeSubTab, setActiveSubTab] = useState<'acceptances' | 'authorizations'>('acceptances');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [loading, setLoading] = useState(true);
  const [acceptances, setAcceptances] = useState<AcceptanceItem[]>([]);
  const [authorizations, setAuthorizations] = useState<AuthorizationItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadAuditData();
  }, [activeSubTab, typeFilter, statusFilter]);

  async function loadAuditData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('tab', activeSubTab);
      if (search.trim()) params.append('search', search.trim());
      if (activeSubTab === 'acceptances' && typeFilter !== 'ALL') params.append('type', typeFilter);
      if (activeSubTab === 'authorizations' && statusFilter !== 'ALL') params.append('status', statusFilter);

      const res = await fetch(`/api/admin/legal/audit?${params.toString()}`);
      if (!res.ok) throw new Error('Falha ao carregar registros de auditoria.');
      const data = await res.json();

      if (activeSubTab === 'acceptances') {
        setAcceptances(data.items || []);
        setTotalCount(data.total || 0);
      } else {
        setAuthorizations(data.items || []);
        setTotalCount(data.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadAuditData();
  }

  return (
    <div>
      {/* Sub-abas de Navegação */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          borderBottom: '2px solid #E5E7EB',
          marginBottom: '20px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveSubTab('acceptances')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeSubTab === 'acceptances' ? '3px solid #1E4620' : '3px solid transparent',
            color: activeSubTab === 'acceptances' ? '#1E4620' : '#6B7280',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            marginBottom: '-2px',
          }}
        >
          Aceites e Ciências Gerais (Termos & Privacidade)
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('authorizations')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeSubTab === 'authorizations' ? '3px solid #1E4620' : '3px solid transparent',
            color: activeSubTab === 'authorizations' ? '#1E4620' : '#6B7280',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            marginBottom: '-2px',
          }}
        >
          Declarações de Autorização por Imóvel
        </button>
      </div>

      {/* Barra de Filtros e Busca */}
      <form
        onSubmit={handleSearchSubmit}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={18} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '10px' }} />
          <input
            type="text"
            placeholder={
              activeSubTab === 'acceptances'
                ? 'Buscar por nome ou email do usuário...'
                : 'Buscar por corretor ou título do imóvel...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 38px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '0.86rem',
            }}
          />
        </div>

        {activeSubTab === 'acceptances' && (
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '0.86rem',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              fontWeight: 600,
            }}
          >
            <option value="ALL">Todos os Documentos</option>
            <option value="TERMS_OF_USE">Termos de Uso</option>
            <option value="PRIVACY_POLICY">Política de Privacidade</option>
          </select>
        )}

        {activeSubTab === 'authorizations' && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '0.86rem',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              fontWeight: 600,
            }}
          >
            <option value="ALL">Todos os Status</option>
            <option value="CONFIRMED">Autorizados (CONFIRMED)</option>
            <option value="REVOKED">Revogados (REVOKED)</option>
          </select>
        )}

        <button
          type="submit"
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
          Filtrar
        </button>
      </form>

      {/* Indicador de Quantidade */}
      <div style={{ fontSize: '0.82rem', color: '#6B7280', marginBottom: '14px', fontWeight: 600 }}>
        Total de registros encontrados: {totalCount}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
          <Loader2 className="animate-spin" size={26} color="#1E4620" />
        </div>
      ) : activeSubTab === 'acceptances' ? (
        /* Tabela de Aceites e Ciências Gerais */
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E5E7EB',
            overflowX: 'auto',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', textAlign: 'left' }}>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>Usuário</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>Documento</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>Versão</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>Ação Registrada</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>Data e Hora</th>
              </tr>
            </thead>
            <tbody>
              {acceptances.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px 14px', textAlign: 'center', color: '#9CA3AF' }}>
                    Nenhum registro de aceite ou ciência encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                acceptances.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 700, color: '#111827' }}>{item.user.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                        {item.user.email} • {item.user.role === 'ADMIN' ? 'Administrador' : 'Corretor'}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>
                      {item.documentType === 'TERMS_OF_USE' ? 'Termos de Uso' : 'Política de Privacidade'}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1E4620' }}>
                      v{item.documentVersion}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          backgroundColor: item.action === 'ACCEPTED' ? '#DCFCE7' : '#EFF6FF',
                          color: item.action === 'ACCEPTED' ? '#166534' : '#1D4ED8',
                        }}
                      >
                        {item.action === 'ACCEPTED' ? 'ACEITE EXPLÍCITO' : 'CIÊNCIA REGISTRADA'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#4B5563' }}>
                      {new Date(item.acceptedAt).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Tabela de Autorizações por Imóvel */
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E5E7EB',
            overflowX: 'auto',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', textAlign: 'left' }}>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>Imóvel</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>Corretor Responsável</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>Versão</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>Situação</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>Confirmação</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>Revogação / Motivo</th>
              </tr>
            </thead>
            <tbody>
              {authorizations.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px 14px', textAlign: 'center', color: '#9CA3AF' }}>
                    Nenhum registro de autorização de imóvel encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                authorizations.map((item) => {
                  const isConfirmed = item.status === 'CONFIRMED';
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#111827' }}>
                          {item.property.title}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                          {item.property.city || '—'} • Status: {item.property.status} •{' '}
                          {item.property.isPublic ? 'Público' : 'Inativo'}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#374151' }}>{item.broker.name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>{item.broker.email}</div>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1E4620' }}>
                        v{item.documentVersion}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            backgroundColor: isConfirmed ? '#DCFCE7' : '#FEF2F2',
                            color: isConfirmed ? '#166534' : '#991B1B',
                          }}
                        >
                          {isConfirmed ? 'CONFIRMADA' : 'REVOGADA'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#4B5563' }}>
                        {new Date(item.confirmedAt).toLocaleString('pt-BR')}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#4B5563', maxWidth: '240px' }}>
                        {item.revokedAt ? (
                          <div>
                            <div style={{ fontWeight: 600, color: '#991B1B' }}>
                              {new Date(item.revokedAt).toLocaleString('pt-BR')}
                            </div>
                            {item.revocationReason && (
                              <div style={{ fontSize: '0.76rem', color: '#6B7280', marginTop: '2px' }}>
                                Motivo: {item.revocationReason}
                              </div>
                            )}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
