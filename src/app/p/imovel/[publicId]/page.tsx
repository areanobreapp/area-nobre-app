import { Metadata } from 'next';
import { toPublicPropertyDTO } from '@/lib/public-property-dto';
import { getPublicPropertyUrl, getAppBaseUrl } from '@/lib/public-sharing';
import { resolvePublicOffer } from '@/lib/public-offer-resolver';
import PublicPresentationView from '@/components/PublicPresentationView';
import PublicRevokedView from '@/components/PublicRevokedView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ publicId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { publicId } = await params;
  const data = await resolvePublicOffer(publicId);

  if (!data || !data.isAvailable || !data.entity) {
    return {
      title: 'Imóvel Indisponível | Área Nobre',
      description: 'Apresentação imobiliária indisponível no momento.',
      robots: { index: false, follow: false },
    };
  }

  const dto = toPublicPropertyDTO(data.entity, data.offerType, data.brokerOverride);
  const brandName = dto.broker.brandName || 'Área Nobre';
  const creciText = dto.broker.creci ? ` (${dto.broker.creci})` : '';

  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(dto.price);

  const locationText = dto.locationPrecision === 'HIDDEN'
    ? dto.city
    : dto.neighborhood
    ? `${dto.neighborhood}, ${dto.city}`
    : dto.city;

  const title = `${dto.title} — ${formattedPrice} | ${brandName}`;
  const description = `${dto.propertyType} disponível em ${locationText}. Apresentação por ${brandName}${creciText}.`;
  const rawCoverImage = dto.images?.[0]?.url;
  let coverImage: string | undefined = undefined;
  if (rawCoverImage) {
    if (rawCoverImage.startsWith('http://') || rawCoverImage.startsWith('https://')) {
      coverImage = rawCoverImage;
    } else {
      const base = getAppBaseUrl();
      coverImage = `${base}${rawCoverImage.startsWith('/') ? '' : '/'}${rawCoverImage}`;
    }
  }

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      url: getPublicPropertyUrl(publicId),
      siteName: brandName,
      images: coverImage ? [{ url: coverImage }] : [],
      locale: 'pt_BR',
      type: 'website',
    },
  };
}

export default async function PublicPropertyPage({ params }: PageProps) {
  const { publicId } = await params;
  const data = await resolvePublicOffer(publicId);
  const publicUrl = getPublicPropertyUrl(publicId);

  // Se o imóvel não existir, ou tiver sido revogado/desativado,
  // ou a conta do corretor for INACTIVE, exibe a tela neutra de desativação
  if (!data || !data.isAvailable || !data.entity) {
    return <PublicRevokedView publicUrl={publicUrl} />;
  }

  // Gera o DTO rigorosamente sanitizado com identidade dinâmica do corretor (override de parceiro ou proprietário)
  const publicDTO = toPublicPropertyDTO(data.entity, data.offerType, data.brokerOverride);

  return (
    <PublicPresentationView
      property={publicDTO}
      publicUrl={publicUrl}
      isPreview={false}
    />
  );
}
