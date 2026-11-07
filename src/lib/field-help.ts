/**
 * Textos padronizados de ajuda contextual para características imobiliárias.
 * Área Nobre — Pontos 14, 17 e 28 (Fase 1 / Bloco 2)
 */

export interface FieldHelpItem {
  title: string;
  description: string;
}

export const FIELD_HELP_ITEMS = {
  // Vagas de garagem
  coveredParkingSpaces: {
    title: 'Vagas cobertas',
    description:
      'Vagas protegidas contra sol e chuva por uma cobertura. A cobertura não significa, necessariamente, que a vaga seja fixa ou privativa.',
  },
  uncoveredParkingSpaces: {
    title: 'Vagas descobertas',
    description:
      'Vagas destinadas ao estacionamento, mas sem cobertura de proteção contra sol e chuva.',
  },
  totalParkingSpaces: {
    title: 'Vagas totais',
    description: 'Soma das vagas cobertas e descobertas cadastradas no imóvel.',
  },

  // Áreas
  privateArea: {
    title: 'Área privativa',
    description:
      'Área de uso exclusivo da unidade, conforme a documentação do imóvel. Pode incluir espaços privativos externos.',
  },
  totalArea: {
    title: 'Área total',
    description:
      'Área total informada na documentação do imóvel, podendo incluir a participação proporcional nas áreas comuns. A inclusão de vagas depende do registro documental.',
  },
  builtArea: {
    title: 'Área construída',
    description:
      'Área edificada do imóvel, conforme o critério de medição adotado. Inclui as paredes e as áreas cobertas contabilizadas.',
  },
  landArea: {
    title: 'Área do terreno',
    description: 'Metragem total do lote ou terreno.',
  },

  // Quartos e Banheiros
  suites: {
    title: 'Suítes',
    description: 'Quartos que possuem banheiro exclusivo.',
  },
  dormitories: {
    title: 'Dormitórios (sem suíte)',
    description:
      'Quartos sem banheiro exclusivo. Não inclua aqui os quartos que já foram contabilizados como suítes.',
  },
  totalBedrooms: {
    title: 'Total de quartos',
    description: 'Soma das suítes e dos dormitórios sem suíte.',
  },
  socialBathrooms: {
    title: 'Banheiros sociais',
    description: 'Banheiros com área de banho que não pertencem às suítes.',
  },
  lavabos: {
    title: 'Lavabos',
    description: 'Ambientes sanitários sem chuveiro ou área de banho.',
  },
  totalBathrooms: {
    title: 'Total de banheiros',
    description:
      'Soma dos banheiros das suítes, banheiros sociais e lavabos. Cada suíte corresponde a um banheiro no cálculo.',
  },
} as const;

export type FieldHelpKey = keyof typeof FIELD_HELP_ITEMS;

/**
 * Recupera o item de ajuda pelo identificador ou retorna null se não encontrado.
 */
export function getFieldHelp(key: FieldHelpKey): FieldHelpItem {
  return FIELD_HELP_ITEMS[key];
}
