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

  // Unidades comerciais das construtoras (Bloco 6B — mesmas regras dos imóveis usados)
  extraBedrooms: {
    title: 'Dormitórios extras',
    description:
      'Quartos sem banheiro exclusivo. Não inclua aqui os quartos que já foram contabilizados como suítes.',
  },
  totalDormitories: {
    title: 'Total de dormitórios',
    description: 'Calculado automaticamente: soma das suítes e dos dormitórios extras.',
  },
  usableArea: {
    title: 'Área útil',
    description:
      'Campo complementar e opcional. Área interna de piso, descontadas as paredes. Não é utilizada no cálculo do R$/m².',
  },
  unitDescription: {
    title: 'Descrição da unidade',
    description:
      'Descreva características ou diferenciais da unidade que não estejam contemplados nos demais campos, como detalhes da planta, acabamentos, posição ou particularidades. Visível aos corretores; não use para informações confidenciais.',
  },
  unitCode: {
    title: 'Identificação da unidade',
    description:
      'Número ou código comercial da unidade (ex.: 802, Casa 05, Lote 14). Deve ser único dentro da torre, bloco ou quadra.',
  },
  unitFloor: {
    title: 'Pavimento',
    description: 'Andar em que a unidade está localizada. Utilize 0 para o térreo.',
  },
  typology: {
    title: 'Tipologia',
    description:
      'Planta-padrão do empreendimento. Ao selecioná-la em um novo cadastro, metragens, características e preço vazios são preenchidos com os valores da tipologia.',
  },
  commercialStatus: {
    title: 'Disponibilidade',
    description:
      'Situação comercial da unidade: Disponível, Reservada, Vendida ou Indisponível temporariamente. Toda alteração fica registrada no histórico.',
  },
  listPrice: {
    title: 'Preço de tabela',
    description: 'Valor oficial de venda da unidade na tabela vigente da construtora.',
  },
  promotionalPrice: {
    title: 'Preço promocional',
    description:
      'Valor promocional opcional. Quando informado, passa a ser o preço de referência e não pode ser superior ao preço de tabela.',
  },
  pricePerSqm: {
    title: 'Preço por m²',
    description:
      'Preço de referência dividido pela metragem oficial do tipo: Área privativa (apartamentos, coberturas, studios e salas), Área construída (casas) ou Área do terreno (lotes). Sem essa metragem, o valor fica indisponível.',
  },
  paymentConditions: {
    title: 'Condições comerciais',
    description:
      'Formas de pagamento autorizadas pela construtora (entrada, parcelas, reforços e correção). Podem valer para todo o empreendimento, uma torre/quadra, uma tipologia ou uma unidade específica.',
  },
  acceptsFinancing: {
    title: 'Aceita financiamento',
    description: 'Indica se a construtora aceita financiamento bancário para a compra desta unidade.',
  },
  acceptsExchange: {
    title: 'Aceita permuta',
    description: 'Indica se a construtora avalia receber outro bem como parte do pagamento.',
  },
  publicNotes: {
    title: 'Observações para corretores',
    description: 'Informações comerciais visíveis aos corretores autenticados na consulta da unidade.',
  },
  internalNotes: {
    title: 'Observações internas',
    description: 'Anotações exclusivas da administração. Nunca são exibidas aos corretores.',
  },
} as const;

export type FieldHelpKey = keyof typeof FIELD_HELP_ITEMS;

/**
 * Recupera o item de ajuda pelo identificador ou retorna null se não encontrado.
 */
export function getFieldHelp(key: FieldHelpKey): FieldHelpItem {
  return FIELD_HELP_ITEMS[key];
}
