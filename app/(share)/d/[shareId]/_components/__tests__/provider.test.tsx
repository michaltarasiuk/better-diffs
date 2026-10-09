// @vitest-environment jsdom

import {act, renderHook} from '@testing-library/react';
import type {SerializedEditorState} from 'lexical';
import {use} from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import type {DiffLine} from '@/diffs/lines';
import {jsonToMap} from '@/utils/map';
import {newId} from '@/utils/new-id';

import {ReviewStateContext, ReviewStateProvider} from '../provider';

vi.mock('next/navigation', () => ({
  useParams: () => ({shareId}),
}));

const FILE_ID = 'src/index.ts';
const THREAD_ID = newId();
const LINE = {lineNumber: 3, side: 'additions'} as DiffLine;
const DRAFT = {root: {}} as SerializedEditorState;

let shareId: string;

function storageKey() {
  return `share:v1:${shareId}`;
}

function renderReviewState() {
  return renderHook(() => use(ReviewStateContext), {
    wrapper: ReviewStateProvider,
  });
}

beforeEach(() => {
  shareId = newId();
  localStorage.clear();
});

describe('ReviewStateProvider', () => {
  it('starts every file with the default state', () => {
    const {result} = renderReviewState();

    expect(result.current.getFileState(FILE_ID)).toEqual({
      commentForms: [],
      replyDrafts: {},
      collapsed: false,
      viewed: false,
      version: 0,
    });
  });

  it('toggles a file collapsed', () => {
    const {result} = renderReviewState();

    act(() => result.current.toggleFileCollapsed(FILE_ID));
    expect(result.current.getFileState(FILE_ID).collapsed).toBe(true);

    act(() => result.current.toggleFileCollapsed(FILE_ID));
    expect(result.current.getFileState(FILE_ID).collapsed).toBe(false);
  });

  it('collapses a file when marked viewed', () => {
    const {result} = renderReviewState();

    act(() => result.current.toggleFileViewed(FILE_ID));
    expect(result.current.getFileState(FILE_ID)).toMatchObject({
      viewed: true,
      collapsed: true,
    });

    act(() => result.current.toggleFileViewed(FILE_ID));
    expect(result.current.getFileState(FILE_ID)).toMatchObject({
      viewed: false,
      collapsed: false,
    });
  });

  it('sets a file viewed explicitly', () => {
    const {result} = renderReviewState();

    act(() => result.current.setFileViewed(FILE_ID, true));

    expect(result.current.getFileState(FILE_ID)).toMatchObject({
      viewed: true,
      collapsed: true,
    });
  });

  it('bumps the version on every change', () => {
    const {result} = renderReviewState();

    act(() => result.current.toggleFileCollapsed(FILE_ID));
    act(() => result.current.toggleFileCollapsed(FILE_ID));

    expect(result.current.getFileState(FILE_ID).version).toBe(2);
  });

  it('keeps files independent', () => {
    const {result} = renderReviewState();

    act(() => result.current.toggleFileCollapsed(FILE_ID));

    expect(result.current.getFileState('other.ts').collapsed).toBe(false);
  });

  describe('comment forms', () => {
    it('adds a form at the line', () => {
      const {result} = renderReviewState();

      act(() => result.current.addCommentForm(FILE_ID, LINE));

      expect(result.current.getFileState(FILE_ID).commentForms).toEqual([
        {...LINE, metadata: {type: 'form', formId: expect.any(String)}},
      ]);
    });

    it('stores a draft on the matching form only', () => {
      const {result} = renderReviewState();
      act(() => result.current.addCommentForm(FILE_ID, LINE));
      act(() => result.current.addCommentForm(FILE_ID, LINE));
      const [first, second] = result.current.getFileState(FILE_ID).commentForms;

      act(() =>
        result.current.setCommentFormDraft(
          FILE_ID,
          first!.metadata.formId,
          DRAFT,
        ),
      );

      const forms = result.current.getFileState(FILE_ID).commentForms;
      expect(forms[0]?.metadata.draft).toEqual(DRAFT);
      expect(forms[1]).toEqual(second);
    });

    it('removes a form', () => {
      const {result} = renderReviewState();
      act(() => result.current.addCommentForm(FILE_ID, LINE));
      act(() => result.current.addCommentForm(FILE_ID, LINE));
      const [first, second] = result.current.getFileState(FILE_ID).commentForms;

      act(() =>
        result.current.removeCommentForm(FILE_ID, first!.metadata.formId),
      );

      expect(result.current.getFileState(FILE_ID).commentForms).toEqual([
        second,
      ]);
    });
  });

  describe('reply drafts', () => {
    it('stores and clears a draft per thread', () => {
      const {result} = renderReviewState();
      const otherThreadId = newId();

      act(() => result.current.setReplyDraft(FILE_ID, THREAD_ID, DRAFT));
      act(() => result.current.setReplyDraft(FILE_ID, otherThreadId, DRAFT));
      act(() => result.current.clearReplyDraft(FILE_ID, THREAD_ID));

      expect(result.current.getFileState(FILE_ID).replyDrafts).toEqual({
        [otherThreadId]: DRAFT,
      });
    });
  });

  describe('persistence', () => {
    it('saves file states under the share key', () => {
      const {result} = renderReviewState();

      act(() => result.current.toggleFileViewed(FILE_ID));

      const stored = jsonToMap(localStorage.getItem(storageKey())!);
      expect(stored.get(FILE_ID)).toMatchObject({viewed: true});
    });

    it('restores file states on the next visit', () => {
      const view = renderReviewState();
      act(() => view.result.current.toggleFileViewed(FILE_ID));
      view.unmount();

      const {result} = renderReviewState();

      expect(result.current.getFileState(FILE_ID).viewed).toBe(true);
    });

    it('keeps shares separate', () => {
      const view = renderReviewState();
      act(() => view.result.current.toggleFileViewed(FILE_ID));
      view.unmount();
      shareId = newId();

      const {result} = renderReviewState();

      expect(result.current.getFileState(FILE_ID).viewed).toBe(false);
    });
  });
});
