export function ReplyInputSkeleton() {
  return (
    <div className="p-3">
      <div
        aria-label="Loading reply input"
        aria-busy="true"
        className="h-9 w-full animate-pulse rounded-field bg-default"
      />
    </div>
  );
}
