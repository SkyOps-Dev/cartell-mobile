// Find Sensor's links (maps_launcher 3.0.0+1 createCoordinatesUri), as Dart builds them: Dart's
// double.toString and Uri's query encoding. The expected strings are what Dart prints for
// Uri(scheme: 'geo', host: 'ul', queryParameters: {'q': ...}) and
// Uri.https('maps.apple.com', '/', {...}).

import { Linking, Platform } from 'react-native';

import { dartDoubleToString } from '../../src/models/jsonParser';
import {
  createCoordinatesUri,
  encodeQueryComponent,
  launchCoordinates,
} from '../../src/services/mapsLauncher';

afterEach(() => jest.restoreAllMocks());

describe('dartDoubleToString', () => {
  test.each([
    [40, '40.0'],
    [-74, '-74.0'],
    [-0, '-0.0'],
    [40.712776, '40.712776'],
    [1e21, '1e+21'],
    [1e20, '100000000000000000000.0'],
    [1.5e-7, '1.5e-7'],
    [0.000001, '0.000001'],
  ])('%p → %s', (value, expected) => {
    expect(dartDoubleToString(value)).toBe(expected);
  });
});

describe('encodeQueryComponent', () => {
  test('keeps only A–Z a–z 0–9 - . _ ~, and writes a space as +', () => {
    expect(encodeQueryComponent("a-b._~ (x),!'*é")).toBe(
      'a-b._~+%28x%29%2C%21%27%2A%C3%A9',
    );
  });
});

describe('createCoordinatesUri', () => {
  test('Android: geo://ul?q=<lat>,<lng>(<label>)', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    expect(createCoordinatesUri(40.712776, -74.005974, 'Front Door')).toBe(
      'geo://ul?q=40.712776%2C-74.005974%28Front+Door%29',
    );
    expect(createCoordinatesUri(40, -74, 'Gate')).toBe(
      'geo://ul?q=40.0%2C-74.0%28Gate%29',
    );
  });

  test('iOS: https://maps.apple.com/?ll=<lat>,<lng>&q=<label>', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    expect(createCoordinatesUri(40.712776, -74.005974, 'Front Door')).toBe(
      'https://maps.apple.com/?ll=40.712776%2C-74.005974&q=Front+Door',
    );
  });

  test('iOS: an empty label drops its "="', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    expect(createCoordinatesUri(1.5, 2.5, '')).toBe(
      'https://maps.apple.com/?ll=1.5%2C2.5&q',
    );
  });

  test('launchCoordinates opens the link', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const open = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined as never);
    await launchCoordinates(1.25, 2, 'S');
    expect(open).toHaveBeenCalledWith('geo://ul?q=1.25%2C2.0%28S%29');
  });
});
