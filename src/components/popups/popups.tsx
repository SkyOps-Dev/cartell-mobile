// Port of showPopupMessage (frontend/lib/components/popups.dart; spec 07 §5, §3.1) and the
// dialog route it opens (showDialog, barrierDismissible: false).
//
// - AlertDialog: background #25282A, radius 16, inset 40/24, min width 280, as wide as its
//   content (IntrinsicWidth), content padding 24 left/right/bottom and 16 top, no shadow.
// - showDialog's useSafeArea: true: the dialog is centred within the safe area (between the status
//   and navigation bars), not the whole screen. Measured on the RMX5070 (2026-10-14): its centre
//   sits 13 px above the screen's.
// - Barrier Colors.black54, not dismissible by tapping. Android Back closes the top popup, as it
//   pops a Flutter dialog route.
// - Enter/exit: fade, 150 ms, Curves.easeOut.
// - Pushing the dialog route takes focus, so an open keyboard closes; when the dialog closes,
//   focus returns to the field that had it (verify against the Flutter reference).
//
// Popups render inside the app tree (PopupHost), under the EnvBanner, so the red server tag stays
// above them as it does in Flutter. `popPopup()` is the equivalent of Navigator.pop(context) from
// inside a dialog: custom onOkay / onCancel handlers must call it themselves, as in Flutter.

import React, { useContext, useEffect, useSyncExternalStore } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
} from 'react-native';

import {
  kCartellBlack,
  kCartellBlue,
  kCartellDarkGray,
  kCartellLightGray,
  kCartellYellow,
  MaterialColors,
} from '../../theme/colors';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { ambientTextStyle, merge, toRN, M3 } from '../../theme/typography';
import { MaterialPill } from '../buttons/MaterialPill';
import { Icon } from '../icons/Icon';
import { FontAwesomeIcons, IconData } from '../icons/iconData';

const TRANSITION_MS = 150;
// Dialog.insetPadding (Material 3 default).
const INSET_HORIZONTAL = 40;
const INSET_VERTICAL = 24;
// Curves.easeOut = Cubic(0.0, 0.0, 0.58, 1.0)
const easeOut = Easing.bezier(0.0, 0.0, 0.58, 1.0);

export type PopupOptions = {
  title: string;
  message: string;
  okayButtonLabel?: string;
  onOkay?: () => void;
  cancelButtonLabel?: string;
  onCancel?: () => void;
  body?: React.ReactNode;
  icon?: IconData;
  showCancel?: boolean;
};

type FocusedInput = Parameters<typeof TextInput.State.focusTextInput>[0];

type Entry = {
  id: number;
  options: PopupOptions;
  opacity: Animated.Value;
  closing: boolean;
  resolve: () => void;
  restoreFocus: FocusedInput;
};

// --- store -------------------------------------------------------------------------------

let entries: Entry[] = [];
let nextId = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const snapshot = () => entries;

/** Opens a popup. Resolves when it has been closed, like `await showDialog(...)`. */
export function showPopupMessage(options: PopupOptions): Promise<void> {
  return new Promise(resolve => {
    const restoreFocus = TextInput.State.currentlyFocusedInput() ?? undefined;
    if (restoreFocus) {
      TextInput.State.blurTextInput(restoreFocus);
    }
    const entry: Entry = {
      id: nextId++,
      options,
      opacity: new Animated.Value(0),
      closing: false,
      resolve,
      restoreFocus,
    };
    entries = [...entries, entry];
    emit();
    Animated.timing(entry.opacity, {
      toValue: 1,
      duration: TRANSITION_MS,
      easing: easeOut,
      useNativeDriver: true,
    }).start();
  });
}

/** showGenericErrorPopup: the catch-all "An error occurred." popup with one Okay. */
export function showGenericErrorPopup(): Promise<void> {
  return showPopupMessage({
    title: 'An error occurred.',
    message: 'Please try again. Contact support if errors persist.',
  });
}

/** Closes the top-most popup (Navigator.pop from inside a dialog). */
export function popPopup(): void {
  const entry = [...entries].reverse().find(e => !e.closing);
  if (!entry) {
    return;
  }
  entry.closing = true;
  // A new array, so the host re-renders and the closing popup stops taking touches.
  entries = [...entries];
  emit();
  Animated.timing(entry.opacity, {
    toValue: 0,
    duration: TRANSITION_MS,
    easing: easeOut,
    useNativeDriver: true,
  }).start(() => {
    entries = entries.filter(e => e.id !== entry.id);
    emit();
    if (entry.restoreFocus) {
      TextInput.State.focusTextInput(entry.restoreFocus);
    }
    entry.resolve();
  });
}

// --- host --------------------------------------------------------------------------------

/** Renders open popups above `children`. Mount once, inside the EnvBanner. */
export function PopupHost({ children }: { children: React.ReactNode }) {
  const open = useSyncExternalStore(subscribe, snapshot);

  const hasOpen = open.some(e => !e.closing);
  useEffect(() => {
    if (!hasOpen) {
      return;
    }
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        popPopup();
        return true;
      },
    );
    return () => subscription.remove();
  }, [hasOpen]);

  return (
    <View style={styles.root}>
      {children}
      {open.map(entry => (
        <PopupRoute key={entry.id} entry={entry} />
      ))}
    </View>
  );
}

function PopupRoute({ entry }: { entry: Entry }) {
  // SafeArea around the dialog (useSafeArea), outside its own inset padding. No provider, no insets.
  const safe = useContext(SafeAreaInsetsContext);
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { opacity: entry.opacity }]}
      pointerEvents={entry.closing ? 'none' : 'auto'}
    >
      <View
        style={[StyleSheet.absoluteFill, styles.barrier]}
        onStartShouldSetResponder={() => true}
      />
      <View
        style={[
          styles.inset,
          safe && {
            paddingTop: safe.top + INSET_VERTICAL,
            paddingBottom: safe.bottom + INSET_VERTICAL,
            paddingLeft: safe.left + INSET_HORIZONTAL,
            paddingRight: safe.right + INSET_HORIZONTAL,
          },
        ]}
        pointerEvents="box-none"
        testID="popup-inset"
      >
        <View style={styles.dialog} accessibilityViewIsModal>
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.content}
            style={styles.scroll}
          >
            <PopupContent options={entry.options} />
          </ScrollView>
        </View>
      </View>
    </Animated.View>
  );
}

// AlertDialog content inherits bodyMedium; Text styles in popups.dart merge over it.
const titleStyle = toRN(
  merge(ambientTextStyle, {
    fontSize: 20,
    fontWeight: 'bold',
    color: MaterialColors.white,
  }),
);
const messageStyle = toRN(
  merge(ambientTextStyle, {
    fontSize: 14,
    color: kCartellLightGray,
    height: 1.4,
  }),
);
// MaterialButton labels inherit labelLarge.
const okayLabelStyle = toRN(
  merge(M3.labelLarge, {
    fontSize: 16,
    fontWeight: '600',
    color: kCartellBlack,
  }),
);
const cancelLabelStyle = toRN(
  merge(M3.labelLarge, {
    fontSize: 16,
    fontWeight: '600',
    color: MaterialColors.white,
  }),
);

/**
 * An empty Flutter Text still takes one line of its style's height (font size × height). An empty
 * React Native Text measures taller than its line height on Android, so the line is a plain box.
 * Measured on the RMX5070 (2026-10-14, Test Connection: empty title and message): within 1 px.
 */
function EmptyLine({ style }: { style: TextStyle }) {
  return (
    <View style={{ height: style.lineHeight }} testID="popup-empty-line" />
  );
}

function PopupContent({ options }: { options: PopupOptions }) {
  const {
    title,
    message,
    okayButtonLabel,
    onOkay,
    cancelButtonLabel,
    onCancel,
    body,
    icon = FontAwesomeIcons.circleExclamation,
    showCancel,
  } = options;
  const renderCancel =
    showCancel ?? (cancelButtonLabel !== undefined || onCancel !== undefined);
  const okay = () => (onOkay ? onOkay() : popPopup());
  const cancel = () => (onCancel ? onCancel() : popPopup());

  return (
    <>
      <View style={styles.iconSlot}>
        <Icon icon={icon} color={kCartellYellow} size={48} />
      </View>
      <View style={styles.titleSlot}>
        {title === '' ? (
          <EmptyLine style={titleStyle} />
        ) : (
          <Text style={[titleStyle, styles.centre]}>{title}</Text>
        )}
      </View>
      <View style={styles.messageSlot}>
        {message === '' ? (
          <EmptyLine style={messageStyle} />
        ) : (
          <Text style={[messageStyle, styles.centre]}>{message}</Text>
        )}
      </View>
      {body !== undefined && <View style={styles.bodySlot}>{body}</View>}
      {renderCancel ? (
        <View style={styles.row}>
          <View style={styles.cancelCell}>
            <MaterialPill
              color={kCartellDarkGray}
              elevation={3}
              minWidth="stretch"
              height={10}
              onPress={cancel}
            >
              <Text style={cancelLabelStyle}>
                {cancelButtonLabel ?? 'Cancel'}
              </Text>
            </MaterialPill>
          </View>
          <View style={styles.okayCell}>
            <MaterialPill
              color={kCartellBlue}
              elevation={3}
              minWidth="stretch"
              height={10}
              onPress={okay}
            >
              <Text style={okayLabelStyle}>{okayButtonLabel ?? 'Okay'}</Text>
            </MaterialPill>
          </View>
        </View>
      ) : (
        <MaterialPill
          color={kCartellBlue}
          elevation={3}
          minWidth={200}
          height={10}
          onPress={okay}
        >
          <Text style={okayLabelStyle}>{okayButtonLabel ?? 'Okay'}</Text>
        </MaterialPill>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  barrier: { backgroundColor: MaterialColors.black54 },
  inset: {
    ...StyleSheet.absoluteFill,
    paddingHorizontal: INSET_HORIZONTAL,
    paddingVertical: INSET_VERTICAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: {
    backgroundColor: kCartellBlack,
    borderRadius: 16,
    minWidth: 280,
    maxWidth: '100%',
    maxHeight: '100%',
    overflow: 'hidden',
  },
  scroll: { flexGrow: 0 },
  content: {
    paddingLeft: 24,
    paddingRight: 24,
    paddingTop: 16,
    paddingBottom: 24,
    alignItems: 'center',
  },
  iconSlot: { paddingBottom: 16 },
  titleSlot: { paddingBottom: 12, alignSelf: 'stretch' },
  messageSlot: { paddingBottom: 24, alignSelf: 'stretch' },
  // Flutter's Column gives the body loose constraints the dialog's width: a body that sizes to
  // its content is centred, one that takes all it is given (a TextField, `alignSelf: 'stretch'`
  // here) spans the dialog.
  bodySlot: { paddingBottom: 16, alignSelf: 'stretch', alignItems: 'center' },
  centre: { textAlign: 'center' },
  row: { flexDirection: 'row', alignSelf: 'stretch' },
  cancelCell: { flex: 1, paddingRight: 8 },
  okayCell: { flex: 1, paddingLeft: 8 },
});
