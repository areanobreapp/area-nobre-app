'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { FIELD_HELP_ITEMS, FieldHelpKey } from '@/lib/field-help';

export interface FieldHelperProps {
  /**
   * Chave pré-definida de texto padronizado (ver `FIELD_HELP_ITEMS`).
   */
  helpKey?: FieldHelpKey;
  /**
   * Título customizado (sobrepõe o título da chave, se fornecido).
   */
  title?: string;
  /**
   * Conteúdo/explicação customizada (sobrepõe a descrição da chave, se fornecida).
   */
  content?: string;
  /**
   * Tamanho do ícone de interrogação em pixels (padrão: 14).
   */
  size?: number;
  /**
   * Cor base do ícone (padrão: sutil).
   */
  color?: string;
  /**
   * Alinhamento horizontal forçado do popover ('auto' | 'left' | 'right'). Padrão: 'auto'.
   */
  align?: 'auto' | 'left' | 'right';
  /**
   * Classe CSS opcional para o wrapper.
   */
  className?: string;
  /**
   * Estilo inline opcional para o wrapper.
   */
  style?: React.CSSProperties;
}

/**
 * Componente reutilizável de ajuda contextual com ícone de interrogação.
 * Atende aos Pontos 14, 17 e 28 com total acessibilidade (clique, toque, teclado e Esc).
 */
export default function FieldHelper({
  helpKey,
  title,
  content,
  size = 14,
  color,
  align = 'auto',
  className = '',
  style = {},
}: FieldHelperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [horizontalPos, setHorizontalPos] = useState<'left' | 'right'>('left');
  const [verticalPos, setVerticalPos] = useState<'down' | 'up'>('down');

  const wrapperRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const popoverId = useId();

  // Resolução do título e conteúdo a partir da chave ou props explícitas
  const item = helpKey ? FIELD_HELP_ITEMS[helpKey] : undefined;
  const resolvedTitle = title || item?.title || 'Ajuda';
  const resolvedContent = content || item?.description || '';

  // Calcula posicionamento seguro dentro da viewport para nunca ser cortado
  function updatePosition() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Decisão horizontal
    if (align === 'left') {
      setHorizontalPos('left');
    } else if (align === 'right') {
      setHorizontalPos('right');
    } else {
      // Auto: se estiver na metade direita ou a menos de 280px da borda direita, alinha à direita
      if (rect.left > viewportWidth / 2 || rect.right + 260 > viewportWidth) {
        setHorizontalPos('right');
      } else {
        setHorizontalPos('left');
      }
    }

    // Decisão vertical: se faltar espaço embaixo (< 170px) e houver espaço em cima, abre para cima
    if (viewportHeight - rect.bottom < 170 && rect.top > 170) {
      setVerticalPos('up');
    } else {
      setVerticalPos('down');
    }
  }

  // Toggle do popover
  function toggleOpen(e?: React.MouseEvent | React.TouchEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }

  function handleClose(e?: React.MouseEvent | React.TouchEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsOpen(false);
    // Retorna foco para o botão de ativação
    triggerRef.current?.focus();
  }

  // Listeners de clique fora, tecla Escape e redimensionamento da janela
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (wrapperRef.current && !wrapperRef.current.contains(target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    function handleResizeOrScroll() {
      updatePosition();
    }

    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true);

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
    };
  }, [isOpen, align]);

  return (
    <span
      ref={wrapperRef}
      className={`field-helper-wrapper ${className}`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        verticalAlign: 'middle',
        marginLeft: '5px',
        lineHeight: 1,
        ...style,
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        aria-label={`Ajuda sobre ${resolvedTitle}`}
        aria-expanded={isOpen}
        aria-controls={isOpen ? popoverId : undefined}
        aria-haspopup="dialog"
        title={`Explicação: ${resolvedTitle}`}
        style={{
          border: 'none',
          backgroundColor: 'transparent',
          padding: 0,
          margin: '-10px -8px -10px -4px',
          cursor: 'pointer',
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isOpen ? 'var(--color-primary, #1E4620)' : (color || 'var(--text-light, #9CA3AF)'),
          transition: 'color var(--transition-fast, 0.15s ease), transform var(--transition-fast, 0.15s ease)',
          outline: 'none',
          WebkitTapHighlightColor: 'transparent',
          width: '40px',
          height: '40px',
          minWidth: '40px',
          minHeight: '40px',
          touchAction: 'manipulation',
        }}
        onMouseEnter={(e) => {
          if (!isOpen) e.currentTarget.style.color = 'var(--color-primary, #1E4620)';
        }}
        onMouseLeave={(e) => {
          if (!isOpen) e.currentTarget.style.color = color || 'var(--text-light, #9CA3AF)';
        }}
        onFocus={(e) => {
          e.currentTarget.style.outline = '2px solid var(--color-primary, #1E4620)';
          e.currentTarget.style.outlineOffset = '2px';
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = 'none';
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: isOpen ? 'var(--color-primary-light, #EBF4EC)' : 'transparent',
            transition: 'background-color var(--transition-fast, 0.15s ease)',
          }}
        >
          <HelpCircle size={size} strokeWidth={2.2} />
        </span>
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          id={popoverId}
          role="dialog"
          aria-modal="false"
          aria-label={resolvedTitle}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            zIndex: 999,
            ...(verticalPos === 'down'
              ? { top: 'calc(100% + 6px)' }
              : { bottom: 'calc(100% + 6px)' }),
            ...(horizontalPos === 'right'
              ? { right: 0, left: 'auto' }
              : { left: 0, right: 'auto' }),
            width: 'min(280px, calc(100vw - 32px))',
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-md, 12px)',
            border: '1px solid var(--border-light, #E5E7EB)',
            boxShadow: 'var(--shadow-lg, 0 12px 28px -4px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05))',
            padding: '12px 14px',
            color: 'var(--text-primary, #111827)',
            fontSize: '0.82rem',
            lineHeight: 1.45,
            textAlign: 'left',
            animation: 'fadeIn 0.15s ease-out',
            boxSizing: 'border-box',
          }}
        >
          {/* Cabeçalho do Popover */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              marginBottom: '6px',
              paddingBottom: '4px',
              borderBottom: '1px solid var(--border-subtle, #F3F4F6)',
            }}
          >
            <span
              style={{
                fontWeight: 700,
                fontSize: '0.84rem',
                color: 'var(--color-primary, #1E4620)',
                letterSpacing: '-0.01em',
              }}
            >
              {resolvedTitle}
            </span>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Fechar explicação"
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                padding: '2px',
                cursor: 'pointer',
                borderRadius: '4px',
                color: 'var(--text-muted, #6B7280)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color var(--transition-fast, 0.15s ease)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary, #111827)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted, #6B7280)';
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Conteúdo / Explicação */}
          <div
            style={{
              color: 'var(--text-secondary, #4B5563)',
              fontSize: '0.80rem',
              fontWeight: 400,
            }}
          >
            {resolvedContent}
          </div>
        </div>
      )}
    </span>
  );
}
