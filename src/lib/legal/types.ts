/**
 * Tipos e enums centrais da infraestrutura de Documentos Legais e Autorizações (Ponto 20)
 * Área Nobre Tecnologia e Inteligência Ltda
 */

export const LegalDocumentType = {
  TERMS_OF_USE: 'TERMS_OF_USE',
  PRIVACY_POLICY: 'PRIVACY_POLICY',
  PROPERTY_AUTHORIZATION: 'PROPERTY_AUTHORIZATION',
} as const;

export type LegalDocumentType = (typeof LegalDocumentType)[keyof typeof LegalDocumentType];

export const LegalDocumentStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type LegalDocumentStatus = (typeof LegalDocumentStatus)[keyof typeof LegalDocumentStatus];

export const LegalAcceptanceAction = {
  ACCEPTED: 'ACCEPTED',         // Concordância contratual (Termos de Uso)
  ACKNOWLEDGED: 'ACKNOWLEDGED', // Registro de apresentação ou ciência (Política de Privacidade)
  CONSENTED: 'CONSENTED',       // Consentimento específico se futuramente exigido
} as const;

export type LegalAcceptanceAction = (typeof LegalAcceptanceAction)[keyof typeof LegalAcceptanceAction];

export const PropertyAuthorizationStatus = {
  NOT_CONFIRMED: 'NOT_CONFIRMED', // Não existe confirmação válida para aquele corretor e imóvel
  CONFIRMED: 'CONFIRMED',         // Existe declaração registrada e ativa
  REVOKED: 'REVOKED',             // A autorização foi posteriormente retirada ou deixou de ser válida
} as const;

export type PropertyAuthorizationStatus = (typeof PropertyAuthorizationStatus)[keyof typeof PropertyAuthorizationStatus];

export interface LegalDocumentDTO {
  id: string;
  type: LegalDocumentType;
  version: string;
  title: string;
  content: string;
  status: LegalDocumentStatus;
  publishedAt: Date | null;
  effectiveDate: Date | null;
  createdAt: Date;
}

export interface PropertyAuthorizationState {
  status: PropertyAuthorizationStatus;
  authorizationId?: string;
  confirmedAt?: Date;
  documentVersion?: string;
  revokedAt?: Date;
  revocationReason?: string;
}
