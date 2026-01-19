import { Skeleton } from "@/src/components/ui/skeleton";

export default function LoreDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Back Button Skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Cinematic Header Skeleton */}
      <div className="relative w-full aspect-[21/9] rounded-lg overflow-hidden">
        {/* Main Image Skeleton */}
        <Skeleton className="absolute inset-0 w-full h-full" />
        
        {/* Title Skeleton (top left) */}
        <div className="absolute top-6 left-6 z-10">
          <Skeleton className="h-10 w-64 mb-2" />
        </div>
        
        {/* Category Skeleton (top right) */}
        <div className="absolute top-6 right-6 z-10">
          <Skeleton className="h-8 w-32" />
        </div>
        
        {/* Image Slider Skeleton (bottom right) */}
        <div className="absolute bottom-10 right-10 z-10 w-96">
          <Skeleton className="h-56 w-full rounded-lg aspect-video" />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content (2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description Container Skeleton */}
          <div className="rounded-lg border-2 border-[#B8860B] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>

          {/* Image Gallery Container Skeleton */}
          <div className="rounded-lg border-2 border-[#B8860B] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
            <Skeleton className="h-8 w-40 mb-4" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          </div>

          {/* Secrets Container Skeleton */}
          <div className="rounded-lg border-2 border-[#B8860B] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
            <Skeleton className="h-8 w-56 mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <Skeleton className="h-[280px] w-full rounded-lg" />
              <Skeleton className="h-[280px] w-full rounded-lg" />
            </div>
          </div>
        </div>

        {/* Sidebar (1 column) */}
        <div className="space-y-6">
          {/* GM Notes Skeleton */}
          <div className="rounded-lg border-2 border-accent-gold/50 bg-accent-gold/5 p-6">
            <Skeleton className="h-8 w-40 mb-4" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


