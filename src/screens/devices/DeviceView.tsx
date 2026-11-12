// Port of frontend/lib/screens/devices/device_view.dart (spec 10 §3): one hub's page, opened by
// tapping its card on the Hubs screen.
//
// AppScaffold with the ⋮ menu (PopupMenuButton, FA ellipsisVertical): Rename Hub (pencil), About
// (circleInfo), Check for updates (cloudArrowDown), Delete Hub (circleXmark; icon and title red).
// Body: PopScope (Back: GoToDevicesHomeScreen) → Expanded → SafeArea → TimedPullToRefresh (always
// pullable; pulled: the hub fetched again, and "Last Updated" moves on) → scroll → Column(stretch):
// - Padding(left 10) → the back arrow (IconButton, FA arrowLeftLong): GoToDevicesHomeScreen;
// - the hub's name (30, centred, on the body text style), 5 below;
// - a blacklisted hub only: Padding(20 across, 10 down) → a box (#EE9999, radius 10, a red border)
//   → Padding(12) → "This hub has been flagged…" (black, centred);
// - HubStatusGlyph, with the state's RefreshState;
// - Padding(20 down; 15 % of the width across once the width is 500 or more) → Column (centred):
//   - Padding(8 across) → a two-column grid (cells 1.4 times as wide as tall), each button centred
//     in its cell: History, Open Gate, Sensors (with a red dot when a sensor is blacklisted),
//     Firmware Updates, Connect HUB, Hub Settings;
//   - Padding(20 across) → Divider (white60, 1);
//   - Padding(10 across, 20 down) → "Last Updated: MM-dd-yyyy hh:mm a", centred as a box.
//
// The screen keeps the hub it was opened with (initState), as Flutter does; the bloc's second
// state (after the re-check) only changes the status. "Last Updated" is the time the page was
// first built, and moves on with each pull. The refreshed hub is the same object (the cache
// merges into it), so the page shows its new values when it redraws.
//
// The ⋮ menu: Rename Hub closes the menu, opens the rename page and fetches the hub again in the
// background (its answer lands on a page that has gone); About closes the menu and opens About.
// Delete Hub opens "Delete Hub?" over the menu, which stays open behind it. Cancel closes the
// dialog only. Delete sends the delete and waits (the dialog stays up, and Delete can be pressed
// again); once it succeeds the dialog closes, then the menu, and the Hubs list shows, from the
// list in hand first (the deleted hub still on it) until its refetch lands. A failed delete shows
// nothing and leaves the dialog up (an uncaught error in Flutter).
//
// Open Gate (active while integrator support is on and the hub was connected when the page
// opened) sends trigger_integrator without waiting, and shows "Sent message to open gate" at once,
// whatever the answer.
//
// Built on Node, with Django closed (decided 2026-11-05): opening the page (with its health
// request), the pull, rename, delete and Open Gate go to Node. Hub Settings opens Hub settings;
// the other buttons and Check for updates open screens not built yet, and do nothing.

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '../../components/Badge';
import { IconButton } from '../../components/buttons/IconButton';
import { HubStatusGlyph } from '../../components/HubStatusGlyph';
import { FontAwesomeIcons, Icons } from '../../components/icons/iconData';
import { AppScaffold } from '../../components/layout/AppScaffold';
import { PopScope } from '../../components/layout/PopScope';
import { SafeArea } from '../../components/layout/SafeArea';
import { Divider } from '../../components/lists/Divider';
import { ListTile } from '../../components/lists/ListTile';
import {
  popMenu,
  PopupMenuButton,
  PopupMenuItem,
} from '../../components/popups/PopupMenu';
import { popPopup, showPopupMessage } from '../../components/popups/popups';
import { showSuccess } from '../../components/popups/toasts';
import { IconButtonRowEntry } from '../../components/threeButtonRows/IconButtonRowEntry';
import { TimedPullToRefresh } from '../../components/TimedPullToRefresh';
import type { Device } from '../../models/device';
import { reportError } from '../../services/reportError';
import {
  deleteDevice,
  setDevice,
  triggerIntegrator,
} from '../../services/requests/deviceRequests';
import {
  GoToAboutDeviceScreen,
  GoToDeviceSettingsEvent,
  GoToDevicesHomeScreen,
  GoToEditDeviceScreen,
} from '../../state/devices/devicesBloc';
import { useReadDevicesBloc } from '../../state/devices/DevicesBlocContext';
import { RefreshState } from '../../state/genericBloc';
import {
  ColorScheme,
  kAppBarActionsIconColor,
  MaterialColors,
} from '../../theme/colors';
import { ambientTextStyle, merge, toRN } from '../../theme/typography';
import { formatDateAndTime } from '../../utilities/textFormatters';

type Props = {
  device: Device;
  refresh?: RefreshState;
};

const BLACKLISTED_MESSAGE =
  'This hub has been flagged for suspicious activity. Please contact support to re-activate this hub';

export function DeviceView({
  device: openedWith,
  refresh = RefreshState.ready,
}: Props) {
  const readDevicesBloc = useReadDevicesBloc();
  const [device, setShownDevice] = useState(openedWith);
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  // LayoutBuilder's maxWidth: the page's own width (the SafeArea's), not the window's.
  const [width, setWidth] = useState(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const goToHubs = () => {
    readDevicesBloc().add(new GoToDevicesHomeScreen());
  };

  const lowerPadding = { paddingHorizontal: width < 500 ? 0 : width * 0.15 };

  const refreshDevice = async () => {
    try {
      const updated = await setDevice(device.id);
      setShownDevice(updated);
      setUpdatedAt(new Date());
    } catch {
      // PORT-GAP: log.e('Error refreshing device: $e').
    }
  };

  /** Rename Hub: close the menu, open the rename page, and fetch the hub again meanwhile. */
  const updateDeviceData = async () => {
    popMenu();
    readDevicesBloc().add(new GoToEditDeviceScreen(device));
    await refreshDevice();
  };

  const pushAbout = () => {
    popMenu();
    readDevicesBloc().add(new GoToAboutDeviceScreen(device));
  };

  /** Deletes the hub, then closes the dialog (Navigator.pop: the top route). */
  const removeDevice = async () => {
    await deleteDevice(device.id);
    if (!mounted.current) {
      return false;
    }
    popPopup();
    return true;
  };

  const deleteDeviceDialog = () => {
    showPopupMessage({
      showCancel: true,
      title: 'Delete Hub?',
      message:
        'Are you sure you want to delete this Hub? Note: Any sensors paired to this hub will remain paired until manually deleted.',
      okayButtonLabel: 'Delete',
      onOkay: () => {
        (async () => {
          const wasSuccessfullyRemoved = await removeDevice();
          if (wasSuccessfullyRemoved) {
            if (!mounted.current) {
              return;
            }
            // Navigator.pop again: now the menu.
            popMenu();
            readDevicesBloc().add(new GoToDevicesHomeScreen());
          }
        })().catch(reportError);
      },
    });
  };

  return (
    <AppScaffold
      actions={
        <HubMenu
          onRename={() => {
            updateDeviceData();
          }}
          onAbout={pushAbout}
          onDelete={deleteDeviceDialog}
        />
      }
      body={
        <PopScope canPop onPopInvoked={goToHubs}>
          <SafeArea style={styles.expanded}>
            <TimedPullToRefresh
              onRefresh={refreshDevice}
              alwaysScrollable
              testID="hub-page"
            >
              <View
                style={styles.backRow}
                onLayout={event => setWidth(event.nativeEvent.layout.width)}
              >
                <IconButton
                  icon={FontAwesomeIcons.arrowLeftLong}
                  color={ColorScheme.onSurfaceVariant}
                  onPressed={goToHubs}
                />
              </View>
              <Text style={nameText}>{device.name}</Text>
              {device.device.isBlacklisted && (
                <View style={styles.bannerPadding}>
                  <View style={styles.banner}>
                    <Text style={bannerText}>{BLACKLISTED_MESSAGE}</Text>
                  </View>
                </View>
              )}
              <HubStatusGlyph device={device} refresh={refresh} />
              <View style={[styles.lower, lowerPadding]}>
                <View style={styles.grid}>
                  <ButtonCell>
                    <IconButtonRowEntry
                      onTap={() => {
                        // PORT-GAP: GoToSpecificDeviceHistoryEvent(device) (the hub's history).
                      }}
                      label="History"
                      iconData={FontAwesomeIcons.clockRotateLeft}
                    />
                  </ButtonCell>
                  <ButtonCell>
                    <IconButtonRowEntry
                      isEnabled={
                        openedWith.shouldUseEmulatedSensor &&
                        openedWith.device.isConnected
                      }
                      onTap={() => {
                        // Not awaited: the toast shows whatever the answer. A failure is the
                        // uncaught error Flutter's Sentry would catch.
                        triggerIntegrator(device.id).catch(reportError);
                        showSuccess('Sent message to open gate');
                      }}
                      label="Open Gate"
                      iconData={FontAwesomeIcons.doorOpen}
                    />
                  </ButtonCell>
                  <ButtonCell>
                    <Badge
                      showBadge={device.hasBlacklistedSensor}
                      contentWidth={10}
                      contentHeight={10}
                      padding={SENSORS_BADGE_PADDING}
                      style={styles.fullHeight}
                    >
                      <IconButtonRowEntry
                        onTap={() => {
                          // PORT-GAP: GoToSensorsScreenEvent(device) (the hub's sensors).
                        }}
                        label="Sensors"
                        iconData={Icons.router}
                      />
                    </Badge>
                  </ButtonCell>
                  <ButtonCell>
                    <IconButtonRowEntry
                      onTap={() => {
                        // PORT-GAP: GoToDeviceFirmwareUpdatesEvent(device.id).
                      }}
                      label="Firmware Updates"
                      iconData={FontAwesomeIcons.microchip}
                    />
                  </ButtonCell>
                  <ButtonCell>
                    <IconButtonRowEntry
                      isEnabled={!device.device.isConnected}
                      onTap={() => {
                        // PORT-GAP: GoToConnectHubBloc(device) (Wi-Fi pairing, its own step).
                      }}
                      label="Connect HUB"
                      iconData={FontAwesomeIcons.rss}
                    />
                  </ButtonCell>
                  <ButtonCell>
                    <IconButtonRowEntry
                      onTap={() => {
                        readDevicesBloc().add(
                          new GoToDeviceSettingsEvent(device),
                        );
                      }}
                      label="Hub Settings"
                      iconData={FontAwesomeIcons.gear}
                    />
                  </ButtonCell>
                </View>
                <View style={styles.dividerPadding}>
                  <Divider color={MaterialColors.white60} thickness={1} />
                </View>
                <Text style={[bodyText, styles.lastUpdated]}>
                  {`Last Updated: ${formatDateAndTime(updatedAt)}`}
                </Text>
              </View>
            </TimedPullToRefresh>
          </SafeArea>
        </PopScope>
      }
    />
  );
}

/** The ⋮ menu. Each item closes the menu (Navigator.pop) before it acts; Delete Hub does not. */
function HubMenu({
  onRename,
  onAbout,
  onDelete,
}: {
  onRename: () => void;
  onAbout: () => void;
  onDelete: () => void;
}) {
  return (
    <PopupMenuButton
      icon={FontAwesomeIcons.ellipsisVertical}
      color={kAppBarActionsIconColor}
      itemBuilder={() => [
        <PopupMenuItem key="rename">
          <ListTile
            leadingIcon={FontAwesomeIcons.pencil}
            title="Rename Hub"
            onTap={onRename}
          />
        </PopupMenuItem>,
        <PopupMenuItem key="about">
          <ListTile
            leadingIcon={FontAwesomeIcons.circleInfo}
            title="About"
            onTap={onAbout}
          />
        </PopupMenuItem>,
        <PopupMenuItem key="updates">
          <ListTile
            leadingIcon={FontAwesomeIcons.cloudArrowDown}
            title="Check for updates"
            onTap={() => {
              popMenu();
              // PORT-GAP: GoToDeviceFirmwareUpdatesEvent(device.id).
            }}
          />
        </PopupMenuItem>,
        <PopupMenuItem key="delete">
          <ListTile
            leadingIcon={FontAwesomeIcons.circleXmark}
            leadingIconColor={MaterialColors.red}
            title="Delete Hub"
            titleStyle={{ color: MaterialColors.red }}
            onTap={onDelete}
          />
        </PopupMenuItem>,
      ]}
    />
  );
}

/** A grid cell: Center(child: button). */
function ButtonCell({ children }: { children: React.ReactNode }) {
  return <View style={styles.cell}>{children}</View>;
}

// badges' BadgeStyle(padding: fromLTRB(0, 70, 10, 0)) around a 10 × 10 SizedBox.
const SENSORS_BADGE_PADDING = { left: 0, top: 70, right: 10, bottom: 0 };

const bodyText = { ...toRN(ambientTextStyle), includeFontPadding: false };
const nameText = {
  ...toRN(merge(ambientTextStyle, { fontSize: 30 })),
  textAlign: 'center' as const,
  includeFontPadding: false,
  paddingBottom: 5,
};
const bannerText = {
  ...toRN(merge(ambientTextStyle, { color: MaterialColors.black })),
  textAlign: 'center' as const,
  includeFontPadding: false,
};

const styles = StyleSheet.create({
  expanded: { flex: 1, alignSelf: 'stretch' },
  backRow: { paddingLeft: 10, alignItems: 'flex-start' },
  bannerPadding: { paddingHorizontal: 20, paddingVertical: 10 },
  banner: {
    backgroundColor: '#EE9999',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: MaterialColors.red,
    padding: 12,
  },
  lower: { paddingVertical: 20, alignItems: 'center' },
  grid: {
    alignSelf: 'stretch',
    paddingHorizontal: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '50%',
    aspectRatio: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullHeight: { height: '100%' },
  dividerPadding: { alignSelf: 'stretch', paddingHorizontal: 20 },
  lastUpdated: { paddingHorizontal: 10, paddingVertical: 20 },
});
