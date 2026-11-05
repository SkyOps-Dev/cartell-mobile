// Port of frontend/lib/components/forms/qr_scanner.dart: scanQrCode pushes a full page
// (MobileScannerSimple) with the camera, which hands back the first barcode the validator accepts.
//
// The page: Scaffold(black) with an AppBar (the title, and the Back arrow that closes the page);
// the body is a Stack of the camera (mobile_scanner 7.4.0's MobileScanner, filling the body, cover)
// and a panel at the bottom: a quarter of the screen's height, black at 0.7, padding (5, 20, 5, 0),
// its content at the top and centred:
// - nothing scanned yet: a 60 × 60 amber spinner, 15, `loadingPrompt`;
// - the scan passed the validator: circleCheck (60, amber), 15, a RoundedButton (`returnPrompt`,
//   amber, black title) that hands the value back again. The page has already closed by then;
//   the panel shows during the closing transition;
// - the scan failed it: FA x (60, amber), 15, `invalidScanPrompt`, 15, "Clear scan" (blue, black
//   title), which forgets the scan, so the camera's next sighting counts again.
// A sighting of the barcode already held is ignored. One that passes calls returnBarcode and
// closes the page at once. A barcode with no value is checked as "" (scannedBarcodeIsValid).
//
// The camera (mobile_scanner asks for the permission each time it starts):
// - the system's camera permission is asked when the page opens (Android shows the dialog again
//   after a plain refusal; once refused for good, or on iOS after one refusal, it answers at once);
// - until it answers the camera area is black (the placeholder);
// - refused: black, with Icons.error (white) and, 16 below, "Camera permission denied." in white;
//   granting it later in Settings and coming back starts the camera;
// - a camera error: the same, with "An unexpected error occurred." and the error's own message.
// The camera stops while the app is in the background, as mobile_scanner does.
// Scanning uses react-native-vision-camera 5 with its barcode scanner (Google ML Kit on both
// platforms, as mobile_scanner uses), every barcode format, as mobile_scanner's default.
// PORT-GAP: SentryMask over the camera (masks the preview in Sentry error screenshots).
// PORT-GAP: "Scanning is not supported on this device." for a phone with no camera; here that
// shows as the generic camera error, or stays black.

import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Camera, useCameraPermission } from 'react-native-vision-camera';
import {
  type Barcode,
  type TargetBarcodeFormat,
  useBarcodeScannerOutput,
} from 'react-native-vision-camera-barcode-scanner';

import {
  ColorScheme,
  kCartellBlack,
  kCartellBlue,
  kCartellYellow,
  MaterialColors,
} from '../../theme/colors';
import {
  ambientTextStyle,
  M3,
  merge,
  textStyle,
  toRN,
} from '../../theme/typography';
import { IconButton } from '../buttons/IconButton';
import { RoundedButton } from '../buttons/RoundedButton';
import { Icon } from '../icons/Icon';
import { FontAwesomeIcons, Icons } from '../icons/iconData';
import { AppBar } from '../layout/AppBar';
import { popPage, pushPage } from '../layout/PageRoute';
import { Scaffold } from '../layout/Scaffold';
import { CircularProgressIndicator } from '../progress/CircularProgressIndicator';

/**
 * Whether a scanned barcode's rawValue should be accepted: every scan when there is no validator;
 * otherwise the validator decides, given "" for a barcode with no value.
 */
export function scannedBarcodeIsValid(
  rawValue: string | undefined,
  validator?: (barcode: string) => boolean,
): boolean {
  if (validator === undefined) {
    return true;
  }
  return validator(rawValue ?? '');
}

type ScanOptions = {
  returnBarcode: (barcode: string) => void;
  isBarcodeValid?: (barcode: string) => boolean;
  returnPrompt?: string;
  invalidScanPrompt?: string;
  loadingPrompt?: string;
  title: string;
};

/** Opens the scanner page (Navigator.push of a MaterialPageRoute). */
export function scanQrCode({
  returnBarcode,
  isBarcodeValid,
  returnPrompt = 'Press to use scan!',
  invalidScanPrompt = 'That code is not correct',
  loadingPrompt = 'Looking for QR code...',
  title,
}: ScanOptions): void {
  pushPage(() => (
    <MobileScannerSimple
      title={title}
      isBarcodeValid={isBarcodeValid}
      returnBarcode={returnBarcode}
      returnPrompt={returnPrompt}
      invalidScanPrompt={invalidScanPrompt}
      loadingPrompt={loadingPrompt}
    />
  ));
}

type Scanned = { rawValue: string | undefined };

export function MobileScannerSimple({
  title,
  isBarcodeValid: validator,
  returnBarcode,
  returnPrompt,
  invalidScanPrompt,
  loadingPrompt,
}: Required<Omit<ScanOptions, 'isBarcodeValid'>> &
  Pick<ScanOptions, 'isBarcodeValid'>) {
  const [barcode, setBarcodeState] = useState<Scanned | null>(null);
  // The barcode held, read by sightings that arrive before the next render.
  const held = useRef<Scanned | null>(null);
  const setBarcode = (next: Scanned | null) => {
    held.current = next;
    setBarcodeState(next);
  };
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const isValid = (scanned: Scanned | null) =>
    scanned !== null && scannedBarcodeIsValid(scanned.rawValue, validator);

  const handleBarcode = (barcodes: Barcode[]) => {
    if (!mounted.current) {
      return;
    }
    const first = barcodes[0];
    if (first === undefined) {
      return;
    }
    if (held.current !== null && held.current.rawValue === first.rawValue) {
      return;
    }
    const scanned = { rawValue: first.rawValue };
    setBarcode(scanned);
    if (isValid(scanned) && scanned.rawValue !== undefined) {
      returnBarcode(scanned.rawValue);
      popPage();
    }
  };

  const { height } = useWindowDimensions();
  let panel: React.ReactNode;
  if (barcode === null) {
    panel = (
      <>
        <CircularProgressIndicator size={60} color={kCartellYellow} />
        <View style={styles.gap15} />
        <Text style={bodyText}>{loadingPrompt}</Text>
      </>
    );
  } else if (isValid(barcode)) {
    panel = (
      <>
        <Icon
          icon={FontAwesomeIcons.circleCheck}
          size={60}
          color={kCartellYellow}
        />
        <View style={styles.gap15} />
        <RoundedButton
          onPressed={() => {
            if (barcode.rawValue !== undefined) {
              returnBarcode(barcode.rawValue);
            }
          }}
          title={returnPrompt}
          buttonColor={kCartellYellow}
          buttonTitleColor={kCartellBlack}
        />
      </>
    );
  } else {
    panel = (
      <>
        <Icon icon={FontAwesomeIcons.x} size={60} color={kCartellYellow} />
        <View style={styles.gap15} />
        <Text style={bodyText}>{invalidScanPrompt}</Text>
        <View style={styles.gap15} />
        <RoundedButton
          onPressed={() => setBarcode(null)}
          title="Clear scan"
          buttonColor={kCartellBlue}
          buttonTitleColor={kCartellBlack}
        />
      </>
    );
  }

  return (
    <Scaffold
      appBar={
        <AppBar
          shrinkWrapTitle
          backgroundColor={ColorScheme.surface}
          leading={
            <IconButton
              icon={
                Platform.OS === 'ios'
                  ? Icons.arrow_back_ios_new_rounded
                  : Icons.arrow_back
              }
              color={ColorScheme.onSurface}
              tooltip="Back"
              onPressed={popPage}
            />
          }
          title={
            <Text numberOfLines={1} style={titleText}>
              {title}
            </Text>
          }
        />
      }
    >
      <View style={styles.body}>
        <ScannerCamera onDetect={handleBarcode} />
        <View style={[styles.panel, { height: height / 4 }]}>{panel}</View>
      </View>
    </Scaffold>
  );
}

const PERMISSION_DENIED = 'Camera permission denied.';
const GENERIC_ERROR = 'An unexpected error occurred.';

/** MobileScanner: the camera, its placeholder while starting, and its error box. */
function ScannerCamera({
  onDetect,
}: {
  onDetect: (barcodes: Barcode[]) => void;
}) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [asked, setAsked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The first state can be "unknown" (or null) until the platform reports one; only a known
  // background or inactive app stops the camera.
  const [appActive, setAppActive] = useState(
    AppState.currentState !== 'background' &&
      AppState.currentState !== 'inactive',
  );
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state =>
      setAppActive(state === 'active'),
    );
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (hasPermission || asked) {
      return;
    }
    requestPermission()
      .catch(() => false)
      .finally(() => setAsked(true));
  }, [hasPermission, asked, requestPermission]);
  const output = useBarcodeScannerOutput({
    barcodeFormats: BARCODE_FORMATS,
    onBarcodeScanned: onDetect,
    onError: () => {
      // PORT-GAP: mobile_scanner reports scan errors on its barcodes stream, which nothing reads.
    },
  });

  if (!hasPermission) {
    return asked ? (
      <ScannerError message={PERMISSION_DENIED} />
    ) : (
      <View style={styles.black} />
    );
  }
  if (error !== null) {
    return <ScannerError message={GENERIC_ERROR} details={error} />;
  }
  return (
    <Camera
      style={StyleSheet.absoluteFill}
      isActive={appActive}
      device="back"
      outputs={[output]}
      onError={cameraError => setError(cameraError.message)}
    />
  );
}

const BARCODE_FORMATS: TargetBarcodeFormat[] = ['all-formats'];

function ScannerError({
  message,
  details,
}: {
  message: string;
  details?: string;
}) {
  return (
    <View style={[styles.black, styles.errorCentre]}>
      <View style={styles.errorIcon}>
        <Icon icon={Icons.error} color={MaterialColors.white} />
      </View>
      <Text style={errorText}>{message}</Text>
      {details !== undefined && <Text style={errorText}>{details}</Text>}
    </View>
  );
}

const bodyText = { ...toRN(ambientTextStyle), includeFontPadding: false };
const errorText = {
  ...toRN(merge(ambientTextStyle, { color: MaterialColors.white })),
  includeFontPadding: false,
};
const titleText = {
  ...textStyle(M3.titleLarge, { color: ColorScheme.onSurface }),
  includeFontPadding: false,
};

const styles = StyleSheet.create({
  body: { flex: 1, backgroundColor: MaterialColors.black },
  black: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: MaterialColors.black,
  },
  errorCentre: { alignItems: 'center', justifyContent: 'center' },
  errorIcon: { paddingBottom: 16 },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingLeft: 5,
    paddingTop: 20,
    paddingRight: 5,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  gap15: { height: 15 },
});
