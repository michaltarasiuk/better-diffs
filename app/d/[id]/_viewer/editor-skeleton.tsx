import {Card} from '@heroui/react';
import {Skeleton} from '@heroui/react/skeleton';

export function DiffEditorSkeleton() {
  return (
    <Card
      aria-label="Loading comment editor"
      aria-busy="true"
      variant="secondary"
      className="m-2 mbs-1"
    >
      <Card.Header>
        <div className="@container flex flex-wrap items-center gap-2">
          <Skeleton className="rounded-field me-auto h-8 w-36 shrink-0 @xl:me-0" />
          <Skeleton className="rounded-field h-8 w-16 shrink-0" />
          <Skeleton className="rounded-field h-8 w-24 shrink-0" />
          <Skeleton className="rounded-field h-8 w-32 shrink-0" />
        </div>
      </Card.Header>
      <Card.Content>
        <div className="rounded-field relative min-h-24 px-3 py-2">
          <Skeleton className="max-h-24 min-h-24 w-full" />
        </div>
      </Card.Content>
      <Card.Footer className="flex flex-wrap-reverse items-center justify-end gap-2">
        <Skeleton className="rounded-field h-8 w-17.25" />
        <Skeleton className="rounded-field h-8 w-22" />
      </Card.Footer>
    </Card>
  );
}
