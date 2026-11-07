'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { useSupportContact } from '@/lib/use-support-contact';

interface LegalStatusData {
  terms: {
    isPublished: boolean;
    version: string | null;
    title: string | null;
    userAccepted: boolean;
  };
  privacy: {
    isPublished: boolean;
    version: string | null;
    title: string | null;
    userAcknowledged: boolean;
  };
  hasPendingAcceptance: boolean;
}

export default function LegalNoticeModal() {
  const router = useRouter();
  const { defaultUrl } = useSupportContact();
  const [legalData, setLegalData] = useState<LegalStatusData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acknowledgePrivacy, setAcknowledgePrivacy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Se estiver em páginas públicas de leitura dos documentos ou login, não exibe modal
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (
        path === '/login' ||
        path === '/cadastro' ||
        path === '/termos-de-uso' ||
        path === '/politica-de-privacidade'
      ) {
        return;
      }
    }

    fetch('/api/legal/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: LegalStatusData | null) => {
        if (data && data.hasPendingAcceptance) {
          const requiresTerms = data.terms.isPublished && !data.terms.userAccepted;
          const requiresPrivacyOnly =
            !requiresTerms && data.privacy.isPublished && !data.privacy.userAcknowledged;

          // Se for somente política de privacidade pendente e o usuário adiou nesta sessão, respeita
          if (
            requiresPrivacyOnly &&
            typeof window !== 'undefined' &&
            sessionStorage.getItem('areanobre_privacy_read_later') === 'true'
          ) {
            return;
          }

          setLegalData(data);
          setIsOpen(true);
        }
      })
      .catch((err) => {
        console.error('Falha ao verificar status legal:', err);
      });
  }, []);

  if (!isOpen || !legalData || !legalData.hasPendingAcceptance) {
    return null;
  }

  const isTermsBlocking = legalData.terms.isPublished && !legalData.terms.userAccepted;
  const isPrivacyPending = legalData.privacy.isPublished && !legalData.privacy.userAcknowledged;

  function handleReadPrivacyLater() {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('areanobre_privacy_read_later', 'true');
    }
    setIsOpen(false);
  }

  async function handleLogout() {
    try {
      setLoggingOut(true);
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (err) {
      console.error('Falha ao deslogar:', err);
      window.location.href = '/login';
    } finally {
      setLoggingOut(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();

    if (isTermsBlocking && !acceptTerms) {
      setError('É necessário manifestar concordância com os Termos de Uso vigentes para continuar.');
      return;
    }

    if (isPrivacyPending && !acknowledgePrivacy) {
      setError('Por favor, confirme a ciência da Política de Privacidade vigente.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/legal/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acceptTerms: isTermsBlocking ? true : undefined,
          acknowledgePrivacy: isPrivacyPending ? true : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao registrar manifestação.');
      }

      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
      }, 1400);
    } catch (err: any) {
      setError(err.message || 'Falha ao processar o registro.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(17, 24, 39, 0.65)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '32px 28px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 10px 10px -5px rgba(0, 0, 0, 0.05)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: isTermsBlocking ? '#DCFCE7' : '#EFF6FF',
              color: isTermsBlocking ? '#166534' : '#1D4ED8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px auto',
            }}
          >
            <ShieldCheck size={26} strokeWidth={2.4} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
            {isTermsBlocking
              ? 'Novo aceite obrigatório dos Termos de Uso'
              : 'Atualização da Política de Privacidade'}
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#4B5563', lineHeight: 1.5, marginTop: '8px' }}>
            {isTermsBlocking
              ? 'Uma nova versão oficial dos Termos de Uso e Responsabilidade foi publicada. Para continuar utilizando as ferramentas da Área Nobre com total transparência e segurança jurídica, confirme seu aceite da versão vigente.'
              : 'A Política de Privacidade da Área Nobre foi atualizada. Acesse o documento integral e confirme sua ciência sobre o tratamento de dados pessoais sob a LGPD.'}
          </p>
        </div>

        {/* Mensagens de Sucesso ou Erro */}
        {success && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '10px',
              color: '#166534',
              fontSize: '0.88rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            <CheckCircle2 size={18} />
            <span>Manifestação registrada com sucesso! Acesso liberado.</span>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '10px',
              color: '#991B1B',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Formulário com Checkboxes Explícitos */}
        {!success && (
          <form onSubmit={handleConfirm}>
            <div
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: '14px',
                border: '1px solid #E5E7EB',
                padding: '16px 18px',
                marginBottom: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              {/* Checkbox 1: Termos de Uso (quando pendente) */}
              {isTermsBlocking && (
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    style={{
                      width: '18px',
                      height: '18px',
                      marginTop: '2px',
                      accentColor: '#1E4620',
                      cursor: 'pointer',
                    }}
                  />
                  <span style={{ fontSize: '0.86rem', color: '#374151', lineHeight: 1.45 }}>
                    Li e concordo expressamente com os{' '}
                    <Link
                      href="/termos-de-uso"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#1E4620', fontWeight: 700, textDecoration: 'underline' }}
                    >
                      Termos de Uso e Responsabilidade
                    </Link>
                    {legalData.terms.version ? ` (versão ${legalData.terms.version})` : ''} da Área Nobre.
                  </span>
                </label>
              )}

              {/* Checkbox 2: Ciência da Política de Privacidade (quando pendente) */}
              {isPrivacyPending && (
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={acknowledgePrivacy}
                    onChange={(e) => setAcknowledgePrivacy(e.target.checked)}
                    style={{
                      width: '18px',
                      height: '18px',
                      marginTop: '2px',
                      accentColor: '#1E4620',
                      cursor: 'pointer',
                    }}
                  />
                  <span style={{ fontSize: '0.86rem', color: '#374151', lineHeight: 1.45 }}>
                    Tomei ciência da{' '}
                    <Link
                      href="/politica-de-privacidade"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#1E4620', fontWeight: 700, textDecoration: 'underline' }}
                    >
                      Política de Privacidade
                    </Link>
                    {legalData.privacy.version ? ` (versão ${legalData.privacy.version})` : ''} e das diretrizes de segurança da informação e LGPD.
                  </span>
                </label>
              )}
            </div>

            {/* Links de Apoio: Leitura, Suporte e Logout */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.80rem',
                color: '#6B7280',
                marginBottom: '20px',
                paddingBottom: '16px',
                borderBottom: '1px solid #F3F4F6',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <a
                href={defaultUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'none',
                  border: 'none',
                  color: '#166534',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'none',
                }}
              >
                <MessageCircle size={15} />
                <span>Dúvidas? Fale com o suporte</span>
              </a>

              <button
                type="button"
                disabled={loggingOut}
                onClick={handleLogout}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'none',
                  border: 'none',
                  color: '#991B1B',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <LogOut size={15} />
                <span>{loggingOut ? 'Saindo...' : 'Sair da conta'}</span>
              </button>
            </div>

            {/* Botões de Ação */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
              {/* Se for somente a política pendente (sem bloqueio dos termos), permite adiar */}
              {!isTermsBlocking && isPrivacyPending && (
                <button
                  type="button"
                  onClick={handleReadPrivacyLater}
                  disabled={submitting}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#4B5563',
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Lembrar mais tarde
                </button>
              )}

              <button
                type="submit"
                disabled={
                  submitting ||
                  (isTermsBlocking && !acceptTerms) ||
                  (isPrivacyPending && !acknowledgePrivacy)
                }
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 22px',
                  borderRadius: '10px',
                  backgroundColor: '#1E4620',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor:
                    submitting ||
                    (isTermsBlocking && !acceptTerms) ||
                    (isPrivacyPending && !acknowledgePrivacy)
                      ? 'not-allowed'
                      : 'pointer',
                  opacity:
                    submitting ||
                    (isTermsBlocking && !acceptTerms) ||
                    (isPrivacyPending && !acknowledgePrivacy)
                      ? 0.6
                      : 1,
                  boxShadow: '0 2px 6px rgba(30, 70, 32, 0.25)',
                }}
              >
                {submitting && <Loader2 size={16} className="spin" />}
                <span>{submitting ? 'Registrando...' : 'Confirmar e continuar'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
