export function ReplyInputSkeleton() {
  return (
    <div
      aria-label="Loading reply input"
      aria-busy="true"
      className="h-9 w-full animate-pulse rounded-field bg-default"
    />
  );
}
