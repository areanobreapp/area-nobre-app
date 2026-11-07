'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ShieldCheck, Sparkles, Building2 } from 'lucide-react';
import FieldHelper from '@/components/FieldHelper';
import { FIELD_HELP_ITEMS, FieldHelpKey } from '@/lib/field-help';

export default function DemonstracaoAjudaPage() {
  const allKeys = Object.keys(FIELD_HELP_ITEMS) as FieldHelpKey[];

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Topo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <Link
            href="/imoveis"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              marginBottom: '8px',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={16} /> Voltar para imóveis
          </Link>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Demonstração dos Componentes de Ajuda Contextual
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Pontos 14, 17 e 28 — Ambiente isolado para teste interativo de acessibilidade, clique, toque e posicionamento seguro.
          </p>
        </div>

        <span
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-primary-light)',
            color: 'var(--color-primary)',
            fontSize: '0.82rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <ShieldCheck size={16} />
          <span>Fase 1 / Bloco 2 — Etapa 1</span>
        </span>
      </div>

      {/* Bloco 1: Simulação no Formulário de Cadastro */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={20} color="var(--color-primary)" />
            Simulação de Aplicação em Formulário Imobiliário
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Passe o mouse ou clique no ícone <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>?</span> ao lado de cada rótulo para abrir a explicação. Pressione <kbd style={{ padding: '2px 5px', backgroundColor: '#F1F5F9', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }}>Esc</kbd> ou clique fora para fechar.
          </p>
        </div>

        {/* Grupo 1: Quartos */}
        <div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
            1. Quartos e Suítes
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Suítes
                <FieldHelper helpKey="suites" />
              </label>
              <input
                type="number"
                defaultValue={2}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Dormitórios (sem suíte)
                <FieldHelper helpKey="dormitories" />
              </label>
              <input
                type="number"
                defaultValue={1}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-primary)' }}>
                Total de quartos (calculado)
                <FieldHelper helpKey="totalBedrooms" />
              </label>
              <input
                type="number"
                disabled
                defaultValue={3}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-primary-subtle)', backgroundColor: 'var(--color-primary-light)', fontWeight: 700, color: 'var(--color-primary)' }}
              />
            </div>
          </div>
        </div>

        {/* Grupo 2: Banheiros */}
        <div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
            2. Banheiros e Lavabos
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Banheiros sociais
                <FieldHelper helpKey="socialBathrooms" />
              </label>
              <input
                type="number"
                defaultValue={1}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Lavabos
                <FieldHelper helpKey="lavabos" />
              </label>
              <input
                type="number"
                defaultValue={1}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-primary)' }}>
                Total de banheiros (calculado)
                <FieldHelper helpKey="totalBathrooms" />
              </label>
              <input
                type="number"
                disabled
                defaultValue={4}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-primary-subtle)', backgroundColor: 'var(--color-primary-light)', fontWeight: 700, color: 'var(--color-primary)' }}
              />
            </div>
          </div>
        </div>

        {/* Grupo 3: Vagas */}
        <div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
            3. Vagas de Garagem
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Vagas cobertas
                <FieldHelper helpKey="coveredParkingSpaces" />
              </label>
              <input
                type="number"
                defaultValue={2}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Vagas descobertas
                <FieldHelper helpKey="uncoveredParkingSpaces" />
              </label>
              <input
                type="number"
                defaultValue={1}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-primary)' }}>
                Vagas totais (calculado)
                <FieldHelper helpKey="totalParkingSpaces" />
              </label>
              <input
                type="number"
                disabled
                defaultValue={3}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-primary-subtle)', backgroundColor: 'var(--color-primary-light)', fontWeight: 700, color: 'var(--color-primary)' }}
              />
            </div>
          </div>
        </div>

        {/* Grupo 4: Áreas */}
        <div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
            4. Metragens e Áreas
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Área privativa (m²)
                <FieldHelper helpKey="privateArea" />
              </label>
              <input
                type="number"
                placeholder="Ex: 110"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Área total (m²)
                <FieldHelper helpKey="totalArea" />
              </label>
              <input
                type="number"
                placeholder="Ex: 145"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Área construída (m²)
                <FieldHelper helpKey="builtArea" />
              </label>
              <input
                type="number"
                placeholder="Ex: 220"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Área do terreno (m²)
                <FieldHelper helpKey="landArea" />
              </label>
              <input
                type="number"
                placeholder="Ex: 360"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bloco 2: Catálogo Completo dos 13 Itens Padronizados */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Catálogo Centralizado de Textos Padronizados ({allKeys.length} definições)
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Estrutura exportada em <code>@/lib/field-help</code> pronta para consumo automático nas próximas etapas.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          {allKeys.map((key) => {
            const def = FIELD_HELP_ITEMS[key];
            return (
              <div
                key={key}
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {def.title}
                  </span>
                  <FieldHelper helpKey={key} />
                </div>
                <code style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>key: {key}</code>
                <p style={{ fontSize: '0.80rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: '4px 0 0 0' }}>
                  {def.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bloco 3: Teste de Borda de Tela (Direita e Esquerda) */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Teste de Posicionamento Extremo (Bordas de Tela)
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Verifique se o popover ajusta automaticamente a sua ancoragem quando posicionado rente ao canto direito ou esquerdo da tela:
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Canto Esquerdo</span>
            <FieldHelper helpKey="privateArea" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Canto Direito</span>
            <FieldHelper helpKey="coveredParkingSpaces" />
          </div>
        </div>
      </div>
    </div>
  );
}
