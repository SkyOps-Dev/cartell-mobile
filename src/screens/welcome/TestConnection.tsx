// Port of the connection test at the end of frontend/lib/screens/welcome/welcome_screen.dart
// (tryUrl, testEcho, ConnectionTest, TestConnectionWidget, TestWidget), shown by the Debug Info
// panel's Test Connection button inside a standard popup.
//
// The four requests start when the popup opens. Each waits 1 s, then has 15 s for the whole
// response. They go straight to the network: no maintenance pre-check and no Authorization
// header, the only calls in the app that skip both.
//
// A row shows a spinner until its check *answers*: ✓ for true, ✗ for false. A check that times
// out or fails on the network never answers, so its spinner turns forever (Q33): FutureBuilder
// only looks at hasData.

import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { baseUrlHttp } from '../../config/environment';
import { Icon } from '../../components/icons/Icon';
import { FontAwesomeIcons } from '../../components/icons/iconData';
import { CircularProgressIndicator } from '../../components/progress/CircularProgressIndicator';
import { ambientTextStyle, textStyle } from '../../theme/typography';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** The response, body read, or a rejection once 15 s have passed (Future.timeout). */
async function send(
  url: string,
  init: RequestInit = {},
): Promise<{ status: number; body: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal as RequestInit['signal'],
    });
    return { status: response.status, body: await response.text() };
  } finally {
    clearTimeout(timer);
  }
}

export async function tryUrl(url: string): Promise<boolean> {
  await delay(1000);
  const response = await send(url);
  return response.status === 200;
}

export async function testEcho(url: string): Promise<boolean> {
  await delay(1000);
  const response = await send(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"msg":"this is a test"}',
  });
  if (response.status !== 200) {
    return false;
  }
  // jsonDecode(body)['msg']: a body that is not JSON, or not a JSON object, throws.
  const decoded: unknown = JSON.parse(response.body);
  if (
    decoded === null ||
    typeof decoded !== 'object' ||
    Array.isArray(decoded)
  ) {
    throw new TypeError('The echo is not a JSON object');
  }
  return (decoded as Record<string, unknown>).msg === 'this is a test';
}

type ConnectionTest = { title: string; didPass: Promise<boolean> };

function startTests(): ConnectionTest[] {
  return [
    { title: 'Internet Access', didPass: tryUrl('https://google.com') },
    { title: 'Server Access', didPass: tryUrl(`${baseUrlHttp()}/test/`) },
    // "Spash" as in the Flutter app (Q36).
    { title: 'Can Reach Spash Page', didPass: tryUrl(baseUrlHttp()) },
    {
      title: 'Can Post to Server',
      didPass: testEcho(`${baseUrlHttp()}/echo/`),
    },
  ];
}

export function TestConnectionWidget() {
  const [tests] = useState(startTests);
  return (
    <View style={styles.box}>
      <ScrollView bounces={false} style={styles.scroll}>
        <View style={styles.column}>
          {tests.map(test => (
            <TestWidget key={test.title} test={test} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function TestWidget({ test }: { test: ConnectionTest }) {
  const [didPass, setDidPass] = useState<boolean | null>(null);
  useEffect(() => {
    test.didPass.then(setDidPass, () => {});
  }, [test]);
  return (
    <View style={styles.row}>
      {didPass === null ? (
        <View style={styles.indicator}>
          <CircularProgressIndicator size={30} />
        </View>
      ) : (
        // A dialog's IconTheme in the dark theme: white.
        <Icon
          icon={didPass ? FontAwesomeIcons.check : FontAwesomeIcons.xmark}
          size={30}
          color="#FFFFFF"
        />
      )}
      <View style={styles.gap} />
      <Text style={[styles.title, titleStyle]}>{test.title}</Text>
    </View>
  );
}

const titleStyle = textStyle(ambientTextStyle, { fontSize: 18 });

const styles = StyleSheet.create({
  box: { maxWidth: 350, maxHeight: 500 },
  scroll: { flexGrow: 0 },
  column: { alignItems: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  indicator: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gap: { width: 10 },
  title: { flexShrink: 1 },
});
