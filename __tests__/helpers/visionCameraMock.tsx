// Stand-ins for react-native-vision-camera and its barcode scanner (both Nitro native modules),
// wired in jest.setup.js. Tests set the camera permission and drive scans through `cameraMock`.

import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

type PermissionStatus =
  | 'not-determined'
  | 'authorized'
  | 'denied'
  | 'restricted';
type ScanOptions = {
  barcodeFormats: string[];
  onBarcodeScanned: (barcodes: { rawValue: string | undefined }[]) => void;
  onError: (error: Error) => void;
};
type CameraProps = {
  isActive: boolean;
  device: unknown;
  outputs?: unknown[];
  onError?: (error: Error) => void;
};

export const cameraMock = {
  /** The permission the app starts with. */
  status: 'not-determined' as PermissionStatus,
  /** What the system dialog answers. */
  grantOnRequest: true,
  requests: 0,
  scanner: null as ScanOptions | null,
  camera: null as CameraProps | null,
  reset() {
    this.status = 'not-determined';
    this.grantOnRequest = true;
    this.requests = 0;
    this.scanner = null;
    this.camera = null;
  },
  /** The camera sees these barcodes in one frame. */
  scan(...rawValues: (string | undefined)[]) {
    this.scanner?.onBarcodeScanned(rawValues.map(rawValue => ({ rawValue })));
  },
};

export function useCameraPermission() {
  const [status, setStatus] = useState<PermissionStatus>(cameraMock.status);
  const requestPermission = useCallback(async () => {
    cameraMock.requests++;
    cameraMock.status = cameraMock.grantOnRequest ? 'authorized' : 'denied';
    setStatus(cameraMock.status);
    return cameraMock.status === 'authorized';
  }, []);
  return {
    status,
    hasPermission: status === 'authorized',
    canRequestPermission: status === 'not-determined',
    requestPermission,
  };
}

export function Camera(props: CameraProps) {
  cameraMock.camera = props;
  return <View testID="camera" />;
}

export function useBarcodeScannerOutput(options: ScanOptions) {
  cameraMock.scanner = options;
  return { kind: 'barcode-scanner-output' };
}
