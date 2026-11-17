// Port of frontend/lib/screens/events/device_history.dart (spec 12 §3): a hub's event history,
// from the hub page's History.
//
// Opening and closing allow every orientation (see History.tsx). Seeded from the state's Event,
// and again whenever a new one arrives. AppScaffold with X → the hub's page; body Expanded →
// SafeArea →
// - loading (only during a pull's refresh): a centred spinner;
// - an error (a later page or a refresh failed): Padding(50) → centred, scrollable: the warning
//   icon (175, deep orange), 15, the exception's raw Dart text (quirk Q25), with no Back handling;
// - otherwise Back → the hub's page, and Column (stretch): Padding(10, 0, 30, 0) → ← at the left;
//   the hub's name (20, bold, height 1.0, centred); Padding(3 down) → "Hub's Event History" (14,
//   height 1.25, centred); 5; Padding(top 8) → Divider(20, white, 1); then, while the bloc is still
//   `checking`, a centred spinner, else the list (./HistoryList.tsx).
// Pull to refresh: the list cleared, the spinner, then page one.

import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '../../components/buttons/IconButton';
import { Icon } from '../../components/icons/Icon';
import { FontAwesomeIcons, Icons } from '../../components/icons/iconData';
import { AppScaffold } from '../../components/layout/AppScaffold';
import { PopScope } from '../../components/layout/PopScope';
import { SafeArea } from '../../components/layout/SafeArea';
import { Divider } from '../../components/lists/Divider';
import { CircularProgressIndicator } from '../../components/progress/CircularProgressIndicator';
import type { Device } from '../../models/device';
import type { Event, Results } from '../../models/event';
import { dartExceptionText } from '../../services/exceptions';
import { allowAllOrientations } from '../../services/phoneRotationManager';
import { reportError } from '../../services/reportError';
import { setDeviceEvents } from '../../services/requests/eventRequests';
import { GoToSpecificDeviceEvent } from '../../state/devices/devicesBloc';
import { useReadDevicesBloc } from '../../state/devices/DevicesBlocContext';
import { RefreshState } from '../../state/genericBloc';
import {
  ColorScheme,
  kAppBarActionsIconColor,
  MaterialColors,
} from '../../theme/colors';
import { ambientTextStyle, merge, toRN } from '../../theme/typography';
import { HistoryList } from './HistoryList';

const hasNext = (next: string | null | undefined) =>
  next !== null && next !== undefined && next !== '';

export function DeviceHistory({
  event,
  device,
  refresh = RefreshState.ready,
}: {
  event: Event;
  device: Device;
  refresh?: RefreshState;
}) {
  const readDevicesBloc = useReadDevicesBloc();
  const [results, setResults] = useState<Results[]>(event.results ?? []);
  const [loadMore, setLoadMore] = useState(hasNext(event.next));
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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

  // didUpdateWidget → _loadInitialData: the new Event seeds the list (an error stays shown).
  useEffect(() => {
    if (seeded.current === event) return;
    seeded.current = event;
    setResults(event.results ?? []);
    nextPage.current = event.next;
    setLoadMore(hasNext(event.next));
    setIsLoading(false);
  }, [event]);

  const toHub = () => {
    readDevicesBloc().add(new GoToSpecificDeviceEvent(device));
  };

  const updateEvents = async (url: string | null) => {
    try {
      const page = await setDeviceEvents({ deviceID: device.id, nextURL: url });
      if (!mounted.current) return;
      setResults(current => [...current, ...(page.results ?? [])]);
      nextPage.current = page.next;
      setLoadMore(hasNext(page.next));
    } catch (error) {
      reportError(error);
      if (mounted.current) setErrorMessage(dartExceptionText(error));
    }
  };

  const updateHistory = async () => {
    setResults([]);
    setLoadMore(true);
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const page = await setDeviceEvents({ deviceID: device.id });
      if (!mounted.current) return;
      setResults(page.results ?? []);
      nextPage.current = page.next;
      setLoadMore(hasNext(page.next));
      setIsLoading(false);
    } catch (error) {
      reportError(error);
      if (!mounted.current) return;
      setErrorMessage(dartExceptionText(error));
      setIsLoading(false);
    }
  };

  let content: React.ReactNode;
  if (isLoading) {
    content = (
      <View style={[styles.expanded, styles.centre]}>
        <CircularProgressIndicator />
      </View>
    );
  } else if (errorMessage !== null) {
    content = (
      <View style={[styles.expanded, styles.errorPadding]}>
        <ScrollView
          style={styles.expanded}
          contentContainerStyle={styles.errorContent}
        >
          <Icon
            icon={Icons.warning_amber_rounded}
            size={175}
            color={MaterialColors.deepOrange}
          />
          <View style={styles.gap15} />
          <Text style={body}>{errorMessage}</Text>
        </ScrollView>
      </View>
    );
  } else {
    content = (
      <PopScope canPop onPopInvoked={toHub}>
        <View style={styles.expanded}>
          <View style={styles.backRow}>
            <IconButton
              icon={FontAwesomeIcons.arrowLeftLong}
              color={ColorScheme.onSurfaceVariant}
              onPressed={toHub}
            />
          </View>
          <Text style={name}>{device.name}</Text>
          <View style={styles.subtitlePadding}>
            <Text style={subtitle}>Hub&apos;s Event History</Text>
          </View>
          <View style={styles.gap5} />
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
        </View>
      </PopScope>
    );
  }

  return (
    <AppScaffold
      actions={
        <IconButton
          icon={FontAwesomeIcons.xmark}
          color={kAppBarActionsIconColor}
          onPressed={toHub}
        />
      }
      body={<SafeArea style={styles.expanded}>{content}</SafeArea>}
    />
  );
}

const body = {
  ...toRN(ambientTextStyle),
  includeFontPadding: false,
};
const name = {
  ...toRN(
    merge(ambientTextStyle, { fontSize: 20, fontWeight: 'bold', height: 1.0 }),
  ),
  textAlign: 'center' as const,
  includeFontPadding: false,
};
const subtitle = {
  ...toRN(merge(ambientTextStyle, { fontSize: 14, height: 1.25 })),
  textAlign: 'center' as const,
  includeFontPadding: false,
};

const styles = StyleSheet.create({
  expanded: { flex: 1, alignSelf: 'stretch' },
  centre: { alignItems: 'center', justifyContent: 'center' },
  errorPadding: { padding: 50 },
  errorContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backRow: { paddingLeft: 10, paddingRight: 30, alignItems: 'flex-start' },
  subtitlePadding: { paddingVertical: 3 },
  gap5: { height: 5 },
  gap15: { height: 15 },
  dividerPadding: { paddingTop: 8 },
});
