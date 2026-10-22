// The part of Flutter's FutureBuilder (widgets/async.dart) the screens use: the latest snapshot
// of a promise. A new promise keeps the previous data (or error) until it settles, as
// AsyncSnapshot.inState does; a rejection is handled here, so it is never "unhandled".

import { useEffect, useState } from 'react';

export type AsyncSnapshot<T> = {
  /** null until the promise resolves (and after it rejects). */
  data: T | null;
  error: unknown;
  hasError: boolean;
};

const nothing = { data: null, error: null, hasError: false };

export function useFutureSnapshot<T>(future: Promise<T>): AsyncSnapshot<T> {
  const [snapshot, setSnapshot] = useState<AsyncSnapshot<T>>(nothing);
  useEffect(() => {
    let active = true;
    future.then(
      data => {
        if (active) {
          setSnapshot({ data, error: null, hasError: false });
        }
      },
      error => {
        if (active) {
          setSnapshot({ data: null, error, hasError: true });
        }
      },
    );
    return () => {
      active = false;
    };
  }, [future]);
  return snapshot;
}
