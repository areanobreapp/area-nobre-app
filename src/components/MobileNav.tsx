'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Building2, Search, MapPin, Plus, X } from 'lucide-react';

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  if (pathname === '/login' || pathname.startsWith('/p/')) return null;

  return (
    <>
      <nav className="mobile-nav-bar" aria-label="Navegação móvel">
        <Link
          href="/"
          className={`mobile-nav-item ${pathname === '/' ? 'active' : ''}`}
        >
          <Home size={20} strokeWidth={pathname === '/' ? 2.5 : 2} />
          <span>Início</span>
        </Link>

        <Link
          href="/imoveis"
          className={`mobile-nav-item ${pathname.startsWith('/imoveis') ? 'active' : ''}`}
        >
          <Building2 size={19} strokeWidth={pathname.startsWith('/imoveis') ? 2.5 : 2} />
          <span>Imóveis</span>
        </Link>

        <Link
          href="/empreendimentos"
          className={`mobile-nav-item ${pathname.startsWith('/empreendimentos') ? 'active' : ''}`}
        >
          <Building2 size={19} strokeWidth={pathname.startsWith('/empreendimentos') ? 2.5 : 2} />
          <span>Construção</span>
        </Link>

        <button
          type="button"
          className="mobile-nav-item action-btn"
          onClick={() => setModalOpen(true)}
          style={{ background: 'none', border: 'none' }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(30, 70, 32, 0.3)',
            }}
          >
            <Plus size={20} strokeWidth={2.8} />
          </div>
          <span>Cadastrar</span>
        </button>

        <Link
          href="/buscas"
          className={`mobile-nav-item ${pathname.startsWith('/buscas') ? 'active' : ''}`}
        >
          <Search size={19} strokeWidth={pathname.startsWith('/buscas') ? 2.5 : 2} />
          <span>Buscas</span>
        </Link>

        <Link
          href="/mapa"
          className={`mobile-nav-item ${pathname.startsWith('/mapa') ? 'active' : ''}`}
        >
          <MapPin size={19} strokeWidth={pathname.startsWith('/mapa') ? 2.5 : 2} />
          <span>Mapa</span>
        </Link>
      </nav>

      {/* Sheet de Ação Rápida no Mobile */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-end',
            animation: 'fadeInSlide 0.2s ease',
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              width: '100%',
              backgroundColor: 'var(--bg-surface)',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
              padding: '24px 20px 40px 20px',
              boxShadow: 'var(--shadow-floating)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 700 }}>O que deseja cadastrar?</span>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} color="#6B7280" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                type="button"
                className="btn-secondary"
                style={{
                  justifyContent: 'flex-start',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.96rem',
                }}
                onClick={() => {
                  setModalOpen(false);
                  router.push('/imoveis/novo');
                }}
              >
                <Building2 size={20} color="var(--color-primary)" />
                <span style={{ fontWeight: 600 }}>Novo imóvel convencional</span>
              </button>

              <button
                type="button"
                className="btn-secondary"
                style={{
                  justifyContent: 'flex-start',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.96rem',
                }}
                onClick={() => {
                  setModalOpen(false);
                  router.push('/empreendimentos/novo');
                }}
              >
                <Building2 size={20} color="var(--color-primary)" />
                <span style={{ fontWeight: 600 }}>Novo imóvel em construção</span>
              </button>

              <button
                type="button"
                className="btn-secondary"
                style={{
                  justifyContent: 'flex-start',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.96rem',
                }}
                onClick={() => {
                  setModalOpen(false);
                  router.push('/buscas/nova');
                }}
              >
                <Search size={20} color="var(--color-primary)" />
                <span style={{ fontWeight: 600 }}>Nova busca de cliente</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
