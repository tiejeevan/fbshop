import { Skeleton } from '@/components/ui/skeleton';

export default function CustomerLoading() {
  return (
    <div className="container mx-auto py-8 px-4">
       <Skeleton className="h-10 w-24 mb-8" />
       <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
          <div className="space-y-3">
              <Skeleton className="aspect-[4/3] w-full rounded-lg" />
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-md" />)}
              </div>
          </div>
          <div className="space-y-6">
              <Skeleton className="h-6 w-1/4 rounded-md" />
              <Skeleton className="h-12 w-3/4 rounded-md" />
              <Skeleton className="h-6 w-1/3 rounded-md" />
              <Skeleton className="h-8 w-1/4 rounded-md" />
              <Skeleton className="h-20 w-full rounded-md" />
              <Skeleton className="h-6 w-1/5 rounded-md" />
              <div className="flex items-center gap-4 pt-4">
                  <Skeleton className="h-10 w-28 rounded-md" />
                  <Skeleton className="h-12 w-40 rounded-md" />
              </div>
          </div>
       </div>
    </div>
  );
}
