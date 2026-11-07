import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { LegalDocumentType, LegalDocumentStatus, LegalAcceptanceAction } from './types';

export interface GuardAcceptedTermsResult {
  allowed: boolean;
  user: any | null;
  errorResponse?: NextResponse;
  reason?: 'UNAUTHENTICATED' | 'TERMS_ACCEPTANCE_REQUIRED' | 'INTERNAL_ERROR';
}

/**
 * Validação centralizada de aceite dos Termos de Uso no servidor (Proteção de APIs).
 *
 * Regras:
 * 1. Identifica o usuário autenticado de forma confiável (retorna HTTP 401 se não autenticado).
 * 2. Identifica se existe versão de TERMS_OF_USE com status PUBLISHED e vigente no banco.
 *    - Se não houver documento publicado (apenas DRAFT ou ARCHIVED), a operação é permitida normalmente.
 * 3. Se houver versão publicada vigente:
 *    - Consulta o aceite persistido no banco de dados (tabela LegalAcceptance) com action === 'ACCEPTED'.
 *    - O aceite de uma versão anterior não substitui a versão vigente.
 *    - Se houver pendência de aceite, recusa com HTTP 403 e código estável 'TERMS_ACCEPTANCE_REQUIRED'.
 * 4. Em caso de falha inesperada na consulta, não permite silenciosamente a mutação;
 *    retorna HTTP 500 com código 'TERMS_VERIFICATION_FAILED'.
 */
export async function assertUserAcceptedTerms(providedUser?: any | null): Promise<GuardAcceptedTermsResult> {
  try {
    const user = providedUser !== undefined ? providedUser : await getCurrentUser();
    if (!user) {
      return {
        allowed: false,
        user: null,
        reason: 'UNAUTHENTICATED',
        errorResponse: NextResponse.json(
          { error: 'Não autorizado.', code: 'UNAUTHENTICATED' },
          { status: 401 }
        ),
      };
    }

    // Busca a versão dos Termos de Uso oficialmente PUBLISHED
    const publishedTerms = await prisma.legalDocument.findFirst({
      where: {
        type: LegalDocumentType.TERMS_OF_USE,
        status: LegalDocumentStatus.PUBLISHED,
      },
      orderBy: [
        { effectiveDate: 'desc' },
        { publishedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        version: true,
      },
    });

    // Quando não houver Termos publicados vigentes (ou apenas DRAFT/ARCHIVED), não aplicar bloqueio
    if (!publishedTerms) {
      return { allowed: true, user };
    }

    // Consulta no banco o aceite explícito do usuário para a versão publicada vigente
    const acceptance = await prisma.legalAcceptance.findUnique({
      where: {
        userId_documentId: {
          userId: user.id,
          documentId: publishedTerms.id,
        },
      },
      select: {
        action: true,
      },
    });

    if (!acceptance || acceptance.action !== LegalAcceptanceAction.ACCEPTED) {
      return {
        allowed: false,
        user,
        reason: 'TERMS_ACCEPTANCE_REQUIRED',
        errorResponse: NextResponse.json(
          {
            error: 'É necessário aceitar a versão vigente dos Termos de Uso para utilizar as funcionalidades internas.',
            code: 'TERMS_ACCEPTANCE_REQUIRED',
            documentVersion: publishedTerms.version,
            documentId: publishedTerms.id,
          },
          { status: 403 }
        ),
      };
    }

    return { allowed: true, user };
  } catch (err: any) {
    console.error('[assertUserAcceptedTerms] Erro ao validar termos do usuário:', err);
    return {
      allowed: false,
      user: null,
      reason: 'INTERNAL_ERROR',
      errorResponse: NextResponse.json(
        {
          error: 'Falha na verificação de integridade legal no servidor.',
          code: 'TERMS_VERIFICATION_FAILED',
        },
        { status: 500 }
      ),
    };
  }
}
