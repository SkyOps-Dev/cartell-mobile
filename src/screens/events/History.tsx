// Port of frontend/lib/screens/events/history.dart (spec 12 §2, features/21): All Event History,
// from the side menu.
//
// Opening and closing allow every orientation (PhoneRotationManager().allowAll(); on Android this
// switches the app to full-user rotation, which stays). Seeded from the state's Event, and seeded
// again whenever a new Event arrives (the cross-fade updates this screen in place).
// - Loading (only during a pull's refresh): AppScaffold (a 48-wide box as its action) with a
//   centred spinner, no Back handling.
// - Otherwise: the same scaffold; Back (canPop false) → Hubs. Column (stretch): 20; Padding(10, 0,
//   50, 0) → ← at the left (→ Hubs); "All Event History" (24, bold, height 1.25, centred);
//   Padding(top 8) → Divider(20, white, 1); then, while the bloc is still `checking`, a centred
//   spinner, else the list (./HistoryList.tsx).
// - At the list's end with a next page: setEventData(next) appended (a failure is only reported;
//   the spinner row stays, and the next scroll to the end tries again).
// - Pull to refresh (quirk Q24): the hubs fetched as well (not awaited), the list cleared, the
//   loading scaffold, then page one; a failure is reported and the loading ends.

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IconButton } from '../../components/buttons/IconButton';
import { FontAwesomeIcons } from '../../components/icons/iconData';
import { AppScaffold } from '../../components/layout/AppScaffold';
import { PopScope } from '../../components/layout/PopScope';
import { SafeArea } from '../../components/layout/SafeArea';
import { Divider } from '../../components/lists/Divider';
import { CircularProgressIndicator } from '../../components/progress/CircularProgressIndicator';
import type { Event, Results } from '../../models/event';
import { allowAllOrientations } from '../../services/phoneRotationManager';
import { reportError } from '../../services/reportError';
import { fetchDevices } from '../../services/requests/deviceRequests';
import { setEventData } from '../../services/requests/eventRequests';
import { RefreshState } from '../../state/genericBloc';
import { GoToHubsScreenEvent } from '../../state/mainApp/mainAppBloc';
import { useMainAppBloc } from '../../state/mainApp/MainAppBlocContext';
import { ColorScheme, MaterialColors } from '../../theme/colors';
import { ambientTextStyle, merge, toRN } from '../../theme/typography';
import { HistoryList } from './HistoryList';

const hasNext = (next: string | null | undefined) =>
  next !== null && next !== undefined && next !== '';

export function History({
  event,
  refresh = RefreshState.ready,
}: {
  event: Event;
  refresh?: RefreshState;
}) {
  const bloc = useMainAppBloc();
  const [results, setResults] = useState<Results[]>(event.results ?? []);
  const [loadMore, setLoadMore] = useState(hasNext(event.next));
  const [isLoading, setIsLoading] = useState(false);
  const nextPage = useRef<string | null>(event.next);
  const mounted = useRef(true);
  const seeded = useRef(event);

  useEffect(() => {
    mounted.current = true;
    allowAllOrientations();
    return () => {
      mounted.current = false;
      allowAllOrientations();
    };
  }, []);

  // didUpdateWidget: a new Event (the fetched one replacing the empty one) seeds the list again.
  useEffect(() => {
    if (seeded.current === event) return;
    seeded.current = event;
    setResults(event.results ?? []);
    nextPage.current = event.next;
    setLoadMore(hasNext(event.next));
    setIsLoading(false);
  }, [event]);

  const toHubs = () => {
    bloc.add(new GoToHubsScreenEvent());
  };

  const updateEvents = async (url: string | null) => {
    try {
      const page = await setEventData({ nextURL: url });
      if (!mounted.current) return;
      setResults(current => [...current, ...(page.results ?? [])]);
      nextPage.current = page.next;
      setLoadMore(hasNext(page.next));
    } catch (error) {
      // Not caught in Flutter: the zone reports it.
      reportError(error);
    }
  };

  const updateHistory = async () => {
    fetchDevices().catch(reportError);
    setResults([]);
    setLoadMore(true);
    setIsLoading(true);
    try {
      const page = await setEventData();
      if (!mounted.current) return;
      setResults(page.results ?? []);
      nextPage.current = page.next;
      setLoadMore(hasNext(page.next));
      setIsLoading(false);
    } catch (error) {
      reportError(error);
      if (mounted.current) setIsLoading(false);
    }
  };

  const actions = <View style={styles.actionBox} />;

  if (isLoading) {
    return (
      <AppScaffold
        actions={actions}
        body={
          <SafeArea style={[styles.expanded, styles.centre]}>
            <CircularProgressIndicator />
          </SafeArea>
        }
      />
    );
  }

  return (
    <AppScaffold
      actions={actions}
      body={
        <PopScope canPop={false} onPopInvoked={toHubs}>
          <SafeArea style={styles.expanded}>
            <View style={styles.gap20} />
            <View style={styles.backRow}>
              <IconButton
                icon={FontAwesomeIcons.arrowLeftLong}
                color={ColorScheme.onSurfaceVariant}
                onPressed={toHubs}
              />
            </View>
            <Text style={title}>All Event History</Text>
            <View style={styles.dividerPadding}>
              <Divider height={20} color={MaterialColors.white} thickness={1} />
            </View>
            {refresh === RefreshState.checking ? (
              <View style={[styles.expanded, styles.centre]}>
                <CircularProgressIndicator />
              </View>
            ) : (
              <HistoryList
                results={results}
                loadMore={loadMore}
                onRefresh={updateHistory}
                onEnd={() => {
                  if (loadMore) updateEvents(nextPage.current);
                }}
              />
            )}
          </SafeArea>
        </PopScope>
      }
    />
  );
}

const title = {
  ...toRN(
    merge(ambientTextStyle, { fontSize: 24, fontWeight: 'bold', height: 1.25 }),
  ),
  textAlign: 'center' as const,
  includeFontPadding: false,
};

const styles = StyleSheet.create({
  expanded: { flex: 1, alignSelf: 'stretch' },
  centre: { alignItems: 'center', justifyContent: 'center' },
  actionBox: { width: 48 },
  gap20: { height: 20 },
  backRow: { paddingLeft: 10, paddingRight: 50, alignItems: 'flex-start' },
  dividerPadding: { paddingTop: 8 },
});
