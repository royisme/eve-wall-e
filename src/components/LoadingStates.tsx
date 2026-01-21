import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Job card skeleton - matches JobCard dimensions
export function JobCardSkeleton() {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
    </Card>
  );
}

// Resume card skeleton - matches ResumeCard dimensions
export function ResumeCardSkeleton() {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
    </Card>
  );
}

// Workspace skeleton - for the main workspace view
export function WorkspaceSkeleton() {
  return (
    <div className="h-full flex flex-col">
      {/* Header skeleton */}
      <div className="h-14 border-b border-border/40 flex items-center px-4 justify-between">
        <div className="flex items-center gap-4">
          <div className="space-y-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-8 w-[180px]" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex-1 grid grid-cols-2 gap-0">
        <div className="p-6 space-y-4 border-r border-border/40">
          <Skeleton className="h-6 w-32" />
          <SkeletonText lines={8} />
        </div>
        <div className="p-6 space-y-4">
          <Skeleton className="h-6 w-40" />
          <SkeletonText lines={12} />
        </div>
      </div>
    </div>
  );
}

// Full page loader with centered spinner
export function FullPageLoader({ message }: { message?: string }) {
  return (
    <div className="h-dvh flex flex-col items-center justify-center bg-background gap-4">
      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
        <Spinner size="lg" />
      </div>
      {message && (
        <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
      )}
    </div>
  );
}

// Inline loader - for inline loading states
export function InlineLoader({ message, className }: { message?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
      <Spinner size="sm" color="muted" />
      {message && <span className="text-sm">{message}</span>}
    </div>
  );
}

// Jobs list skeleton - multiple job cards
export function JobsListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <JobCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Resume list skeleton - multiple resume cards
export function ResumeListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <ResumeCardSkeleton key={i} />
      ))}
    </div>
  );
}
