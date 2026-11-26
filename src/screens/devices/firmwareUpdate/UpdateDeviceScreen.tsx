// Port of frontend/lib/screens/devices/firmware_update/update_device_screen.dart (spec 14 §4): one
// update's progress. On opening it starts the update (or adopts the running one, resumeUpdateId)
// and polls it every second (./firmwareUpdateListener.ts).
//
// AppScaffold(showNavigation: false) → Expanded → SafeArea → PopScope (Back → leave) → scroll →
// Padding(10) → Column (centred):
// - ← 'Back to firmware', at the left;
// - the ring: diameter clamp(width − 80, 200, 300); a green tick on success, a red cross on failure,
//   else the percentage over a determinate CircularProgressIndicator (amber on #54585A, stroke 15),
//   both easing to each new value over 800 ms, linear (at once when the OS removes animations);
// - 20; a live region: the headline (20, bold, white) and, padded 20, the detail (17, #A2AAAD);
// - 25; on failure "Try again" (a fresh start); while running Elapsed and Remaining, each with a
//   divider; Version; on failure "Reference: <code>" (always 3: quirk).
// A screen reader hears every new 10% and the outcome. Errors open a dialog whose OK returns to
// the Firmware screen.

import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  Easing,
  ReduceMotion,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { IconButton } from '../../../components/buttons/IconButton';
import { RoundedButton } from '../../../components/buttons/RoundedButton';
import { TextButton } from '../../../components/buttons/TextButton';
import { Icon } from '../../../components/icons/Icon';
import { FontAwesomeIcons } from '../../../components/icons/iconData';
import { KeyValuePairDisplay } from '../../../components/KeyValuePairDisplay';
import { AppScaffold } from '../../../components/layout/AppScaffold';
import { PopScope } from '../../../components/layout/PopScope';
import { SafeArea } from '../../../components/layout/SafeArea';
import { Divider } from '../../../components/lists/Divider';
import { popPopup, showAlertDialog } from '../../../components/popups/popups';
import { CircularProgressIndicator } from '../../../components/progress/CircularProgressIndicator';
import { ScaffoldScrollView } from '../../../components/layout/ScaffoldScrollView';
import type { Device } from '../../../models/device';
import type { Firmware } from '../../../models/firmware';
import {
  FirmwareUpdateRejectedException,
  UpdateTokenFailedException,
} from '../../../services/exceptions';
import { GoToDeviceFirmwareUpdatesEvent } from '../../../state/devices/devicesBloc';
import { useReadDevicesBloc } from '../../../state/devices/DevicesBlocContext';
import {
  ColorScheme,
  kCartellAlertRed,
  kCartellAppScaffoldColor,
  kCartellDarkGray,
  kCartellLightGray,
  kCartellStatusGreen,
  kCartellYellow,
  MaterialColors,
} from '../../../theme/colors';
import { ambientTextStyle, merge, toRN } from '../../../theme/typography';
import { useDisableAnimations } from '../../../utilities/disableAnimations';
import {
  type FetchUpdateStatusFn,
  type StartFwUpdateFn,
  UpdateListener,
} from './firmwareUpdateListener';
import {
  type FirmwareUpdateStatusCode,
  FirmwareUpdateStatusType,
} from './firmwareUpdateStatusCode';
import type { UpdateProgressSnapshot } from './updateProgressSnapshot';

type Props = {
  device: Device;
  firmware: Firmware;
  /** Set when the server already has an update running for this hub: poll it, start none. */
  resumeUpdateId?: number | null;
  /** Seams for tests, forwarded to the UpdateListener. */
  startFwUpdate?: StartFwUpdateFn;
  fetchUpdateStatus?: FetchUpdateStatusFn;
};

/** Dart's int `%`: never negative for a positive divisor. */
const dartMod = (a: number, b: number) => ((a % b) + b) % b;

/** _formatDuration: mm:ss, or hh:mm:ss from an hour (Duration's truncating getters). */
export function formatDuration(microseconds: number): string {
  const seconds = dartMod(Math.trunc(microseconds / 1e6), 60);
  const minutes = dartMod(Math.trunc(microseconds / 6e7), 60);
  const hours = Math.trunc(microseconds / 3.6e9);
  const pad = (n: number) => String(n).padStart(2, '0');
  const mmss = `${pad(minutes)}:${pad(seconds)}`;
  return hours === 0 ? mmss : `${pad(hours)}:${mmss}`;
}

/** Plain-language outcome. */
function statusHeadline(status: FirmwareUpdateStatusCode): string {
  switch (status.statusType) {
    case FirmwareUpdateStatusType.Success:
      return 'Update complete';
    case FirmwareUpdateStatusType.Failure:
      return 'Update did not finish';
    default:
      return 'Updating firmware';
  }
}

export function UpdateDeviceScreen({
  device,
  firmware,
  resumeUpdateId = null,
  startFwUpdate,
  fetchUpdateStatus,
}: Props) {
  const readDevicesBloc = useReadDevicesBloc();
  const [snapshot, setSnapshot] = useState<UpdateProgressSnapshot | null>(null);
  const listener = useRef<UpdateListener | null>(null);
  /** Announced progress, in whole tens of percent. */
  const lastAnnouncedTenth = useRef(-1);
  /** Dropped by "Try again": a retry starts a fresh update. */
  const resumeId = useRef<number | null>(resumeUpdateId);
  const mounted = useRef(true);
  const { width } = useWindowDimensions();

  const goBackToFirmware = () => {
    readDevicesBloc().add(new GoToDeviceFirmwareUpdatesEvent(device.id));
  };

  const showUpdateErrorAlert = (error: unknown) => {
    let title: string;
    let message: string;
    if (error instanceof FirmwareUpdateRejectedException) {
      title = 'Cannot start update';
      message = error.cause;
    } else if (error instanceof UpdateTokenFailedException) {
      title = 'Sign in again';
      message =
        'Your session expired before the update could start. Your hub is ' +
        'untouched. Sign in again and retry.';
    } else {
      title = 'Lost contact';
      message =
        'We lost contact with the hub while watching the update. The update ' +
        'may still be running. Check that the hub is powered on and ' +
        'connected, then open Firmware again to see where it got to.';
    }
    showAlertDialog({
      title,
      content: message,
      backgroundColor: kCartellAppScaffoldColor,
      actions: (
        <TextButton
          label="OK"
          foregroundColor={kCartellYellow}
          onPressed={() => {
            listener.current?.close();
            popPopup();
            goBackToFirmware();
          }}
        />
      ),
    });
  };

  const announceProgress = (event: UpdateProgressSnapshot) => {
    if (!mounted.current) return;
    const status = event.status;
    if (
      status !== null &&
      status.statusType !== FirmwareUpdateStatusType.InProgress
    ) {
      AccessibilityInfo.announceForAccessibility(statusHeadline(status));
      return;
    }
    const tenth = Math.floor(event.percentageDone * 10);
    if (tenth === lastAnnouncedTenth.current) return;
    lastAnnouncedTenth.current = tenth;
    AccessibilityInfo.announceForAccessibility(
      `Firmware update ${tenth * 10} percent complete`,
    );
  };

  const startUpdate = () => {
    const current = new UpdateListener({ startFwUpdate, fetchUpdateStatus });
    listener.current = current;
    if (resumeId.current !== null) {
      current.firmwareUpdateId = resumeId.current;
    }
    current.getUpdateStream(device, firmware, {
      onData: event => {
        setSnapshot(event);
        announceProgress(event);
      },
      onError: error => {
        if (!mounted.current) return;
        // After the frame, as Flutter's addPostFrameCallback.
        requestAnimationFrame(() => {
          if (!mounted.current) return;
          showUpdateErrorAlert(error);
        });
      },
    });
    current.startListening({ shouldStart: true });
  };

  useEffect(() => {
    mounted.current = true;
    startUpdate();
    return () => {
      mounted.current = false;
      listener.current?.close();
    };
    // initState / dispose only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = snapshot?.status ?? null;
  const statusType = status?.statusType;
  const hasSucceeded = statusType === FirmwareUpdateStatusType.Success;
  const hasFailed = statusType === FirmwareUpdateStatusType.Failure;
  const isFinished = hasSucceeded || hasFailed;

  const leave = () => {
    // PORT-GAP: after a success, UserFeedback.requestUserFeedback(context,
    // "Firmware Update Success", after) first (the feedback popup); `after` is what follows. Its
    // flag is false outside debug builds (quirk Q32), so a release build goes straight on, as here.
    listener.current?.close();
    goBackToFirmware();
  };

  const retry = () => {
    listener.current?.close();
    setSnapshot(null);
    listener.current = null;
    lastAnnouncedTenth.current = -1;
    // The update the resume id pointed at has finished: start a fresh one.
    resumeId.current = null;
    startUpdate();
  };

  const statusDetail = (code: FirmwareUpdateStatusCode): string => {
    switch (code.statusType) {
      case FirmwareUpdateStatusType.Success:
        return (
          `Your hub is now running v${firmware.versionNumber} ` +
          'and is back to watching for vehicles.'
        );
      case FirmwareUpdateStatusType.Failure:
        return (
          'Your hub kept its previous firmware and is still working. ' +
          'Check that it is powered on and connected, then try again.'
        );
      default:
        return (
          'Keep the hub powered on. You can leave this screen — ' +
          'the update keeps running.'
        );
    }
  };

  const timeElapsed =
    snapshot === null
      ? 'Calculating...'
      : formatDuration(snapshot.elapsedMilliseconds * 1000);
  const timeLeftSeconds = snapshot?.estimatedTimeLeftSeconds ?? null;
  const estimatedTimeLeft =
    timeLeftSeconds === null
      ? 'Calculating...'
      : formatDuration(timeLeftSeconds * 1e6);

  // 300 × 300 would not fit a 320 dp phone once padding is counted.
  const diameter = Math.min(Math.max(width - 80, 200), 300);
  let indicator: React.ReactNode;
  if (hasSucceeded) {
    indicator = (
      <Icon
        icon={FontAwesomeIcons.circleCheck}
        color={kCartellStatusGreen}
        size={diameter}
        accessibilityLabel="Update complete"
      />
    );
  } else if (hasFailed) {
    indicator = (
      <Icon
        icon={FontAwesomeIcons.circleXmark}
        color={kCartellAlertRed}
        size={diameter}
        accessibilityLabel="Update did not finish"
      />
    );
  } else {
    indicator = (
      <ProgressRing value={snapshot?.percentageDone ?? 0} diameter={diameter} />
    );
  }

  return (
    <AppScaffold
      showNavigation={false}
      body={
        <SafeArea style={styles.expanded}>
          <PopScope
            canPop
            onPopInvoked={popped => {
              if (popped) return;
              leave();
            }}
          >
            <ScaffoldScrollView
              style={styles.expanded}
              contentContainerStyle={styles.column}
            >
              <View style={styles.back}>
                <IconButton
                  icon={FontAwesomeIcons.arrowLeftLong}
                  color={ColorScheme.onSurfaceVariant}
                  tooltip="Back to firmware"
                  onPressed={leave}
                />
              </View>
              {indicator}
              <View style={styles.gap20} />
              <View style={styles.liveRegion} accessibilityLiveRegion="polite">
                <Text style={headline}>
                  {status === null ? 'Starting update' : statusHeadline(status)}
                </Text>
                <View style={styles.gap10} />
                <View style={styles.padH20}>
                  <Text style={detail}>
                    {status === null
                      ? 'Keep the hub powered on.'
                      : statusDetail(status)}
                  </Text>
                </View>
              </View>
              <View style={styles.gap25} />
              {hasFailed && (
                <View style={styles.padH20}>
                  <RoundedButton
                    buttonColor={kCartellYellow}
                    buttonTitleColor={MaterialColors.black}
                    iconColor={MaterialColors.black}
                    icon={FontAwesomeIcons.arrowsRotate}
                    title="Try again"
                    onPressed={retry}
                  />
                </View>
              )}
              {!isFinished && (
                <>
                  <KeyValuePairDisplay
                    keyStr="Elapsed"
                    valueStr={timeElapsed}
                  />
                  <View style={styles.divider}>
                    <Divider color={kCartellDarkGray} thickness={1} />
                  </View>
                  <KeyValuePairDisplay
                    keyStr="Remaining"
                    valueStr={estimatedTimeLeft}
                  />
                  <View style={styles.divider}>
                    <Divider color={kCartellDarkGray} thickness={1} />
                  </View>
                </>
              )}
              <KeyValuePairDisplay
                keyStr="Version"
                valueStr={`v${firmware.versionNumber}`}
              />
              {status !== null && status.isError && (
                <View style={styles.reference}>
                  <Text style={reference}>{`Reference: ${status.code}`}</Text>
                </View>
              )}
            </ScaffoldScrollView>
          </PopScope>
        </SafeArea>
      }
    />
  );
}

/**
 * TweenAnimationBuilder(0 → value, 800 ms, linear) around the percentage and the ring. The ring
 * redraws on the UI thread; the percentage text changes only when its whole number does.
 */
function ProgressRing({
  value,
  diameter,
}: {
  value: number;
  diameter: number;
}) {
  const disableAnimations = useDisableAnimations();
  const animated = useSharedValue(0);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    animated.value = withTiming(value, {
      duration: disableAnimations ? 0 : 800,
      easing: Easing.linear,
      reduceMotion: ReduceMotion.Never,
    });
    // A new duration applies from the next value, as Flutter's builder (no restart).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, animated]);

  useAnimatedReaction(
    () => Math.round(animated.value * 100),
    (current, previous) => {
      if (current !== previous) {
        scheduleOnRN(setPercent, current);
      }
    },
  );

  return (
    <View style={{ width: diameter, height: diameter }}>
      <View style={[StyleSheet.absoluteFill, styles.centre]}>
        <Text style={percentStyle}>{`${percent}%`}</Text>
      </View>
      <View style={StyleSheet.absoluteFill}>
        <CircularProgressIndicator
          size={diameter}
          value={animated}
          color={kCartellYellow}
          backgroundColor={kCartellDarkGray}
          strokeWidth={15}
          semanticsLabel="Firmware update progress"
          semanticsValue={`${percent}`}
        />
      </View>
    </View>
  );
}

const text = (style: Parameters<typeof merge>[1]) => ({
  ...toRN(merge(ambientTextStyle, style)),
  includeFontPadding: false,
});
const headline = {
  ...text({ fontSize: 20, fontWeight: 'bold', color: MaterialColors.white }),
  textAlign: 'center' as const,
};
const detail = {
  ...text({ fontSize: 17, color: kCartellLightGray }),
  textAlign: 'center' as const,
};
const reference = text({ fontSize: 14, color: kCartellLightGray });
const percentStyle = {
  ...text({ fontSize: 45, fontWeight: 'bold', color: MaterialColors.white }),
  fontVariant: ['tabular-nums' as const],
};

const styles = StyleSheet.create({
  expanded: { flex: 1, alignSelf: 'stretch' },
  column: { padding: 10, alignItems: 'center' },
  back: { alignSelf: 'stretch', alignItems: 'flex-start' },
  centre: { alignItems: 'center', justifyContent: 'center' },
  liveRegion: { alignItems: 'center' },
  padH20: { paddingHorizontal: 20 },
  divider: { alignSelf: 'stretch', paddingHorizontal: 20 },
  reference: { paddingTop: 15 },
  gap10: { height: 10 },
  gap20: { height: 20 },
  gap25: { height: 25 },
});
