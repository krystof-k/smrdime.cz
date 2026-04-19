export function SkeletonBlock() {
  return (
    <span className="inline-block animate-pulse rounded bg-gray-200 text-transparent dark:bg-gray-700">
      ██
    </span>
  );
}

export function LineSkeleton() {
  return (
    <div className="h-16 w-40 shrink-0 rounded-2xl bg-gray-500/20 p-3 backdrop-blur-sm dark:bg-gray-700/30">
      <div className="grid h-full w-full grid-cols-3 items-center gap-1">
        <div className="mx-auto h-5 w-5 animate-pulse rounded bg-gray-300 dark:bg-gray-600" />
        <div className="mx-auto h-4 w-4 animate-pulse rounded bg-gray-300 dark:bg-gray-600" />
        <div className="ml-auto h-3 w-8 animate-pulse rounded bg-gray-300 dark:bg-gray-600" />
      </div>
    </div>
  );
}
