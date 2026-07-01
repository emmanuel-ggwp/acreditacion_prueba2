import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-gray-500">
      <LoadingSpinner size="lg" />
      <p className="text-sm">Cargando…</p>
    </div>
  );
}
