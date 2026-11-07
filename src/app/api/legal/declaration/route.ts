import { NextResponse } from 'next/server';
import { getLatestPropertyAuthorizationDocument } from '@/lib/legal/service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const doc = await getLatestPropertyAuthorizationDocument();
    if (!doc) {
      return NextResponse.json(
        { error: 'Declaração não encontrada.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: doc.id,
      type: doc.type,
      version: doc.version,
      title: doc.title,
      content: doc.content,
      status: doc.status,
    });
  } catch (error: any) {
    console.error('Erro ao buscar documento de declaração:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar declaração.' },
      { status: 500 }
    );
  }
}
