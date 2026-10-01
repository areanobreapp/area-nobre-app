'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Credenciais inválidas.');
      }

      // Redirecionamento completo para garantir o envio dos cookies de sessão
      window.location.href = '/';
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro ao entrar.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin() {
    setError(null);
    setDemoLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDemo: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao acessar conta de demonstração.');
      }

      // Redirecionamento completo para garantir o envio dos cookies de sessão
      window.location.href = '/';
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro ao entrar no modo demo.');
      }
    } finally {
      setDemoLoading(false);
    }
  }

  function handleFillDemo() {
    setEmail('demo@areanobre.local');
    setPassword('corretor123');
    setError(null);
  }

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const err = params.get('error');
      if (err === 'campos_obrigatorios') {
        setError('Por favor, informe e-mail e senha.');
      } else if (err === 'credenciais_invalidas' || err === 'senha_incorreta') {
        setError('E-mail ou senha incorretos.');
      } else if (err === 'conta_inativa') {
        setError('Sua conta está desativada. Entre em contato com o suporte ou administrador.');
      } else if (err === 'demo_desativado') {
        setError('Acesso de demonstração indisponível em produção.');
      } else if (err === 'erro_servidor') {
        setError('Erro interno ao realizar autenticação.');
      }
    }
  }, []);

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 0',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '36px 32px',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Topo / Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #1E4620 0%, #2D5A27 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              margin: '0 auto 14px auto',
              boxShadow: '0 4px 12px rgba(30, 70, 32, 0.25)',
            }}
          >
            <Building2 size={28} strokeWidth={2.4} />
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            ÁREA NOBRE
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Acesso exclusivo para corretores
          </p>
        </div>

        {/* Mensagem de Erro */}
        {error && (
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              marginBottom: '20px',
              border: '1px solid #FECACA',
            }}
          >
            {error}
          </div>
        )}

        {/* Botão de Demonstração Rápida (Exclusivo para Ambiente de Desenvolvimento) */}
        {process.env.NODE_ENV !== 'production' && (
          <>
            <div style={{ marginBottom: '24px' }}>
              <a
                href="/api/auth/login?demo=1"
                onClick={(e) => {
                  // Permite transição suave se JS estiver ativo
                  if (!demoLoading) {
                    setDemoLoading(true);
                  }
                }}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '13px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.96rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                <ShieldCheck size={20} />
                <span>{demoLoading ? 'Acessando carteira...' : 'Entrar como Daiane (Demo)'}</span>
              </a>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '8px' }}>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Conta Daiane Corrêa:
                </span>
                <button
                  type="button"
                  onClick={handleFillDemo}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: '0.76rem',
                    color: 'var(--color-primary)',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                  }}
                >
                  Preencher no formulário
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '12px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-light)' }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>ou digite seus dados</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-light)' }} />
            </div>
          </>
        )}

        {/* Formulário Tradicional */}
        <form
          action="/api/auth/login"
          method="POST"
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <div>
            <label
              htmlFor="email"
              style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}
            >
              E-mail profissional
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="email"
                name="email"
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com.br"
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  fontSize: '0.92rem',
                  outline: 'none',
                  backgroundColor: 'var(--bg-subtle)',
                  boxSizing: 'border-box',
                }}
              />
              <Mail
                size={16}
                color="#9CA3AF"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}
            >
              Senha
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  fontSize: '0.92rem',
                  outline: 'none',
                  backgroundColor: 'var(--bg-subtle)',
                  boxSizing: 'border-box',
                }}
              />
              <Lock
                size={16}
                color="#9CA3AF"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || demoLoading}
            className="btn-secondary"
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.94rem',
              marginTop: '8px',
              boxSizing: 'border-box',
              cursor: 'pointer',
            }}
          >
            <span>{loading ? 'Entrando...' : 'Entrar na conta'}</span>
            <ArrowRight size={16} />
          </button>

          <div
            style={{
              marginTop: '16px',
              paddingTop: '14px',
              borderTop: '1px solid var(--border-light)',
              textAlign: 'center',
              fontSize: '0.84rem',
              color: 'var(--text-secondary)',
            }}
          >
            Não possui uma conta?{' '}
            <Link
              href="/cadastro"
              style={{
                color: 'var(--color-primary)',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Criar conta de corretor
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
