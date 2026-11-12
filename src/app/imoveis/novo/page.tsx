import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import PropertyForm from '@/components/PropertyForm';
import { prisma } from '@/lib/db';

interface NovoImovelPageProps {
  searchParams?: Promise<{ buildingId?: string }>;
}

export default async function NovoImovelPage({ searchParams }: NovoImovelPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const resolvedParams = searchParams ? await searchParams : {};
  let initialData: any = undefined;

  if (resolvedParams.buildingId) {
    const b = await prisma.building.findUnique({
      where: { id: resolvedParams.buildingId },
    });
    if (b) {
      initialData = {
        buildingId: b.id,
        building: b,
        address: b.address || '',
        number: b.number || '',
        neighborhood: b.neighborhood || '',
        city: b.city || 'Criciúma',
        state: b.state || 'SC',
        zipcode: b.zipcode || '',
        latitude: b.latitude,
        longitude: b.longitude,
        boundary: b.boundary,
        boundaryArea: b.boundaryArea,
        propertyType: 'Apartamento',
      };
    }
  }

  return <PropertyForm currentUserId={user.id} initialData={initialData} />;
}
