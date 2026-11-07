import React from 'react';
import Link from 'next/link';
import { Building2, ArrowLeft, ShieldAlert, FileText, CheckCircle2, Clock } from 'lucide-react';
import { getActiveLegalDocument } from '@/lib/legal/service';
import { LegalDocumentType } from '@/lib/legal/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Termos de Uso e Responsabilidade — Área Nobre',
  description: 'Termos e condições gerais de uso e responsabilidade profissional da plataforma Área Nobre.',
};

export default async function TermosDeUsoPage() {
  const document = await getActiveLegalDocument(LegalDocumentType.TERMS_OF_USE);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F9FAFB', padding: '40px 16px' }}>
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        {/* Topo / Navegação de Retorno */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#4B5563',
              textDecoration: 'none',
              fontSize: '0.88rem',
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={16} />
            <span>Voltar ao início</span>
          </Link>

          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #1E4620 0%, #2D5A27 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}
            >
              <Building2 size={18} strokeWidth={2.4} />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#111827', letterSpacing: '-0.02em' }}>
              ÁREA NOBRE
            </span>
          </Link>
        </div>

        {/* Card Principal */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E5E7EB',
            padding: '40px 32px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          {document ? (
            // Caso exista versão publicada no banco
            <div>
              <div style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: '20px', marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '20px',
                      backgroundColor: '#DCFCE7',
                      color: '#166534',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                    }}
                  >
                    Versão {document.version}
                  </span>
                  {document.effectiveDate && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.80rem', color: '#6B7280' }}>
                      <Clock size={14} />
                      Vigência a partir de {new Date(document.effectiveDate).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', margin: 0, lineHeight: 1.25 }}>
                  {document.title}
                </h1>
              </div>

              {/* Conteúdo integral renderizado do banco */}
              <div
                style={{
                  fontSize: '0.94rem',
                  lineHeight: 1.7,
                  color: '#374151',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {document.content}
              </div>
            </div>
          ) : (
            // Caso NÃO haja versão publicada (Em processo de homologação jurídica)
            <div style={{ textAlign: 'center', padding: '40px 16px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#F3F4F6',
                  color: '#4B5563',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 18px auto',
                }}
              >
                <FileText size={28} />
              </div>

              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#111827', marginBottom: '10px' }}>
                Termos de Uso e Responsabilidade
              </h1>

              <div
                style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  marginBottom: '20px',
                }}
              >
                Em fase final de homologação jurídica
              </div>

              <p style={{ fontSize: '0.92rem', color: '#4B5563', lineHeight: 1.6, maxWidth: '580px', margin: '0 auto 24px auto' }}>
                Os Termos de Uso e Responsabilidade da plataforma Área Nobre encontram-se em processo formal de revisão jurídica.
                O texto integral oficial será disponibilizado publicamente nesta página assim que a homologação for concluída.
              </p>

              <div
                style={{
                  backgroundColor: '#F9FAFB',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  padding: '16px 20px',
                  maxWidth: '520px',
                  margin: '0 auto 28px auto',
                  fontSize: '0.84rem',
                  color: '#6B7280',
                  textAlign: 'left',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontWeight: 700, color: '#1F2937', marginBottom: '4px' }}>
                  Área Nobre Tecnologia e Inteligência Ltda
                </div>
                <div>CNPJ: 69.723.459/0001-10</div>
                <div>Rua Henrique Lage, 690, Centro, Criciúma/SC — CEP 88801-010</div>
                <div style={{ marginTop: '6px' }}>
                  Contato oficial: <a href="mailto:areanobreapp@gmail.com" style={{ color: '#1E4620', fontWeight: 600 }}>areanobreapp@gmail.com</a>
                </div>
              </div>

              <Link
                href="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  backgroundColor: '#1E4620',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                }}
              >
                Voltar à página inicial
              </Link>
            </div>
          )}

          {/* Rodapé Institucional da Página */}
          <div
            style={{
              marginTop: '40px',
              paddingTop: '20px',
              borderTop: '1px solid #F3F4F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              fontSize: '0.78rem',
              color: '#9CA3AF',
            }}
          >
            <span>© {new Date().getFullYear()} Área Nobre Tecnologia e Inteligência Ltda.</span>
            <div style={{ display: 'flex', gap: '16px' }}>
              <Link href="/politica-de-privacidade" style={{ color: '#6B7280', textDecoration: 'none' }}>
                Política de Privacidade
              </Link>
              <a href="mailto:areanobreapp@gmail.com" style={{ color: '#6B7280', textDecoration: 'none' }}>
                Contato
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
