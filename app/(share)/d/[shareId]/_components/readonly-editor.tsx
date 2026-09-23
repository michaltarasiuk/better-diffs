'use client';

import {useState} from 'react';
import {typographyVariants} from '@heroui/styles';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {RichTextExtension} from '@lexical/rich-text';
import {defineExtension, type SerializedEditorState} from 'lexical';

import {EDITOR_THEME} from '../_lib/editor-theme';

interface ReadonlyEditorProps {
  readonly initialState: SerializedEditorState;
}

export function ReadonlyEditor({initialState}: ReadonlyEditorProps) {
  const [extension] = useState(() =>
    defineExtension({
      name: '@better-diffs/readonly-editor',
      namespace: 'ReadonlyEditor',
      theme: EDITOR_THEME,
      dependencies: [RichTextExtension],
      editable: false,
      $initialEditorState: JSON.stringify(initialState),
      onError(error) {
        console.error(error);
      },
    }),
  );

  return (
    <LexicalExtensionComposer extension={extension} contentEditable={null}>
      <div className="relative block w-full rounded-field px-3 py-2">
        <ContentEditable
          aria-label="Comment"
          className={typographyVariants({type: 'body-sm'}).base({
            className: 'w-full outline-none',
          })}
        />
      </div>
    </LexicalExtensionComposer>
  );
}
