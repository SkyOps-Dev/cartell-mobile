// qr_scanner.dart (scanQrCode, MobileScannerSimple) with mobile_scanner's camera behaviour: the
// permission is asked as the page opens, the camera starts once granted, a refusal shows its
// message, and scans go through the validator.

import React from 'react';
import { BackHandler } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  scanQrCode,
  scannedBarcodeIsValid,
} from '../../src/components/forms/QrScanner';
import {
  PageRouteBase,
  PageRouteHost,
  resetPagesForTests,
} from '../../src/components/layout/PageRoute';
import { cameraMock } from '../helpers/visionCameraMock';

const backHandlers: (() => boolean | null | undefined)[] = [];

const metrics = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 36, left: 0, right: 0, bottom: 44 },
};

const isMac = (value: string) =>
  /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/.test(value);

async function settle(ms = 600) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

async function openScanner(returnBarcode = jest.fn()) {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <PageRouteBase>{null}</PageRouteBase>
      <PageRouteHost />
    </SafeAreaProvider>,
  );
  await act(async () => {
    scanQrCode({
      title: 'Scan Hub QR Code',
      loadingPrompt: 'Please scan the QR code on the hub',
      invalidScanPrompt: 'That does not seem to match a QR code on a hub',
      returnPrompt: 'Tap to use hub QR code',
      isBarcodeValid: isMac,
      returnBarcode,
    });
  });
  await settle();
  return returnBarcode;
}

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
  cameraMock.reset();
  resetPagesForTests();
  backHandlers.length = 0;
  jest
    .spyOn(BackHandler, 'addEventListener')
    .mockImplementation((_event, handler) => {
      backHandlers.push(handler as () => boolean);
      return {
        remove: () => {
          backHandlers.splice(
            backHandlers.indexOf(handler as () => boolean),
            1,
          );
        },
      };
    });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('scannedBarcodeIsValid: everything without a validator; "" for a missing value', () => {
  expect(scannedBarcodeIsValid(undefined)).toBe(true);
  expect(scannedBarcodeIsValid('x', () => false)).toBe(false);
  const validator = jest.fn(() => true);
  scannedBarcodeIsValid(undefined, validator);
  expect(validator).toHaveBeenCalledWith('');
});

test('asks for the camera as the page opens, then starts it', async () => {
  await openScanner();
  expect(screen.getByText('Scan Hub QR Code')).toBeTruthy();
  expect(cameraMock.requests).toBe(1);
  expect(screen.getByTestId('camera')).toBeTruthy();
  expect(cameraMock.camera?.isActive).toBe(true);
  expect(cameraMock.camera?.device).toBe('back');
  expect(cameraMock.scanner?.barcodeFormats).toEqual(['all-formats']);
  // Nothing scanned yet: the spinner and the prompt.
  expect(screen.getByText('Please scan the QR code on the hub')).toBeTruthy();
});

test('already allowed: no question, the camera starts', async () => {
  cameraMock.status = 'authorized';
  await openScanner();
  expect(cameraMock.requests).toBe(0);
  expect(screen.getByTestId('camera')).toBeTruthy();
});

test('refused: no camera, "Camera permission denied."', async () => {
  cameraMock.grantOnRequest = false;
  await openScanner();
  expect(screen.queryByTestId('camera')).toBeNull();
  expect(screen.getByText('Camera permission denied.')).toBeTruthy();
  expect(screen.getByText('Please scan the QR code on the hub')).toBeTruthy();
});

test('a camera error shows the generic message and the error', async () => {
  await openScanner();
  await act(async () => {
    cameraMock.camera?.onError?.(new Error('Camera in use'));
  });
  expect(screen.getByText('An unexpected error occurred.')).toBeTruthy();
  expect(screen.getByText('Camera in use')).toBeTruthy();
});

test('a valid code is handed back once and the page closes', async () => {
  const returnBarcode = await openScanner();
  await act(async () => {
    cameraMock.scan('ff:ff:ff:fd:00:06');
    // The same code in the next frame is ignored.
    cameraMock.scan('ff:ff:ff:fd:00:06');
  });
  expect(returnBarcode).toHaveBeenCalledTimes(1);
  expect(returnBarcode).toHaveBeenCalledWith('ff:ff:ff:fd:00:06');
  // During the closing transition the panel shows the tick and the button.
  expect(screen.getByText('Tap to use hub QR code')).toBeTruthy();
  await settle();
  expect(screen.queryByText('Scan Hub QR Code')).toBeNull();
});

test('only the first barcode in a frame counts', async () => {
  const returnBarcode = await openScanner();
  await act(async () => {
    cameraMock.scan('not a mac', 'ff:ff:ff:fd:00:06');
  });
  expect(returnBarcode).not.toHaveBeenCalled();
  expect(
    screen.getByText('That does not seem to match a QR code on a hub'),
  ).toBeTruthy();
});

test('an invalid code stays on the page until Clear scan, which lets it count again', async () => {
  const returnBarcode = await openScanner();
  await act(async () => {
    cameraMock.scan('https://example.com');
  });
  expect(
    screen.getByText('That does not seem to match a QR code on a hub'),
  ).toBeTruthy();
  expect(screen.getByText('Clear scan')).toBeTruthy();
  // Seen again: ignored, it is the code already held.
  await act(async () => {
    cameraMock.scan('https://example.com');
  });
  await fireEvent.press(screen.getByText('Clear scan'));
  expect(screen.getByText('Please scan the QR code on the hub')).toBeTruthy();
  await act(async () => {
    cameraMock.scan('https://example.com');
  });
  expect(
    screen.getByText('That does not seem to match a QR code on a hub'),
  ).toBeTruthy();
  expect(returnBarcode).not.toHaveBeenCalled();
});

test('a barcode with no value is checked as "" and fails', async () => {
  const returnBarcode = await openScanner();
  await act(async () => {
    cameraMock.scan(undefined);
  });
  expect(returnBarcode).not.toHaveBeenCalled();
  expect(screen.getByText('Clear scan')).toBeTruthy();
});

test('the app bar arrow and Android Back close the page without a code', async () => {
  const returnBarcode = await openScanner();
  await fireEvent.press(
    screen.getByText(String.fromCodePoint(0xf570), {
      includeHiddenElements: true,
    }),
  );
  await settle();
  expect(screen.queryByText('Scan Hub QR Code')).toBeNull();

  await act(async () => {
    scanQrCode({ title: 'Again', returnBarcode });
  });
  await settle();
  expect(screen.getByText('Again')).toBeTruthy();
  // Flutter's defaults for the prompts.
  expect(screen.getByText('Looking for QR code...')).toBeTruthy();
  await act(async () => {
    [...backHandlers].reverse().some(handler => handler());
  });
  await settle();
  expect(screen.queryByText('Again')).toBeNull();
  expect(returnBarcode).not.toHaveBeenCalled();
});
