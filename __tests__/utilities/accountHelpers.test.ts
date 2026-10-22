// The small pure pieces behind Account Settings: Flutter's formatPhoneNumber (with Dart's
// int.tryParse), SettingParser's case-sensitive bool, and the type names the switch toasts show.

import { parseProfile } from '../../src/models/profile';
import { parseSetting } from '../../src/models/setting';
import {
  NoAccountInformationFoundException,
  UnableToUpdateUserInformationException,
  UpdateStoredCredentialsFailedException,
  TimeOutException,
} from '../../src/services/exceptions';
import { dartTypeName } from '../../src/utilities/dartTypeName';
import {
  formatPhoneNumber,
  isDartInt,
} from '../../src/utilities/textFormatters';

describe('formatPhoneNumber', () => {
  test.each([
    ['5551234567', '(555) 123-4567'],
    ['0000000000', '(000) 000-0000'],
    // int.tryParse takes a sign, so these ten count as numbers too.
    ['+555123456', '(+55) 512-3456'],
    ['-555123456', '(-55) 512-3456'],
    // …and a hexadecimal literal, and surrounding whitespace.
    ['0x12345678', '(0x1) 234-5678'],
    [' 55512345 ', '( 55) 512-345 '],
  ])('%j → %j', (input, output) => {
    expect(formatPhoneNumber(input)).toBe(output);
  });

  test.each([
    ['N/A', 'N/A'],
    ['555-123-4567', '555-123-4567'],
    ['555123456', '555123456'],
    ['55512345678', '55512345678'],
    ['555 123 456', '555 123 456'],
    ['12345abcde', '12345abcde'],
  ])('%j is not ten digits, so it stays %j', (input, output) => {
    expect(formatPhoneNumber(input)).toBe(output);
  });

  test('an empty phone gives null (the screen then says "Enter Phone Number")', () => {
    expect(formatPhoneNumber('')).toBeNull();
  });

  test.each([
    ['12', true],
    ['+12', true],
    ['\t12\n', true],
    ['0X1f', true],
    ['', false],
    ['+', false],
    ['1 2', false],
    ['0x', false],
    ['1.0', false],
    ['١٢', false],
  ])('isDartInt(%j) is %s', (source, expected) => {
    expect(isDartInt(source)).toBe(expected);
  });
});

describe('parseSetting', () => {
  test('only the exact text "true" is true', () => {
    expect(
      parseSetting({ id: 3, key: 'alexa_enabled', value: 'true' }),
    ).toEqual({
      id: 3,
      key: 'alexa_enabled',
      value: true,
    });
    for (const value of ['True', 'TRUE', '1', 'yes', 'false', '', null]) {
      expect(parseSetting({ id: 3, key: 'k', value }).value).toBe(false);
    }
  });

  test('missing id and key default to 0 and ""', () => {
    expect(parseSetting({ value: 'true' })).toEqual({
      id: 0,
      key: '',
      value: true,
    });
  });
});

test('parseProfile keeps the fields the app reads and the locations as sent', () => {
  const locations = [
    { id: 9, name: '(Default Location)', devices: [], groups: [] },
  ];
  expect(
    parseProfile({
      user: 3,
      should_send_notification: true,
      locations,
      alexa_enabled: false,
    }),
  ).toEqual({
    user: 3,
    shouldSendNotification: true,
    locations,
    alexaEnabled: false,
  });
});

describe('dartTypeName', () => {
  test.each<[string, unknown]>([
    [
      'UnableToUpdateUserInformationException',
      new UnableToUpdateUserInformationException('x'),
    ],
    [
      'UpdateStoredCredentialsFailedException',
      new UpdateStoredCredentialsFailedException('x'),
    ],
    [
      'NoAccountInformationFoundException',
      new NoAccountInformationFoundException('x'),
    ],
    ['TimeOutException', new TimeOutException()],
    ['ClientException', new TypeError('Network request failed')],
  ])('%s', (name, error) => {
    expect(dartTypeName(error)).toBe(name);
  });
});
