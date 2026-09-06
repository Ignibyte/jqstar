# Assistive-technology release charters

These charters are required for a release candidate that changes a grid, dialog, menu, combobox,
sortable interaction, navigation, focus management, or live server update. Axe and ARIA assertions
remain blocking, but they do not replace this manual evidence.

## CSP proof setup

From the verified repository checkout, run `npm run proof:csp` after `npm run check` passes. Open
the printed URL and retain the session record under `.git/jqstar/manual-csp/` with the tester's
observations. The command verifies the tested tarball and current receipt, uses the same strict CSP
server as automated package proof, and keeps immutable assets available until Ctrl+C. It does not
record a manual pass. See [development guidance](../DEVELOPMENT.md) for address and port options.

## Evidence record

Create one record per assistive-technology and browser pair. Store it with the release evidence, not
as an undated claim in this document.

- Release candidate tarball name and SHA-256
- Commit and quality-receipt SHA-256
- Operating system, browser, assistive technology, and exact versions
- Input mode and relevant verbosity settings
- Charter steps attempted, with pass, fail, or not applicable for each step
- The spoken output when it differs from the expected name, role, state, value, or announcement
- Issue link and severity for every failure
- Tester, date, and clean-profile or existing-profile status

A skipped release-critical step needs a named reason and owner. “Automated tests passed” is not a
valid reason.

## NVDA with Firefox or Chrome

Use the current supported Windows release and the newest stable NVDA plus one supported Firefox or
Chrome version. Start with a clean browser profile and NVDA's default desktop layout.

### Data Table and grid navigation

1. Reach the table by heading and table navigation without using a pointer. Confirm the caption, row
   and column counts, header names, sort direction, selection state, and current page are announced
   once.
2. Sort one column, add a second sort, filter, change page, and load a virtual window. Confirm focus
   remains on the initiating control and updated totals are announced without rereading the page.
3. Select rows, expand a row, edit a cell, trigger an optimistic conflict, and recover. Confirm
   selected, expanded, invalid, and conflict states have usable names and instructions.
4. Test the narrow-screen overflow presentation. Confirm table navigation still follows the visual
   column order and pinned columns do not cause repeated or missing headers.

### Dialogs, menus, comboboxes, and navigation

1. Open and close each dialog with the keyboard. Confirm the name and description are announced,
   focus enters at the documented target, Tab stays within a modal dialog, Escape closes it, and
   focus returns to the trigger.
2. Open a menu and menubar, traverse items and submenus, activate a disabled-item boundary, and
   dismiss it. Confirm role, position, checked state, submenu state, and the chosen action.
3. Use a combobox with typing, arrows, Home, End, Escape, and selection. Confirm the accessible
   name, expanded state, active option, result count, selection, loading, empty, and error states.
4. Follow direct links, back and forward history, and an updated navigation region. Confirm the page
   title, current location, restored focus, and live-region message are neither missing nor
   duplicated.

### Sortable and live updates

1. Reorder an item using the documented keyboard alternative. Confirm pickup, position changes,
   invalid targets, drop, and cancellation are announced. Pointer-only drag does not pass.
2. Start, retry, abort, and complete a server update. Confirm loading and terminal results are
   announced once and ordinary streaming patches do not move the virtual cursor.

### CSP installed-package interaction

Use the strict-policy CSP proof served from the same candidate tarball as the release evidence.
Reload between attempts. Record the page URL and whether JavaScript is enabled. These steps use
native page controls; no console commands are needed.

1. Navigate by heading and form controls. Confirm the native Name input, Increment, Save, Toggle,
   Increment behavior, and Run server update and cleanup controls have distinct names. Confirm the
   initial values are Count 1, Double 2, Behavior count 1, and Behavior double 2.
2. Activate Increment behavior once and Increment once. Confirm each control retains focus, both
   counts become 2, both doubles become 4, and neither application changes the other application's
   value. Activate Save and confirm its saved status. Toggle on and off and confirm the pressed
   state is announced without duplicate activation.
3. Activate Run server update and cleanup. Confirm the live result announces Completed once, the
   server result is Count 8 and Double 16, and the independent behavior finishes at count 3 and
   double 6. Confirm the SDK patch is readable without resetting the reading cursor. Record any
   missing, repeated, misleading, or interrupted announcement.
4. Follow Native destination and return. Submit a name through the native form and confirm the
   received value on the destination page. Repeat link and form navigation with JavaScript disabled;
   names, headings, successful navigation, and the submitted value must remain usable.

## VoiceOver with Safari

Use the current supported macOS release, stable Safari, and built-in VoiceOver. Record whether Quick
Nav is on for each step because it changes key behavior.

### Data Table and grid navigation

1. Navigate to the table through the rotor and enter table interaction. Confirm its caption,
   dimensions, headers, sort direction, selection, expansion, and pagination context.
2. Sort, filter, page, and request a virtual window. Confirm the initiating control retains focus
   and the result announcement does not interrupt row or cell exploration.
3. Edit a value and trigger validation and conflict states. Confirm the error is associated with the
   field, the current server value is understandable, and recovery returns to the edited cell.

### Dialogs, menus, comboboxes, and navigation

1. Open each dialog from Safari, traverse every control, close with Escape and the close control,
   and confirm focus restoration plus name, description, and modal state.
2. Traverse menus and menubars with VoiceOver and native arrow keys. Confirm item roles, checked and
   disabled states, submenus, dismissal, and action feedback.
3. Exercise combobox search, active-option movement, selection, loading, empty, and error states.
   Confirm the text field remains editable while listbox context and counts are announced.
4. Use links, Safari history, and navigation regions. Confirm title changes, current-page state,
   restored focus, and live messages after document or region replacement.

### Sortable and live updates

1. Complete reorder, cancel, and invalid-target cases with the keyboard alternative. Confirm every
   position announcement and verify the saved DOM order after leaving and returning.
2. Observe delayed, retrying, aborted, failed, and successful server work. Confirm each terminal
   state is announced once and partial streams do not reset the VoiceOver cursor.

### CSP installed-package interaction

Use the strict-policy CSP proof served from the same candidate tarball as the release evidence.
Reload between attempts. Record the page URL and whether JavaScript is enabled. These steps use
native page controls; no console commands are needed.

1. Navigate by heading and form controls. Confirm the native Name input, Increment, Save, Toggle,
   Increment behavior, and Run server update and cleanup controls have distinct names. Confirm the
   initial values are Count 1, Double 2, Behavior count 1, and Behavior double 2.
2. Activate Increment behavior once and Increment once. Confirm each control retains focus, both
   counts become 2, both doubles become 4, and neither application changes the other application's
   value. Activate Save and confirm its saved status. Toggle on and off and confirm the pressed
   state is announced without duplicate activation.
3. Activate Run server update and cleanup. Confirm the live result announces Completed once, the
   server result is Count 8 and Double 16, and the independent behavior finishes at count 3 and
   double 6. Confirm the SDK patch is readable without resetting the reading cursor. Record any
   missing, repeated, misleading, or interrupted announcement.
4. Follow Native destination and return. Submit a name through the native form and confirm the
   received value on the destination page. Repeat link and form navigation with JavaScript disabled;
   names, headings, successful navigation, and the submitted value must remain usable.

## Release decision

The charter passes only when every applicable step passes on both required pairs or an issue records
an explicit release decision. Re-run the affected section after a fix. Attach the final records to
the same artifact manifest and checksum tested by the release gate.
