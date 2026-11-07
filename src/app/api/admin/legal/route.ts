import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import {
  listLegalDocumentsWithStats,
  createDraftLegalDocument,
} from '@/lib/legal/service';
import { LegalDocumentType } from '@/lib/legal/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: 'Acesso negado. Esta rota é restrita a administradores da Área Nobre.' },
        { status: 403 }
      );
    }

    const documents = await listLegalDocumentsWithStats();

    // Agrupa por tipo para facilidade de renderização no painel
    const grouped = {
      [LegalDocumentType.TERMS_OF_USE]: documents.filter(
        (d) => d.type === LegalDocumentType.TERMS_OF_USE
      ),
      [LegalDocumentType.PRIVACY_POLICY]: documents.filter(
        (d) => d.type === LegalDocumentType.PRIVACY_POLICY
      ),
      [LegalDocumentType.PROPERTY_AUTHORIZATION]: documents.filter(
        (d) => d.type === LegalDocumentType.PROPERTY_AUTHORIZATION
      ),
    };

    return NextResponse.json({
      success: true,
      documents,
      grouped,
    });
  } catch (error: any) {
    console.error('[api/admin/legal] Erro ao listar documentos:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao consultar documentos jurídicos.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: 'Acesso negado. Esta rota é restrita a administradores da Área Nobre.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { type, version, title, content } = body;

    if (!type || !version || !title || !content) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios: tipo, versão, título e conteúdo.' },
        { status: 400 }
      );
    }

    const validTypes = Object.values(LegalDocumentType);
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Tipo de documento inválido. Válidos: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const created = await createDraftLegalDocument({
      type,
      version,
      title,
      content,
      createdById: admin.id,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Rascunho da versão ${created.version} criado com sucesso.`,
        document: created,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[api/admin/legal] Erro ao criar rascunho:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao cadastrar rascunho de documento.' },
      { status: 400 }
    );
  }
}
