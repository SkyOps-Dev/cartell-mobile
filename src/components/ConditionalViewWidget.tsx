// Port of frontend/lib/components/conditional_view_widget.dart (spec 11): shows `children` only
// once `shouldRender()` resolves true; nothing while waiting, on false, or on an error.
//
// FutureBuilder(future: shouldRender()) asks again on every build of this widget, which is every
// time its parent rebuilds (quirk Q34). Here that is every render: the request is started while
// rendering, and the inner view follows the newest one, keeping the last answer meanwhile.

import React from 'react';

import { useFutureSnapshot } from '../utilities/futureBuilder';

type Props = {
  shouldRender: () => Promise<boolean>;
  children: React.ReactNode;
};

export function ConditionalViewWidget({ shouldRender, children }: Props) {
  const future = shouldRender();
  // Handled by the inner view once it subscribes; this stops an early rejection counting as
  // unhandled before then.
  future.catch(() => undefined);
  return <FutureView future={future}>{children}</FutureView>;
}

function FutureView({
  future,
  children,
}: {
  future: Promise<boolean>;
  children: React.ReactNode;
}) {
  const snapshot = useFutureSnapshot(future);
  // `hasData && data!`, else Container(): nothing, zero-sized.
  return snapshot.data === true ? <>{children}</> : null;
}
