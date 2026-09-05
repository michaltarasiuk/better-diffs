import {Card} from '@heroui/react';
import {Skeleton} from '@heroui/react/skeleton';

export function CommentEditorSkeleton() {
  return (
    <Card
      aria-label="Loading comment editor"
      aria-busy="true"
      variant="secondary"
      className="m-2 mbs-1"
    >
      <Card.Header>
        <div className="@container flex flex-wrap items-center gap-2">
          <Skeleton className="me-auto h-8 w-36 shrink-0 rounded-field @xl:me-0" />
          <Skeleton className="h-8 w-16 shrink-0 rounded-field" />
          <Skeleton className="h-8 w-24 shrink-0 rounded-field" />
          <Skeleton className="h-8 w-32 shrink-0 rounded-field" />
        </div>
      </Card.Header>
      <Card.Content>
        <div className="relative min-h-24 rounded-field py-2">
          <Skeleton className="max-h-24 min-h-24 w-full" />
        </div>
      </Card.Content>
      <Card.Footer className="flex flex-wrap-reverse items-center justify-end gap-2">
        <Skeleton className="h-8 w-17.25 rounded-field" />
        <Skeleton className="h-8 w-22 rounded-field" />
      </Card.Footer>
    </Card>
  );
}
