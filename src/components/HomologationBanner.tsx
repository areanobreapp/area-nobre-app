import React from 'react';

/**
 * Banner de identificação visual exclusiva para o ambiente de homologação e testes.
 *
 * Regras:
 * - Só é renderizado se APP_ENV === 'homologation' ou NEXT_PUBLIC_APP_ENV === 'homologation'.
 * - Se ausente ou com qualquer outro valor, retorna null (zero impacto no DOM e na produção).
 * - Exibido tanto em páginas autenticadas quanto em páginas públicas de apresentação de imóveis.
 * - Posicionado no fluxo natural do topo, respeitando safe-area do iOS e sem obstruir modais, mapas ou botões.
 */
export default function HomologationBanner() {
  const isHomologation =
    process.env.APP_ENV === 'homologation' ||
    process.env.NEXT_PUBLIC_APP_ENV === 'homologation';

  if (!isHomologation) {
    return null;
  }

  return (
    <div
      role="status"
      aria-label="Aviso de ambiente de homologação"
      className="w-full bg-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider py-1.5 px-4 text-center border-b border-amber-600 shadow-sm flex items-center justify-center gap-2 select-none relative z-50 pt-[max(0.375rem,env(safe-area-inset-top))]"
    >
      <span className="inline-block w-2 h-2 rounded-full bg-amber-950 animate-pulse" aria-hidden="true" />
      <span>Ambiente de Homologação — Dados de Teste</span>
    </div>
  );
}
