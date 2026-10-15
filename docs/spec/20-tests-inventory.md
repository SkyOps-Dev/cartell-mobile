# 20 — Flutter Tests Inventory → RN Acceptance Tests

Plan steps: every "Port the tests" item. Source: `frontend/test/**` (77 files, **574 tests**) plus
the helper `test/support/pairing_fixtures.dart`. The full list of test names (group and test
descriptions) is the acceptance-criteria list. Re-extract it at each step with:

```bash
cd frontend/test && grep -nE "^\s*(group|test|testWidgets)\(" <file>
```

## How to port

- **Logic tests** (pure functions, blocs, services) become Jest unit tests with the same cases
  and names.
- **Widget tests** become React Native Testing Library tests asserting the same visible text,
  enabled/disabled state, semantics and callbacks.
- **"Wiring" tests** assert on Dart *source text*, because `AuthBloc` does network I/O in its
  constructor and could not be pumped. In TS, inject dependencies (fetch, storage, biometrics)
  and write **behavioural tests for the same rule** instead of source-text checks. Keep the rule
  the test protected: its group or test name.
- **Native-config tests** become a Jest test that reads the RN native files (AndroidManifest,
  styles, Info.plist, entitlements) and asserts the same facts.
- Keep a mapping comment at the top of each RN test file: `// Ported from frontend/test/<path>`.

## Inventory

| Flutter test file | Tests | Protects | Plan step |
|---|---|---|---|
| bloc/auth/attempt_logging_in_event_wiring_test.dart | 8 | Autofill commit once on success; no IsLoadingAppState mid-login; the empty guard runs first | 7.3 |
| bloc/auth/attempt_registration_event_wiring_test.dart | 6 | Commit only on 201; form stays mounted; unhandled status returns to the form | 7.4 |
| bloc/auth/auth_state_test.dart | 8 | State equality (login, registration, popup, maintenance) | 6.1, 7.x |
| bloc/auth/biometric_gate_wiring_test.dart | 6 | Gate placement and outcomes; offer guarded; settings row visibility | 7.2, 7.3, 10.1 |
| bloc/devices/recovery_after_close_test.dart | 1 | No dispatch into a closed bloc during recovery | 9.2 |
| bloc/main_app/go_to_hubs_screen_event_test.dart | 3 | HUBs from inside the hubs flow; from elsewhere; closed bloc | 9.1 |
| bloc/shared/emit_then_refresh_test.dart | 6 | emitThenRefresh semantics | 6.2 |
| components/conditional_view_widget_test.dart | 4 | Render or hide rules, errors hidden | 5.9 |
| components/env_banner_test.dart | 5 | Banner shown or hidden, runtime switch, stable tree | 3.5, 5.9 |
| components/forms/auto_switch_test.dart | 3 | Revert on failure, no throw after dispose | 5.4 |
| components/forms/qr_scanner_validity_test.dart | 3 | Validator semantics | 14.2 |
| components/forms/rounded_button_test.dart | 4 | Gravel disabled fill, semantics | 5.2 |
| components/friendly_error_view_test.dart | 16 | Messages, Retry and Sign In, no raw error text | 5.9 |
| components/hub_light_guide_test.dart | 4 | Unique names, meaningful descriptions | 5.8 |
| components/hub_light_widget_test.dart | 9 | Semantics, per-segment timing, independent streams, reduce motion, rebuild stability | 5.8 |
| components/key_value_pair_display_test.dart | 3 | Reflow at 1.5×, legible key | 5.9 |
| components/navbar_drawer_dismissal_test.dart | 7 | Close before dispatch; rail vs drawer at 800; showNavigation false | 5.9, 9.1 |
| components/navbar_wiring_test.dart | 3 | closeDrawer, never pop | 9.1 |
| components/pairing/pairing_step_scaffold_test.dart | 13 | Step count, title in the body, no navigation, help FAB, exit placement | 15.6 |
| components/popups_test.dart | 6 | Cancel inference rules | 5.5 |
| native_biometric_config_test.dart | 9 | FragmentActivity, AppCompat themes, appcompat dependency, window background literal, webcredentials hosts, Face ID string | 3.2, 3.3 |
| screens/account/edit_password_test.dart | 2 | One request plus spinner; a throw leaves the screen usable | 10.2 |
| screens/account/friendly_error_view_usage_test.dart | 7 | Feedback and edit-phone error branches use FriendlyErrorView | 10.2, 10.3 |
| screens/bloc_widgets/auth_bloc_widget_wiring_test.dart | 12 | Mode → event mapping via the debouncer; maintenance flag; login gets all fields | 6.3, 7.6 |
| screens/devices/connect_hub_to_wifi/abandon_dialog_widget_test.dart | 1 | Re-check state at tap time | 15.6 |
| …/abandon_guard_test.dart | 7 | pairingCanPop and abandonEventFor | 15.6 |
| …/access_point_probe_test.dart | 19 | decidePollStep probe rules and clamping; probeHubAccessPoint outcomes and cleanup | 15.5 |
| …/button_palette_test.dart | 2 | No off-palette colours in pairing; QR scanner accents | 15.6, 14.2 |
| …/event_handler_registration_test.dart | 1 | Every HubConnectionEvent has a handler | 15.2 |
| …/exit_wiring_test.dart | 2 | One way out; Back and the button share the function | 15.6 |
| …/hub_connection_events_test.dart | 11 | Summary events; cancel-after-success guard; orphaned poller; ErrorOccurred re-entrancy | 15.2, 15.5 |
| …/hub_registration_check_test.dart | 24 | classifyProbeFailure, decidePollStep, auth expiry, foreground lifecycle | 15.5 |
| …/hub_registration_poller_test.dart | 11 | Poller loop semantics | 15.5 |
| …/light_check_branch_test.dart | 5 | Two kinds of "No"; reset confirm; reset screen copy | 15.6 |
| …/list_wifi_networks_widget_test.dart | 7 | ListTile rows of 48dp or more; empty states; refresh reopens the window | 15.6 |
| …/no_password_dialog_test.dart | 1 | Connect without a password | 15.6 |
| …/pairing_copy_test.dart | 9 | Copy names real controls; approval word; timeout headline length | 15.6, 15.3 |
| …/pairing_error_codes_test.dart | 20 | Error codes; interpretVerificationMessage; describeVerificationTimeout | 15.3 |
| …/pairing_step_index_test.dart | 9 | Step numbering rules | 15.6 |
| …/pairing_stopped_widget_test.dart | 5 | Copy, order, code, no amber | 15.6 |
| …/password_length_test.dart | 8 | Byte-based limit, live error, disabled Connect, no autofill | 15.6, 4.6 |
| …/probe_outcome_screens_test.dart | 10 | Reverted screen, light readings, waiting screen | 15.6 |
| …/probe_outcome_test.dart | 6 | Poller handling of probe outcomes | 15.5 |
| …/reply_guard_test.dart | 7 | shouldAdvanceOnReply; codes; bloc close | 15.4, 15.2 |
| …/server_reachability_test.dart | 11 | decideReconnectStep, awaitServerReachable | 15.5 |
| …/start_connection_event_wiring_test.dart | 8 | Bind failure handling; cancel during platform calls; 1 s window check | 15.3 |
| …/waiting_screen_test.dart | 13 | Clock isolation, elapsed label, patience copy, reasons, exits | 15.6 |
| screens/devices/firmware_update/available_firmware_updates_screen_test.dart | 12 | Layout at 2.0×, offers, offline, staleness, running update | 13.1 |
| screens/devices/firmware_update/firmware_update_listener_test.dart | 21 | Errors, status mapping, close, resume, failure budget, no overlap | 13.2 |
| screens/devices/firmware_update/update_device_screen_test.dart | 3 | Retry after a resumed failure; error attribution | 13.2 |
| screens/sensors/edit_sensor_test.dart | 1 | Waits for the rename | 12.3 |
| screens/sensors/format_coordinate_test.dart | 5 | formatCoordinate | 12.3 |
| screens/sensors/sensor_flagged_banner_test.dart | 9 | Banner rendering and button | 12.2 |
| screens/sensors/sensor_view_wiring_test.dart | 2 | Contact support routes through MainAppBloc | 12.2 |
| screens/welcome/lock_screen_test.dart | 3 | Always a password route; message rules | 7.2 |
| screens/welcome/login_screen_test.dart | 17 | Autofill, errors, submitting, labels, dismissal | 7.3 |
| screens/welcome/maintenance_mode_screen_test.dart | 7 | Copy, layout, retry | 7.6 |
| screens/welcome/registration_screen_test.dart | 10 | Autofill, submitting, brand red, labels | 7.4 |
| services/auth_manager/check_creds_test.dart | 3 | validateToken null-safety; token never logged | 4.9, 8.4 |
| services/biometric_preference_test.dart | 5 | Three-state preference | 4.4 |
| services/biometric_service_test.dart | 9 | Availability and outcome mapping | 7.7 |
| services/encryption_test.dart | 6 | AES known answer; 64-byte rules | 4.6 |
| services/enums/result_test.dart | 7 | Result statuses | 4.3 |
| services/legacy_credential_purge_wiring_test.dart | 14 | Purge placement on launch, login, logout and delete; failure isolation | 4.4, 7.2, 7.5, 10.1 |
| services/requests/auth_requests_test.dart | 22 | Single flight, cache, _doAuth, offline gate | 4.8 |
| services/requests/authorized_requester_test.dart | 8 | 401 → refresh → retry; offline vs expired | 4.8 |
| services/requests/hub_network_name_check_test.dart | 2 | Capture vs breadcrumb | 4.8 |
| services/requests/network_helper_test.dart | 17 | Verbs with 401 retry; mode classification | 4.8 |
| services/secure_storage_purge_test.dart | 4 | Purge keys, environment scoping | 4.4 |
| services/secure_storage_test.dart | 7 | Empty→null normalisation | 4.4 |
| udp_commands/scan_wifi_ssid_padding_test.dart | 3 | NUL-terminated SSID decoding | 4.11 |
| udp_commands/udp_connection_singleton_test.dart | 4 | Bind failure does not install the instance | 4.11 |
| udp_commands/udp_connection_test.dart | 5 | Listener self-removal; destination config | 4.11 |
| utilities/AppWatchers/mode_debouncer_test.dart | 11 | Debouncer rules | 4.10 |
| utilities/AppWatchers/mode_watcher_test.dart | 3 | Listener add and remove | 4.10 |
| utilities/exceptions/account_exceptions_test.dart | 9 | Exception toString and hierarchy | 4.3 |
| support/pairing_fixtures.dart | — | Shared fixtures (devices, replies) | 15.x |

## Release-tool tests (`frontend/tests/tool/`, Python)

| File | Tests | Plan step |
|---|---|---|
| test_release.py | release flow | 18.4 |
| test_store_versions.py | build-number checks against the stores | 18.4 |
| test_verify_artifact.py | artifact environment fingerprint, signer, minimum OS | 18.3 |
| test_fastlane_lanes.py | lane guards (reads the Fastfiles) | 18.4 |

## Gaps (no Flutter test exists; add RN tests anyway)

Hubs list, hub detail, hub settings, about and rename hub, account settings, edit name and
phone, Help, Alexa, hub light guide, all event-history screens, sensors list, add-sensor wizard,
add-hub bloc and screen, notifications, logout flow, welcome and debug menu, and
DataPersistor/model parsing. Write behavioural tests from the specs for each of these.
