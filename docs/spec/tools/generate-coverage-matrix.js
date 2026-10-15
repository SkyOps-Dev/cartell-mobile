// Generates ../22-file-coverage-matrix.md. Run: node react_native_app/docs/spec/tools/generate-coverage-matrix.js
// Every file under frontend/ (except generated build dirs) must match a rule,
// otherwise the script exits non-zero. First matching rule wins.
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../../../../frontend");
const OUT = path.resolve(__dirname, "../22-file-coverage-matrix.md");
const EXCLUDE_DIRS = new Set(["build", ".dart_tool", ".fvm", ".gradle", "Pods", ".idea"]);

function walk(dir, rel = "") {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (EXCLUDE_DIRS.has(e.name)) continue;
      out = out.concat(walk(path.join(dir, e.name), rel ? `${rel}/${e.name}` : e.name));
    } else {
      out.push(rel ? `${rel}/${e.name}` : e.name);
    }
  }
  return out;
}

// Directories whose files are listed as one grouped row.
const GROUPS = [
  /^android\/app\/src\/main\/res\/mipmap-[^/]+\//,
  /^ios\/Runner\/Assets\.xcassets\/AppIcon\.appiconset\//,
  /^ios\/Runner\/Assets\.xcassets\/LaunchImage\.imageset\//,
  /^ios\/Runner\/Assets\.xcassets\/SplashScreen\.imageset\//,
  /^ios\/Runner\/Assets\.xcassets\/SplashScreen2\.imageset\//,
  /^ios\/Runner\.xcodeproj\//,
  /^ios\/Runner\.xcworkspace\//,
  /^ios\/Flutter\//,
  /^android\/gradle\/wrapper\//,
  /^web\//,
  /^linux\//,
  /^macos\//,
  /^windows\//,
  /^docs\/superpowers\/plans\//,
  /^docs\/superpowers\/specs\//,
];

const R = (re, steps, note = "") => ({ re, steps, note });

const TEST_MAP = {
  "test/bloc/auth/attempt_logging_in_event_wiring_test.dart": "7.3",
  "test/bloc/auth/attempt_registration_event_wiring_test.dart": "7.4",
  "test/bloc/auth/auth_state_test.dart": "6.1, 7.x",
  "test/bloc/auth/biometric_gate_wiring_test.dart": "7.2, 7.3, 10.1",
  "test/bloc/devices/recovery_after_close_test.dart": "9.2",
  "test/bloc/main_app/go_to_hubs_screen_event_test.dart": "9.1",
  "test/bloc/shared/emit_then_refresh_test.dart": "6.2",
  "test/components/conditional_view_widget_test.dart": "5.9",
  "test/components/env_banner_test.dart": "3.5, 5.9",
  "test/components/forms/auto_switch_test.dart": "5.4",
  "test/components/forms/qr_scanner_validity_test.dart": "14.2",
  "test/components/forms/rounded_button_test.dart": "5.2",
  "test/components/friendly_error_view_test.dart": "5.9",
  "test/components/hub_light_guide_test.dart": "5.8",
  "test/components/hub_light_widget_test.dart": "5.8",
  "test/components/key_value_pair_display_test.dart": "5.9",
  "test/components/navbar_drawer_dismissal_test.dart": "5.9, 9.1",
  "test/components/navbar_wiring_test.dart": "9.1",
  "test/components/pairing/pairing_step_scaffold_test.dart": "15.6",
  "test/components/popups_test.dart": "5.5",
  "test/native_biometric_config_test.dart": "3.2, 3.3",
  "test/screens/account/edit_password_test.dart": "10.2",
  "test/screens/account/friendly_error_view_usage_test.dart": "10.2, 10.3",
  "test/screens/bloc_widgets/auth_bloc_widget_wiring_test.dart": "6.3, 7.6",
  "test/screens/devices/firmware_update/available_firmware_updates_screen_test.dart": "13.1",
  "test/screens/devices/firmware_update/firmware_update_listener_test.dart": "13.2",
  "test/screens/devices/firmware_update/update_device_screen_test.dart": "13.2",
  "test/screens/sensors/edit_sensor_test.dart": "12.3",
  "test/screens/sensors/format_coordinate_test.dart": "12.3",
  "test/screens/sensors/sensor_flagged_banner_test.dart": "12.2",
  "test/screens/sensors/sensor_view_wiring_test.dart": "12.2",
  "test/screens/welcome/lock_screen_test.dart": "7.2",
  "test/screens/welcome/login_screen_test.dart": "7.3",
  "test/screens/welcome/maintenance_mode_screen_test.dart": "7.6",
  "test/screens/welcome/registration_screen_test.dart": "7.4",
  "test/services/auth_manager/check_creds_test.dart": "4.9, 8.4",
  "test/services/biometric_preference_test.dart": "4.4",
  "test/services/biometric_service_test.dart": "7.7",
  "test/services/encryption_test.dart": "4.6",
  "test/services/enums/result_test.dart": "4.3",
  "test/services/legacy_credential_purge_wiring_test.dart": "4.4, 7.2, 7.5, 10.1",
  "test/services/requests/auth_requests_test.dart": "4.8",
  "test/services/requests/authorized_requester_test.dart": "4.8",
  "test/services/requests/hub_network_name_check_test.dart": "4.8",
  "test/services/requests/network_helper_test.dart": "4.8",
  "test/services/secure_storage_purge_test.dart": "4.4",
  "test/services/secure_storage_test.dart": "4.4",
  "test/udp_commands/scan_wifi_ssid_padding_test.dart": "4.11",
  "test/udp_commands/udp_connection_singleton_test.dart": "4.11",
  "test/udp_commands/udp_connection_test.dart": "4.11",
  "test/utilities/AppWatchers/mode_debouncer_test.dart": "4.10",
  "test/utilities/AppWatchers/mode_watcher_test.dart": "4.10",
  "test/utilities/exceptions/account_exceptions_test.dart": "4.3",
};

const RULES = [
  // ---- root files
  R(/^\.env$/, "—", "Vestigial dotenv asset; nothing reads it (D11)"),
  R(/^\.flutter-plugins-dependencies$/, "—", "Generated plugin list (informed spec 03 §10)"),
  R(/^\.fvmrc$/, "—", "Flutter toolchain pin"),
  R(/^\.gitignore$/, "3.6", "RN .gitignore equivalent"),
  R(/^\.impeccable\//, "1.4", "Design-token reference"),
  R(/^\.metadata$/, "—", "Flutter tool metadata"),
  R(/^\.vscode\//, "3.6", "Editor settings (optional equivalent)"),
  R(/^CLAUDE\.md$/, "0.2, 19.6", "Gotchas folded into specs; write RN CLAUDE.md"),
  R(/^DESIGN\.md$/, "1.4, 5.x", "Design intent — as-built code wins"),
  R(/^PRODUCT\.md$/, "0.1", "Product context"),
  R(/^README\.md$/, "19.6", "Docs"),
  R(/^FOLLOWUP_TODO\.md$/, "spec 19", "Review items; confirmed ones are in the quirk register"),
  R(/^changelog\.txt$/, "18.5", "Release-notes source"),
  R(/^flutter-release-notes\.txt$/, "18.5", "Historical release notes"),
  R(/^Pipfile(\.lock)?$/, "18.4", "Release-tool dependencies"),
  R(/^analysis_options\.yaml$/, "3.6", "Lint policy → ESLint/TS strict"),
  R(/^devtools_options\.yaml$/, "—", "Flutter DevTools config"),
  R(/^pubspec\.yaml$/, "2.10, 3.1, 3.4, 18.1", "Dependencies, assets, fonts, version"),
  R(/^pubspec\.lock$/, "2.10", "Locked versions — read package sources at these versions"),
  // ---- android
  R(/^android\/fastlane\//, "18.4", "Fastlane lanes"),
  R(/^android\/Gemfile/, "18.4", "Fastlane Ruby deps"),
  R(/^android\/app\/google-services-old\.json$/, "—", "Unused leftover"),
  R(/^android\/app\/google-services\.json$/, "3.2, 8.1", "Firebase Android config"),
  R(/^android\/app\/src\/main\/java\/io\/flutter\/plugins\/GeneratedPluginRegistrant\.java$/, "—", "Generated"),
  R(/^android\/local\.properties$/, "—", "Machine-local"),
  R(/^android\/app\/src\/main\/res\/mipmap-/, "3.2", "Launcher icons — copy byte-for-byte"),
  R(/^android\/app\/src\/main\/ic_launcher-playstore\.png$/, "3.2", "Play Store icon"),
  R(/^android\/app\/src\/main\/res\/drawable\/ic_launcher_background\.xml$/, "—", "Template vector, unreferenced"),
  R(/^android\/app\/src\/main\/res\//, "3.2", "Themes / launch background"),
  R(/^android\/app\/src\/main\/kotlin\//, "3.2", "MainActivity (FragmentActivity host requirement)"),
  R(/^android\/app\/src\/(main|debug|profile)\/AndroidManifest\.xml$/, "3.2", "Manifest parity"),
  R(/^android\/\.gitignore$/, "3.6", ""),
  R(/^android\//, "3.2", "Gradle/build config"),
  // ---- ios
  R(/^ios\/fastlane\//, "18.4", "Fastlane lanes"),
  R(/^ios\/Gemfile/, "18.4", "Fastlane Ruby deps"),
  R(/^ios\/ExportOptions\.plist$/, "3.3, 18.4", "manageAppVersionAndBuildNumber=false"),
  R(/^ios\/TR563D534B\./, "18.2", "Signing material — never copy into the repo"),
  R(/^ios\/Flutter\//, "—", "Flutter-generated build config"),
  R(/^ios\/Runner\/GeneratedPluginRegistrant\./, "—", "Generated"),
  R(/^ios\/Runner\/Assets\.xcassets\/AppIcon\.appiconset\//, "3.3", "App icon set — copy"),
  R(/^ios\/Runner\/Assets\.xcassets\/LaunchImage\.imageset\//, "3.3", "1×1 launch image"),
  R(/^ios\/Runner\/Assets\.xcassets\/SplashScreen2?\.imageset\//, "—", "Unused image sets"),
  R(/^ios\/Runner\/Assets\.xcassets\/Contents\.json$/, "3.3", ""),
  R(/^ios\/Runner\/Base\.lproj\/LaunchScreen\.storyboard$/, "3.3", "#0A0E21 launch screen"),
  R(/^ios\/Runner\/Base\.lproj\/Main\.storyboard$/, "3.3", "Flutter main storyboard — verify no visible effect"),
  R(/^ios\/Runner\/GoogleService-Info\.plist$/, "3.3, 8.1", "Firebase iOS config"),
  R(/^ios\/Runner\/(Info\.plist|Runner\.entitlements|AppDelegate\.swift|Runner-Bridging-Header\.h)$/, "3.3", "Native shell parity"),
  R(/^ios\/Runner\.xcodeproj\//, "3.3", "Project settings (deployment target, team, family)"),
  R(/^ios\/Runner\.xcworkspace\//, "3.3", ""),
  R(/^ios\/Podfile$/, "3.3", "Pod floor raise"),
  R(/^ios\/\.gitignore$/, "3.6", ""),
  // ---- assets
  R(/^assets\/fonts\//, "3.4", "Source Sans Pro Regular"),
  R(/^assets\/images\/(cartelldigitalreverse|HUB|Sensor|cartell_ct6|avatar)\.png$/, "3.4", "Used image"),
  R(/^assets\/images\//, "—", "Bundled but unreferenced in lib/ — not shipped unless the client asks"),
  // ---- docs / envs / scaffolds / tooling
  R(/^docs\/superpowers\/DEVICE-VERIFICATION-427\.md$/, "15.10", "Hardware verification checklist"),
  R(/^docs\/superpowers\//, "15.x (reference)", "Design history for pairing and release"),
  R(/^docs\/(fastlane|app_store)\.md$/, "18.4", ""),
  R(/^docs\//, "3.6 (reference)", "Dev process docs"),
  R(/^envs\//, "3.5", "Environment config — secrets never committed"),
  R(/^(linux|macos|windows)\//, "—", "Desktop scaffolds, not shipped (D7)"),
  R(/^web\//, "—", "Web scaffold, not shipped (D7)"),
  R(/^tests\/tool\/test_verify_artifact\.py$/, "18.3", ""),
  R(/^tests\/tool\//, "18.4", "Release-tool tests"),
  R(/^tool\/verify_artifact\.py$/, "18.3", "Artifact verifier"),
  R(/^tool\//, "18.4", "Release tool"),
  R(/^test\/support\//, "15.x", "Shared pairing fixtures"),
  // ---- lib: entry, blocs
  R(/^lib\/main\.dart$/, "3.5, 4.2, 6.3", "Startup, Sentry, app root"),
  R(/^lib\/bloc\/shared\//, "6.1, 6.2", "GenericBloc, emitThenRefresh, RefreshState"),
  R(/^lib\/bloc\/auth\/(auth_bloc|bloc|event|state)\.dart$/, "6.1, 7.2", "AuthBloc"),
  R(/^lib\/bloc\/auth\/events\/auto_login_event\.dart$/, "7.2", ""),
  R(/^lib\/bloc\/auth\/events\/attempt_logging_in_event\.dart$/, "7.3", ""),
  R(/^lib\/bloc\/auth\/events\/attempt_registration_event\.dart$/, "7.4", ""),
  R(/^lib\/bloc\/auth\/events\/attempt_log_out_event\.dart$/, "7.5", ""),
  R(/^lib\/bloc\/auth\/events\/maintenance_mode_event\.dart$/, "7.6", ""),
  R(/^lib\/bloc\/auth\/events\/go_to_/, "7.1", "Auth navigation events"),
  R(/^lib\/bloc\/main_app\/(main_app_bloc|bloc|event|state)\.dart$/, "9.1", "MainAppBloc"),
  R(/^lib\/bloc\/main_app\/events\/(go_to_hubs_screen_event|go_back_n_states_event)\.dart$/, "9.1", ""),
  R(/^lib\/bloc\/main_app\/events\/go_to_account_settings_screen\.dart$/, "10.1", ""),
  R(/^lib\/bloc\/main_app\/events\/go_to_account_settings_edit_/, "10.2", ""),
  R(/^lib\/bloc\/main_app\/events\/go_to_(contact_us_screen|alexa_help_screen_state|hub_lights_help_screen)\.dart$/, "10.3", ""),
  R(/^lib\/bloc\/main_app\/events\/go_to_event_history_screen\.dart$/, "11.2", ""),
  R(/^lib\/bloc\/devices\/(devices_bloc|bloc|event|state)\.dart$/, "9.2", "DevicesBloc + states"),
  R(/^lib\/bloc\/devices\/events\/(go_to_devices_home_screen|refresh_devices_event|go_back_n_states_event)\.dart$/, "9.2", ""),
  R(/^lib\/bloc\/devices\/events\/go_to_specific_device_event\.dart$/, "9.3", ""),
  R(/^lib\/bloc\/devices\/events\/go_to_device_settings\.dart$/, "9.4", ""),
  R(/^lib\/bloc\/devices\/events\/go_to_(about_device_screen|edit_device_screen)\.dart$/, "9.5", ""),
  R(/^lib\/bloc\/devices\/events\/go_to_(specific_device_history_event|sensor_history_event)\.dart$/, "11.2", ""),
  R(/^lib\/bloc\/devices\/events\/go_to_(sensors_screen_event|specific_sensor_screen)\.dart$/, "12.1, 12.2", ""),
  R(/^lib\/bloc\/devices\/events\/go_to_(specific_sensor_about_screen|edit_sensor_screen|edit_sensor_location_screen)\.dart$/, "12.3", ""),
  R(/^lib\/bloc\/devices\/events\/go_to_(add_sensor_start|is_removing_case_for_add_sensor|sensor_connect_screen)\.dart$/, "12.4", ""),
  R(/^lib\/bloc\/devices\/events\/go_to_(device_firmware_updates_event|update_device_firmware_screen)\.dart$/, "13.1, 13.2", ""),
  R(/^lib\/bloc\/devices\/events\/go_to_add_a_hub_screen\.dart$/, "14.1", ""),
  R(/^lib\/bloc\/devices\/events\/go_to_add_hub_success_screen\.dart$/, "14.3", ""),
  R(/^lib\/bloc\/devices\/events\/go_to_connect_hub_bloc\.dart$/, "15.2", "Entry into pairing"),
  // ---- lib: components
  R(/^lib\/components\/app_scaffold\.dart$/, "5.9", ""),
  R(/^lib\/components\/conditional_view_widget\.dart$/, "5.9", ""),
  R(/^lib\/components\/ellipsis\.dart$/, "9.2", "Hubs 'Add Hub' menu"),
  R(/^lib\/components\/env_banner\.dart$/, "3.5, 5.9", ""),
  R(/^lib\/components\/errors\//, "5.5, 6.3", "RenderedMessage types"),
  R(/^lib\/components\/forms\/additional_info_field\.dart$/, "5.9", ""),
  R(/^lib\/components\/forms\/auto_switch\.dart$/, "5.4", ""),
  R(/^lib\/components\/forms\/qr_scanner\.dart$/, "14.2", ""),
  R(/^lib\/components\/forms\/(rounded_button|scalable_button|toggle_button)\.dart$/, "5.2", ""),
  R(/^lib\/components\/forms\/text_field_with_post_change_validators\.dart$/, "5.3", ""),
  R(/^lib\/components\/friendly_error_view\.dart$/, "5.9", ""),
  R(/^lib\/components\/hub_light_widget\.dart$/, "5.8", ""),
  R(/^lib\/components\/hub_status_glyph\.dart$/, "5.9", ""),
  R(/^lib\/components\/icon_content\.dart$/, "5.9", "Unused, port for completeness"),
  R(/^lib\/components\/key_value_pair_display\.dart$/, "5.9", ""),
  R(/^lib\/components\/navbar\.dart$/, "5.9, 9.1", ""),
  R(/^lib\/components\/pairing\/pairing_step_scaffold\.dart$/, "15.6", ""),
  R(/^lib\/components\/popups\.dart$/, "5.5, 5.6", "Dialog + toasts"),
  R(/^lib\/components\/(responsive_spacer|reusable_card|reusable_listing)\.dart$/, "5.9", ""),
  R(/^lib\/components\/rounded_loader\.dart$/, "5.2", ""),
  R(/^lib\/components\/sensor_ellipsis\.dart$/, "12.1", "Sensors 'Pair Sensor' menu"),
  R(/^lib\/components\/sensors\/sensor_card\.dart$/, "12.1", ""),
  R(/^lib\/components\/teast_popups\.dart$/, "5.6", "Top banner (showInfo unused)"),
  R(/^lib\/components\/three_button_rows\//, "5.9", ""),
  R(/^lib\/components\/timed_pull_to_refresh\.dart$/, "5.10", ""),
  R(/^lib\/components\/top_appbar\.dart$/, "—", "Dead code (D11)"),
  R(/^lib\/components\/user_feedback\.dart$/, "10.3", ""),
  // ---- lib: models
  R(/^lib\/models\//, "4.7", "Models + parsers"),
  // ---- lib: screens
  R(/^lib\/screens\/account\/account_settings(_skeleton)?\.dart$/, "10.1", ""),
  R(/^lib\/screens\/account\/edit_/, "10.2", ""),
  R(/^lib\/screens\/bloc_widgets\//, "6.3", "Routers"),
  R(/^lib\/screens\/devices\/add_device\/successfully_added_device_screen\.dart$/, "14.3", ""),
  R(/^lib\/screens\/devices\/add_device\//, "14.1", "AddDevice screen + AddDeviceBloc"),
  R(/^lib\/screens\/devices\/connect_hub_to_wifi\/hub_wifi\.dart$/, "15.1", ""),
  R(/^lib\/screens\/devices\/connect_hub_to_wifi\/(connect_hub|bloc|states|timer_manager|connection_constants)\.dart$/, "15.2", ""),
  R(/^lib\/screens\/devices\/connect_hub_to_wifi\/events\/(hub_event|hub_setup_events)\.dart$/, "15.2", ""),
  R(/^lib\/screens\/devices\/connect_hub_to_wifi\/events\/(hub_connection_events|wifi_network_events)\.dart$/, "15.3", ""),
  R(/^lib\/screens\/devices\/connect_hub_to_wifi\/events\/wifi_connection_events\.dart$/, "15.4, 15.5", ""),
  R(/^lib\/screens\/devices\/connect_hub_to_wifi\/events\/error_events\.dart$/, "15.5", ""),
  R(/^lib\/screens\/devices\/connect_hub_to_wifi\/(hub_access_point_probe|hub_registration_check|hub_registration_poller|server_reachability|utilities)\.dart$/, "15.5", ""),
  R(/^lib\/screens\/devices\/connect_hub_to_wifi\/pairing_error_codes\.dart$/, "15.3", ""),
  R(/^lib\/screens\/devices\/connect_hub_to_wifi\/reply_guard\.dart$/, "15.4", ""),
  R(/^lib\/screens\/devices\/connect_hub_to_wifi\/pairing_step_index\.dart$/, "15.6", ""),
  R(/^lib\/screens\/devices\/connect_hub_to_wifi\/widgets\//, "15.6", "Pairing screen"),
  R(/^lib\/screens\/devices\/devices_screen\.dart$/, "9.2", "Hubs list"),
  R(/^lib\/screens\/devices\/device_view\.dart$/, "9.3", "Hub detail"),
  R(/^lib\/screens\/devices\/device_settings_screen\.dart$/, "9.4", "Hub settings"),
  R(/^lib\/screens\/devices\/(device_meta|edit_device)\.dart$/, "9.5", "About / rename hub"),
  R(/^lib\/screens\/devices\/firmware_update\/available_firmware_updates_screen\.dart$/, "13.1", ""),
  R(/^lib\/screens\/devices\/firmware_update\/websocket_close_codes\.dart$/, "—", "Dead code (D11)"),
  R(/^lib\/screens\/devices\/firmware_update\//, "13.2", "Listener / progress"),
  R(/^lib\/screens\/events\//, "11.1, 11.2", "Event history"),
  R(/^lib\/screens\/misc\/(add_location|invite_shared_user)\.dart$/, "—", "Dead code (D11)"),
  R(/^lib\/screens\/misc\/debug_menu\.dart$/, "7.1", ""),
  R(/^lib\/screens\/misc\/(alexa_cheat_sheet|contact_us|hub_lights)\.dart$/, "10.3", ""),
  R(/^lib\/screens\/sensors\/sensors_screen\.dart$/, "12.1", ""),
  R(/^lib\/screens\/sensors\/(sensor_view|sensor_flagged_banner)\.dart$/, "12.2", ""),
  R(/^lib\/screens\/sensors\/(sensor_meta|edit_sensor|edit_coordinates)\.dart$/, "12.3", ""),
  R(/^lib\/screens\/sensors\/add_sensor\//, "12.4", "Add-sensor wizard"),
  R(/^lib\/screens\/welcome\/(load_screen|welcome_screen)\.dart$/, "7.1", ""),
  R(/^lib\/screens\/welcome\/lock_screen\.dart$/, "7.2", ""),
  R(/^lib\/screens\/welcome\/login_screen\.dart$/, "7.3", ""),
  R(/^lib\/screens\/welcome\/registration_screen\.dart$/, "7.4", ""),
  R(/^lib\/screens\/welcome\/maintenance_mode_screen\.dart$/, "7.6", ""),
  // ---- lib: services
  R(/^lib\/services\/auth_manager\/check_creds\.dart$/, "4.9, 7.2, 8.4", ""),
  R(/^lib\/services\/biometric_service\.dart$/, "7.7", ""),
  R(/^lib\/services\/data\/data_persistor\.dart$/, "4.7", ""),
  R(/^lib\/services\/(encryption|hash_mac_address)\.dart$/, "4.6", ""),
  R(/^lib\/services\/enums\/result\.dart$/, "4.3", ""),
  R(/^lib\/services\/(immediate_timer|library|text_formatters)\.dart$/, "4.5", ""),
  R(/^lib\/services\/notifications\.dart$/, "8.2", ""),
  R(/^lib\/services\/request\.dart$/, "4.8", ""),
  R(/^lib\/services\/requests\/(networking|auth_gateway|auth_requests|authorized_requester|exceptions|hub_network_name_check)\.dart$/, "4.8", ""),
  R(/^lib\/services\/requests\/(device|event|firmware|firmware_update|location|sensor|settings|user)_requests\.dart$/, "4.9", "API functions"),
  R(/^lib\/services\/secure_storage\.dart$/, "4.4", ""),
  // ---- lib: udp + utilities
  R(/^lib\/udp_commands\//, "4.11", "UDP protocol"),
  R(/^lib\/utilities\/AppWatchers\//, "4.10", ""),
  R(/^lib\/utilities\/Exceptions\//, "4.3", ""),
  R(/^lib\/utilities\/bloc_popups\.dart$/, "5.5, 6.3", ""),
  R(/^lib\/utilities\/constants\.dart$/, "3.5, 5.1", ""),
  R(/^lib\/utilities\/(device_info|text_formatters)\.dart$/, "4.5", ""),
  R(/^lib\/utilities\/logging\.dart$/, "4.1", ""),
  R(/^lib\/utilities\/notifications\.dart$/, "8.1", ""),
  R(/^lib\/utilities\/object_stack\.dart$/, "4.5, 6.1", ""),
  R(/^lib\/utilities\/scaling\.dart$/, "4.5, 16.1", ""),
  R(/^lib\/utilities\/start_services\.dart$/, "4.7, 4.8", "Persistors, parsers, 15 s auth timer"),
];

function classify(file) {
  if (TEST_MAP[file]) return { steps: TEST_MAP[file], note: "Port as RN test" };
  if (file.startsWith("test/screens/devices/connect_hub_to_wifi/")) return { steps: "15.x", note: "Pairing test (see spec 20)" };
  for (const r of RULES) if (r.re.test(file)) return { steps: r.steps, note: r.note };
  return null;
}

const files = walk(ROOT).sort();
const unmapped = [];
const rows = new Map(); // section -> array of rows
const groupAgg = new Map(); // groupKey -> {count, steps, note, section}

function sectionOf(f) {
  if (f.startsWith("lib/")) return "lib/ (Dart source)";
  if (f.startsWith("test/")) return "test/ (Flutter tests)";
  if (f.startsWith("android/")) return "android/";
  if (f.startsWith("ios/")) return "ios/";
  if (f.startsWith("assets/")) return "assets/";
  if (/^(tool|tests)\//.test(f)) return "tool/ and tests/tool/ (release tooling)";
  if (/^(docs|envs)\//.test(f)) return "docs/ and envs/";
  if (/^(web|linux|macos|windows)\//.test(f)) return "Unshipped platform scaffolds";
  return "frontend/ root files";
}

for (const f of files) {
  const c = classify(f);
  if (!c) { unmapped.push(f); continue; }
  const g = GROUPS.find((re) => re.test(f));
  const section = sectionOf(f);
  if (g) {
    const key = f.match(g)[0];
    const agg = groupAgg.get(key) || { count: 0, steps: c.steps, note: c.note, section };
    agg.count++;
    groupAgg.set(key, agg);
    continue;
  }
  if (!rows.has(section)) rows.set(section, []);
  rows.get(section).push({ file: f, ...c });
}
for (const [key, agg] of groupAgg) {
  if (!rows.has(agg.section)) rows.set(agg.section, []);
  rows.get(agg.section).push({ file: `${key}* (${agg.count} files)`, steps: agg.steps, note: agg.note });
}

if (unmapped.length) {
  console.error("UNMAPPED FILES:\n" + unmapped.join("\n"));
  process.exit(1);
}

const ORDER = [
  "lib/ (Dart source)", "test/ (Flutter tests)", "android/", "ios/", "assets/",
  "frontend/ root files", "docs/ and envs/", "tool/ and tests/tool/ (release tooling)",
  "Unshipped platform scaffolds",
];
const total = files.length;
const libCount = files.filter((f) => f.startsWith("lib/")).length;
const notPorted = [...rows.values()].flat().filter((r) => r.steps === "—");

let md = `# 22 — File Coverage Matrix (every Flutter file → the plan step that ports it)

Generated on 2026-10-05 by a script that walks \`frontend/\` (excluding \`build/\`, \`.dart_tool/\`,
\`.fvm/\`) and **fails if any file has no rule**. This is the guarantee that nothing in the Flutter
app is missed. Steps refer to \`../../PORTING_PLAN.md\`. "—" means deliberately not ported, with the
reason in the Note column.

- Files covered: **${total}** (including **${libCount}** Dart files in \`lib/\`). Unmapped: **0**.
- Rows marked "—": ${notPorted.length} (generated files, dead code, unshipped scaffolds, unused assets).
- Re-generate after any Flutter change (Phase 20) and fix any new unmapped file before porting it.
  Generator: \`node react_native_app/docs/spec/tools/generate-coverage-matrix.js\` (Node 18+).

`;
for (const s of ORDER) {
  const list = rows.get(s);
  if (!list) continue;
  list.sort((a, b) => a.file.localeCompare(b.file));
  md += `\n## ${s}\n\n| File | Plan step(s) | Note |\n|---|---|---|\n`;
  for (const r of list) md += `| \`${r.file}\` | ${r.steps} | ${r.note} |\n`;
}
fs.writeFileSync(OUT, md);
console.log(`OK: ${total} files mapped (${libCount} in lib/), ${notPorted.length} rows not ported. Wrote ${OUT}`);
