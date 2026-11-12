import { redirect } from 'next/navigation';

interface MapaPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MapaPage({ searchParams }: MapaPageProps) {
  const resolved = searchParams ? await searchParams : {};
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(resolved)) {
    if (typeof v === 'string') sp.set(k, v);
    else if (Array.isArray(v)) v.forEach((val) => sp.append(k, val));
  }
  const qs = sp.toString();
  redirect(qs ? `/?${qs}` : '/');
}
