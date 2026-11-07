'use client';

import React, { useEffect, useRef } from 'react';
import { ShieldAlert, ArrowLeft, MessageCircle, X } from 'lucide-react';
import { isSafeWhatsAppUrl, markAntifraudNoticeDismissed } from '@/lib/antifraud-contact';

interface AntifraudNoticeModalProps {
  isOpen: boolean;
  targetUrl: string | null;
  onClose: () => void;
  onProceed?: () => void;
}

export default function AntifraudNoticeModal({
  isOpen,
  targetUrl,
  onClose,
  onProceed,
}: AntifraudNoticeModalProps) {
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  // Controle de scroll do body e foco acessível
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Foco inicial no botão de ação principal
    const timer = setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 50);

    // Tecla Escape fecha o modal com o mesmo comportamento do botão "Voltar"
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !targetUrl) {
    return null;
  }

  function handleConfirmAndProceed() {
    // 1. Marca que o aviso foi concluído para esta visita
    markAntifraudNoticeDismissed();

    // 2. Valida se a URL é um link oficial e seguro do WhatsApp
    if (targetUrl && isSafeWhatsAppUrl(targetUrl)) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } else {
      console.warn('[AntifraudNoticeModal] Destino rejeitado por não ser uma URL oficial segura do WhatsApp:', targetUrl);
    }

    if (onProceed) {
      onProceed();
    }
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="antifraud-title"
      aria-describedby="antifraud-desc"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(17, 24, 39, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '540px',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '28px 24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 10px 10px -5px rgba(0, 0, 0, 0.05)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão de Fechar discreto no canto */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Voltar para a página"
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'none',
            border: 'none',
            color: '#9CA3AF',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={20} />
        </button>

        {/* Ícone de Destaque */}
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: '#FEF3C7',
              color: '#B45309',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px auto',
            }}
          >
            <ShieldAlert size={28} strokeWidth={2.2} />
          </div>

          <h2
            id="antifraud-title"
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#111827',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Antes de conversar com o corretor
          </h2>
        </div>

        {/* Texto Principal */}
        <div
          id="antifraud-desc"
          style={{
            fontSize: '0.88rem',
            color: '#374151',
            lineHeight: 1.6,
            marginBottom: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <p style={{ margin: 0 }}>
            Para sua segurança, confira a identidade e o CRECI do profissional e verifique a documentação do imóvel antes de fechar qualquer negócio.
          </p>

          <p style={{ margin: 0 }}>
            Desconfie de pedidos de pagamento antecipado. Antes de transferir valores, confirme quem receberá o dinheiro e a legitimidade da negociação.
          </p>
        </div>

        {/* Nota Complementar */}
        <div
          style={{
            backgroundColor: '#F9FAFB',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            padding: '12px 14px',
            marginBottom: '24px',
            fontSize: '0.80rem',
            color: '#6B7280',
            lineHeight: 1.5,
          }}
        >
          <strong>Nota:</strong> A Área Nobre disponibiliza a plataforma, mas não realiza verificação independente de todos os anúncios ou profissionais.
        </div>

        {/* Botões de Ação */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '11px 18px',
              borderRadius: '10px',
              border: '1px solid #D1D5DB',
              backgroundColor: '#FFFFFF',
              color: '#4B5563',
              fontSize: '0.86rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            <ArrowLeft size={16} />
            <span>Voltar</span>
          </button>

          <button
            ref={confirmButtonRef}
            type="button"
            onClick={handleConfirmAndProceed}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '11px 22px',
              borderRadius: '10px',
              backgroundColor: '#25D366',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '0.88rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37, 211, 102, 0.3)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
          >
            <MessageCircle size={18} />
            <span>Entendi, continuar para o WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
}
