import type {CodeViewScrollTarget} from '@pierre/diffs';

interface Scrollable {
  scrollTo(target: CodeViewScrollTarget): void;
}

export function scrollToFile(codeView: Scrollable, fileId: string) {
  codeView.scrollTo({type: 'item', id: fileId, align: 'start'});
}
