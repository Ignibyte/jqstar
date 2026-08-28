# jQuery Star

Datastar-style reactive attributes with real jQuery inside every expression.

```html
<section id="counter" data-signals="{ count: 0 }">
  <button data-on:click="$count++; $(el).fadeOut()">Increment and disappear</button>

  <output data-text="$count"></output>
</section>

<script>
  $("#counter").star();
</script>
```

`$` stays jQuery. A dollar sign followed by a name reads or writes reactive state. The example above
therefore has two separate meanings:

```js
$count++; // increment the reactive count signal
$(el).fadeOut(); // call the real jQuery effect on this button
```

There is no replacement selector API and no jQuery-shaped compatibility object. `$.fn`, `$.extend`,
`$.ajax`, plugins, effects, and `$(...)` are the installed jQuery instance.

## Setup

```sh
npm install
```

```ts
import $ from "jquery";
import "jquery-star";

$("#app").star();
```

For a page-wide application, use the document element as the root:

```ts
$.star.boot();
```

The UMD build installs itself on the global `jQuery` object, so a script-tag build only needs
`$("#app").star()` after both scripts load.

## Source registry

The package ships a copy-in source registry alongside the runtime. Initialize a consuming project,
inspect the catalog, and add only the recipes it needs:

```sh
npx jqstar init
npx jqstar list
npx jqstar add button dialog command-palette
npx jqstar doctor
```

`jquery-star.json` controls the project-relative destination:

```json
{
  "$schema": "./node_modules/jquery-star/schema/jquery-star.schema.json",
  "output": "components/jquery-star"
}
```

`add` refuses to replace an existing file unless `--force` is explicit. `--dry-run` prints every
planned destination without writing it. `--cwd` runs any command against another project directory,
and `list` and `doctor` support `--json` for scripts.

The root `registry.json` also conforms to the current shadcn source-registry schema. Once this
repository is public, the same recipes can be installed by a shadcn CLI from the GitHub repository
address. The copied files are ordinary HTML fragments. Applications own and edit that markup while
the `jquery-star` package supplies behavior and the compiled theme.

## Components

The component-system proof now includes 63 recipes: Button, Button Group, Dialog, Alert Dialog,
Sheet, Drawer, Field, Form, Label, Input, Input Group, File Input, Textarea, Native Select,
Checkbox, Radio Group, Switch, Slider, Toggle, Toggle Group, Collapsible, Accordion, Tabs, Popover,
Tooltip, Hover Card, Dropdown Menu, Context Menu, Menubar, Tree View, Select, Combobox, Calendar,
Range Calendar, Date Picker, Date Range Picker, Number Field, Password Field, Tags Input, Input OTP,
Resizable Panels, Scroll Area, Data Table, Toast, Card, Badge, Alert, Separator, Avatar, Skeleton,
Spinner, Progress, Meter, Empty State, Keyboard Key, Breadcrumb, Pagination, Navigation Menu,
Command Palette, Async Form, Sidebar, Carousel, and Toolbar. Import the precompiled theme for the
default appearance. Tailwind is used to author this file but is not required in the consuming
application.

```ts
import "jquery-star/ui.css";
```

Button variants and sizes use semantic data attributes:

```html
<button data-jqs="button">Save</button>
<button data-jqs="button" data-variant="outline">Cancel</button>
<button data-jqs="button" data-variant="danger" data-size="sm">Delete</button>
```

Dialog behavior uses named actions and the native `<dialog>` element:

```html
<button
  data-jqs="button"
  aria-haspopup="dialog"
  data-on:click="@ui.dialog.open('#account-dialog', '#dialog-cancel')"
>
  Edit account
</button>

<dialog id="account-dialog" data-jqs="dialog" data-close-on-backdrop>
  <div data-part="content">
    <header data-part="header">
      <h2 data-part="title">Edit account</h2>
      <p data-part="description">Review the changes before saving.</p>
    </header>

    <div data-part="footer">
      <button
        id="dialog-cancel"
        data-jqs="button"
        data-variant="outline"
        data-on:click="@ui.dialog.close('cancelled')"
      >
        Cancel
      </button>
      <button data-jqs="button" data-on:click="@ui.dialog.close('saved')">Save</button>
    </div>
  </div>
</dialog>
```

The dialog assigns accessible title and description relationships from its parts. It also manages
`data-state`, cancelable lifecycle events, initial focus, focus return, Escape, optional backdrop
dismissal, and `aria-expanded` on the trigger. JavaScript can call the same behavior through
`$.star.ui.dialog.open()` and `$.star.ui.dialog.close()`.

Sheet is a Dialog composition rather than a second modal system. Add `data-variant="sheet"` to dock
the native dialog to the right, or add `data-side="left"` to reverse it. It retains Dialog's named
actions, modality, focus return, Escape behavior, accessible relationships, and lifecycle events.
Drawer uses that same behavior with `data-variant="drawer"` and a bottom-docked presentation. Alert
Dialog uses `role="alertdialog"` plus a required title and description for interruptive decisions;
it should not replace ordinary non-blocking Alert or Toast messages.

Form components keep native form behavior and use the existing `data-bind:*` directives:

```html
<div data-jqs="field">
  <label data-part="label" for="email">Email</label>
  <p data-part="description" id="email-help">Used for receipts.</p>
  <input id="email" data-jqs="input" data-bind:email type="email" aria-describedby="email-help" />
</div>

<label data-jqs="switch">
  <input data-part="control" data-bind:notifications type="checkbox" role="switch" />
  <span data-part="track" aria-hidden="true"><span data-part="thumb"></span></span>
  <span data-part="label">Notifications</span>
</label>
```

Add `data-jqs="form"` when the form should surface native constraint failures through its Field
anatomy:

```html
<form data-jqs="form" data-on:submit__prevent="@post('/profile', { contentType: 'form' })">
  <div data-jqs="field">
    <label data-jqs="label" for="profile-email">Email</label>
    <input id="profile-email" data-jqs="input" name="email" type="email" required />
    <p data-part="message" hidden></p>
  </div>
  <button data-jqs="button" type="submit">Save</button>
</form>
```

Invalid controls retain the browser's `ValidityState` and `validationMessage`; Form reflects them
through `aria-invalid`, the associated message, and `data-invalid` on Field. Input clears only
runtime-owned errors as it becomes valid. Use
`$.star.ui.form.validate|valid|focusInvalid|setErrors|clearErrors|reset()` or
`@ui.form.validate|focus-invalid|set-errors|clear-errors|reset`. Form emits
`jquery-star:form:invalid|server-invalid`, cancelable `before-submit`, `submit`, and `reset` events.
File Input stays native, so the existing `contentType: 'form'` backend action includes selected
files through `FormData`.

A future backend can return a conventional field-error map from a 422 response. Applying that map
uses `setCustomValidity()`, so browser validation, focus, Field state, and messages remain one
model:

```ts
const result = await fetch("/api/profile", { method: "POST", body: new FormData(form) });
const body = await result.json();

if (result.status === 422) {
  $.star.ui.form.setErrors(form, body.errors);
}
```

Keys match native control names; `_form` targets a direct `data-part="server-message"`. Editing a
field clears only the server error installed for that control. `clearErrors()` can clear all errors
or selected names.

Radio Group and Slider deliberately retain native controls. Toggle adds managed `aria-pressed`
state, while Toggle Group adds single or multiple selection, required selection, arrow-key roving
focus, ordered form values, cancelable lifecycle events, and named actions:

```html
<button data-jqs="toggle" type="button">Live preview</button>

<div
  id="formatting"
  data-jqs="toggle-group"
  data-type="multiple"
  data-value="bold"
  data-name="formatting"
  aria-label="Text formatting"
>
  <button data-part="item" data-value="bold">Bold</button>
  <button data-part="item" data-value="italic">Italic</button>
  <button data-part="item" data-value="underline">Underline</button>
</div>
```

Use `$.star.ui.toggle.press|toggle()`, `$.star.ui.toggleGroup.select|toggle|value()`, or the
equivalent `@ui.toggle.*` and `@ui.toggle-group.*` actions. Toggle Group emits cancelable
`jquery-star:toggle-group:before-change` and final `jquery-star:toggle-group:change` events.

Collapsible and Accordion build on native `<details>` and `<summary>` behavior:

```html
<details id="more" data-jqs="collapsible">
  <summary data-part="trigger">
    More details
    <span data-part="indicator" aria-hidden="true"></span>
  </summary>
  <div data-part="content">The additional content.</div>
</details>

<div data-jqs="accordion" data-mode="single" data-collapsible="false">
  <details data-part="item" open>
    <summary data-part="trigger">First section</summary>
    <div data-part="content">First content.</div>
  </details>
  <details data-part="item">
    <summary data-part="trigger">Second section</summary>
    <div data-part="content">Second content.</div>
  </details>
</div>
```

Use `data-mode="multiple"` to allow several accordion items to remain open. Setting
`data-collapsible="false"` keeps one item open. The programmatic APIs are
`$.star.ui.collapsible.open|close|toggle()` and `$.star.ui.accordion.open|close|toggle()`. The same
operations are registered as `@ui.collapsible.*` and `@ui.accordion.*` named actions.

Tabs use stable parts and values rather than component-specific classes:

```html
<div id="settings-tabs" data-jqs="tabs" data-value="profile">
  <div data-part="list" aria-label="Settings">
    <button data-part="trigger" data-value="profile">Profile</button>
    <button data-part="trigger" data-value="security">Security</button>
  </div>
  <section data-part="panel" data-value="profile">Profile settings</section>
  <section data-part="panel" data-value="security">Security settings</section>
</div>
```

Tabs activate on focus by default. Add `data-activation="manual"` to require Enter, Space, or a
click after moving focus, and `data-orientation="vertical"` for vertical arrow-key behavior. Use
`$.star.ui.tabs.activate('#settings-tabs', 'security')` or the equivalent named action
`@ui.tabs.activate('#settings-tabs', 'security')`. Changes emit cancelable
`jquery-star:tabs:before-change` and final `jquery-star:tabs:change` events.

Popover uses the browser top layer when the Popover API is available and retains the same behavior
through a fallback:

```html
<div id="help" data-jqs="popover" data-side="bottom" data-align="start">
  <button data-part="trigger">Show help</button>
  <div data-part="content">
    <h2 data-part="title">Keyboard shortcuts</h2>
    <p data-part="description">Press Escape or click outside to close.</p>
    <button data-on:click="@ui.popover.close">Done</button>
  </div>
</div>
```

The runtime assigns the trigger/content relationship, handles collision-aware placement, outside
press, Escape, focus return, and server-morphed parts. The programmatic API and named actions expose
`open`, `close`, and `toggle` under `$.star.ui.popover` and `@ui.popover.*`.

Tooltip opens from hover or keyboard focus without moving focus:

```html
<div data-jqs="tooltip" data-side="top" data-align="center">
  <button data-part="trigger">Build status</button>
  <div data-part="content">All checks passed</div>
</div>
```

The runtime adds `role="tooltip"` and preserves any existing `aria-describedby` tokens on the
trigger. `data-delay` and `data-close-delay` control timing in milliseconds. Tooltip content must be
non-interactive; use Popover when the floating content contains controls.

Hover Card is the focus-and-hover counterpart for richer supplemental content:

```html
<div data-jqs="hover-card">
  <a data-part="trigger" href="/people/ada">Ada Lovelace</a>
  <div data-part="content">
    <h2 data-part="title">Ada Lovelace</h2>
    <p data-part="description">Mathematician and early programmer.</p>
    <a href="/people/ada">View profile</a>
  </div>
</div>
```

The card is hoverable, remains open while focus or the pointer is inside either part, and can be
dismissed with Escape without losing trigger focus. `data-delay`, `data-close-delay`, `data-side`,
and `data-align` tune timing and placement. APIs and cancelable lifecycle events are available under
`$.star.ui.hoverCard`, `@ui.hover-card.*`, and `jquery-star:hover-card:*`.

Dropdown Menu uses `data-jqs="menu"` and menu-specific parts:

```html
<div data-jqs="menu" data-align="end">
  <button data-part="trigger">Actions</button>
  <div data-part="content">
    <button data-part="item" data-value="edit">Edit</button>
    <button data-part="checkbox-item" data-value="preview" data-checked="true">Show preview</button>
    <div data-part="separator"></div>
    <button data-part="item" data-value="delete" data-disabled>Delete</button>
  </div>
</div>
```

The menu supports Arrow Up/Down, Home/End, character typeahead, Escape, outside press, checkbox and
radio items, focusable `data-disabled` items, and focus return. Add `data-close-on-select="false"`
to keep an item open after selection. APIs and named actions are available under `$.star.ui.menu`
and `@ui.menu.*`.

Context Menu uses that same menu engine but opens at the pointer, Shift+F10 invocation point, or a
touch long-press. Its lifecycle is namespaced under `jquery-star:context-menu:*`, with APIs and
named actions at `$.star.ui.contextMenu` and `@ui.context-menu.*`. Menubar composes multiple
Dropdown Menu roots into one horizontal or vertical roving-focus application menu. Arrow keys switch
top-level menus while an open popup stays active; use `$.star.ui.menubar.open|close|focus|value()`
or `@ui.menubar.*`.

Tree View uses nested `item`, `row`, `label`, and `group` parts while deriving tree, treeitem,
level, position, expansion, and selection semantics. It keeps focus independent from selection,
supports the complete Arrow/Home/End/asterisk/typeahead model, and adds Space, Shift+Arrow, and
Control+A for multi-select trees. Use `$.star.ui.tree.select|expand|collapse|toggle|focus|value()`
or `@ui.tree.*`; `data-value` remains the server-patch boundary.

Sidebar provides a responsive application shell with `panel`, `content`, `trigger`, `rail`, and
`backdrop` parts. Choose `data-collapsible="icon"`, `"offcanvas"`, or `"none"`. Below 48rem it
becomes an off-canvas panel, starts closed, closes on Escape or backdrop click, and restores the
desktop state when the viewport grows. `data-storage-key` persists desktop state and Ctrl/Command+B
toggles the first sidebar. Use `$.star.ui.sidebar.open|close|toggle|value()` or `@ui.sidebar.*`.

Carousel keeps each source-owned `slide` in the DOM while exposing one at a time. Previous, next,
indicator, keyboard, and swipe navigation update `data-value`; `data-loop` enables wrapping.
`data-autoplay` accepts a delay of at least 1000 milliseconds, pauses for focus, hover, or user
navigation, and respects reduced-motion preferences. Use
`$.star.ui.carousel.next|previous|go|play|pause|value()` or `@ui.carousel.*`.

Toolbar groups three or more controls under one keyboard tab stop. Arrow keys follow
`data-orientation`, Home and End move to the edges, disabled controls are skipped, and
`data-loop="false"` stops at either edge. Text fields, selects, and other controls that own Arrow
keys keep their native behavior unless they opt into roving navigation with
`data-toolbar-nav="roving"`. Use `$.star.ui.toolbar.focus|next|previous|value()` or `@ui.toolbar.*`.

Select keeps a native form control as its value and submission source:

```html
<label for="framework-control">Framework</label>
<div id="framework" data-jqs="select" data-placeholder="Choose a framework">
  <select id="framework-control" data-part="control" data-bind:framework name="framework">
    <optgroup label="Current project">
      <option value="jquery-star">jQuery Star</option>
      <option value="datastar">Datastar</option>
    </optgroup>
    <option value="unavailable" disabled>Unavailable</option>
  </select>
</div>
```

Enhancement generates the combobox trigger and listbox from the native options. Arrow keys and
typeahead move the active option without changing the form value. Enter, Space, Tab, or a pointer
selection commits it. Escape cancels exploration. The selected value works with `FormData`, jQuery
`serialize()`, form reset, and `data-bind:*`. Use
`$.star.ui.select.select('#framework', 'datastar')` or `@ui.select.select('#framework', 'datastar')`
from code or markup. A server can patch `data-value` and the native options; enhancement
synchronizes the trigger and generated listbox.

Combobox separates an editable query from its committed form value:

```html
<label for="technology-query">Find a UI system</label>
<div id="technology" data-jqs="combobox" data-filter="manual" data-min-length="1">
  <input id="technology-query" data-part="control" data-bind:query name="technologyQuery" />
  <input data-part="value" data-bind:technology type="hidden" name="technology" />
  <div id="technology-results" data-part="content">
    <div data-part="option" data-value="jquery-star">jQuery Star</div>
    <div data-part="option" data-value="datastar">Datastar</div>
    <div data-part="empty" hidden>No matching systems</div>
  </div>
</div>
```

The input keeps DOM focus while Arrow Up/Down changes `aria-activedescendant`. Enter or pointer
selection commits an option. Escape and Tab close without turning an arbitrary query into a value.
Typing after a selection clears the stale hidden value. Local filtering uses substring matching by
default; use `data-filter="starts-with"` or `data-filter="manual"` when the server owns the result
set. `$.star.ui.combobox` and `@ui.combobox.*` provide `open`, `close`, `toggle`, `select`, and
`clear`. The API also exposes `value()` and `query()`.

For server-backed autocomplete, bind the query and request results with the existing backend action:

```html
<input
  data-part="control"
  data-bind:query
  data-on:input__debounce.180ms="@get('/autocomplete', {
    pending: 'searching',
    requestCancellation: 'auto'
  })"
/>
```

The server can patch the inside of `data-part="content"` with new options. The live demo does this
with the official Datastar SDK and verifies that the input node, focus, query, active option, and
committed form value survive the patch.

Calendar implements a single-select APG grid and keeps its public state in ISO data attributes:

```html
<div id="release-calendar" data-jqs="calendar" data-month="2026-08" data-value="2026-08-28">
  <div data-part="header">
    <button data-part="previous" aria-label="Previous month">←</button>
    <h2 data-part="heading"></h2>
    <button data-part="next" aria-label="Next month">→</button>
  </div>
  <div data-part="grid"></div>
</div>

<button data-on:click="@ui.calendar.select('#release-calendar', '2026-08-31')">
  Select release date
</button>
```

Arrow keys move by day or week, Home and End move to week edges, Page Up and Page Down move by
month, and Shift modifies those keys to move by year. Only one enabled day is in the tab order.
`data-min`, `data-max`, `data-disabled-dates`, `data-disable-weekends`, and `data-week-start="1"`
constrain the grid. Use `$.star.ui.calendar.select|month|next|previous|value()` or the matching
`@ui.calendar.*` actions. Selection emits cancelable `jquery-star:calendar:before-change`, followed
by `jquery-star:calendar:change`; month navigation emits `jquery-star:calendar:view-change`.

Date Picker composes a native read-only text input, Popover, and Calendar. The input remains the
form value and works with `data-bind:*`; the popup receives a dialog name from the input's label,
focus starts on the selected date, and selecting a day closes the popup and restores focus. Use the
registry recipe for the complete anatomy, or call `$.star.ui.datePicker.open|close|select|value()`
and `@ui.date-picker.*` from existing markup.

Range Calendar uses the same grid keyboard contract with `data-start` and `data-end`. A completed
range marks every selected grid cell, announces its endpoints, normalizes reverse selection, and
rejects spans containing disabled dates. After a completed range, the next selection starts a new
one. Use `$.star.ui.rangeCalendar.select|clear|month|next|previous|value()` or the matching
`@ui.range-calendar.*` actions.

Date Range Picker composes Popover and Range Calendar with separate native start and end inputs. The
first selection keeps the popup open; the completed range dispatches ordinary input/change events,
closes it, and restores focus. Use `$.star.ui.dateRangePicker` or
`@ui.date-range-picker.open|close|select|clear`.

Number Field keeps a real `<input type="number">` as the value and validity source. Its buttons call
the native step algorithm, so `min`, `max`, and `step` still decide what is allowed. Use
`$.star.ui.numberField.increment|decrement|set|value()` or `@ui.number-field.*` actions.

Password Field changes the same native input between `password` and `text`; it does not clone the
control, clear its value, or replace its `name` and `autocomplete` attributes. Use
`$.star.ui.passwordField.show|hide|toggle|visible()` or `@ui.password-field.*` actions. The toggle
updates its accessible name and pressed state, and the optional status part announces Caps Lock.

Tags Input accepts Enter or comma, removes the last tag with Backspace on an empty control, and
creates one hidden input per tag using `data-name`. Tags are serialized as a JSON array in
`data-value`, which preserves spaces and gives server patches a stable boundary. Use
`$.star.ui.tagsInput.add|remove|clear|value()` or `@ui.tags-input.*` actions. All three fields emit
cancelable `before-change` followed by `change` component events; Number Field and Tags Input also
dispatch ordinary bubbling input/change events.

Input OTP renders visual slots over one native input instead of splitting a code into six controls.
That preserves paste, `autocomplete="one-time-code"`, mobile `inputmode`, validation, and ordinary
form submission. `data-length` and `data-pattern` constrain the code. Use
`$.star.ui.inputOTP.set|clear|focus|value|complete()` or `@ui.input-otp.*`; completion emits
`jquery-star:input-otp:complete` once for each transition to a full code.

Resizable Panels accepts two or more alternating direct `panel` and `handle` parts. Panel
`data-min`/`data-max` constraints apply equally to pointer, touch, Arrow keys, Home, End, API calls,
and server-patched JSON sizes. Enter collapses or restores the panel before a handle. Optional
`data-storage-key` persistence never replaces the public `data-value` state. Use
`$.star.ui.resizable.set|resize|collapse|reset|value()` or `@ui.resizable.*` actions.

Scroll Area deliberately has no runtime. A focusable `data-part="viewport"` retains native wheel,
touch, scrollbar, and keyboard behavior while the theme supplies cross-browser scrollbar styling,
focus treatment, overscroll containment, and vertical or horizontal presentation.

Data Table enhances native table markup rather than turning it into an application grid:

```html
<div id="systems" data-jqs="data-table" data-page-size="10">
  <div data-part="toolbar">
    <label for="systems-filter">Filter systems</label>
    <input id="systems-filter" data-part="filter" type="search" />
    <span data-part="selection-status"></span>
  </div>
  <div data-part="viewport">
    <table data-part="table">
      <caption>
        Component systems
      </caption>
      <thead>
        <tr>
          <th scope="col"><input data-part="select-all" type="checkbox" /></th>
          <th scope="col" data-key="name"><button data-part="sort">Name</button></th>
        </tr>
      </thead>
      <tbody>
        <tr data-row-id="jquery-star">
          <td><input data-part="row-select" type="checkbox" /></td>
          <th scope="row" data-key="name">jQuery Star</th>
        </tr>
      </tbody>
    </table>
  </div>
  <div data-part="pagination">
    <button data-part="previous">Previous</button>
    <span data-part="page-status"></span>
    <button data-part="next">Next</button>
  </div>
</div>
```

Sortable headers use `data-key`; add `data-type="number"` or `data-type="date"` when text sorting is
not correct. The sort button cycles ascending, descending, then source order, and only the active
header receives `aria-sort`. Selection uses stable `data-row-id` values and select-all applies to
the visible page. `$.star.ui.dataTable` and `@ui.dataTable.*` expose sorting, filtering, page
navigation, and selected IDs. Set `data-processing="manual"` when a server owns filtering, sorting,
and pagination; the component will publish state and events without rearranging or hiding rows.

Composition primitives are semantic HTML plus stable styling hooks, so they add no runtime state:

```html
<article data-jqs="card" aria-labelledby="release-title">
  <header data-part="header">
    <h2 id="release-title" data-part="title">Release candidate</h2>
    <p data-part="description">Ready for review.</p>
  </header>
  <div data-part="content">
    <span data-jqs="avatar" role="img" aria-label="Chad Peppers">CP</span>
    <span data-jqs="badge" data-variant="success">Verified</span>
    <hr data-jqs="separator" />
    <progress data-jqs="progress" value="63" max="63">63 of 63</progress>
  </div>
</article>

<div data-jqs="alert" data-variant="warning" role="status">
  <strong data-part="title">Review needed</strong>
  <span data-part="description">Two checks remain.</span>
</div>

<span data-jqs="skeleton" aria-hidden="true"></span>
```

Badge and Alert accept `default`, `secondary`, `outline`, `success`, and `danger` variants where
applicable; Alert also accepts `warning`. Avatar accepts `sm`, `md`, and `lg` sizes. Skeleton is
decorative and disables its shimmer when the user prefers reduced motion. Use native semantics and
labels around these primitives; `data-jqs` supplies appearance, not replacement accessibility roles.

Breadcrumb and Pagination keep their native navigation landmarks, lists, and links. Navigation Menu
uses ordinary site-navigation links and composes Popover for disclosure sections instead of claiming
the desktop application `menu` role. Command Palette composes Dialog with
`<div data-jqs="combobox" data-inline>` so search results remain inside the modal instead of opening
another top-layer popup.

Toast supports server-rendered markup and an imperative or named-action API:

```html
<button
  data-on:click="@ui.toast.show({ title: 'Saved', description: 'Your changes are live.', variant: 'success' })"
>
  Save
</button>

<div data-jqs="toast-viewport" aria-label="Notifications (F8)"></div>
```

`$.star.ui.toast.show()` returns the created toast. Use `dismiss()` or `clear()` to remove toasts.
Passive toasts dismiss after five seconds by default; toasts with actions remain until dismissed
unless `data-duration` is explicit. Timers pause on hover, focus, window blur, and hidden tabs. F8
focuses the viewport, Escape dismisses a focused toast, and a horizontal swipe dismisses it. Use
`data-priority="assertive"` only for time-sensitive messages. Actions require `data-alt-text` with a
non-timed alternative.

See [component research](docs/COMPONENT_RESEARCH.md) and
[component architecture](docs/COMPONENT_ARCHITECTURE.md) for the decisions and verification rules.

## Catalog deployment

The public catalog deploys to [ignibyte.github.io/jqstar](https://ignibyte.github.io/jqstar/) after
the complete proof workflow passes on `main`. The Vite base is supplied by the workflow, so local
development stays at `/` and a future custom domain can switch to `/` without source changes.

GitHub Pages is static. Its catalog therefore uses an explicit in-browser fallback for the three
backend demonstrations. Local development continues to run the real JSON and SSE routes generated
with the official Datastar SDK. A future hosted API can replace the fallback without changing the
component markup or public action names.

## Expression context

Every directive receives the same names.

| Name                | Value                                          |
| ------------------- | ---------------------------------------------- |
| `$`                 | The real jQuery function                       |
| `$count`            | The reactive signal named `count`              |
| `el`                | The element that owns the directive            |
| `$(el)`             | That element wrapped in jQuery                 |
| `evt`               | The current event inside `data-on:*`           |
| `this`              | The current element inside event expressions   |
| `$el`               | The current element as a jQuery object         |
| `root` / `$root`    | The application root as DOM and jQuery objects |
| `state` / `signals` | The complete reactive state object             |

Expressions are ordinary JavaScript:

```html
<button
  data-on:click="
    $count++;
    $(el).addClass('used');
    console.log($.fn.jquery, evt.type);
  "
>
  Use once
</button>
```

Event expressions may be asynchronous and can use `await`.

## Named actions

Use `@name` when behavior belongs in JavaScript instead of markup.

```html
<button data-on:click="@removeItem">Remove</button>
```

```ts
$.star.action<{ itemCount: number }>("removeItem", ({ $element, state }) => {
  $element!.closest("li").fadeOut(150, function () {
    $(this).remove();
  });

  state.itemCount--;
});
```

Arguments are expressions evaluated in the same context:

```html
<button data-on:click="@removeItem($itemId, 'archive')">Remove</button>
```

The action receives them as `args`:

```ts
$.star.action("removeItem", ({ args }) => {
  const [itemId, mode] = args!;
});
```

Local actions in the optional behavior-sheet API take precedence over global actions with the same
name.

## Backend actions

The built-in `@get`, `@post`, `@put`, `@patch`, and `@delete` actions send the current signals and
apply the response:

```html
<button data-on:click="@get('/items')">Refresh</button>

<form data-on:submit__prevent="@post('/items', { contentType: 'form' })">
  <input name="title" required />
  <button>Save</button>
</form>
```

GET requests put the signals in a `datastar` query parameter. POST, PUT, PATCH, and DELETE send a
JSON body. DELETE also includes the query parameter because the TypeScript SDK reads it there.
Signal names beginning with an underscore are private and are left out by default. Every request
includes `Datastar-Request: true`.

Set `contentType: 'form'` to validate and submit the nearest form without signals. URL-encoded forms
use `application/x-www-form-urlencoded`. Forms with `enctype="multipart/form-data"` use `FormData`,
including file inputs. Use `selector` to choose another form.

The response determines what changes:

| Response            | Result                                                                             |
| ------------------- | ---------------------------------------------------------------------------------- |
| `application/json`  | Deep-patch signals; `null` removes a signal                                        |
| `text/html`         | Morph elements by ID, or use the `datastar-selector` and `datastar-mode` headers   |
| `text/event-stream` | Apply `datastar-patch-signals` and `datastar-patch-elements` events as they arrive |
| `204 No Content`    | Finish without changing the page                                                   |

A JSON response can set `datastar-only-if-missing: true` to add defaults without overwriting
existing signals. HTML patch modes are `outer`, `inner`, `replace`, `prepend`, `append`, `before`,
`after`, and `remove`. Outer morphs preserve matching elements, focused controls, unsaved input
values, and existing jQuery handlers. Put `data-ignore-morph` on a subtree that the server must not
change.

This is a complete SSE response with two patches:

```text
event: datastar-patch-signals
data: signals {count: 5}

event: datastar-patch-elements
data: selector #feed
data: mode append
data: elements <li data-text="$count"></li>

```

### Official Datastar SDK

The server can generate those events with the official SDK. No jQuery Star adapter is needed:

```sh
npm install @starfederation/datastar-sdk
```

```ts
import { ServerSentEventGenerator } from "@starfederation/datastar-sdk/node";

const read = await ServerSentEventGenerator.readSignals(request);
if (!read.success) {
  response.writeHead(400).end(read.error);
  return;
}

await ServerSentEventGenerator.stream(request, response, (stream) => {
  stream.patchSignals(
    JSON.stringify({
      count: Number(read.signals.count ?? 0) + 1,
    }),
  );

  stream.patchElements(`<li data-text="$count"></li>`, { selector: "#feed", mode: "append" });
});
```

The integration suite runs against `@starfederation/datastar-sdk` 1.0 itself. It verifies
`readSignals()` for GET, POST, and DELETE requests, signal patches, `onlyIfMissing`, outer and
append element patches, SVG namespaces, selector and ID removal, signal removal, event IDs, and
retry fields. The SDK’s `executeScript()` helper is intentionally outside this compatibility set.

Inserted HTML is scanned immediately. Its `data-on:*`, `data-text`, bindings, and cleanup hooks work
without another `.star()` call.

Common request options:

```html
<button
  data-on:click="@post('/items', {
  payload: {title: $title},
  params: {source: 'toolbar'},
  pending: 'saving',
  error: 'saveError',
  retry: 'error',
  retryMaxCount: 2,
  requestCancellation: 'cleanup'
})"
>
  Save
</button>
```

- `filterSignals` accepts `include` and `exclude` regular expressions.
- `headers`, `credentials`, `params`, and `payload` customize the request.
- `pending` names a boolean signal. `error` names a signal that receives the final error message.
  These two options are jQuery Star extensions.
- `retry` is `auto`, `error`, `always`, or `never`. `auto` retries network failures. The defaults
  are 10 retries, a 1-second first wait, a multiplier of 2, and a 30-second maximum wait.
- `requestCancellation: 'auto'` cancels an older matching request from the same element. `cleanup`
  also cancels when that directive or element is removed. `disabled` allows overlap. An
  `AbortController` gives the caller direct control.
- `target` and `mode` override the HTML response headers.

The initiating element emits `datastar-fetch` and `jquery-star:fetch` events. Read `evt.detail.type`
for `started`, `progress`, `retrying`, `finished`, `retries-failed`, or `error`. Unknown SSE events
are forwarded as `jquery-star:sse`.

JavaScript can create the same actions without an attribute:

```ts
const app = $("#app").star("instance")!;
await app.run($.star.post("/items", { payload: { title: "Proof" } }));
```

## Signals and computed values

`data-signals` accepts a JavaScript object. Signal objects are deeply reactive.

```html
<section data-signals="{ user: { firstName: 'Ada' }, count: 1 }" data-computed:double="$count * 2">
  <strong data-text="$user.firstName"></strong>
  <output data-text="$double"></output>
</section>
```

Multiple `data-signals` attributes inside one application merge into the same state tree. State can
also be read from JavaScript:

```ts
const state = $("#app").star("state");
state.count++;
await $.star.nextUpdate();
```

## Directives

| Directive         | Example                                      | Effect                         |
| ----------------- | -------------------------------------------- | ------------------------------ |
| `data-on:event`   | `data-on:click="$open = true"`               | Run an event expression        |
| `data-text`       | `data-text="$count"`                         | Set text content               |
| `data-html`       | `data-html="$trustedHtml"`                   | Set HTML content               |
| `data-show`       | `data-show="$open"`                          | Show or hide with jQuery       |
| `data-class:name` | `data-class:active="$open"`                  | Toggle one class               |
| `data-class`      | `data-class="{ active: $open }"`             | Toggle several classes         |
| `data-attr:name`  | `data-attr:aria-label="$label"`              | Set or remove an attribute     |
| `data-prop:name`  | `data-prop:disabled="!$valid"`               | Set a DOM property             |
| `data-style:name` | `data-style:color="$color"`                  | Set an inline style            |
| `data-bind:name`  | `data-bind:user.name`                        | Two-way input binding          |
| `data-effect`     | `data-effect="$(el).text($count)"`           | Rerun when read signals change |
| `data-init`       | `data-init="$(el).datepicker()"`             | Run once when inserted         |
| `data-destroy`    | `data-destroy="$(el).datepicker('destroy')"` | Run before cleanup             |
| `data-ignore`     | `data-ignore`                                | Skip a subtree                 |

`data-bind:*` handles text controls, booleans, checkbox arrays, radio groups, and multiple selects.
Kebab-case signal names become camel case, so `data-bind:display-name` writes `state.displayName`.

`data-html` does not sanitize its value. Use it only with HTML that your application trusts.

## Event modifiers

Modifiers follow the event name with a double underscore.

```html
<form data-on:submit__prevent__once="@save"></form>

<input data-on:input__debounce.250ms="@search($el.val())" />

<aside data-on:click__outside="$open = false"></aside>

<div data-on:scroll__window__passive="@measure"></div>

<input data-on:keydown__enter="@submit" />
```

Supported modifiers are:

- `prevent`, `stop`, `once`, and `self`
- `debounce`, `debounce.250ms`, and `debounce.1s`
- `throttle`, `throttle.100ms`, and `throttle.1s`
- `outside`, `window`, and `document`
- `capture` and `passive`
- `enter`, `escape`, `space`, `tab`, `up`, `down`, `left`, and `right`

`prevent` and `passive` cannot be combined.

## Dynamic markup and cleanup

The application watches its root for inserted, removed, and changed attributes. A button inserted
later works without another `.star()` call:

```js
$("#app").append(`
  <button data-on:click="$count++">Increment</button>
`);
```

Changing a directive attribute removes the old listener or effect before the new one is installed.
Removing a subtree stops its effects and listeners and runs `data-destroy`.

Destroy an application explicitly when its root remains in the page:

```ts
$("#app").star("destroy");
```

Expression failures trigger `jquery-star:error` on the application root:

```ts
$("#app").on("jquery-star:error", (_event, detail) => {
  console.error(detail.attribute, detail.expression, detail.error);
});
```

## Optional behavior sheets

The earlier selector-based API remains available for code that should not use attributes:

```ts
$("#counter").star({
  state: { count: 0 },
  actions: {
    increment: ({ state }) => state.count++,
  },
  ui: {
    ".increment": { on: { click: "increment" } },
    ".count": { text: ({ state }) => state.count },
  },
});
```

Calling `.star()` with no definition starts attribute mode. Passing a definition starts
behavior-sheet mode. Both modes use the same reactive engine, action registry, update queue, and
destruction command.

## Content Security Policy

JavaScript expressions are compiled with `Function`, so expression directives need `unsafe-eval` in
`script-src`. The exact shorthand `data-on:click="@removeItem"` does not compile JavaScript and can
be used under a stricter policy when the page does not use expression-based signals or bindings.

Never place untrusted text inside a directive. Treat directive values as source code, not as data.

## Verification

```sh
npm test
npm run typecheck
npm run build
npm run build:demo
npm run demo
```

The test suite covers the exact `$count++; $(el).fadeOut()` example, named actions, action
arguments, computed signals, every binding family, event modifiers, dynamic insertion, attribute
replacement, cleanup, backend request encoding, retries, cancellation, JSON and HTML responses,
chunked SSE, official Datastar SDK output, DOM morphing, and the optional behavior-sheet API.

This is an independent implementation. It accepts the official SDK’s signal and element patch events
plus the related JSON and HTML response headers. It is not a copy of the full Datastar browser
runtime. It does not support the SDK’s `executeScript()` helper and rejects `text/javascript`
responses instead of executing server-supplied code. A hidden page delays a new GET until it is
visible, but an already-open stream is not closed and reopened automatically.
