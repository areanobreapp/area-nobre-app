import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  SUPPORT_SETTING_KEY,
  getSupportPhoneSetting,
  setSupportPhoneSetting,
} from '@/lib/support-service';
import { formatBrazilianPhoneDisplay } from '@/lib/whatsapp';

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

    const setting = await prisma.systemSetting.findUnique({
      where: { key: SUPPORT_SETTING_KEY },
    });

    const phone = setting?.value || (await getSupportPhoneSetting());

    return NextResponse.json({
      key: SUPPORT_SETTING_KEY,
      phone,
      formattedPhone: formatBrazilianPhoneDisplay(phone),
      isConfigured: !!setting?.value,
      updatedAt: setting?.updatedAt || null,
      updatedBy: setting?.updatedBy || null,
    });
  } catch (error) {
    console.error('[api/admin/settings] Erro ao carregar configurações:', error);
    return NextResponse.json(
      { error: 'Erro interno ao consultar configurações.' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: 'Acesso negado. Esta rota é restrita a administradores da Área Nobre.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawKey = body.key;

    // Não permitir alteração arbitrária de outras configurações por meio dessa rota
    if (rawKey && rawKey !== SUPPORT_SETTING_KEY) {
      return NextResponse.json(
        { error: `Esta rota permite gerenciar exclusivamente a configuração ${SUPPORT_SETTING_KEY}.` },
        { status: 400 }
      );
    }

    const rawPhone = body.phone || body.value;
    if (!rawPhone || typeof rawPhone !== 'string' || !rawPhone.trim()) {
      return NextResponse.json(
        { error: 'Informe um número de telefone para o WhatsApp de suporte.' },
        { status: 400 }
      );
    }

    const result = await setSupportPhoneSetting(rawPhone, admin.id);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Número de telefone inválido.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'WhatsApp de suporte atualizado com sucesso.',
      key: SUPPORT_SETTING_KEY,
      phone: result.phone,
      formattedPhone: result.formattedPhone,
    });
  } catch (error) {
    console.error('[api/admin/settings] Erro ao atualizar configurações:', error);
    return NextResponse.json(
      { error: 'Erro interno ao salvar configurações.' },
      { status: 500 }
    );
  }
}
