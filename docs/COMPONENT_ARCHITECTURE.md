# jQuery Star component architecture

## Public contract

Component behavior uses `data-jqs`. Stable internal slots use `data-part`. Runtime state is
reflected in `data-state`. Appearance is allowed to change without changing those attributes.

```html
<button data-jqs="button" data-on:click="@ui.dialog.open('#account-dialog')">Edit account</button>

<dialog id="account-dialog" data-jqs="dialog">
  <div data-part="content">
    <h2 data-part="title">Edit account</h2>
    <p data-part="description">Changes are saved to the server.</p>
    <button data-jqs="button" data-on:click="@ui.dialog.close('cancelled')">Cancel</button>
  </div>
</dialog>
```

Application behavior remains in the existing expression language:

```html
<button data-on:click="$count++; $(el).fadeOut()">Increment and disappear</button>
<button data-on:click="@removeItem">Remove</button>
<button data-on:click="@post('/items')">Save</button>
```

Component actions use the `ui.` namespace. Component events use the `jquery-star:component:event`
namespace. Dialog currently provides:

- `@ui.dialog.open('#selector', '#initial-focus-selector')`
- `@ui.dialog.close('return-value')`
- `$.star.ui.dialog.open(target, options)`
- `$.star.ui.dialog.close(target, returnValue)`
- `jquery-star:dialog:before-open`
- `jquery-star:dialog:open`
- `jquery-star:dialog:before-close`
- `jquery-star:dialog:close`

The two `before-*` events are cancelable.

Alert Dialog and Drawer compose Dialog instead of forking its modality. Alert Dialog adds the APG
`alertdialog` role and requires both a visible label and described alert message. Drawer adds only a
bottom-docked `data-variant="drawer"` presentation. Both retain native inertness, initial focus,
Escape, lifecycle cancellation, and focus return.

Collapsible and Accordion provide:

- `@ui.collapsible.open|close|toggle('#details-selector')`
- `@ui.accordion.open|close|toggle('#item-selector')`
- Equivalent methods under `$.star.ui.collapsible` and `$.star.ui.accordion`
- `jquery-star:collapsible:before-open|open|before-close|close`
- `jquery-star:accordion:before-open|open|before-close|close`
- Single and multiple accordion modes
- Optional Arrow Up, Arrow Down, Home, and End navigation between accordion headers

The `before-*` events are cancelable. Native pointer, Enter, Space, and Tab behavior comes from
`<details>` and `<summary>`.

Tabs provide:

- `@ui.tabs.activate('#tabs-selector', 'tab-value')`
- `$.star.ui.tabs.activate(target, tab)` and `$.star.ui.tabs.value(target)`
- `jquery-star:tabs:before-change` and `jquery-star:tabs:change`
- Automatic activation by default and manual activation with `data-activation="manual"`
- Horizontal and vertical orientation with wrapping arrow-key navigation, Home, and End
- Roving `tabindex`, disabled-tab skipping, and stable `tab`/`tabpanel` relationships

`jquery-star:tabs:before-change` is cancelable. A matching `data-value` connects each trigger to its
panel and provides the stable programmatic value.

Toggle and Toggle Group provide:

- `@ui.toggle.press|toggle` and equivalent methods under `$.star.ui.toggle`
- `@ui.toggle-group.select|toggle` and `$.star.ui.toggleGroup.select|toggle|value`
- `jquery-star:toggle:before-change|change` and `jquery-star:toggle-group:before-change|change`
- Single or multiple selection, optional required selection, and ordered hidden form values
- Horizontal or vertical roving focus with wrapping Arrow keys, Home, End, and disabled-item
  skipping
- Stable `data-value`, `data-state`, and `aria-pressed` state that can be replaced by a server patch

The `before-change` events are cancelable. Toggle Group uses the APG Toolbar keyboard contract
because arrow-key focus turns the entire cluster into a single tab stop; activation remains native
button behavior.

Popover provides:

- `@ui.popover.open|close|toggle('#popover-selector')`
- Equivalent methods under `$.star.ui.popover`
- `jquery-star:popover:before-open|open|before-close|close`
- Native top-layer display where the Popover API exists, with a hidden-attribute fallback
- Collision-aware top/bottom placement and start/center/end alignment
- Outside-press and Escape dismissal, optional initial focus, and focus return

Both `before-*` events are cancelable. Popover content defaults to a labelled non-modal `dialog`;
Tooltip and Dropdown Menu will apply their own more specific semantics over the same positioning and
dismissal concepts.

Tooltip provides:

- Hover and focus activation with `data-delay` and `data-close-delay`
- `@ui.tooltip.open|close('#tooltip-selector')` and equivalent methods under `$.star.ui.tooltip`
- `jquery-star:tooltip:before-open|open|before-close|close`
- Preserved `aria-describedby` tokens, `role="tooltip"`, Escape dismissal, and no focus movement
- Hover persistence across the trigger and tooltip content
- A validation error when tooltip content contains interactive controls

The `before-*` events are cancelable. Tooltip, Popover, and Menu share top-layer fallback and
four-sided collision-aware placement, but keep separate interaction models.

Hover Card provides:

- Pointer and focus opening with configurable open and close delays
- Persistent visibility while either the trigger or content contains pointer or keyboard focus
- Interactive content in normal DOM tab order, without flattening it into `aria-describedby`
- Escape and outside-press dismissal, with focus return when dismissal occurs inside the card
- Collision-aware four-sided placement and the same native Popover/fallback boundary
- `@ui.hover-card.open|close`, equivalent `$.star.ui.hoverCard` methods, and cancelable
  `jquery-star:hover-card:before-open|open|before-close|close` lifecycle events

This contract implements WCAG 2.2's dismissible, hoverable, and persistent requirements for content
shown on hover or focus. It is not a Tooltip because it can contain links and controls, and it is
not a Dialog because opening it does not move focus or make the page inert.

Dropdown Menu provides:

- `@ui.menu.open|close|toggle('#menu-selector')` and equivalent methods under `$.star.ui.menu`
- `jquery-star:menu:before-open|open|before-close|close|select`
- Menu-button trigger relationships and `menuitem`, `menuitemcheckbox`, and `menuitemradio` parts
- Arrow Up/Down, Home/End, wrapping focus, character typeahead, Escape, and outside dismissal
- Focusable `data-disabled` items that cannot activate
- Checkbox and radio state reflection plus opt-out of close-on-select
- Focus recovery when server morphing removes the active item

The lifecycle and `select` events are cancelable. Menu uses the shared floating primitive for
top-layer fallback and placement while owning its composite-widget focus model.

Select provides:

- A native single-value `<select data-part="control">` as the source for form submission,
  serialization, reset, and `data-bind:*`
- A generated `combobox` trigger and `listbox` popup, including option groups and disabled options
- Arrow Up/Down, Home/End, wrapping navigation, and character typeahead while focus stays on the
  trigger through `aria-activedescendant`
- Exploration without value changes, followed by commit on Enter, Space, Tab, or pointer selection
- `@ui.select.open|close|toggle` and `@ui.select.select`, with equivalent methods under
  `$.star.ui.select`
- `jquery-star:select:before-open|open|before-close|close|before-change|change`
- Rebuilding when server-patched native options change and synchronization from a patched
  `data-value`

The three `before-*` events are cancelable. Option values must be unique because values provide the
stable identity across native options, generated options, signals, and server patches.

Combobox provides:

- A direct text input as `data-part="control"` and a hidden native form value as `data-part="value"`
- Independent query and committed-value state, both compatible with `data-bind:*`, form reset, and
  ordinary form submission
- Input focus retained through `aria-activedescendant`, with Arrow Up/Down navigation, Enter
  selection, and Escape or Tab dismissal without implicit selection
- Local contains or starts-with filtering, plus `data-filter="manual"` for server-owned results
- `@ui.combobox.open|close|toggle|select|clear` and equivalent methods under `$.star.ui.combobox`
- `jquery-star:combobox:before-open|open|before-close|close|query|before-select|select|clear`
- Focus and active-option recovery when Datastar patches the listbox contents during an open query

The `before-open`, `before-close`, and `before-select` events are cancelable. Option values must be
unique. A query is allowed without a committed value; only Enter, pointer selection, or the explicit
`select` API writes the hidden value.

Data Table provides:

- Native `table`, `caption`, `thead`, `tbody`, `th`, and `td` semantics without applying
  `role="grid"`
- Column sorting through `data-key`, optional string/number/date comparison, and `aria-sort` on only
  the active column
- Local text filtering and page-size pagination, with page reset after sorting or filtering
- Current-page select-all, single or multiple row selection, and stable `data-row-id` state that can
  survive server row replacement
- `@ui.dataTable.sort|filter|page|next|previous` and equivalent methods under `$.star.ui.dataTable`
- `jquery-star:data-table:before-sort|sort|filter|page|selection-change`
- `data-processing="manual"` for server-owned filtering, sorting, and pagination

`before-sort` is cancelable. Client processing owns the complete local pipeline; manual processing
owns none of it. Mixing server pagination with client-only sorting or filtering would misrepresent
the full result set.

Calendar and Date Picker provide:

- A generated seven-column `grid` with one roving tab stop and native day buttons
- Arrow Left/Right by day, Arrow Up/Down by week, Home/End by week edge, Page Up/Down by month, and
  Shift+Page Up/Down by year
- ISO `data-value` and `data-month` state, plus min, max, disabled-date, disabled-weekend, and
  Sunday/Monday week-start constraints
- `@ui.calendar.select|next|previous` and `$.star.ui.calendar.select|month|next|previous|value`
- `jquery-star:calendar:before-change|change|view-change`, with cancelable selection
- A Date Picker composition that retains a labelled native input as the form value and uses Popover
  for placement, Escape/outside dismissal, and focus return
- `@ui.date-picker.open|close|select` and `$.star.ui.datePicker.open|close|select|value`

Range Calendar and Date Range Picker extend that contract with:

- ISO `data-start` and `data-end` state, continuous selected grid cells, announced endpoints, and an
  incomplete start state that prompts for the end date
- Reverse-range normalization and rejection of ranges that cross unavailable dates
- Two native Date Range Picker inputs so start and end remain ordinary `FormData` values
- `@ui.range-calendar.select|clear|next|previous` and
  `$.star.ui.rangeCalendar.select|clear|month|next|previous|value`
- `@ui.date-range-picker.open|close|select|clear` and the matching `$.star.ui.dateRangePicker` API
- Cancelable before-change, change, invalid-range, and view-change lifecycle events

The selected day, focused day, and viewed month are separate state. Keyboard exploration therefore
does not submit a value, and a server patch can replace `data-value` or `data-month` without
replacing the component API. Date Picker writes the native input only after Calendar selection and
dispatches ordinary `input` and `change` events so `data-bind:*`, forms, and jQuery listeners stay
in the same path. The keyboard model follows the WAI-ARIA APG
[Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) and
[Date Picker Dialog Example](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/).

Form provides:

- Delegation to native `checkValidity()`, `reportValidity()`, `ValidityState`, and localized
  `validationMessage`
- Runtime-owned `aria-invalid`, Field `data-invalid`, and described message state that clears as a
  marked control becomes valid
- First-invalid focus without replacing native inputs or their submission behavior
- `@ui.form.validate|focus-invalid|reset` and `$.star.ui.form.validate|valid|focusInvalid|reset`
- `jquery-star:form:invalid|before-submit|submit|reset`, with cancelable `before-submit`
- Compatibility with `data-bind:*`, ordinary `FormData`, and existing JSON, URL-encoded, or
  multipart backend actions
- Structured backend errors through `setCustomValidity()`, matched by native control name, plus an
  optional `_form` message and `jquery-star:form:server-invalid` event
- `setErrors` and `clearErrors` APIs/actions that clear only runtime-owned server validity

The runtime never invents a second validation model. Server-owned errors can use separate messages
and state; only elements marked as runtime validation state are cleared by subsequent input.

Number Field, Password Field, and Tags Input provide:

- A direct native number or password input that remains the form, validity, autocomplete, and
  password-manager boundary
- Number stepping through the browser's `stepUp()` and `stepDown()` algorithms, including native
  `min`, `max`, and `step` constraints
- Password visibility without replacing the control, plus synchronized toggle name, `aria-pressed`,
  state, and optional Caps Lock status
- A Tags Input textbox with Enter/comma addition, empty-Backspace removal, case-insensitive
  duplicate rejection, a configurable maximum, and removable list items
- Ordered repeated hidden inputs for Tags Input so ordinary `FormData.getAll(name)` retains every
  value; JSON `data-value` preserves spaces across server patches
- `@ui.number-field.*`, `@ui.password-field.*`, and `@ui.tags-input.*` actions with equivalent APIs
  under `$.star.ui`
- Cancelable `jquery-star:*-field:before-change` / `jquery-star:tags-input:before-change` events,
  followed by change events and ordinary native form events where a value changes

These fields keep the same progressive-enhancement boundary as Select, Date Picker, and Form: native
controls own platform behavior, while the component runtime coordinates only the additional buttons,
tokens, state hooks, and lifecycle contracts.

Input OTP provides:

- One native text, password, or telephone input as the sole focus, autofill, validation, paste, and
  form-submission boundary
- `autocomplete="one-time-code"`, numeric `inputmode`, native `maxlength`, and configurable
  per-character filtering through `data-pattern`
- Generated visual slots hidden from assistive technology that mirror the native value
- `@ui.input-otp.set|clear|focus`, equivalent `$.star.ui.inputOTP` methods, cancelable
  `before-change`, `change`, and one-shot `complete` lifecycle events
- Stable `data-value` and completion state for server patches without replacing the native input

Resizable Panels provides:

- Two or more alternating direct Panel and Handle parts laid out horizontally or vertically
- Pointer and touch dragging plus orientation-aware Arrow keys, Home, End, and Enter
  collapse/restore behavior
- Focusable `separator` handles with label, controlled pane, orientation, minimum, maximum, and
  current-value semantics
- Per-panel minimum and maximum percentages enforced by the same constraint path for every input
  method
- JSON `data-value`, optional local `data-storage-key`, server-patch reconciliation, and
  `@ui.resizable.set|resize|collapse|reset` plus matching `$.star.ui.resizable` methods
- Cancelable before-change, change, resize-start, and resize-end lifecycle events

Scroll Area preserves native overflow and keyboard behavior. The only required behavioral element is
a focusable, labelled `data-part="viewport"`; the theme contributes scrollbar presentation, focus
indication, overscroll containment, and vertical or horizontal layout without translating content in
JavaScript.

Static form and composition primitives provide:

- Label and Native Select styling without replacing native label/control relationships
- Button Group visual composition while each child remains a native Button
- Input Group composition around a native input and File Input styling over the native file picker
- Native `<meter>` ranges with optimum, suboptimal, and low-value presentation
- Card anatomy through semantic `header`, content, and `footer` elements with stable `data-part`
  hooks
- Badge and Alert variants through `data-variant`, without inventing behavior or accessibility roles
- Avatar image or text fallback presentation with `sm`, `md`, and `lg` sizes
- Native `<hr>` separators and `<progress>` indicators with theme styling
- Decorative Skeleton placeholders whose shimmer respects `prefers-reduced-motion`

Label, Native Select, Input Group, File Input, Button Group, Meter, Card, Badge, Alert, Separator,
Avatar, Skeleton, and Progress have no component runtime. Authors keep control of the appropriate
native element, label, live-region role, and document structure. The library contributes only stable
selectors, tokens, variants, and responsive presentation.

Navigation and command composition provides:

- Breadcrumb as a labelled navigation landmark with an ordered list and `aria-current="page"`
- Pagination as a labelled navigation landmark with native links plus current and disabled states
- Navigation Menu as ordinary site links with Popover-powered disclosure sections, deliberately
  avoiding application-menu roles
- Command Palette as a modal Dialog containing an inline Combobox listbox

Breadcrumb and Pagination have no runtime. Navigation Menu inherits Popover behavior and lifecycle
events. Command Palette inherits Dialog and Combobox behavior, including focus return, Escape,
filtering, `aria-activedescendant`, and explicit Enter selection. `data-inline` keeps Combobox
results inside a composition instead of promoting them to a separate top-layer popover.

Toast provides:

- `@ui.toast.show(messageOrOptions)`, `@ui.toast.dismiss`, and `@ui.toast.clear`
- Equivalent `show`, `dismiss`, and `clear` methods under `$.star.ui.toast`
- `jquery-star:toast:open|before-dismiss|dismiss`
- Separate visual groups and polite/assertive live-region announcements
- Auto-dismiss paused by hover, focus, window blur, and document visibility
- Persistent-by-default actionable toasts with required `data-alt-text`
- F8 viewport access, Escape dismissal, focus recovery, and horizontal swipe dismissal

`before-dismiss` is cancelable. Important tasks must not depend on an expiring toast; action toasts
remain open by default and alternative instructions must identify a non-timed route.

## Styling boundary

Tailwind is an authoring and compilation dependency. It is not a browser dependency. The published
`jquery-star-ui.css` file works in applications with no Tailwind setup and does not include Tailwind
Preflight, which prevents global resets from breaking existing jQuery applications.

Design tokens are CSS variables generated through Tailwind's theme system. Component CSS targets the
public data attributes instead of requiring utility classes in user markup.

## Distribution boundary

`registry.json` is both the package catalog and a shadcn-compatible source registry. Every item uses
an explicit `registry:file` target, so the registry distributes framework-neutral HTML instead of
assuming React aliases or a build system. The package includes the catalog, recipes, project-config
schema, and `jqstar` executable.

The local CLI has four commands:

- `init` writes `jquery-star.json` without replacing an existing configuration.
- `list` reads the configured catalog and supports structured JSON output.
- `add` preflights source and destination paths, rejects traversal, refuses implicit overwrites, and
  supports dry runs.
- `doctor` checks the project manifest, jQuery and jQuery Star dependencies, configuration, and
  component directory.

The npm package smoke test inspects the dry-run tarball, not just the worktree. It fails if the
runtime, CSS, executable, schema, catalog, or representative recipes are absent.

## Accessibility rule

Each interactive component gets a written keyboard contract derived from the WAI-ARIA Authoring
Practices. Native elements are preferred when they already implement the contract. Dialog therefore
uses `HTMLDialogElement.showModal()`, which makes the rest of the document inert and lets the
browser contain focus.

Automated checks are necessary but incomplete. Every interactive component must have:

1. Vitest coverage for its API, DOM state, lifecycle events, and cleanup.
2. Playwright coverage for pointer and keyboard behavior in Chromium.
3. Axe checks in each meaningful visible state.
4. A built demo that a person can inspect.
5. Passing formatting, ESLint, TypeScript, build, and package smoke checks.

## Implemented inventory

Implemented:

- Button and Button Group
- Dialog, Alert Dialog, Sheet, and Drawer
- Field, Form, Label, Input, Input Group, File Input, Textarea, Native Select, Checkbox, Radio
  Group, Switch, Slider, Number Field, Password Field, Tags Input, and Input OTP
- Toggle and Toggle Group
- Collapsible, Accordion, and Tabs
- Popover, Tooltip, Hover Card, and Dropdown Menu
- Select, Combobox, and server-backed Autocomplete
- Calendar, Range Calendar, Date Picker, and Date Range Picker
- Data Table and Toast
- Resizable Panels and Scroll Area
- Card, Badge, Alert, Separator, Avatar, Skeleton, Spinner, Progress, Meter, Empty State, and
  Keyboard Key
- Breadcrumb, Pagination, Navigation Menu, Command Palette, and Async Form

This 57-component inventory is registry-backed and source-owned. Domain-heavy additions can build on
these contracts without changing the public anatomy.

Shared mechanics stay below the public contracts: components reuse floating placement and top-layer
fallback, while each interaction model keeps its own focus, dismissal, state, and event semantics.
