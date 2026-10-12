import {Card, Skeleton} from '@heroui/react';

export function CommentEditorSkeleton() {
  return (
    <Card
      aria-label="Loading comment editor"
      aria-busy="true"
      className="@container"
    >
      <Card.Header>
        <div className="-m-1 flex [scrollbar-width:none] items-center gap-2 overflow-x-auto p-1">
          <Skeleton className="h-9 w-36 shrink-0 rounded-field md:h-8" />
          <Skeleton className="ms-auto h-9 w-18 shrink-0 rounded-field md:h-8 md:w-16 @xl:ms-0" />
          <Skeleton className="h-9 w-27 shrink-0 rounded-field md:h-8 md:w-24" />
          <Skeleton className="h-9 w-36 shrink-0 rounded-field md:h-8 md:w-32" />
        </div>
      </Card.Header>

      <Card.Content>
        <div className="flex max-h-48 min-h-24 w-full flex-col rounded-field px-3 py-2">
          <Skeleton className="h-5 w-40 rounded-md" />
        </div>
      </Card.Content>

      <Card.Footer className="flex flex-wrap-reverse items-center justify-end gap-2">
        <Skeleton className="h-9 w-17.25 rounded-field md:h-8" />
        <Skeleton className="h-9 w-22 rounded-field md:h-8" />
      </Card.Footer>
    </Card>
  );
}
