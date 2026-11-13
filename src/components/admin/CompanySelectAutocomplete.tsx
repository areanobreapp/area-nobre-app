'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import Link from 'next/link';
import {
  Building2,
  Search,
  MapPin,
  X,
  Check,
  Loader2,
  AlertCircle,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';

export interface CompanyOption {
  id: string;
  name: string;
  tradeName: string;
  cnpj?: string | null;
  city?: string | null;
  state?: string | null;
  status?: string;
  logoUrl?: string | null;
}

interface CompanySelectAutocompleteProps {
  value: string; // companyId
  onChange: (companyId: string, company: CompanyOption | null) => void;
  initialCompany?: CompanyOption | null;
  legacyDeveloperName?: string | null;
  required?: boolean;
  disabled?: boolean;
  error?: string | null;
}

const BRAZIL_UFS = [
  'TODAS',
  'SC',
  'RS',
  'PR',
  'SP',
  'RJ',
  'MG',
  'ES',
  'GO',
  'DF',
  'MT',
  'MS',
  'BA',
  'PE',
  'CE',
  'PA',
  'AM',
  'OUTROS',
];

function formatCnpjClient(cnpj: string | null | undefined): string {
  if (!cnpj) return '';
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return cnpj;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

export default function CompanySelectAutocomplete({
  value,
  onChange,
  initialCompany,
  legacyDeveloperName,
  required = false,
  disabled = false,
  error = null,
}: CompanySelectAutocompleteProps) {
  const [selectedCompany, setSelectedCompany] = useState<CompanyOption | null>(initialCompany || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('TODAS');
  const [results, setResults] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sincroniza se a prop initialCompany ou value mudar
  useEffect(() => {
    if (initialCompany && initialCompany.id === value) {
      setSelectedCompany(initialCompany);
    } else if (!value) {
      setSelectedCompany(null);
    }
  }, [initialCompany, value]);

  // Se houver value mas não selectedCompany (ex: ID vindo da API de edição sem company completo)
  useEffect(() => {
    if (value && !selectedCompany) {
      let active = true;
      (async () => {
        try {
          const res = await fetch(`/api/companies/${value}`);
          if (res.ok) {
            const data = await res.json();
            if (active && data.company) {
              setSelectedCompany(data.company);
            }
          }
        } catch {
          // Silencioso se falhar, o ID continua armazenado
        }
      })();
      return () => {
        active = false;
      };
    }
  }, [value, selectedCompany]);

  // Função central de busca
  async function searchCompanies(q: string, city: string, uf: string) {
    setLoading(true);
    setFetchError(null);
    setHasSearched(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('search', q.trim());
      if (city.trim()) params.set('city', city.trim());
      if (uf && uf !== 'TODAS') params.set('state', uf);
      params.set('limit', '12');

      const res = await fetch(`/api/companies?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Falha ao consultar construtoras cadastradas.');
      }
      const data = await res.json();
      setResults(data.companies || []);
    } catch (err: any) {
      setFetchError(err.message || 'Erro ao conectar à base de construtoras.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  // Efeito disparado com debounce quando o usuário altera os filtros de busca
  useEffect(() => {
    // Se uma construtora já estiver selecionada e o usuário não estiver buscando ativamente, não busca
    if (selectedCompany && !searchTerm && !cityFilter && stateFilter === 'TODAS') {
      return;
    }

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      // Permite buscar por termo, cidade, ou lista as primeiras ativas se tudo vazio
      searchCompanies(searchTerm, cityFilter, stateFilter);
    }, 280);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchTerm, cityFilter, stateFilter]);

  function handleSelect(company: CompanyOption) {
    setSelectedCompany(company);
    onChange(company.id, company);
    setSearchTerm('');
    setResults([]);
    setHasSearched(false);
  }

  function handleClearSelection() {
    setSelectedCompany(null);
    onChange('', null);
    setSearchTerm('');
    // Dispara busca inicial para conveniência
    searchCompanies('', cityFilter, stateFilter);
  }

  function handleSearchInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearchTerm(val);
    // REGRA 3: Limpar o ID selecionado caso o usuário altere manualmente a pesquisa
    if (selectedCompany) {
      setSelectedCompany(null);
      onChange('', null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Label e Indicador Obrigatório */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label
          htmlFor="input-busca-construtora"
          style={{
            fontSize: '0.86rem',
            fontWeight: 700,
            color: '#111827',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Building2 size={16} color="#1E4620" />
          <span>Construtora parceira {required && <strong style={{ color: '#DC2626' }}>*</strong>}</span>
        </label>

        {selectedCompany && (
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#166534',
              backgroundColor: '#DCFCE7',
              padding: '2px 8px',
              borderRadius: '9999px',
            }}
          >
            VÍNCULO ATIVO
          </span>
        )}
      </div>

      {/* Aviso de Dado Legado (Sem vínculo formal por companyId) */}
      {!selectedCompany && legacyDeveloperName && (
        <div
          id="badge-legacy-developer"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            padding: '10px 12px',
            borderRadius: '8px',
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            color: '#92400E',
            fontSize: '0.78rem',
            lineHeight: 1.4,
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#D97706' }} />
          <div>
            <strong>Registro legado:</strong> Construtora informada originalmente como texto livre: &quot;
            <strong>{legacyDeveloperName}</strong>&quot;.
            <br />
            Selecione uma construtora cadastrada abaixo para vincular o empreendimento formalmente à base administrativa.
          </div>
        </div>
      )}

      {/* CARD DA CONSTRUTORA SELECIONADA */}
      {selectedCompany ? (
        <div
          id="card-construtora-selecionada"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: '#F0FDF4',
            border: '2px solid #1E4620',
            borderRadius: '10px',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px', flex: 1 }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: '#DCFCE7',
                color: '#166534',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontWeight: 800,
                fontSize: '1.1rem',
                border: '1px solid #BBF7D0',
              }}
            >
              {selectedCompany.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedCompany.logoUrl}
                  alt={selectedCompany.tradeName}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '7px' }}
                />
              ) : (
                selectedCompany.tradeName.charAt(0).toUpperCase()
              )}
            </div>

            <div>
              <div
                id="selected-company-tradename"
                style={{ fontSize: '0.96rem', fontWeight: 800, color: '#111827', lineHeight: 1.2 }}
              >
                {selectedCompany.tradeName}
              </div>

              {selectedCompany.name && selectedCompany.name !== selectedCompany.tradeName && (
                <div style={{ fontSize: '0.76rem', color: '#4B5563', marginTop: '2px' }}>
                  Razão Social: {selectedCompany.name}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.74rem',
                  color: '#6B7280',
                  marginTop: '3px',
                  flexWrap: 'wrap',
                }}
              >
                {(selectedCompany.city || selectedCompany.state) && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <MapPin size={12} color="#166534" />
                    <strong>
                      {selectedCompany.city || 'Cidade não informada'}
                      {selectedCompany.state ? ` - ${selectedCompany.state}` : ''}
                    </strong>
                  </span>
                )}
                {selectedCompany.cnpj && (
                  <span>CNPJ: {formatCnpjClient(selectedCompany.cnpj)}</span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            id="btn-trocar-construtora"
            onClick={handleClearSelection}
            disabled={disabled}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #D1D5DB',
              color: '#374151',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <RotateCcw size={13} />
            <span>Trocar Construtora</span>
          </button>
        </div>
      ) : (
        /* PAINEL DE BUSCA E AUTOCOMPLETE (QUANDO NENHUMA CONSTRUTORA SELECIONADA) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Linha de Filtros: Pesquisa + Cidade + UF */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '8px',
            }}
          >
            {/* Campo 1: Busca Geral (Nome Fantasia, Razão Social ou CNPJ) */}
            <div style={{ position: 'relative', flex: 2, minWidth: '220px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '11px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9CA3AF',
                }}
              />
              <input
                type="text"
                id="input-busca-construtora"
                placeholder="Pesquisar por nome fantasia, razão social ou CNPJ..."
                value={searchTerm}
                onChange={handleSearchInputChange}
                disabled={disabled}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 34px',
                  borderRadius: '8px',
                  border: error ? '2px solid #DC2626' : '1px solid #D1D5DB',
                  fontSize: '0.86rem',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#9CA3AF',
                    cursor: 'pointer',
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Campo 2: Filtro por Cidade */}
            <div style={{ position: 'relative', flex: 1, minWidth: '150px' }}>
              <MapPin
                size={16}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9CA3AF',
                }}
              />
              <input
                type="text"
                id="input-cidade-construtora"
                placeholder="Cidade (opcional)..."
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                disabled={disabled}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 32px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.86rem',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                }}
              />
            </div>

            {/* Campo 3: Filtro por UF */}
            <div style={{ width: '100px', flexShrink: 0 }}>
              <select
                id="select-uf-construtora"
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                disabled={disabled}
                style={{
                  width: '100%',
                  padding: '9px 10px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.86rem',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  fontWeight: 600,
                  color: '#374151',
                }}
              >
                {BRAZIL_UFS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf === 'TODAS' ? 'UF (Todas)' : uf}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ fontSize: '0.74rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>A cidade e UF correspondem ao endereço cadastral da construtora.</span>
          </div>

          {/* LISTA DE RESULTADOS / FEEDBACKS */}
          <div
            id="container-resultados-construtoras"
            style={{
              maxHeight: '260px',
              overflowY: 'auto',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            }}
          >
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>
                <Loader2 size={20} className="animate-spin" style={{ color: '#1E4620', margin: '0 auto 6px auto' }} />
                <span style={{ fontSize: '0.82rem' }}>Buscando construtoras cadastradas...</span>
              </div>
            ) : fetchError ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#DC2626', fontSize: '0.82rem' }}>
                {fetchError}
              </div>
            ) : results.length === 0 && hasSearched ? (
              /* REGRA 5: Nenhuma construtora cadastrada corresponde à pesquisa */
              <div
                id="msg-nenhuma-construtora"
                style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  backgroundColor: '#F9FAFB',
                }}
              >
                <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Nenhuma construtora cadastrada corresponde à pesquisa.
                </div>
                <div style={{ fontSize: '0.76rem', color: '#6B7280', marginBottom: '12px' }}>
                  O cadastro de construtoras deve ser realizado previamente no módulo administrativo.
                </div>
                <Link
                  href="/admin/construtoras/nova"
                  target="_blank"
                  rel="noopener noreferrer"
                  id="link-cadastrar-nova-construtora"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    backgroundColor: '#1E4620',
                    color: '#FFFFFF',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  <span>Cadastrar nova construtora</span>
                  <ExternalLink size={13} />
                </Link>
              </div>
            ) : (
              /* CARDS DE RESULTADOS PARA SELEÇÃO */
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {results.map((c) => (
                  <div
                    key={c.id}
                    id={`company-option-${c.id}`}
                    data-company-id={c.id}
                    onClick={() => handleSelect(c)}
                    style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid #F3F4F6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F0FDF4';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          backgroundColor: '#DCFCE7',
                          color: '#166534',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontSize: '0.86rem',
                          fontWeight: 800,
                        }}
                      >
                        {c.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.logoUrl}
                            alt={c.tradeName}
                            style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '5px' }}
                          />
                        ) : (
                          c.tradeName.charAt(0).toUpperCase()
                        )}
                      </div>

                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827' }}>
                          {c.tradeName}
                        </div>
                        {c.name && c.name !== c.tradeName && (
                          <div style={{ fontSize: '0.74rem', color: '#6B7280' }}>
                            Razão: {c.name}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: '#6B7280', marginTop: '2px' }}>
                          {(c.city || c.state) && (
                            <span>
                              {c.city || 'Cidade não informada'}{c.state ? `/${c.state}` : ''}
                            </span>
                          )}
                          {c.cnpj && (
                            <span>• CNPJ: {formatCnpjClient(c.cnpj)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#F3F4F6',
                        color: '#1E4620',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                      }}
                    >
                      Selecionar
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mensagem de Erro de Validação */}
      {error && (
        <span
          id="company-selection-error"
          style={{
            fontSize: '0.78rem',
            color: '#DC2626',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <AlertCircle size={13} />
          {error}
        </span>
      )}
    </div>
  );
}

