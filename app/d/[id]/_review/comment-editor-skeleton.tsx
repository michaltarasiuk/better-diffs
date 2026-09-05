import {Card} from '@heroui/react';
import {Skeleton} from '@heroui/react/skeleton';

export function CommentEditorSkeleton() {
  return (
    <Card
      aria-label="Loading comment editor"
      aria-busy="true"
      variant="secondary"
      className="@container m-2 mbs-1"
    >
      <Card.Header>
        <div className="flex [scrollbar-width:none] items-center gap-2 overflow-x-auto">
          <Skeleton className="h-9 w-36 shrink-0 rounded-field md:h-8" />
          <Skeleton className="ms-auto h-8 w-16 shrink-0 rounded-field @xl:ms-0" />
          <Skeleton className="h-8 w-24 shrink-0 rounded-field" />
          <Skeleton className="h-8 w-32 shrink-0 rounded-field" />
        </div>
      </Card.Header>
      <Card.Content>
        <Skeleton className="block h-24 w-full rounded-field px-3 py-2" />
      </Card.Content>
      <Card.Footer className="flex flex-wrap-reverse items-center justify-end gap-2">
        <Skeleton className="h-8 w-17.25 rounded-field" />
        <Skeleton className="h-8 w-22 rounded-field" />
      </Card.Footer>
    </Card>
  );
}
