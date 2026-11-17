import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertUserAcceptedTerms } from '@/lib/legal/service';
import { validateNonNegativeInt, validateNonNegativeFloat } from '@/lib/validation';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const termsCheck = await assertUserAcceptedTerms(user);
    if (!termsCheck.allowed) {
      return termsCheck.errorResponse!;
    }

    const { id: developmentId } = await params;

    const typologies = await prisma.typology.findMany({
      where: { developmentId },
      include: {
        materials: {
          where: {
            category: 'PLANTA_TIPOLOGIA',
            isActive: true,
            ...(user.role === 'ADMIN' ? {} : { visibility: { in: ['PUBLIC', 'BROKERS_ONLY'] } }),
          },
          orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
        },
      },
      orderBy: { price: 'asc' },
    });

    return NextResponse.json({ success: true, typologies }, { status: 200 });
  } catch (error: any) {
    console.error('[API Development Typologies GET Error]:', error);
    return NextResponse.json({ error: 'Falha ao buscar tipologias.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const termsCheck = await assertUserAcceptedTerms(user);
    if (!termsCheck.allowed) {
      return termsCheck.errorResponse!;
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Apenas administradores podem salvar tipologias.' },
        { status: 403 }
      );
    }

    const { id: developmentId } = await params;

    const development = await prisma.development.findUnique({
      where: { id: developmentId },
      include: { typologies: true },
    });

    if (!development) {
      return NextResponse.json({ error: 'Empreendimento não encontrado.' }, { status: 404 });
    }

    const body = await req.json();

    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Tipologia';
    const propertyType = typeof body.propertyType === 'string' && body.propertyType.trim() ? body.propertyType.trim() : 'Apartamento';

    // Conversão de valor de preço
    let price = 0;
    if (typeof body.price === 'number') {
      price = body.price;
    } else if (typeof body.price === 'string') {
      const cleanDigits = body.price.replace(/\D/g, '');
      if (cleanDigits) {
        price = parseFloat(cleanDigits);
      }
    }

    const vPrivateArea = validateNonNegativeFloat(body.privateArea, 'Área privativa');
    const vBuiltArea = validateNonNegativeFloat(body.builtArea, 'Área construída');
    const vTotalArea = validateNonNegativeFloat(body.totalArea, 'Área total');

    const vSuites = validateNonNegativeInt(body.suites, 'Suítes');
    const vOtherBed = validateNonNegativeInt(body.otherBedrooms, 'Outros quartos');
    const vBedrooms = validateNonNegativeInt(body.bedrooms, 'Quartos');

    const suites = vSuites.value !== null ? vSuites.value : 0;
    const otherBedrooms = vOtherBed.value;
    const bedrooms = otherBedrooms !== null ? suites + otherBedrooms : (vBedrooms.value !== null ? vBedrooms.value : suites);

    const vSocial = validateNonNegativeInt(body.socialBathrooms, 'Banheiros sociais');
    const vLavabos = validateNonNegativeInt(body.lavabos, 'Lavabos');
    const vBaths = validateNonNegativeInt(body.bathrooms, 'Banheiros');

    const socialBathrooms = vSocial.value;
    const lavabos = vLavabos.value;
    let bathrooms = vBaths.value !== null ? vBaths.value : suites;
    if (socialBathrooms !== null || lavabos !== null) {
      bathrooms = suites + (socialBathrooms ?? 0) + (lavabos ?? 0);
    }

    const vCovered = validateNonNegativeInt(body.coveredParkingSpaces, 'Vagas cobertas');
    const vUncovered = validateNonNegativeInt(body.uncoveredParkingSpaces, 'Vagas descobertas');
    const vParking = validateNonNegativeInt(body.parkingSpaces, 'Vagas de garagem');

    const coveredParkingSpaces = vCovered.value;
    const uncoveredParkingSpaces = vUncovered.value;
    let parkingSpaces = vParking.value !== null ? vParking.value : 0;
    if (coveredParkingSpaces !== null || uncoveredParkingSpaces !== null) {
      parkingSpaces = (coveredParkingSpaces ?? 0) + (uncoveredParkingSpaces ?? 0);
    }

    const typologyData = {
      name,
      propertyType,
      price,
      privateArea: vPrivateArea.value,
      builtArea: vBuiltArea.value,
      totalArea: vTotalArea.value,
      bedrooms,
      suites,
      otherBedrooms,
      bathrooms,
      socialBathrooms,
      lavabos,
      parkingSpaces,
      coveredParkingSpaces,
      uncoveredParkingSpaces,
      status: body.status || 'Disponível',
      notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
      acceptsExchange: body.acceptsExchange !== undefined ? Boolean(body.acceptsExchange) : null,
      exchangeNotes: typeof body.exchangeNotes === 'string' && body.exchangeNotes.trim() ? body.exchangeNotes.trim() : null,
      hasBarbecue: body.hasBarbecue !== undefined ? Boolean(body.hasBarbecue) : null,
      hasElevator: body.hasElevator !== undefined ? Boolean(body.hasElevator) : null,
      isPenthouse: body.isPenthouse !== undefined ? Boolean(body.isPenthouse) : null,
    };

    let typology;
    if (body.id && development.typologies.some((t) => t.id === body.id)) {
      typology = await prisma.typology.update({
        where: { id: body.id },
        data: typologyData,
        include: { materials: true },
      });
    } else {
      typology = await prisma.typology.create({
        data: {
          ...typologyData,
          developmentId,
        },
        include: { materials: true },
      });
    }

    return NextResponse.json({ success: true, typology }, { status: 201 });
  } catch (error: any) {
    console.error('[API Development Typologies POST Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao salvar tipologia.' },
      { status: 500 }
    );
  }
}
