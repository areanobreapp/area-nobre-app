/**
 * ÁREA NOBRE — FASE 2 | BLOCO 05
 * F2.B05.3G.4 — Agrupamento de Imóveis Compartilhados no Mapa e nas Buscas
 * 
 * Centraliza a lógica de consolidação de anúncios ativos vinculados à mesma
 * identidade física (PhysicalProperty), preservando a independência comercial
 * dos corretores e a integridade de imóveis legados e unidades autônomas.
 */

export interface CoListingSummary {
  id: string;
  title: string;
  price: number;
  isPrimaryListing?: boolean;
  listingSlot?: number | null;
  createdAt?: string | Date;
  responsibleBroker?: {
    id: string;
    name: string;
    email?: string;
    profile?: {
      commercialName?: string | null;
      phone?: string | null;
      creci?: string | null;
      avatarUrl?: string | null;
      logoUrl?: string | null;
      city?: string | null;
      tagline?: string | null;
    } | null;
  } | null;
  user?: {
    id?: string;
    name?: string;
    profile?: {
      commercialName?: string | null;
      phone?: string | null;
      creci?: string | null;
      avatarUrl?: string | null;
      logoUrl?: string | null;
    } | null;
  } | null;
}

/**
 * Agrupa anúncios de imóveis convencionais pela identidade física (PhysicalProperty).
 * 
 * Regras estritas:
 * 1. Anúncios com o mesmo physicalPropertyId são agrupados em um único item consolidado.
 * 2. Unidades diferentes no mesmo edifício possuem physicalPropertyId distintos e NÃO são agrupadas.
 * 3. Imóveis diferentes que coincidam em coordenadas ou endereço NÃO são agrupados.
 * 4. Imóveis legados (physicalPropertyId nulo) permanecem individuais.
 * 5. O preço de referência canônico é estritamente PhysicalProperty.sharedPrice.
 */
export function consolidateProperties<T extends {
  id: string;
  price: number;
  title?: string;
  isPrimaryListing?: boolean;
  physicalPropertyId?: string | null;
  physicalProperty?: {
    id: string;
    sharedPrice?: number | string | null;
    activeListingsCount?: number;
    primaryListingId?: string | null;
    listings?: any[];
  } | null;
  responsibleBroker?: any;
  user?: any;
}>(rawProperties: T[]): Array<T & {
  canonicalPrice: number;
  brokerCount: number;
  coListings: CoListingSummary[];
}> {
  const physicalGroupMap = new Map<string, T[]>();
  const legacyProperties: Array<T & {
    canonicalPrice: number;
    brokerCount: number;
    coListings: CoListingSummary[];
  }> = [];

  for (const prop of rawProperties) {
    if (prop.physicalPropertyId) {
      const list = physicalGroupMap.get(prop.physicalPropertyId) || [];
      list.push(prop);
      physicalGroupMap.set(prop.physicalPropertyId, list);
    } else {
      // Imóvel legado sem physicalPropertyId: mantém comportamento individual preexistente
      legacyProperties.push({
        ...prop,
        canonicalPrice: prop.price,
        brokerCount: 1,
        coListings: [
          {
            id: prop.id,
            title: prop.title || 'Anúncio do imóvel',
            price: prop.price,
            isPrimaryListing: true,
            responsibleBroker: prop.responsibleBroker || prop.user,
          },
        ],
      });
    }
  }

  const consolidatedList: Array<T & {
    canonicalPrice: number;
    brokerCount: number;
    coListings: CoListingSummary[];
  }> = [];

  physicalGroupMap.forEach((groupings, physicalId) => {
    // Elege o anúncio de representação (preferência ao primário oficial ou mais antigo)
    const primary = groupings.find((g) => g.isPrimaryListing) || groupings[0];

    // Preço canônico obrigatório: PhysicalProperty.sharedPrice
    const sharedPrice = primary.physicalProperty?.sharedPrice != null
      ? Number(primary.physicalProperty.sharedPrice)
      : primary.price;

    // Consolidação de todos os co-anúncios ativos conhecidos
    const coListingsMap = new Map<string, CoListingSummary>();

    // 1. Co-anúncios presentes na lista atual
    for (const g of groupings) {
      coListingsMap.set(g.id, {
        id: g.id,
        title: g.title || 'Anúncio do imóvel',
        price: sharedPrice,
        isPrimaryListing: Boolean(g.isPrimaryListing),
        responsibleBroker: g.responsibleBroker || g.user,
      });
    }

    // 2. Co-anúncios informados na relação physicalProperty.listings (se disponível)
    if (primary.physicalProperty?.listings && Array.isArray(primary.physicalProperty.listings)) {
      for (const l of primary.physicalProperty.listings) {
        if (!coListingsMap.has(l.id)) {
          coListingsMap.set(l.id, {
            id: l.id,
            title: l.title || 'Anúncio do imóvel',
            price: sharedPrice,
            isPrimaryListing: Boolean(l.isPrimaryListing),
            responsibleBroker: l.responsibleBroker || l.user,
          });
        }
      }
    }

    const coListings = Array.from(coListingsMap.values()).sort((a, b) => {
      if (a.isPrimaryListing && !b.isPrimaryListing) return -1;
      if (!a.isPrimaryListing && b.isPrimaryListing) return 1;
      return 0;
    });

    const brokerCount = Math.max(
      coListings.length,
      primary.physicalProperty?.activeListingsCount || 1
    );

    consolidatedList.push({
      ...primary,
      price: sharedPrice,
      canonicalPrice: sharedPrice,
      brokerCount,
      coListings,
    });
  });

  return [...consolidatedList, ...legacyProperties];
}

/**
 * Consolida matches de buscas para que múltiplas ofertas do mesmo imóvel físico
 * não dupliquem cards nem marcadores no mapa de busca, apresentando os corretores
 * disponíveis sem favorecimento automático.
 */
export function consolidateMatches(rawMatches: any[]): any[] {
  const physicalGroupMap = new Map<string, any[]>();
  const nonGrouped: any[] = [];

  for (const m of rawMatches) {
    if (m.offerType === 'PROPERTY' && m.property) {
      const physId = m.property.physicalPropertyId || m.property.physicalProperty?.id;
      if (physId) {
        const list = physicalGroupMap.get(physId) || [];
        list.push(m);
        physicalGroupMap.set(physId, list);
        continue;
      }
    }
    nonGrouped.push(m);
  }

  const consolidated: any[] = [];

  physicalGroupMap.forEach((matchesGroup) => {
    // Escolhe o match com maior score (ou o primário) para liderar a apresentação
    const leadMatch = [...matchesGroup].sort((a, b) => (b.score || 0) - (a.score || 0))[0];

    const canonicalPrice = leadMatch.property.physicalProperty?.sharedPrice != null
      ? Number(leadMatch.property.physicalProperty.sharedPrice)
      : (Number(leadMatch.property.price) || 0);

    const coListingsMap = new Map<string, CoListingSummary>();

    for (const mg of matchesGroup) {
      if (mg.property) {
        coListingsMap.set(mg.property.id, {
          id: mg.property.id,
          title: mg.property.title,
          price: canonicalPrice,
          isPrimaryListing: Boolean(mg.property.isPrimaryListing),
          responsibleBroker: mg.property.responsibleBroker || mg.property.user,
        });
      }
    }

    if (leadMatch.property.physicalProperty?.listings && Array.isArray(leadMatch.property.physicalProperty.listings)) {
      for (const l of leadMatch.property.physicalProperty.listings) {
        if (!coListingsMap.has(l.id)) {
          coListingsMap.set(l.id, {
            id: l.id,
            title: l.title,
            price: canonicalPrice,
            isPrimaryListing: Boolean(l.isPrimaryListing),
            responsibleBroker: l.responsibleBroker || l.user,
          });
        }
      }
    }

    const coListings = Array.from(coListingsMap.values()).sort((a, b) => {
      if (a.isPrimaryListing && !b.isPrimaryListing) return -1;
      if (!a.isPrimaryListing && b.isPrimaryListing) return 1;
      return 0;
    });

    const brokerCount = Math.max(
      coListings.length,
      leadMatch.property.physicalProperty?.activeListingsCount || 1
    );

    consolidated.push({
      ...leadMatch,
      brokerCount,
      coListings,
      property: {
        ...leadMatch.property,
        price: canonicalPrice,
        canonicalPrice,
        brokerCount,
        coListings,
      },
    });
  });

  return [...consolidated, ...nonGrouped].sort((a, b) => (b.score || 0) - (a.score || 0));
}

