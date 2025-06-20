import { Loader2 } from 'lucide-react';

export default function AdminLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center p-10">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
