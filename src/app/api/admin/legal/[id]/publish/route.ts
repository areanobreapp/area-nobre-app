import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { publishLegalDocument } from '@/lib/legal/service';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: 'Acesso negado. Esta rota é restrita a administradores da Área Nobre.' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const isSimulation = body.isSimulation === true;

    const published = await publishLegalDocument(id, {
      adminUserId: admin.id,
      isSimulation,
    });

    return NextResponse.json({
      success: true,
      message: `Documento "${published.title}" (v${published.version}) publicado com sucesso.`,
      document: published,
    });
  } catch (error: any) {
    console.error('[api/admin/legal/[id]/publish] Erro ao publicar documento:', error);
    return NextResponse.json(
      { error: error.message || 'Falha na publicação do documento.' },
      { status: 400 }
    );
  }
}
