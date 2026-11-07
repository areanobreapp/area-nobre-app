import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  LegalDocumentType,
  LegalAcceptanceAction,
} from '@/lib/legal/types';
import {
  getActiveLegalDocument,
  recordUserAcceptance,
  getUserLegalStatus,
} from '@/lib/legal/service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Acesso não autorizado. Faça login para registrar seu aceite.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { acceptTerms, acknowledgePrivacy } = body;

    if (!acceptTerms && !acknowledgePrivacy) {
      return NextResponse.json(
        { error: 'Nenhuma ação de aceite ou ciência informada.' },
        { status: 400 }
      );
    }

    const [activeTerms, activePrivacy] = await Promise.all([
      getActiveLegalDocument(LegalDocumentType.TERMS_OF_USE),
      getActiveLegalDocument(LegalDocumentType.PRIVACY_POLICY),
    ]);

    // Registra aceite dos Termos de Uso se solicitado
    if (acceptTerms) {
      if (!activeTerms) {
        return NextResponse.json(
          { error: 'Não há versão ativa e publicada dos Termos de Uso no momento.' },
          { status: 400 }
        );
      }
      await recordUserAcceptance({
        userId: user.id,
        documentId: activeTerms.id,
        action: LegalAcceptanceAction.ACCEPTED,
      });
    }

    // Registra ciência da Política de Privacidade se solicitada
    if (acknowledgePrivacy) {
      if (!activePrivacy) {
        return NextResponse.json(
          { error: 'Não há versão ativa e publicada da Política de Privacidade no momento.' },
          { status: 400 }
        );
      }
      await recordUserAcceptance({
        userId: user.id,
        documentId: activePrivacy.id,
        action: LegalAcceptanceAction.ACKNOWLEDGED,
      });
    }

    const updatedStatus = await getUserLegalStatus(user.id);

    return NextResponse.json({
      success: true,
      message: 'Manifestação registrada com sucesso.',
      status: updatedStatus,
    });
  } catch (error) {
    console.error('[api/legal/accept] Erro ao registrar aceite:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar o registro de aceite.' },
      { status: 500 }
    );
  }
}
