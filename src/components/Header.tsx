'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, Search, MapPin, Plus, User, LogOut, ChevronDown, Sparkles, Shield } from 'lucide-react';

interface HeaderProps {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    profile?: {
      commercialName?: string | null;
      avatarUrl?: string | null;
      creci?: string | null;
    } | null;
  } | null;
}

export default function Header({ user }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [cadastrarOpen, setCadastrarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const cadastrarRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cadastrarRef.current && !cadastrarRef.current.contains(event.target as Node)) {
        setCadastrarOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Falha ao sair:', err);
    }
  }

  // Se estiver em página pública ou login, não exibe o cabeçalho interno
  if (pathname.startsWith('/p/')) return null;
  const isLoginPage = pathname === '/login';

  return (
    <header className="site-header">
      <div className="header-inner">
        {/* Marca / Logo */}
        <Link href="/" className="brand-logo">
          <div className="brand-icon">
            <Building2 size={18} strokeWidth={2.4} />
          </div>
          <span>ÁREA NOBRE</span>
        </Link>

        {!isLoginPage && (
          <>
            {/* Navegação Desktop */}
            <nav className="desktop-nav">
              <Link
                href="/"
                className={`nav-link ${pathname === '/' ? 'active' : ''}`}
              >
                Início
              </Link>
              <Link
                href="/imoveis"
                className={`nav-link ${pathname.startsWith('/imoveis') ? 'active' : ''}`}
              >
                <Building2 size={16} />
                Imóveis
              </Link>
              <Link
                href="/empreendimentos"
                className={`nav-link ${pathname.startsWith('/empreendimentos') ? 'active' : ''}`}
              >
                <Building2 size={16} />
                Imóveis em construção
              </Link>
              <Link
                href="/buscas"
                className={`nav-link ${pathname.startsWith('/buscas') ? 'active' : ''}`}
              >
                <Search size={16} />
                Buscas
              </Link>
              <Link
                href="/mapa"
                className={`nav-link ${pathname.startsWith('/mapa') ? 'active' : ''}`}
              >
                <MapPin size={16} />
                Mapa
              </Link>
            </nav>

            {/* Ações e Menu de Usuário */}
            <div className="header-actions">
              {/* Botão + Cadastrar */}
              <div className="dropdown-container" ref={cadastrarRef}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setCadastrarOpen(!cadastrarOpen)}
                  aria-expanded={cadastrarOpen}
                >
                  <Plus size={16} strokeWidth={2.6} />
                  <span>Cadastrar</span>
                  <ChevronDown size={14} />
                </button>

                {cadastrarOpen && (
                  <div className="dropdown-menu">
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setCadastrarOpen(false);
                        router.push('/imoveis/novo');
                      }}
                    >
                      <Building2 size={16} />
                      <span>Novo imóvel convencional</span>
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setCadastrarOpen(false);
                        router.push('/empreendimentos/novo');
                      }}
                    >
                      <Building2 size={16} />
                      <span>Novo imóvel em construção</span>
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setCadastrarOpen(false);
                        router.push('/buscas/nova');
                      }}
                    >
                      <Search size={16} />
                      <span>Nova busca de cliente</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Menu de Perfil / Usuária e Negócio */}
              {user ? (
                <div className="dropdown-container" ref={userMenuRef}>
                  <button
                    type="button"
                    className="user-badge"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    aria-expanded={userMenuOpen}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 12px 5px 6px' }}
                  >
                    {user.profile?.avatarUrl ? (
                      <img
                        src={user.profile.avatarUrl}
                        alt={user.name}
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="avatar-circle">
                        {user.name
                          ? user.name.split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
                          : 'AN'}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1.15 }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {user.profile?.commercialName || user.name}
                      </span>
                      <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                        {user.name} • {user.role === 'ADMIN' ? 'Admin' : 'Corretor'}
                      </span>
                    </div>
                    <ChevronDown size={14} color="#6B7280" />
                  </button>

                  {userMenuOpen && (
                    <div className="dropdown-menu" style={{ minWidth: '220px' }}>
                      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-light)', marginBottom: '4px' }}>
                        <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-primary)', fontWeight: 800 }}>
                          {user.role === 'ADMIN' ? 'Área Nobre Gestão' : 'Identidade Profissional'}
                        </div>
                        <div style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                          {user.profile?.commercialName || user.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {user.name} ({user.email})
                        </div>
                      </div>

                      <Link
                        href="/perfil"
                        className="dropdown-item"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User size={16} />
                        <span>Meu Perfil</span>
                      </Link>

                      {user.role === 'ADMIN' && (
                        <Link
                          href="/admin"
                          className="dropdown-item"
                          onClick={() => setUserMenuOpen(false)}
                          style={{ color: '#92400E' }}
                        >
                          <Shield size={16} color="#92400E" />
                          <span style={{ fontWeight: 700 }}>Administração</span>
                        </Link>
                      )}

                      <button
                        className="dropdown-item danger"
                        onClick={handleLogout}
                      >
                        <LogOut size={16} />
                        <span>Sair da conta</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/login" className="btn-secondary" style={{ padding: '8px 16px' }}>
                  Entrar
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
