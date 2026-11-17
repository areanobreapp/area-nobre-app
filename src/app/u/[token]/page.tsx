import { Metadata } from 'next';
import {
  resolvePublicCommercialUnit,
  getPublicCommercialUnitUrl,
} from '@/lib/commercial-unit-share';
import CommercialUnitPublicView from '@/components/commercial-units/CommercialUnitPublicView';
import { Building2, AlertCircle } from 'lucide-react';
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
      title: 'Unidade Indisponível | Área Nobre',
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

  // Se a unidade não existir, o token for inválido/adulterado, o corretor estiver inativo ou o empreendimento for despublicado:
  if (!result || !result.isAvailable || !result.data) {
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
            maxWidth: '440px',
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
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
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
            Apresentação Indisponível
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
