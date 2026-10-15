// Port of widgets/pop_scope.dart and how the page route answers Android Back
// (widgets/navigator.dart maybePop, widgets/routes.dart ModalRoute.popDisposition; spec 06 §7).
//
// The app's screens all live on one page route (MaterialApp's home), so Back is decided like this:
// - If any PopScope on the page has canPop false, Back does not leave the page: every PopScope's
//   onPopInvoked runs (with didPop false). Flutter calls them parent first; React mounts children
//   first, so here the order is reversed. Only the innermost one (the screen's) does anything in
//   this app; the shells' are empty.
// - Otherwise Back goes to the system, which puts the app in the background (the auth screens,
//   which have no PopScope).
// Routes above the page (dialogs, the popup menu, Cupertino sheets) take Back first: they add their
// own BackHandler listeners when they open, after this one, and React Native asks the newest
// first. A drawer is not a route and does not take Back here (Drawer.tsx).
//
// Mount PageBackHandler once, before anything else that listens for Back.

import React, { useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';

type PopEntry = {
  canPop: () => boolean;
  onPopInvoked: (didPop: boolean) => void;
};

const entries: PopEntry[] = [];

function onBackPressed(): boolean {
  if (entries.every(entry => entry.canPop())) {
    return false;
  }
  [...entries].forEach(entry => entry.onPopInvoked(false));
  return true;
}

/** The page route's Back handling. */
export function PageBackHandler() {
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPressed,
    );
    return () => subscription.remove();
  }, []);
  return null;
}

type Props = {
  canPop: boolean;
  /** onPopInvokedWithResult(didPop, result). */
  onPopInvoked?: (didPop: boolean) => void;
  children: React.ReactNode;
};

/** PopScope: registers with the page while mounted. */
export function PopScope({ canPop, onPopInvoked, children }: Props) {
  const latest = useRef({ canPop, onPopInvoked });
  latest.current = { canPop, onPopInvoked };
  useEffect(() => {
    const entry: PopEntry = {
      canPop: () => latest.current.canPop,
      onPopInvoked: didPop => latest.current.onPopInvoked?.(didPop),
    };
    entries.push(entry);
    return () => {
      entries.splice(entries.indexOf(entry), 1);
    };
  }, []);
  return <>{children}</>;
}

/** Tests only: what Android Back would do now (true = handled on the page). */
export function pressBackForTests(): boolean {
  return onBackPressed();
}
