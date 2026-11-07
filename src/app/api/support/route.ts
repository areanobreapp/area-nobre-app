import { NextResponse } from 'next/server';
import { getSupportContactDTO } from '@/lib/support-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const contact = await getSupportContactDTO();
    return NextResponse.json(contact, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('[api/support] Erro ao obter dados de suporte:', error);
    return NextResponse.json(
      {
        phone: '5548999273694',
        formattedPhone: '(48) 99927-3694',
        message: 'Olá! Preciso de ajuda com a Área Nobre.',
        loginMessage: 'Olá! Preciso de ajuda para acessar a Área Nobre.',
      },
      { status: 200 }
    );
  }
}
