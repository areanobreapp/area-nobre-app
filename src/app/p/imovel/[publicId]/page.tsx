import { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { toPublicPropertyDTO } from '@/lib/public-property-dto';
import { getPublicPropertyUrl, getAppBaseUrl } from '@/lib/public-sharing';
import PublicPresentationView from '@/components/PublicPresentationView';
import PublicRevokedView from '@/components/PublicRevokedView';

interface PageProps {
  params: Promise<{ publicId: string }>;
}

async function getOfferData(publicId: string) {
  // 1. Tenta encontrar Property
  const property = await prisma.property.findUnique({
    where: { publicId },
    include: {
      images: {
        orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
      },
      responsibleBroker: {
        include: { profile: true },
      },
      user: {
        include: { profile: true },
      },
    },
  });

  if (property) {
    const broker = property.responsibleBroker || property.user;
    // Regra da Fase 5.4: Se a conta do corretor estiver desativada (INACTIVE), a página pública deixa de ser servida
    const isBrokerActive = broker ? broker.status === 'ACTIVE' : true;
    return {
      entity: property,
      offerType: 'PROPERTY' as const,
      isPublic: property.isPublic && isBrokerActive,
    };
  }

  // 2. Tenta encontrar Typology
  const typology = await prisma.typology.findUnique({
    where: { publicId },
    include: {
      development: {
        include: {
          images: {
            orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
          },
          responsibleBroker: {
            include: { profile: true },
          },
          user: {
            include: { profile: true },
          },
        },
      },
    },
  });

  if (typology) {
    const broker = typology.development.responsibleBroker || typology.development.user;
    const isBrokerActive = broker ? broker.status === 'ACTIVE' : true;
    return {
      entity: typology,
      offerType: 'TYPOLOGY' as const,
      isPublic: typology.isPublic && isBrokerActive,
    };
  }

  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { publicId } = await params;
  const data = await getOfferData(publicId);

  if (!data || !data.isPublic) {
    return {
      title: 'Imóvel Indisponível | Apresentação Imobiliária',
      description: 'Apresentação digital de imóvel.',
      robots: { index: false, follow: false },
    };
  }

  const dto = toPublicPropertyDTO(data.entity, data.offerType);
  const brandName = dto.broker.brandName || 'Corretora de Imóveis';
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
  const description = `${dto.propertyType} disponível em ${locationText}. Apresentação exclusiva por ${brandName}${creciText}.`;
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
  const data = await getOfferData(publicId);

  const publicUrl = getPublicPropertyUrl(publicId);

  // Se o imóvel não existir, ou tiver sido desativado (isPublic: false),
  // ou a conta do corretor for INACTIVE, exibe a tela neutra de desativação (Fase 5.3 & 5.4)
  if (!data || !data.isPublic) {
    return <PublicRevokedView publicUrl={publicUrl} />;
  }

  // Gera o DTO rigorosamente sanitizado com identidade dinâmica do corretor
  const publicDTO = toPublicPropertyDTO(data.entity, data.offerType);

  return (
    <PublicPresentationView
      property={publicDTO}
      publicUrl={publicUrl}
      isPreview={false}
    />
  );
}
