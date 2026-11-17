import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getMaterialWithAuthCheck } from '@/lib/commercial-material-service';
import { createMaterialStreamResponse } from '@/lib/material-storage';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const check = await getMaterialWithAuthCheck(id, user);
    if (!check.material) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    // Serve o arquivo em streaming para visualização inline segura em nova aba
    return await createMaterialStreamResponse(check.material, 'inline');
  } catch (err: any) {
    console.error('[API Material View Error]:', err);
    return NextResponse.json({ error: 'Erro ao visualizar material.' }, { status: 500 });
  }
}
