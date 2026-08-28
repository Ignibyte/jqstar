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

Context Menu reuses the same item, checked-state, typeahead, dismissal, and focus-return engine
while changing only its invocation and placement boundary:

- Native `contextmenu`, Shift+F10, the Context Menu key, and touch long-press invocation
- Pointer-coordinate placement with viewport collision clamping
- `@ui.context-menu.open|close`, matching `$.star.ui.contextMenu` methods, and independently
  namespaced cancelable lifecycle and selection events
- Ordinary clicks on the context surface remain ordinary clicks

Menubar composes direct `data-jqs="menu"` children instead of creating a second popup-menu system.
It provides one top-level tab stop, horizontal or vertical roving focus, wrapping Arrow navigation,
Home, End, character typeahead, menu switching while a popup is open, and
`@ui.menubar.open|close|focus` with matching `$.star.ui.menubar` methods.

Tree View provides:

- Derived `tree`, `treeitem`, `group`, `aria-level`, `aria-posinset`, and `aria-setsize` semantics
- Roving DOM focus with APG Arrow, Home, End, asterisk expansion, and character typeahead behavior
- Independent single or multiple selection, including Space, optional Shift+Arrow extension, and
  Control/Command+A over visible items
- Cancelable selection and expansion boundaries, activation events, and stable server-patched
  `data-value` / `data-expanded` state
- `@ui.tree.select|expand|collapse|toggle|focus` and matching `$.star.ui.tree` methods

Sidebar provides:

- `panel`, `content`, `trigger`, `rail`, and `backdrop` parts within one application-shell root
- Icon, off-canvas, and fixed modes through `data-collapsible`
- A mobile off-canvas boundary below 48rem with Escape, backdrop close, trigger focus return, and
  separate restoration of the desktop state
- Optional `data-storage-key`, a configurable Ctrl/Command shortcut, and server-patched
  `data-value="expanded|collapsed"`
- Cancelable `jquery-star:sidebar:before-change`, `jquery-star:sidebar:change`,
  `@ui.sidebar.open|close|toggle`, and matching `$.star.ui.sidebar` methods

Carousel provides:

- A labelled carousel region, grouped slides, position-based fallback names, live-status changes,
  and inactive slide hiding
- Previous, next, indicator, orientation-aware keyboard, and pointer-swipe navigation
- Optional looping and automatic rotation that pauses for focus, hover, user navigation, and
  reduced-motion preferences
- Cancelable `jquery-star:carousel:before-change`, plus `change`, `play`, and `pause` events
- `@ui.carousel.next|previous|go|play|pause` and matching `$.star.ui.carousel` methods

Toolbar provides:

- One roving tab stop across buttons, links, toggles, and other controls
- Horizontal or vertical Arrow navigation, Home, End, disabled-item skipping, and optional
  non-looping edges
- Native Arrow-key behavior for text, number, range, select, textarea, and editable controls unless
  `data-toolbar-nav="roving"` is explicit
- `@ui.toolbar.focus|next|previous` and matching `$.star.ui.toolbar` methods

Stepper provides:

- An ordered-list step model with `aria-current="step"`, roving trigger focus, and one visible
  labelled panel
- Optional linear navigation that runs native constraint validation before forward transitions
- Explicit completion state, cancelable transitions, completion events, and server-patched
  `data-value`
- `@ui.stepper.next|previous|go|complete` and matching `$.star.ui.stepper` methods

Sortable List provides:

- Stable item identity from unique `data-value` attributes and JSON order in the root `data-value`
- Equivalent drag, keyboard grab/move/drop, and visible Up/Down controls
- Repeated hidden inputs from `data-name`, so ordinary FormData preserves order
- Cancelable changes, live announcements, server-patched order, `@ui.sortable.move|up|down`, and
  matching `$.star.ui.sortable` methods

File Upload provides:

- A native file input as the only selection and FormData source
- Pointer selection and file drop through the same count, byte-size, and `accept` validation
- Removable generated file rows, form-reset synchronization, and ordinary input/change events
- `@ui.fileUpload.clear|remove` and matching `$.star.ui.fileUpload` methods

Multi Select provides:

- A direct `<select multiple>` as the source for FormData, constraint validation, reset, disabled
  options, and server-patched option lists
- A labelled `listbox` with `aria-multiselectable`, distinct active and selected states, Space
  toggling, Arrow/Home/End focus movement, typeahead, and Control/Command+A
- Removable selected tags, optional `data-max`, cancelable changes, and JSON root `data-value`
- `@ui.multi-select.open|close|toggle|set|select|clear` and matching `$.star.ui.multiSelect` methods

Time Picker provides:

- A direct `<input type="time">` as the locale UI, validity source, and submitted `HH:mm[:ss]` value
- Earlier/Later controls that respect the native second-based `step`, `min`, `max`, disabled, and
  readonly state
- Preset buttons, invalid/change events, server-patched `data-value`,
  `@ui.time-picker.increment|decrement|set`, and matching `$.star.ui.timePicker` methods

Color Picker provides:

- A direct `<input type="color">` as the platform picker and submitted value
- An optional editable value and suggested swatches that use one normalization and cancelation path
- A preview, live status, server-patched `data-value`, `@ui.color-picker.set`, and matching
  `$.star.ui.colorPicker` methods

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

Conversation and feedback components provide:

- Rating backed by one native radio group, including required validation, reset, FormData, and the
  browser's keyboard behavior
- `set`, `clear`, and `value` under `$.star.ui.rating`, with equivalent named actions and cancelable
  lifecycle events
- Source-owned Message articles whose sender, time, content, attachment, action, and sent-side parts
  remain editable application markup
- Message Scroller with a named, focusable `role="log"`, appended-message observation, follow and
  pause state, unread count, and a visible route back to the latest message
- `latest`, `follow`, `isFollowing`, and `unread` under `$.star.ui.messageScroller`, with equivalent
  named actions for state-changing operations

Message Scroller only moves after appended messages while it is already following the end. Once a
reader scrolls beyond `data-threshold`, it preserves that position and exposes the unread count.
Server patches append Message articles to the source-owned content instead of calling an imperative
rendering API.

Search and result components provide:

- Search Field backed by one native `input type="search"`, its owning form, and its ordinary
  FormData query value
- `set`, `clear`, `focus`, `submit`, and `value` under `$.star.ui.searchField`, with equivalent
  named actions and cancelable value changes
- Item as zero-runtime, editable article or row anatomy for media, copy, metadata, footer, and
  actions
- Feed as a labelled article collection with position, set-size, busy, cursor, loading, done, and
  error state
- Page Up and Page Down article movement plus Control+Home and Control+End feed-boundary movement
- One visible Load More button shared by pointer activation, keyboard-triggered loading at the end
  of the feed, imperative loading, and optional Intersection Observer activation
- `load`, `complete`, `fail`, `reset`, `state`, and `focus` under `$.star.ui.feed`, with equivalent
  named actions

Feed does not own result HTML or a request client. The application appends source-owned Item
articles, then calls `complete` with the next cursor and done state. This keeps JSON, Datastar HTML
patches, and future backend transports on the same component contract.

Clarification and conversational content components provide:

- Questionnaire as direct native fieldsets with legends, named radio or checkbox controls, optional
  freeform input, and ordinary form serialization
- Ordered previous, next, indexed or named navigation; explicit skip values; required and min/max
  selection validation; visible choice shortcuts; reset; resume; and conditional `data-disabled`
  questions
- `next`, `previous`, `go`, `skip`, `reset`, `submit`, `value`, `answer`, and `answers` under
  `$.star.ui.questionnaire`, with equivalent named actions and cancelable change, skip, and submit
  boundaries
- Attachment as zero-runtime file or image anatomy for media, name, metadata, status, progress, and
  actions
- Bubble as zero-runtime conversational content and reaction anatomy that composes inside Message

Questionnaire validates during the owning form's capture phase. An invalid question is made active,
focused, and announced before an application request listener can run. API answer writes dispatch
native input and change events, and all state rendering uses conditional DOM writes so global
enhancement cannot create an observer loop.

Reporting and document components provide:

- Chart parses one captioned native table and renders bar or line SVG presentation from the same
  rows and cells a backend can patch.
- `refresh`, `setType`, `type`, and `data` are exposed under `$.star.ui.chart`, with equivalent
  named refresh and type actions.
- Chart SVG is presentation-only. The source table stays in the accessibility tree and can be made
  visually available with `data-table-visible`.
- Chart uses explicit refresh calls and the global enhancement pass. It does not install a
  component-level observer.
- Aspect Ratio, Direction, Marker, Table, and Typography are zero-runtime HTML and theme contracts.
  Direction delegates inheritance to native `dir`; Table preserves native table semantics; and
  Typography styles ordinary document markup.

Operations and inspection components provide:

- Stat as zero-runtime title, value, description, figure, and action anatomy, with an optional
  responsive Stat Group.
- Timeline as a semantic ordered list with complete, current, and pending presentation.
- Status as a decorative or explicitly labelled state dot. Its optional pulse is CSS-only and
  reduced-motion aware.
- Browser Mockup and Diff as zero-runtime presentation. Diff keeps one native range input as the
  pointer and keyboard control; the authored jQuery expression updates only a CSS variable.
- Code Block as authored `pre` and `code` content with `text` and async `copy` methods under
  `$.star.ui.codeBlock`, an equivalent named action, cancelable before-copy, and success or failure
  events.

Code Block installs no click listener or observer. The recipe calls its named action explicitly.
Clipboard outcomes are written to an authored polite status element, so server-patched code remains
the same source read by both `text()` and `copy()`.

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
- Popover, Tooltip, Hover Card, Dropdown Menu, Context Menu, and Menubar
- Tree View, Sidebar, Carousel, Toolbar, Stepper, Sortable List, and File Upload
- Multi Select, Time Picker, Color Picker, and Rating
- Message, Message Scroller, Search Field, Item, Feed, Questionnaire, Attachment, and Bubble
- Aspect Ratio, Chart, Direction, Marker, Table, and Typography
- Stat, Timeline, Status, Code Block, Browser Mockup, and Diff
- Select, Combobox, and server-backed Autocomplete
- Calendar, Range Calendar, Date Picker, and Date Range Picker
- Data Table and Toast
- Resizable Panels and Scroll Area
- Card, Badge, Alert, Separator, Avatar, Skeleton, Spinner, Progress, Meter, Empty State, and
  Keyboard Key
- Breadcrumb, Pagination, Navigation Menu, Command Palette, and Async Form

This 90-component inventory is registry-backed and source-owned. Domain-heavy additions can build on
these contracts without changing the public anatomy.

## Self-hosted proof backend

`server/api.ts` owns the demo API routes used by both the Vite middleware and the production-shaped
Node server. `server/index.ts` adds safe static-file resolution, cache policy, security headers,
health checks, and graceful shutdown. `npm run test:self-hosted` builds the library, site, and
server, starts the bundled process on an ephemeral port, and verifies the rendered application plus
backend contracts.

The expression runtime currently uses dynamic function compilation. The self-hosted Content Security
Policy therefore permits `unsafe-eval` for scripts while keeping scripts same-origin and blocking
objects, framing, and foreign base URLs. A stricter policy requires a precompiled or replaced
expression compiler; named actions alone are compatible with that future boundary.

Shared mechanics stay below the public contracts: components reuse floating placement and top-layer
fallback, while each interaction model keeps its own focus, dismissal, state, and event semantics.
