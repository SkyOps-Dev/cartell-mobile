// GoToAccountSettingsScreen and the three edit-form events
// (bloc/main_app/events/go_to_account_settings_*.dart; spec 06 §4, spec 11).

import { AuthRequestManager } from '../../src/services/requests/authRequests';
import { Result } from '../../src/services/result';
import { AuthBloc } from '../../src/state/auth/authBloc';
import {
  GoToAccountSettingsEditNameScreenEvent,
  GoToAccountSettingsEditPasswordScreenEvent,
  GoToAccountSettingsEditPhoneNumberScreenEvent,
  GoToAccountSettingsScreen,
  GoToHubsScreenEvent,
  IsOnAccountSettingsEditNameScreenState,
  IsOnAccountSettingsEditPasswordScreenState,
  IsOnAccountSettingsEditPhoneNumberScreenState,
  IsOnAccountSettingsScreenState,
  IsOnHubsScreenState,
  MainAppBloc,
  MainAppState,
} from '../../src/state/mainApp/mainAppBloc';
import { flush, installFakeServer } from '../helpers/fakeServer';

const userJson = {
  id: 3,
  email: 'umair@example.com',
  first_name: 'Umair',
  last_name: 'Khan',
  phone_no: '5551234567',
  should_send_emails: false,
};
const profileJson = {
  user: 3,
  should_send_notification: true,
  locations: [],
  alexa_enabled: false,
};

let mainAppBloc: MainAppBloc;
let emitted: MainAppState[];

beforeEach(async () => {
  jest
    .spyOn(AuthRequestManager.prototype, 'auth')
    .mockResolvedValue(Result.success());
  // A bloc with nothing behind it: the events here never reach the AuthBloc.
  mainAppBloc = new MainAppBloc({ add: jest.fn() } as unknown as AuthBloc);
  await flush();
  emitted = [];
  mainAppBloc.subscribe(() => emitted.push(mainAppBloc.state));
});

afterEach(() => {
  mainAppBloc.close();
  jest.restoreAllMocks();
});

async function settle() {
  for (let i = 0; i < 10; i++) {
    await flush();
  }
}

test('shows the skeleton at once, then the user and profile once both have landed', async () => {
  installFakeServer({
    'GET /maintenance-mode/': { status: 200 },
    'GET /auth/users/me/': { status: 200, body: userJson },
    'GET /profiles/me': { status: 200, body: profileJson },
  });
  mainAppBloc.add(new GoToAccountSettingsScreen());
  expect(emitted).toHaveLength(1);
  const skeleton = emitted[0] as IsOnAccountSettingsScreenState;
  expect(skeleton).toBeInstanceOf(IsOnAccountSettingsScreenState);
  expect([skeleton.user, skeleton.profile]).toEqual([null, null]);
  expect(skeleton.isPoppable).toBe(true);

  await settle();
  expect(emitted).toHaveLength(2);
  const loaded = emitted[1] as IsOnAccountSettingsScreenState;
  expect(loaded.user).toMatchObject({ id: 3, firstName: 'Umair' });
  expect(loaded.profile).toMatchObject({
    user: 3,
    shouldSendNotification: true,
  });
});

test('asks for both side by side, not one after the other', async () => {
  const answers: (() => void)[] = [];
  const { requests } = installFakeServer({
    'GET /maintenance-mode/': { status: 200 },
  });
  const fetchMock = global.fetch as jest.Mock;
  const plain = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation((url: string, init?: RequestInit) => {
    if (url.endsWith('/maintenance-mode/')) {
      return plain(url, init);
    }
    requests.push({
      method: 'GET',
      path: new URL(url).pathname,
      headers: {},
      body: undefined,
    });
    return new Promise(resolve =>
      answers.push(() =>
        resolve({
          status: 200,
          text: async () =>
            JSON.stringify(url.includes('profiles') ? profileJson : userJson),
        } as Response),
      ),
    );
  });
  mainAppBloc.add(new GoToAccountSettingsScreen());
  await settle();
  // Both requests are out before either has answered.
  expect(
    requests
      .map(r => r.path)
      .filter(path => path !== '/maintenance-mode/')
      .sort(),
  ).toEqual(['/auth/users/me/', '/profiles/me']);
  answers.forEach(answer => answer());
  await settle();
  expect(emitted).toHaveLength(2);
});

test('a failed request goes to Hubs (the recovery), after both have finished', async () => {
  installFakeServer({
    'GET /maintenance-mode/': { status: 200 },
    'GET /auth/users/me/': { status: 200, body: userJson },
    'GET /profiles/me': { status: 500 },
  });
  mainAppBloc.add(new GoToAccountSettingsScreen());
  await settle();
  expect(emitted.map(s => s.constructor)).toEqual([
    IsOnAccountSettingsScreenState,
    IsOnHubsScreenState,
  ]);
});

test('leaving while it loads is respected: nothing jumps back', async () => {
  installFakeServer({
    'GET /maintenance-mode/': { status: 200 },
    'GET /auth/users/me/': { status: 200, body: userJson },
    'GET /profiles/me': { status: 200, body: profileJson },
  });
  mainAppBloc.add(new GoToAccountSettingsScreen());
  mainAppBloc.add(new GoToHubsScreenEvent());
  await settle();
  expect(emitted.map(s => s.constructor)).toEqual([
    IsOnAccountSettingsScreenState,
    IsOnHubsScreenState,
  ]);
});

test.each([
  [
    GoToAccountSettingsEditNameScreenEvent,
    IsOnAccountSettingsEditNameScreenState,
  ],
  [
    GoToAccountSettingsEditPasswordScreenEvent,
    IsOnAccountSettingsEditPasswordScreenState,
  ],
  [
    GoToAccountSettingsEditPhoneNumberScreenEvent,
    IsOnAccountSettingsEditPhoneNumberScreenState,
  ],
])(
  '%p shows its form with the user in hand, fetching nothing, off the back-stack',
  async (Event, State) => {
    const { fetchMock } = installFakeServer({});
    const user = {
      id: 3,
      email: 'e',
      firstName: 'F',
      lastName: 'L',
      phoneNo: '',
      shouldSendEmails: false,
    };
    mainAppBloc.add(new Event(user));
    await settle();
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toBeInstanceOf(State);
    expect((emitted[0] as unknown as { user: unknown }).user).toBe(user);
    expect(emitted[0].isPoppable).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  },
);
