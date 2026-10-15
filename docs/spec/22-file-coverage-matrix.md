# 22 — File Coverage Matrix (every Flutter file → the plan step that ports it)

Generated on 2026-10-05 by a script that walks `frontend/` (excluding `build/`, `.dart_tool/`,
`.fvm/`) and **fails if any file has no rule**. This is the guarantee that nothing in the Flutter
app is missed. Steps refer to `../../PORTING_PLAN.md`. "—" means deliberately not ported, with the
reason in the Note column.

- Files covered: **643** (including **266** Dart files in `lib/`). Unmapped: **0**.
- Rows marked "—": 32 (generated files, dead code, unshipped scaffolds, unused assets).
- Re-generate after any Flutter change (Phase 20) and fix any new unmapped file before porting it.
  Generator: `node react_native_app/docs/spec/tools/generate-coverage-matrix.js` (Node 18+).


## lib/ (Dart source)

| File | Plan step(s) | Note |
|---|---|---|
| `lib/bloc/auth/auth_bloc.dart` | 6.1, 7.2 | AuthBloc |
| `lib/bloc/auth/bloc.dart` | 6.1, 7.2 | AuthBloc |
| `lib/bloc/auth/event.dart` | 6.1, 7.2 | AuthBloc |
| `lib/bloc/auth/events/attempt_log_out_event.dart` | 7.5 |  |
| `lib/bloc/auth/events/attempt_logging_in_event.dart` | 7.3 |  |
| `lib/bloc/auth/events/attempt_registration_event.dart` | 7.4 |  |
| `lib/bloc/auth/events/auto_login_event.dart` | 7.2 |  |
| `lib/bloc/auth/events/go_to_login_screen_event.dart` | 7.1 | Auth navigation events |
| `lib/bloc/auth/events/go_to_registration_screen_event.dart` | 7.1 | Auth navigation events |
| `lib/bloc/auth/events/go_to_welcome_screen_event.dart` | 7.1 | Auth navigation events |
| `lib/bloc/auth/events/maintenance_mode_event.dart` | 7.6 |  |
| `lib/bloc/auth/state.dart` | 6.1, 7.2 | AuthBloc |
| `lib/bloc/devices/bloc.dart` | 9.2 | DevicesBloc + states |
| `lib/bloc/devices/devices_bloc.dart` | 9.2 | DevicesBloc + states |
| `lib/bloc/devices/event.dart` | 9.2 | DevicesBloc + states |
| `lib/bloc/devices/events/go_back_n_states_event.dart` | 9.2 |  |
| `lib/bloc/devices/events/go_to_about_device_screen.dart` | 9.5 |  |
| `lib/bloc/devices/events/go_to_add_a_hub_screen.dart` | 14.1 |  |
| `lib/bloc/devices/events/go_to_add_hub_success_screen.dart` | 14.3 |  |
| `lib/bloc/devices/events/go_to_add_sensor_start.dart` | 12.4 |  |
| `lib/bloc/devices/events/go_to_connect_hub_bloc.dart` | 15.2 | Entry into pairing |
| `lib/bloc/devices/events/go_to_device_firmware_updates_event.dart` | 13.1, 13.2 |  |
| `lib/bloc/devices/events/go_to_device_settings.dart` | 9.4 |  |
| `lib/bloc/devices/events/go_to_devices_home_screen.dart` | 9.2 |  |
| `lib/bloc/devices/events/go_to_edit_device_screen.dart` | 9.5 |  |
| `lib/bloc/devices/events/go_to_edit_sensor_location_screen.dart` | 12.3 |  |
| `lib/bloc/devices/events/go_to_edit_sensor_screen.dart` | 12.3 |  |
| `lib/bloc/devices/events/go_to_is_removing_case_for_add_sensor.dart` | 12.4 |  |
| `lib/bloc/devices/events/go_to_sensor_connect_screen.dart` | 12.4 |  |
| `lib/bloc/devices/events/go_to_sensor_history_event.dart` | 11.2 |  |
| `lib/bloc/devices/events/go_to_sensors_screen_event.dart` | 12.1, 12.2 |  |
| `lib/bloc/devices/events/go_to_specific_device_event.dart` | 9.3 |  |
| `lib/bloc/devices/events/go_to_specific_device_history_event.dart` | 11.2 |  |
| `lib/bloc/devices/events/go_to_specific_sensor_about_screen.dart` | 12.3 |  |
| `lib/bloc/devices/events/go_to_specific_sensor_screen.dart` | 12.1, 12.2 |  |
| `lib/bloc/devices/events/go_to_update_device_firmware_screen.dart` | 13.1, 13.2 |  |
| `lib/bloc/devices/events/refresh_devices_event.dart` | 9.2 |  |
| `lib/bloc/devices/state.dart` | 9.2 | DevicesBloc + states |
| `lib/bloc/main_app/bloc.dart` | 9.1 | MainAppBloc |
| `lib/bloc/main_app/event.dart` | 9.1 | MainAppBloc |
| `lib/bloc/main_app/events/go_back_n_states_event.dart` | 9.1 |  |
| `lib/bloc/main_app/events/go_to_account_settings_edit_name_screen.dart` | 10.2 |  |
| `lib/bloc/main_app/events/go_to_account_settings_edit_password_screen.dart` | 10.2 |  |
| `lib/bloc/main_app/events/go_to_account_settings_edit_phone_number_screen.dart` | 10.2 |  |
| `lib/bloc/main_app/events/go_to_account_settings_screen.dart` | 10.1 |  |
| `lib/bloc/main_app/events/go_to_alexa_help_screen_state.dart` | 10.3 |  |
| `lib/bloc/main_app/events/go_to_contact_us_screen.dart` | 10.3 |  |
| `lib/bloc/main_app/events/go_to_event_history_screen.dart` | 11.2 |  |
| `lib/bloc/main_app/events/go_to_hub_lights_help_screen.dart` | 10.3 |  |
| `lib/bloc/main_app/events/go_to_hubs_screen_event.dart` | 9.1 |  |
| `lib/bloc/main_app/main_app_bloc.dart` | 9.1 | MainAppBloc |
| `lib/bloc/main_app/state.dart` | 9.1 | MainAppBloc |
| `lib/bloc/shared/bloc.dart` | 6.1, 6.2 | GenericBloc, emitThenRefresh, RefreshState |
| `lib/bloc/shared/events.dart` | 6.1, 6.2 | GenericBloc, emitThenRefresh, RefreshState |
| `lib/bloc/shared/generic_bloc.dart` | 6.1, 6.2 | GenericBloc, emitThenRefresh, RefreshState |
| `lib/bloc/shared/states.dart` | 6.1, 6.2 | GenericBloc, emitThenRefresh, RefreshState |
| `lib/components/app_scaffold.dart` | 5.9 |  |
| `lib/components/conditional_view_widget.dart` | 5.9 |  |
| `lib/components/ellipsis.dart` | 9.2 | Hubs 'Add Hub' menu |
| `lib/components/env_banner.dart` | 3.5, 5.9 |  |
| `lib/components/errors/popup_dialog.dart` | 5.5, 6.3 | RenderedMessage types |
| `lib/components/errors/popup_error.dart` | 5.5, 6.3 | RenderedMessage types |
| `lib/components/errors/popup_notification.dart` | 5.5, 6.3 | RenderedMessage types |
| `lib/components/errors/rendered_message.dart` | 5.5, 6.3 | RenderedMessage types |
| `lib/components/forms/additional_info_field.dart` | 5.9 |  |
| `lib/components/forms/auto_switch.dart` | 5.4 |  |
| `lib/components/forms/qr_scanner.dart` | 14.2 |  |
| `lib/components/forms/rounded_button.dart` | 5.2 |  |
| `lib/components/forms/scalable_button.dart` | 5.2 |  |
| `lib/components/forms/text_field_with_post_change_validators.dart` | 5.3 |  |
| `lib/components/forms/toggle_button.dart` | 5.2 |  |
| `lib/components/friendly_error_view.dart` | 5.9 |  |
| `lib/components/hub_light_widget.dart` | 5.8 |  |
| `lib/components/hub_status_glyph.dart` | 5.9 |  |
| `lib/components/icon_content.dart` | 5.9 | Unused, port for completeness |
| `lib/components/key_value_pair_display.dart` | 5.9 |  |
| `lib/components/navbar.dart` | 5.9, 9.1 |  |
| `lib/components/pairing/pairing_step_scaffold.dart` | 15.6 |  |
| `lib/components/popups.dart` | 5.5, 5.6 | Dialog + toasts |
| `lib/components/responsive_spacer.dart` | 5.9 |  |
| `lib/components/reusable_card.dart` | 5.9 |  |
| `lib/components/reusable_listing.dart` | 5.9 |  |
| `lib/components/rounded_loader.dart` | 5.2 |  |
| `lib/components/sensor_ellipsis.dart` | 12.1 | Sensors 'Pair Sensor' menu |
| `lib/components/sensors/sensor_card.dart` | 12.1 |  |
| `lib/components/teast_popups.dart` | 5.6 | Top banner (showInfo unused) |
| `lib/components/three_button_rows/icon_button_row_entry.dart` | 5.9 |  |
| `lib/components/three_button_rows/three_button_row.dart` | 5.9 |  |
| `lib/components/timed_pull_to_refresh.dart` | 5.10 |  |
| `lib/components/top_appbar.dart` | — | Dead code (D11) |
| `lib/components/user_feedback.dart` | 10.3 |  |
| `lib/main.dart` | 3.5, 4.2, 6.3 | Startup, Sentry, app root |
| `lib/models/abstract_model.dart` | 4.7 | Models + parsers |
| `lib/models/connection.dart` | 4.7 | Models + parsers |
| `lib/models/device_model.dart` | 4.7 | Models + parsers |
| `lib/models/device.dart` | 4.7 | Models + parsers |
| `lib/models/event.dart` | 4.7 | Models + parsers |
| `lib/models/firmware_update_model.dart` | 4.7 | Models + parsers |
| `lib/models/firmware.dart` | 4.7 | Models + parsers |
| `lib/models/json_parser.dart` | 4.7 | Models + parsers |
| `lib/models/location.dart` | 4.7 | Models + parsers |
| `lib/models/models.dart` | 4.7 | Models + parsers |
| `lib/models/profile.dart` | 4.7 | Models + parsers |
| `lib/models/sensor.dart` | 4.7 | Models + parsers |
| `lib/models/setting_model.dart` | 4.7 | Models + parsers |
| `lib/models/user.dart` | 4.7 | Models + parsers |
| `lib/screens/account/account_settings_skeleton.dart` | 10.1 |  |
| `lib/screens/account/account_settings.dart` | 10.1 |  |
| `lib/screens/account/edit_name.dart` | 10.2 |  |
| `lib/screens/account/edit_password.dart` | 10.2 |  |
| `lib/screens/account/edit_phone.dart` | 10.2 |  |
| `lib/screens/bloc_widgets/auth_bloc_widget.dart` | 6.3 | Routers |
| `lib/screens/bloc_widgets/devices_bloc_widget.dart` | 6.3 | Routers |
| `lib/screens/bloc_widgets/main_app_bloc_widget.dart` | 6.3 | Routers |
| `lib/screens/devices/add_device/add_device_screen.dart` | 14.1 | AddDevice screen + AddDeviceBloc |
| `lib/screens/devices/add_device/add_device.dart` | 14.1 | AddDevice screen + AddDeviceBloc |
| `lib/screens/devices/add_device/bloc/add_device_bloc.dart` | 14.1 | AddDevice screen + AddDeviceBloc |
| `lib/screens/devices/add_device/bloc/events/add_device_error_event.dart` | 14.1 | AddDevice screen + AddDeviceBloc |
| `lib/screens/devices/add_device/bloc/events/add_device_event.dart` | 14.1 | AddDevice screen + AddDeviceBloc |
| `lib/screens/devices/add_device/bloc/events/add_device_hide_mac_address_event.dart` | 14.1 | AddDevice screen + AddDeviceBloc |
| `lib/screens/devices/add_device/bloc/events/add_device_init_event.dart` | 14.1 | AddDevice screen + AddDeviceBloc |
| `lib/screens/devices/add_device/bloc/events/add_device_scanned_mac_address_event.dart` | 14.1 | AddDevice screen + AddDeviceBloc |
| `lib/screens/devices/add_device/bloc/events/add_device_show_mac_address_event.dart` | 14.1 | AddDevice screen + AddDeviceBloc |
| `lib/screens/devices/add_device/bloc/events/add_device_start_scanning_event.dart` | 14.1 | AddDevice screen + AddDeviceBloc |
| `lib/screens/devices/add_device/bloc/events/add_device_submit_event.dart` | 14.1 | AddDevice screen + AddDeviceBloc |
| `lib/screens/devices/add_device/bloc/events/add_device_warn_about_editing_event.dart` | 14.1 | AddDevice screen + AddDeviceBloc |
| `lib/screens/devices/add_device/bloc/events/base_add_device_event.dart` | 14.1 | AddDevice screen + AddDeviceBloc |
| `lib/screens/devices/add_device/bloc/states/add_device_initial_state.dart` | 14.1 | AddDevice screen + AddDeviceBloc |
| `lib/screens/devices/add_device/bloc/states/add_device_loading_state.dart` | 14.1 | AddDevice screen + AddDeviceBloc |
| `lib/screens/devices/add_device/bloc/states/add_device_showing_mac_address_field_state.dart` | 14.1 | AddDevice screen + AddDeviceBloc |
| `lib/screens/devices/add_device/bloc/states/add_device_state.dart` | 14.1 | AddDevice screen + AddDeviceBloc |
| `lib/screens/devices/add_device/bloc/states/add_device_warn_about_editing_state.dart` | 14.1 | AddDevice screen + AddDeviceBloc |
| `lib/screens/devices/add_device/bloc/states/base_add_device_state.dart` | 14.1 | AddDevice screen + AddDeviceBloc |
| `lib/screens/devices/add_device/successfully_added_device_screen.dart` | 14.3 |  |
| `lib/screens/devices/connect_hub_to_wifi/bloc.dart` | 15.2 |  |
| `lib/screens/devices/connect_hub_to_wifi/connect_hub.dart` | 15.2 |  |
| `lib/screens/devices/connect_hub_to_wifi/connection_constants.dart` | 15.2 |  |
| `lib/screens/devices/connect_hub_to_wifi/events/error_events.dart` | 15.5 |  |
| `lib/screens/devices/connect_hub_to_wifi/events/hub_connection_events.dart` | 15.3 |  |
| `lib/screens/devices/connect_hub_to_wifi/events/hub_event.dart` | 15.2 |  |
| `lib/screens/devices/connect_hub_to_wifi/events/hub_setup_events.dart` | 15.2 |  |
| `lib/screens/devices/connect_hub_to_wifi/events/wifi_connection_events.dart` | 15.4, 15.5 |  |
| `lib/screens/devices/connect_hub_to_wifi/events/wifi_network_events.dart` | 15.3 |  |
| `lib/screens/devices/connect_hub_to_wifi/hub_access_point_probe.dart` | 15.5 |  |
| `lib/screens/devices/connect_hub_to_wifi/hub_registration_check.dart` | 15.5 |  |
| `lib/screens/devices/connect_hub_to_wifi/hub_registration_poller.dart` | 15.5 |  |
| `lib/screens/devices/connect_hub_to_wifi/hub_wifi.dart` | 15.1 |  |
| `lib/screens/devices/connect_hub_to_wifi/pairing_error_codes.dart` | 15.3 |  |
| `lib/screens/devices/connect_hub_to_wifi/pairing_step_index.dart` | 15.6 |  |
| `lib/screens/devices/connect_hub_to_wifi/reply_guard.dart` | 15.4 |  |
| `lib/screens/devices/connect_hub_to_wifi/server_reachability.dart` | 15.5 |  |
| `lib/screens/devices/connect_hub_to_wifi/states.dart` | 15.2 |  |
| `lib/screens/devices/connect_hub_to_wifi/timer_manager.dart` | 15.2 |  |
| `lib/screens/devices/connect_hub_to_wifi/utilities.dart` | 15.5 |  |
| `lib/screens/devices/connect_hub_to_wifi/widgets/begin_pairing_hub_widget.dart` | 15.6 | Pairing screen |
| `lib/screens/devices/connect_hub_to_wifi/widgets/check_if_plugged_in_widget.dart` | 15.6 | Pairing screen |
| `lib/screens/devices/connect_hub_to_wifi/widgets/checking_if_hub_connected_to_server_widget.dart` | 15.6 | Pairing screen |
| `lib/screens/devices/connect_hub_to_wifi/widgets/connecting_to_hub_widget.dart` | 15.6 | Pairing screen |
| `lib/screens/devices/connect_hub_to_wifi/widgets/failure_widget.dart` | 15.6 | Pairing screen |
| `lib/screens/devices/connect_hub_to_wifi/widgets/hub_connect_widget.dart` | 15.6 | Pairing screen |
| `lib/screens/devices/connect_hub_to_wifi/widgets/hub_light_readings.dart` | 15.6 | Pairing screen |
| `lib/screens/devices/connect_hub_to_wifi/widgets/hub_reverted_widget.dart` | 15.6 | Pairing screen |
| `lib/screens/devices/connect_hub_to_wifi/widgets/intitial_connection_widget.dart` | 15.6 | Pairing screen |
| `lib/screens/devices/connect_hub_to_wifi/widgets/list_wifi_networks_widget.dart` | 15.6 | Pairing screen |
| `lib/screens/devices/connect_hub_to_wifi/widgets/pairing_stopped_widget.dart` | 15.6 | Pairing screen |
| `lib/screens/devices/connect_hub_to_wifi/widgets/reestablish_connection_to_server_widget.dart` | 15.6 | Pairing screen |
| `lib/screens/devices/connect_hub_to_wifi/widgets/resetting_hub_widget.dart` | 15.6 | Pairing screen |
| `lib/screens/devices/connect_hub_to_wifi/widgets/start_hub_connecting_to_wifi_widget.dart` | 15.6 | Pairing screen |
| `lib/screens/devices/connect_hub_to_wifi/widgets/success_widget.dart` | 15.6 | Pairing screen |
| `lib/screens/devices/connect_hub_to_wifi/widgets/validating_connection_widget.dart` | 15.6 | Pairing screen |
| `lib/screens/devices/connect_hub_to_wifi/widgets/verifying_hub_state_widget.dart` | 15.6 | Pairing screen |
| `lib/screens/devices/connect_hub_to_wifi/widgets/view_wifi_network_widget.dart` | 15.6 | Pairing screen |
| `lib/screens/devices/connect_hub_to_wifi/widgets/wifi_reconnect_failed_widget.dart` | 15.6 | Pairing screen |
| `lib/screens/devices/device_meta.dart` | 9.5 | About / rename hub |
| `lib/screens/devices/device_settings_screen.dart` | 9.4 | Hub settings |
| `lib/screens/devices/device_view.dart` | 9.3 | Hub detail |
| `lib/screens/devices/devices_screen.dart` | 9.2 | Hubs list |
| `lib/screens/devices/edit_device.dart` | 9.5 | About / rename hub |
| `lib/screens/devices/firmware_update/available_firmware_updates_screen.dart` | 13.1 |  |
| `lib/screens/devices/firmware_update/firmware_update_listener.dart` | 13.2 | Listener / progress |
| `lib/screens/devices/firmware_update/firmware_update_status_code.dart` | 13.2 | Listener / progress |
| `lib/screens/devices/firmware_update/firmware_update_status_type.dart` | 13.2 | Listener / progress |
| `lib/screens/devices/firmware_update/update_device_screen.dart` | 13.2 | Listener / progress |
| `lib/screens/devices/firmware_update/update_progress_snapshot.dart` | 13.2 | Listener / progress |
| `lib/screens/devices/firmware_update/websocket_close_codes.dart` | — | Dead code (D11) |
| `lib/screens/events/device_history.dart` | 11.1, 11.2 | Event history |
| `lib/screens/events/history.dart` | 11.1, 11.2 | Event history |
| `lib/screens/events/phone_rotation_manager.dart` | 11.1, 11.2 | Event history |
| `lib/screens/events/sensor_history.dart` | 11.1, 11.2 | Event history |
| `lib/screens/misc/add_location.dart` | — | Dead code (D11) |
| `lib/screens/misc/alexa_cheat_sheet.dart` | 10.3 |  |
| `lib/screens/misc/contact_us.dart` | 10.3 |  |
| `lib/screens/misc/debug_menu.dart` | 7.1 |  |
| `lib/screens/misc/hub_lights.dart` | 10.3 |  |
| `lib/screens/misc/invite_shared_user.dart` | — | Dead code (D11) |
| `lib/screens/sensors/add_sensor/00_enter_name_for_add_sensor.dart` | 12.4 | Add-sensor wizard |
| `lib/screens/sensors/add_sensor/01_remove_case_for_add_sensor.dart` | 12.4 | Add-sensor wizard |
| `lib/screens/sensors/add_sensor/02_sensor_connect_screen.dart` | 12.4 | Add-sensor wizard |
| `lib/screens/sensors/edit_coordinates.dart` | 12.3 |  |
| `lib/screens/sensors/edit_sensor.dart` | 12.3 |  |
| `lib/screens/sensors/sensor_flagged_banner.dart` | 12.2 |  |
| `lib/screens/sensors/sensor_meta.dart` | 12.3 |  |
| `lib/screens/sensors/sensor_view.dart` | 12.2 |  |
| `lib/screens/sensors/sensors_screen.dart` | 12.1 |  |
| `lib/screens/welcome/load_screen.dart` | 7.1 |  |
| `lib/screens/welcome/lock_screen.dart` | 7.2 |  |
| `lib/screens/welcome/login_screen.dart` | 7.3 |  |
| `lib/screens/welcome/maintenance_mode_screen.dart` | 7.6 |  |
| `lib/screens/welcome/registration_screen.dart` | 7.4 |  |
| `lib/screens/welcome/welcome_screen.dart` | 7.1 |  |
| `lib/services/auth_manager/check_creds.dart` | 4.9, 7.2, 8.4 |  |
| `lib/services/biometric_service.dart` | 7.7 |  |
| `lib/services/data/data_persistor.dart` | 4.7 |  |
| `lib/services/encryption.dart` | 4.6 |  |
| `lib/services/enums/result.dart` | 4.3 |  |
| `lib/services/hash_mac_address.dart` | 4.6 |  |
| `lib/services/immediate_timer.dart` | 4.5 |  |
| `lib/services/library.dart` | 4.5 |  |
| `lib/services/notifications.dart` | 8.2 |  |
| `lib/services/request.dart` | 4.8 |  |
| `lib/services/requests/auth_gateway.dart` | 4.8 |  |
| `lib/services/requests/auth_requests.dart` | 4.8 |  |
| `lib/services/requests/authorized_requester.dart` | 4.8 |  |
| `lib/services/requests/device_requests.dart` | 4.9 | API functions |
| `lib/services/requests/event_requests.dart` | 4.9 | API functions |
| `lib/services/requests/exceptions.dart` | 4.8 |  |
| `lib/services/requests/firmware_requests.dart` | 4.9 | API functions |
| `lib/services/requests/firmware_update_requests.dart` | 4.9 | API functions |
| `lib/services/requests/hub_network_name_check.dart` | 4.8 |  |
| `lib/services/requests/location_requests.dart` | 4.9 | API functions |
| `lib/services/requests/networking.dart` | 4.8 |  |
| `lib/services/requests/sensor_requests.dart` | 4.9 | API functions |
| `lib/services/requests/settings_requests.dart` | 4.9 | API functions |
| `lib/services/requests/user_requests.dart` | 4.9 | API functions |
| `lib/services/secure_storage.dart` | 4.4 |  |
| `lib/services/text_formatters.dart` | 4.5 |  |
| `lib/udp_commands/commands.dart` | 4.11 | UDP protocol |
| `lib/udp_commands/commands/abstract_udp_command.dart` | 4.11 | UDP protocol |
| `lib/udp_commands/commands/firmware_version_commands.dart` | 4.11 | UDP protocol |
| `lib/udp_commands/commands/network_password_check_and_save_encrypted.dart` | 4.11 | UDP protocol |
| `lib/udp_commands/commands/network_password_check_and_save.dart` | 4.11 | UDP protocol |
| `lib/udp_commands/commands/scan_wifi_commands.dart` | 4.11 | UDP protocol |
| `lib/udp_commands/commands/set_websocket_uri_commands.dart` | 4.11 | UDP protocol |
| `lib/udp_commands/commands/set_wifi_ssid_and_password_commands.dart` | 4.11 | UDP protocol |
| `lib/udp_commands/commands/wifi_test_commands.dart` | 4.11 | UDP protocol |
| `lib/udp_commands/udp_connection.dart` | 4.11 | UDP protocol |
| `lib/udp_commands/upd_command_routing.dart` | 4.11 | UDP protocol |
| `lib/utilities/AppWatchers/mode_debouncer.dart` | 4.10 |  |
| `lib/utilities/AppWatchers/mode_watcher.dart` | 4.10 |  |
| `lib/utilities/bloc_popups.dart` | 5.5, 6.3 |  |
| `lib/utilities/constants.dart` | 3.5, 5.1 |  |
| `lib/utilities/device_info.dart` | 4.5 |  |
| `lib/utilities/Exceptions/AccountExceptions.dart` | 4.3 |  |
| `lib/utilities/Exceptions/Exceptions.dart` | 4.3 |  |
| `lib/utilities/Exceptions/HubExceptions.dart` | 4.3 |  |
| `lib/utilities/Exceptions/json_parsing_exceptions.dart` | 4.3 |  |
| `lib/utilities/Exceptions/model_exceptions.dart` | 4.3 |  |
| `lib/utilities/Exceptions/NetworkExceptions.dart` | 4.3 |  |
| `lib/utilities/Exceptions/ProfileExceptions.dart` | 4.3 |  |
| `lib/utilities/Exceptions/SettingsExceptions.dart` | 4.3 |  |
| `lib/utilities/logging.dart` | 4.1 |  |
| `lib/utilities/notifications.dart` | 8.1 |  |
| `lib/utilities/object_stack.dart` | 4.5, 6.1 |  |
| `lib/utilities/scaling.dart` | 4.5, 16.1 |  |
| `lib/utilities/start_services.dart` | 4.7, 4.8 | Persistors, parsers, 15 s auth timer |
| `lib/utilities/text_formatters.dart` | 4.5 |  |

## test/ (Flutter tests)

| File | Plan step(s) | Note |
|---|---|---|
| `test/bloc/auth/attempt_logging_in_event_wiring_test.dart` | 7.3 | Port as RN test |
| `test/bloc/auth/attempt_registration_event_wiring_test.dart` | 7.4 | Port as RN test |
| `test/bloc/auth/auth_state_test.dart` | 6.1, 7.x | Port as RN test |
| `test/bloc/auth/biometric_gate_wiring_test.dart` | 7.2, 7.3, 10.1 | Port as RN test |
| `test/bloc/devices/recovery_after_close_test.dart` | 9.2 | Port as RN test |
| `test/bloc/main_app/go_to_hubs_screen_event_test.dart` | 9.1 | Port as RN test |
| `test/bloc/shared/emit_then_refresh_test.dart` | 6.2 | Port as RN test |
| `test/components/conditional_view_widget_test.dart` | 5.9 | Port as RN test |
| `test/components/env_banner_test.dart` | 3.5, 5.9 | Port as RN test |
| `test/components/forms/auto_switch_test.dart` | 5.4 | Port as RN test |
| `test/components/forms/qr_scanner_validity_test.dart` | 14.2 | Port as RN test |
| `test/components/forms/rounded_button_test.dart` | 5.2 | Port as RN test |
| `test/components/friendly_error_view_test.dart` | 5.9 | Port as RN test |
| `test/components/hub_light_guide_test.dart` | 5.8 | Port as RN test |
| `test/components/hub_light_widget_test.dart` | 5.8 | Port as RN test |
| `test/components/key_value_pair_display_test.dart` | 5.9 | Port as RN test |
| `test/components/navbar_drawer_dismissal_test.dart` | 5.9, 9.1 | Port as RN test |
| `test/components/navbar_wiring_test.dart` | 9.1 | Port as RN test |
| `test/components/pairing/pairing_step_scaffold_test.dart` | 15.6 | Port as RN test |
| `test/components/popups_test.dart` | 5.5 | Port as RN test |
| `test/native_biometric_config_test.dart` | 3.2, 3.3 | Port as RN test |
| `test/screens/account/edit_password_test.dart` | 10.2 | Port as RN test |
| `test/screens/account/friendly_error_view_usage_test.dart` | 10.2, 10.3 | Port as RN test |
| `test/screens/bloc_widgets/auth_bloc_widget_wiring_test.dart` | 6.3, 7.6 | Port as RN test |
| `test/screens/devices/connect_hub_to_wifi/abandon_dialog_widget_test.dart` | 15.x | Pairing test (see spec 20) |
| `test/screens/devices/connect_hub_to_wifi/abandon_guard_test.dart` | 15.x | Pairing test (see spec 20) |
| `test/screens/devices/connect_hub_to_wifi/access_point_probe_test.dart` | 15.x | Pairing test (see spec 20) |
| `test/screens/devices/connect_hub_to_wifi/button_palette_test.dart` | 15.x | Pairing test (see spec 20) |
| `test/screens/devices/connect_hub_to_wifi/event_handler_registration_test.dart` | 15.x | Pairing test (see spec 20) |
| `test/screens/devices/connect_hub_to_wifi/exit_wiring_test.dart` | 15.x | Pairing test (see spec 20) |
| `test/screens/devices/connect_hub_to_wifi/hub_connection_events_test.dart` | 15.x | Pairing test (see spec 20) |
| `test/screens/devices/connect_hub_to_wifi/hub_registration_check_test.dart` | 15.x | Pairing test (see spec 20) |
| `test/screens/devices/connect_hub_to_wifi/hub_registration_poller_test.dart` | 15.x | Pairing test (see spec 20) |
| `test/screens/devices/connect_hub_to_wifi/light_check_branch_test.dart` | 15.x | Pairing test (see spec 20) |
| `test/screens/devices/connect_hub_to_wifi/list_wifi_networks_widget_test.dart` | 15.x | Pairing test (see spec 20) |
| `test/screens/devices/connect_hub_to_wifi/no_password_dialog_test.dart` | 15.x | Pairing test (see spec 20) |
| `test/screens/devices/connect_hub_to_wifi/pairing_copy_test.dart` | 15.x | Pairing test (see spec 20) |
| `test/screens/devices/connect_hub_to_wifi/pairing_error_codes_test.dart` | 15.x | Pairing test (see spec 20) |
| `test/screens/devices/connect_hub_to_wifi/pairing_step_index_test.dart` | 15.x | Pairing test (see spec 20) |
| `test/screens/devices/connect_hub_to_wifi/pairing_stopped_widget_test.dart` | 15.x | Pairing test (see spec 20) |
| `test/screens/devices/connect_hub_to_wifi/password_length_test.dart` | 15.x | Pairing test (see spec 20) |
| `test/screens/devices/connect_hub_to_wifi/probe_outcome_screens_test.dart` | 15.x | Pairing test (see spec 20) |
| `test/screens/devices/connect_hub_to_wifi/probe_outcome_test.dart` | 15.x | Pairing test (see spec 20) |
| `test/screens/devices/connect_hub_to_wifi/reply_guard_test.dart` | 15.x | Pairing test (see spec 20) |
| `test/screens/devices/connect_hub_to_wifi/server_reachability_test.dart` | 15.x | Pairing test (see spec 20) |
| `test/screens/devices/connect_hub_to_wifi/start_connection_event_wiring_test.dart` | 15.x | Pairing test (see spec 20) |
| `test/screens/devices/connect_hub_to_wifi/waiting_screen_test.dart` | 15.x | Pairing test (see spec 20) |
| `test/screens/devices/firmware_update/available_firmware_updates_screen_test.dart` | 13.1 | Port as RN test |
| `test/screens/devices/firmware_update/firmware_update_listener_test.dart` | 13.2 | Port as RN test |
| `test/screens/devices/firmware_update/update_device_screen_test.dart` | 13.2 | Port as RN test |
| `test/screens/sensors/edit_sensor_test.dart` | 12.3 | Port as RN test |
| `test/screens/sensors/format_coordinate_test.dart` | 12.3 | Port as RN test |
| `test/screens/sensors/sensor_flagged_banner_test.dart` | 12.2 | Port as RN test |
| `test/screens/sensors/sensor_view_wiring_test.dart` | 12.2 | Port as RN test |
| `test/screens/welcome/lock_screen_test.dart` | 7.2 | Port as RN test |
| `test/screens/welcome/login_screen_test.dart` | 7.3 | Port as RN test |
| `test/screens/welcome/maintenance_mode_screen_test.dart` | 7.6 | Port as RN test |
| `test/screens/welcome/registration_screen_test.dart` | 7.4 | Port as RN test |
| `test/services/auth_manager/check_creds_test.dart` | 4.9, 8.4 | Port as RN test |
| `test/services/biometric_preference_test.dart` | 4.4 | Port as RN test |
| `test/services/biometric_service_test.dart` | 7.7 | Port as RN test |
| `test/services/encryption_test.dart` | 4.6 | Port as RN test |
| `test/services/enums/result_test.dart` | 4.3 | Port as RN test |
| `test/services/legacy_credential_purge_wiring_test.dart` | 4.4, 7.2, 7.5, 10.1 | Port as RN test |
| `test/services/requests/auth_requests_test.dart` | 4.8 | Port as RN test |
| `test/services/requests/authorized_requester_test.dart` | 4.8 | Port as RN test |
| `test/services/requests/hub_network_name_check_test.dart` | 4.8 | Port as RN test |
| `test/services/requests/network_helper_test.dart` | 4.8 | Port as RN test |
| `test/services/secure_storage_purge_test.dart` | 4.4 | Port as RN test |
| `test/services/secure_storage_test.dart` | 4.4 | Port as RN test |
| `test/support/pairing_fixtures.dart` | 15.x | Shared pairing fixtures |
| `test/udp_commands/scan_wifi_ssid_padding_test.dart` | 4.11 | Port as RN test |
| `test/udp_commands/udp_connection_singleton_test.dart` | 4.11 | Port as RN test |
| `test/udp_commands/udp_connection_test.dart` | 4.11 | Port as RN test |
| `test/utilities/AppWatchers/mode_debouncer_test.dart` | 4.10 | Port as RN test |
| `test/utilities/AppWatchers/mode_watcher_test.dart` | 4.10 | Port as RN test |
| `test/utilities/exceptions/account_exceptions_test.dart` | 4.3 | Port as RN test |

## android/

| File | Plan step(s) | Note |
|---|---|---|
| `android/.gitignore` | 3.6 |  |
| `android/app/build.gradle` | 3.2 | Gradle/build config |
| `android/app/google-services-old.json` | — | Unused leftover |
| `android/app/google-services.json` | 3.2, 8.1 | Firebase Android config |
| `android/app/src/debug/AndroidManifest.xml` | 3.2 | Manifest parity |
| `android/app/src/main/AndroidManifest.xml` | 3.2 | Manifest parity |
| `android/app/src/main/ic_launcher-playstore.png` | 3.2 | Play Store icon |
| `android/app/src/main/java/io/flutter/plugins/GeneratedPluginRegistrant.java` | — | Generated |
| `android/app/src/main/kotlin/com/iwatllc/cartell/MainActivity.kt` | 3.2 | MainActivity (FragmentActivity host requirement) |
| `android/app/src/main/res/drawable-v21/launch_background.xml` | 3.2 | Themes / launch background |
| `android/app/src/main/res/drawable/ic_launcher_background.xml` | — | Template vector, unreferenced |
| `android/app/src/main/res/drawable/launch_background.xml` | 3.2 | Themes / launch background |
| `android/app/src/main/res/mipmap-anydpi-v26/* (1 files)` | 3.2 | Launcher icons — copy byte-for-byte |
| `android/app/src/main/res/mipmap-hdpi/* (3 files)` | 3.2 | Launcher icons — copy byte-for-byte |
| `android/app/src/main/res/mipmap-mdpi/* (3 files)` | 3.2 | Launcher icons — copy byte-for-byte |
| `android/app/src/main/res/mipmap-xhdpi/* (3 files)` | 3.2 | Launcher icons — copy byte-for-byte |
| `android/app/src/main/res/mipmap-xxhdpi/* (3 files)` | 3.2 | Launcher icons — copy byte-for-byte |
| `android/app/src/main/res/mipmap-xxxhdpi/* (3 files)` | 3.2 | Launcher icons — copy byte-for-byte |
| `android/app/src/main/res/values-night/styles.xml` | 3.2 | Themes / launch background |
| `android/app/src/main/res/values/styles.xml` | 3.2 | Themes / launch background |
| `android/app/src/profile/AndroidManifest.xml` | 3.2 | Manifest parity |
| `android/build.gradle` | 3.2 | Gradle/build config |
| `android/fastlane/.gitignore` | 18.4 | Fastlane lanes |
| `android/fastlane/Appfile` | 18.4 | Fastlane lanes |
| `android/fastlane/Fastfile` | 18.4 | Fastlane lanes |
| `android/fastlane/README.md` | 18.4 | Fastlane lanes |
| `android/Gemfile` | 18.4 | Fastlane Ruby deps |
| `android/Gemfile.lock` | 18.4 | Fastlane Ruby deps |
| `android/gradle.properties` | 3.2 | Gradle/build config |
| `android/gradle/wrapper/* (2 files)` | 3.2 | Gradle/build config |
| `android/gradlew` | 3.2 | Gradle/build config |
| `android/gradlew.bat` | 3.2 | Gradle/build config |
| `android/local.properties` | — | Machine-local |
| `android/settings.gradle` | 3.2 | Gradle/build config |

## ios/

| File | Plan step(s) | Note |
|---|---|---|
| `ios/.gitignore` | 3.6 |  |
| `ios/ExportOptions.plist` | 3.3, 18.4 | manageAppVersionAndBuildNumber=false |
| `ios/fastlane/.gitignore` | 18.4 | Fastlane lanes |
| `ios/fastlane/Appfile` | 18.4 | Fastlane lanes |
| `ios/fastlane/Fastfile` | 18.4 | Fastlane lanes |
| `ios/fastlane/README.md` | 18.4 | Fastlane lanes |
| `ios/Flutter/* (7 files)` | — | Flutter-generated build config |
| `ios/Gemfile` | 18.4 | Fastlane Ruby deps |
| `ios/Gemfile.lock` | 18.4 | Fastlane Ruby deps |
| `ios/Podfile` | 3.3 | Pod floor raise |
| `ios/Runner.xcodeproj/* (5 files)` | 3.3 | Project settings (deployment target, team, family) |
| `ios/Runner.xcworkspace/* (3 files)` | 3.3 |  |
| `ios/Runner/AppDelegate.swift` | 3.3 | Native shell parity |
| `ios/Runner/Assets.xcassets/AppIcon.appiconset/* (47 files)` | 3.3 | App icon set — copy |
| `ios/Runner/Assets.xcassets/Contents.json` | 3.3 |  |
| `ios/Runner/Assets.xcassets/LaunchImage.imageset/* (5 files)` | 3.3 | 1×1 launch image |
| `ios/Runner/Assets.xcassets/SplashScreen.imageset/* (4 files)` | — | Unused image sets |
| `ios/Runner/Assets.xcassets/SplashScreen2.imageset/* (4 files)` | — | Unused image sets |
| `ios/Runner/Base.lproj/LaunchScreen.storyboard` | 3.3 | #0A0E21 launch screen |
| `ios/Runner/Base.lproj/Main.storyboard` | 3.3 | Flutter main storyboard — verify no visible effect |
| `ios/Runner/GeneratedPluginRegistrant.h` | — | Generated |
| `ios/Runner/GeneratedPluginRegistrant.m` | — | Generated |
| `ios/Runner/GoogleService-Info.plist` | 3.3, 8.1 | Firebase iOS config |
| `ios/Runner/Info.plist` | 3.3 | Native shell parity |
| `ios/Runner/Runner-Bridging-Header.h` | 3.3 | Native shell parity |
| `ios/Runner/Runner.entitlements` | 3.3 | Native shell parity |
| `ios/TR563D534B.cer` | 18.2 | Signing material — never copy into the repo |
| `ios/TR563D534B.certSigningRequest` | 18.2 | Signing material — never copy into the repo |
| `ios/TR563D534B.p12` | 18.2 | Signing material — never copy into the repo |

## assets/

| File | Plan step(s) | Note |
|---|---|---|
| `assets/fonts/SourceSansPro-Regular.ttf` | 3.4 | Source Sans Pro Regular |
| `assets/images/avatar.png` | 3.4 | Used image |
| `assets/images/cartell_ct6.png` | 3.4 | Used image |
| `assets/images/cartellbox1.jpg` | — | Bundled but unreferenced in lib/ — not shipped unless the client asks |
| `assets/images/cartelldigitalcolor.png` | — | Bundled but unreferenced in lib/ — not shipped unless the client asks |
| `assets/images/cartelldigitalreverse.png` | 3.4 | Used image |
| `assets/images/cartellwhite.png` | — | Bundled but unreferenced in lib/ — not shipped unless the client asks |
| `assets/images/favicondigital.png` | — | Bundled but unreferenced in lib/ — not shipped unless the client asks |
| `assets/images/HUB.png` | 3.4 | Used image |
| `assets/images/icon-1-1.png` | — | Bundled but unreferenced in lib/ — not shipped unless the client asks |
| `assets/images/icon-1.ai` | — | Bundled but unreferenced in lib/ — not shipped unless the client asks |
| `assets/images/icon-1.png` | — | Bundled but unreferenced in lib/ — not shipped unless the client asks |
| `assets/images/icon-1LG-1.png` | — | Bundled but unreferenced in lib/ — not shipped unless the client asks |
| `assets/images/logo.png` | — | Bundled but unreferenced in lib/ — not shipped unless the client asks |
| `assets/images/Product-Cluster-no-cable-trans.png` | — | Bundled but unreferenced in lib/ — not shipped unless the client asks |
| `assets/images/Sensor.png` | 3.4 | Used image |

## frontend/ root files

| File | Plan step(s) | Note |
|---|---|---|
| `.env` | — | Vestigial dotenv asset; nothing reads it (D11) |
| `.flutter-plugins-dependencies` | — | Generated plugin list (informed spec 03 §10) |
| `.fvmrc` | — | Flutter toolchain pin |
| `.gitignore` | 3.6 | RN .gitignore equivalent |
| `.impeccable/design.json` | 1.4 | Design-token reference |
| `.metadata` | — | Flutter tool metadata |
| `.vscode/.gitignore` | 3.6 | Editor settings (optional equivalent) |
| `.vscode/settings.json` | 3.6 | Editor settings (optional equivalent) |
| `analysis_options.yaml` | 3.6 | Lint policy → ESLint/TS strict |
| `changelog.txt` | 18.5 | Release-notes source |
| `CLAUDE.md` | 0.2, 19.6 | Gotchas folded into specs; write RN CLAUDE.md |
| `DESIGN.md` | 1.4, 5.x | Design intent — as-built code wins |
| `devtools_options.yaml` | — | Flutter DevTools config |
| `flutter-release-notes.txt` | 18.5 | Historical release notes |
| `FOLLOWUP_TODO.md` | spec 19 | Review items; confirmed ones are in the quirk register |
| `Pipfile` | 18.4 | Release-tool dependencies |
| `Pipfile.lock` | 18.4 | Release-tool dependencies |
| `PRODUCT.md` | 0.1 | Product context |
| `pubspec.lock` | 2.10 | Locked versions — read package sources at these versions |
| `pubspec.yaml` | 2.10, 3.1, 3.4, 18.1 | Dependencies, assets, fonts, version |
| `README.md` | 19.6 | Docs |

## docs/ and envs/

| File | Plan step(s) | Note |
|---|---|---|
| `docs/app_store.md` | 18.4 |  |
| `docs/cocoapods_ios_build_fix.md` | 3.6 (reference) | Dev process docs |
| `docs/code_quality/formatting_and_sanitizing.md` | 3.6 (reference) | Dev process docs |
| `docs/code_quality/pre_commit_setup.md` | 3.6 (reference) | Dev process docs |
| `docs/dev_startup/cartell_flutter_setup.md` | 3.6 (reference) | Dev process docs |
| `docs/development_process.md` | 3.6 (reference) | Dev process docs |
| `docs/fastlane.md` | 18.4 |  |
| `docs/superpowers/DEVICE-VERIFICATION-427.md` | 15.10 | Hardware verification checklist |
| `docs/superpowers/plans/* (5 files)` | 15.x (reference) | Design history for pairing and release |
| `docs/superpowers/specs/* (4 files)` | 15.x (reference) | Design history for pairing and release |
| `envs/.gitignore` | 3.5 | Environment config — secrets never committed |
| `envs/beta.json` | 3.5 | Environment config — secrets never committed |
| `envs/dev.copy.json` | 3.5 | Environment config — secrets never committed |
| `envs/dev.json` | 3.5 | Environment config — secrets never committed |
| `envs/live.json` | 3.5 | Environment config — secrets never committed |
| `envs/README.md` | 3.5 | Environment config — secrets never committed |
| `envs/simulator.json` | 3.5 | Environment config — secrets never committed |
| `envs/test.json` | 3.5 | Environment config — secrets never committed |

## tool/ and tests/tool/ (release tooling)

| File | Plan step(s) | Note |
|---|---|---|
| `tests/tool/test_fastlane_lanes.py` | 18.4 | Release-tool tests |
| `tests/tool/test_release.py` | 18.4 | Release-tool tests |
| `tests/tool/test_store_versions.py` | 18.4 | Release-tool tests |
| `tests/tool/test_verify_artifact.py` | 18.3 |  |
| `tool/__init__.py` | 18.4 | Release tool |
| `tool/release.py` | 18.4 | Release tool |
| `tool/store_versions.py` | 18.4 | Release tool |
| `tool/verify_artifact.py` | 18.3 | Artifact verifier |

## Unshipped platform scaffolds

| File | Plan step(s) | Note |
|---|---|---|
| `linux/* (18 files)` | — | Desktop scaffolds, not shipped (D7) |
| `macos/* (31 files)` | — | Desktop scaffolds, not shipped (D7) |
| `web/* (7 files)` | — | Web scaffold, not shipped (D7) |
| `windows/* (32 files)` | — | Desktop scaffolds, not shipped (D7) |
