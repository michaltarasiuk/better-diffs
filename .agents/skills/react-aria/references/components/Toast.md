# Toast

{docs.exports.UNSTABLE_Toast.description}

## Vanilla CSS example

```tsx
import {MyToastRegion, queue} from 'vanilla-starter/Toast';
import {Button} from 'vanilla-starter/Button';

function Example(props) {
  return (
    <div>
      <MyToastRegion />
      <Button
        onPress={() =>
          queue.add(
            {
              title: props.title || 'Files uploaded',
              description:
                props.description || '3 files uploaded successfully.',
            },
            props.timeout ? {timeout: props.timeout} : undefined,
          )
        }
      >
        Show Toast
      </Button>
    </div>
  );
}
```

### Toast.tsx

```tsx
'use client';
import {
  UNSTABLE_ToastRegion as ToastRegion,
  UNSTABLE_Toast as Toast,
  UNSTABLE_ToastQueue as ToastQueue,
  UNSTABLE_ToastContent as ToastContent,
  type ToastProps,
  Text,
} from 'react-aria-components/Toast';
import {Button} from './Button';
import {X} from 'lucide-react';
import './Toast.css';
import {flushSync} from 'react-dom';
import {type CSSProperties} from 'react';

// Define the type for your toast content. This interface defines the properties of your toast content, affecting what you
// pass to the queue calls as arguments.
interface MyToastContent {
  title: string;
  description?: string;
}

// This is a global toast queue, to be imported and called where ever you want to queue a toast via queue.add().
export const queue = new ToastQueue<MyToastContent>({
  // Wrap state updates in a CSS view transition.
  wrapUpdate(fn) {
    if ('startViewTransition' in document) {
      document.startViewTransition(() => {
        flushSync(fn);
      });
    } else {
      fn();
    }
  },
});

export function MyToastRegion() {
  return (
    // The ToastRegion should be rendered at the root of your app.
    <ToastRegion queue={queue}>
      {({toast}) => (
        <MyToast
          toast={toast}
          style={{viewTransitionName: toast.key} as CSSProperties}
        >
          <ToastContent>
            <Text slot="title">{toast.content.title}</Text>
            {toast.content.description && (
              <Text slot="description">{toast.content.description}</Text>
            )}
          </ToastContent>
          <Button slot="close" aria-label="Close" variant="quiet">
            <X size={16} />
          </Button>
        </MyToast>
      )}
    </ToastRegion>
  );
}

export function MyToast(props: ToastProps<MyToastContent>) {
  return <Toast {...props} />;
}
```

### Toast.css

```css
@import './theme.css';

.react-aria-ToastRegion {
  position: fixed;
  bottom: var(--spacing-4);
  right: var(--spacing-4);
  z-index: 100;
  display: flex;
  flex-direction: column-reverse;
  gap: var(--spacing-2);
  border-radius: var(--radius-lg);
  outline: none;

  &[data-focus-visible] {
    outline: 2px solid var(--focus-ring-color);
    outline-offset: 2px;
  }
}

.react-aria-Toast {
  width: 230px;
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  background: var(--highlight-background);
  padding: var(--spacing-3) var(--spacing-4);
  border-radius: var(--radius-lg);
  outline: none;
  forced-color-adjust: none;
  view-transition-class: toast;

  &[data-focus-visible] {
    outline: 2px solid var(--focus-ring-color);
    outline-offset: 2px;
  }

  .react-aria-ToastContent {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-width: 0;
    font: var(--font-size) system-ui;

    [slot='title'] {
      font-weight: 600;
      color: var(--highlight-foreground);
    }

    [slot='description'] {
      font-size: var(--font-size-sm);
      color: var(--highlight-foreground);
    }
  }

  .react-aria-Button[slot='close'] {
    flex: 0 0 auto;
    background: none;
    border: none;
    appearance: none;
    border-radius: var(--radius-sm);
    height: var(--spacing-8);
    width: var(--spacing-8);
    color: var(--highlight-foreground);
    padding: 0;
    outline: none;
    -webkit-tap-highlight-color: transparent;

    &[data-hovered] {
      background: var(--tint-900);
      box-shadow: none;
    }

    &[data-focus-visible] {
      outline: 2px solid var(--highlight-foreground);
      outline-offset: 2px;
    }

    &[data-pressed] {
      background: var(--highlight-pressed);
      box-shadow: none;
    }
  }
}

::view-transition-new(.toast):only-child {
  animation: slide-in 400ms;
}

::view-transition-old(.toast):only-child {
  animation: slide-out 400ms;
  animation-fill-mode: forwards;
}

@keyframes slide-out {
  to {
    translate: 100% 0;
    opacity: 0;
    visibility: hidden;
  }
}

@keyframes slide-in {
  from {
    translate: 100% 0;
    opacity: 0;
  }
}
```

## Tailwind example

```tsx
import {MyToastRegion, queue} from 'tailwind-starter/Toast';
import {Button} from 'tailwind-starter/Button';

function Example(props) {
  return (
    <div>
      <MyToastRegion />
      <Button
        onPress={() =>
          queue.add(
            {
              title: props.title || 'Files uploaded',
              description:
                props.description || '3 files uploaded successfully.',
            },
            props.timeout ? {timeout: props.timeout} : undefined,
          )
        }
      >
        Show Toast
      </Button>
    </div>
  );
}
```

### Toast.tsx

```tsx
'use client';
import React, {type CSSProperties} from 'react';
import {
  UNSTABLE_ToastRegion as ToastRegion,
  UNSTABLE_Toast as Toast,
  UNSTABLE_ToastQueue as ToastQueue,
  UNSTABLE_ToastContent as ToastContent,
  type ToastProps,
  Button,
  Text,
} from 'react-aria-components/Toast';
import {XIcon} from 'lucide-react';
import {composeTailwindRenderProps} from './utils';
import {flushSync} from 'react-dom';
import './Toast.css';

// Define the type for your toast content. This interface defines the properties of your toast content, affecting what you
// pass to the queue calls as arguments.
interface MyToastContent {
  title: string;
  description?: string;
}

// This is a global toast queue, to be imported and called where ever you want to queue a toast via queue.add().
export const queue = new ToastQueue<MyToastContent>({
  // Wrap state updates in a CSS view transition.
  wrapUpdate(fn) {
    if ('startViewTransition' in document) {
      document.startViewTransition(() => {
        flushSync(fn);
      });
    } else {
      fn();
    }
  },
});

export function MyToastRegion() {
  return (
    // The ToastRegion should be rendered at the root of your app.
    <ToastRegion
      queue={queue}
      className="fixed right-4 bottom-4 flex flex-col-reverse gap-2 rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 focus-visible:outline-solid"
    >
      {({toast}) => (
        <MyToast toast={toast}>
          <ToastContent className="flex min-w-0 flex-1 flex-col">
            <Text slot="title" className="text-sm font-semibold text-white">
              {toast.content.title}
            </Text>
            {toast.content.description && (
              <Text slot="description" className="text-xs text-white">
                {toast.content.description}
              </Text>
            )}
          </ToastContent>
          <Button
            slot="close"
            aria-label="Close"
            className="flex h-8 w-8 flex-none appearance-none items-center justify-center rounded-sm border-none bg-transparent p-0 text-white outline-none [-webkit-tap-highlight-color:transparent] hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus-visible:outline-solid pressed:bg-white/15"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </MyToast>
      )}
    </ToastRegion>
  );
}

export function MyToast(props: ToastProps<MyToastContent>) {
  return (
    <Toast
      {...props}
      style={{viewTransitionName: props.toast.key} as CSSProperties}
      className={composeTailwindRenderProps(
        props.className,
        'flex w-[230px] items-center gap-4 rounded-lg bg-blue-600 px-4 py-3 font-sans outline-none [view-transition-class:toast] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 focus-visible:outline-solid forced-colors:outline',
      )}
    />
  );
}
```

## Content

### Title and description

Use the `"title"` and `"description"` slots within `<ToastContent>` to provide structured content for the toast. The title is required, and description is optional.

## Vanilla CSS example

```tsx
import {queue} from 'vanilla-starter/Toast';
import {Button} from 'vanilla-starter/Button';

function Example() {
  return (
    <Button
      onPress={() =>
        queue.add({
          title: 'Update available',
          description: 'A new version is ready to install.',
        })
      }
    >
      Check for updates
    </Button>
  );
}
```

## Tailwind example

```tsx
import {queue} from 'tailwind-starter/Toast';
import {Button} from 'tailwind-starter/Button';

function Example() {
  return (
    <Button
      onPress={() =>
        queue.add({
          title: 'Update available',
          description: 'A new version is ready to install.',
        })
      }
    >
      Check for updates
    </Button>
  );
}
```

### Close button

Include a `<Button slot="close">` to allow users to dismiss the toast manually. This is important for accessibility.

<InlineAlert variant="notice">
  <Heading>Accessibility</Heading>
  <Content>We recommend that the close button should be rendered as a sibling of `<ToastContent>` rather than inside it, so that screen readers announce the toast content without the close button first.</Content>
</InlineAlert>

## Dismissal

Use the `timeout` option to automatically dismiss toasts after a period of time. For accessibility, toasts should have a minimum timeout of **5 seconds**. Timers automatically pause when the user focuses or hovers over a toast.

## Vanilla CSS example

```tsx
import {queue} from 'vanilla-starter/Toast';
import {Button} from 'vanilla-starter/Button';

function Example() {
  return (
    <Button
      onPress={() =>
        queue.add({title: 'File has been saved!'}, {timeout: 5000})
      }
    >
      Save file
    </Button>
  );
}
```

## Tailwind example

```tsx
import {queue} from 'tailwind-starter/Toast';
import {Button} from 'tailwind-starter/Button';

function Example() {
  return (
    <Button
      onPress={() =>
        queue.add({title: 'File has been saved!'}, {timeout: 5000})
      }
    >
      Save file
    </Button>
  );
}
```

<InlineAlert variant="notice">
  <Heading>Accessibility</Heading>
  <Content>Only auto-dismiss toasts when the information is not critical, or may be found elsewhere. Some users may require additional time to read toasts, and screen zoom users may miss them entirely.</Content>
</InlineAlert>

### Programmatic dismissal

Toasts can be programmatically dismissed using the key returned from `queue.add()`. This is useful when a toast becomes irrelevant before the user manually closes it.

## Vanilla CSS example

```tsx
import {queue} from 'vanilla-starter/Toast';
import {Button} from 'vanilla-starter/Button';
import {useState} from 'react';

function Example() {
  let [toastKey, setToastKey] = useState<string | null>(null);

  return (
    <Button
      onPress={() => {
        if (!toastKey) {
          setToastKey(
            queue.add(
              {title: 'Processing...'},
              {onClose: () => setToastKey(null)},
            ),
          );
        } else {
          queue.close(toastKey);
        }
      }}
    >
      {toastKey ? 'Cancel' : 'Process'}
    </Button>
  );
}
```

## Tailwind example

```tsx
import {queue} from 'tailwind-starter/Toast';
import {Button} from 'tailwind-starter/Button';
import {useState} from 'react';

function Example() {
  let [toastKey, setToastKey] = useState<string | null>(null);

  return (
    <Button
      onPress={() => {
        if (!toastKey) {
          setToastKey(
            queue.add(
              {title: 'Processing...'},
              {onClose: () => setToastKey(null)},
            ),
          );
        } else {
          queue.close(toastKey);
        }
      }}
    >
      {toastKey ? 'Cancel' : 'Process'}
    </Button>
  );
}
```

## Accessibility

Toast regions are [landmark regions](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/) that can be navigated using <Keyboard>F6</Keyboard> to move forward and <Keyboard>Shift</Keyboard> + <Keyboard>F6</Keyboard> to move backward. This provides an easy way for keyboard users to jump to toasts from anywhere in the app.

When a toast is closed, focus moves to the next toast if any. When the last toast is closed, focus is restored to where it was before.

## API

```tsx
<ToastRegion>
  {({toast}) => (
    <Toast toast={toast}>
      <ToastContent>
        <Text slot="title" />
        <Text slot="description" />
      </ToastContent>
      <Button slot="close" />
    </Toast>
  )}
</ToastRegion>
```

### ToastRegion

### Toast

### ToastContent

`<ToastContent>` renders the main content of a toast, including the title and description slots. It accepts all HTML attributes.

### ToastQueue

A `ToastQueue` manages the state for a `<ToastRegion>`. The state is stored outside React so you can trigger toasts from anywhere in your application.
