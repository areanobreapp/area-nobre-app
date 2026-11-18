import { Metadata } from 'next';
import {
  resolvePublicCommercialUnit,
  getPublicCommercialUnitUrl,
} from '@/lib/commercial-unit-share';
import CommercialUnitPublicView from '@/components/commercial-units/CommercialUnitPublicView';
import { AlertCircle, MessageCircle } from 'lucide-react';
import { formatCurrencyBRL } from '@/lib/commercial-unit-format';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const result = await resolvePublicCommercialUnit(token);

  if (!result || !result.isAvailable || !result.data) {
    return {
      title: `${result?.unavailabilityTitle || 'Unidade Indisponível'} | Área Nobre`,
      description: 'Esta apresentação comercial não está disponível no momento.',
      robots: { index: false, follow: false },
    };
  }

  const { unit, development: dev, broker } = result.data;
  const formattedPrice = unit.currentPrice ? formatCurrencyBRL(unit.currentPrice) : 'Sob Consulta';

  const title = `Unidade ${unit.unitCode} • ${dev.name} — ${formattedPrice} | ${broker.commercialName}`;
  const description = `${unit.unitType} no ${dev.name}. ${unit.privateArea ? `${unit.privateArea}m² privativos, ` : ''}${unit.bedrooms} dormitórios. Apresentação por ${broker.commercialName}.`;

  const coverImage = dev.images?.[0]?.url;

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      url: getPublicCommercialUnitUrl(token),
      siteName: 'Área Nobre',
      images: coverImage ? [{ url: coverImage }] : [],
      locale: 'pt_BR',
      type: 'website',
    },
  };
}

export default async function PublicCommercialUnitPage({ params }: PageProps) {
  const { token } = await params;
  const result = await resolvePublicCommercialUnit(token);
  const publicUrl = getPublicCommercialUnitUrl(token);

  // Se a unidade estiver indisponível (VENDIDA, INDISPONIVEL_TEMPORARIAMENTE, empreendimento não publicado, token inválido, etc.):
  if (!result || !result.isAvailable || !result.data) {
    const broker = result?.broker;
    const isTemporarilyUnavailable =
      result?.unavailabilityCode === 'UNIT_TEMPORARILY_UNAVAILABLE';

    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: '460px',
            width: '100%',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '36px 24px',
            textAlign: 'center',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: isTemporarilyUnavailable ? '#FEF3C7' : '#FEF2F2',
              color: isTemporarilyUnavailable ? '#B45309' : '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <AlertCircle size={28} />
          </div>

          <h1
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#0F172A',
              margin: '0 0 8px',
            }}
          >
            {result?.unavailabilityTitle || 'Apresentação Indisponível'}
          </h1>

          <p
            style={{
              fontSize: '0.88rem',
              color: '#64748B',
              lineHeight: 1.5,
              margin: '0 0 24px',
            }}
          >
            {result?.unavailabilityReason ||
              'Esta unidade comercial não está disponível para visualização pública no momento. Entre em contato diretamente com o corretor responsável para mais detalhes.'}
          </p>

          {/* Preserva a identificação do corretor responsável quando o link é válido (FUNC-01) */}
          {broker && (
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#166534',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '6px',
                }}
              >
                Corretor Responsável
              </div>
              <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0F172A' }}>
                {broker.commercialName}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>
                {broker.creci ? `CRECI: ${broker.creci} • ` : ''}
                {broker.formattedPhone || broker.city || 'Atendimento Autorizado'}
              </div>

              {broker.hasWhatsApp && broker.whatsappUrl && (
                <a
                  href={broker.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    marginTop: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    backgroundColor: '#25D366',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  <MessageCircle size={16} />
                  <span>Falar com o Corretor no WhatsApp</span>
                </a>
              )}
            </div>
          )}

          <div
            style={{
              fontSize: '0.78rem',
              color: '#94A3B8',
              borderTop: '1px solid #F1F5F9',
              paddingTop: '16px',
            }}
          >
            Área Nobre • Consultoria Imobiliária
          </div>
        </div>
      </div>
    );
  }

  return <CommercialUnitPublicView data={result.data} publicUrl={publicUrl} />;
}

