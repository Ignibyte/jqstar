# jQStar

**A full-featured frontend platform for server-rendered applications that do not want to become
single-page applications.**

You should not need to adopt an SPA architecture just to build a modern, reactive web application.
With jQStar, you can:

- Keep routes, validation, permissions, and data on the server.
- Keep HTML readable and useful before JavaScript runs.
- Add reactivity and rich components where they are needed.
- Update parts of the page through HTML, JSON, or Datastar streams.
- Choose ordinary JSON/HTML requests or Datastar compatibility per backend action.
- Avoid JSX, hydration, virtual DOM ownership, and client-side route duplication.
- Continue using existing backend templates and jQuery plugins.
- Adopt the framework incrementally instead of rewriting the application.

## What we are building for

1. An excellent server-rendered development experience.
2. Predictable enhancement and cleanup after HTML replacement.
3. Backend-agnostic examples for PHP, Rails, Django, Node, and similar stacks.
4. Strong no-build and modular-package support.
5. Accessible components that solve real application workflows.
6. Optional navigation and shared state without making them mandatory.
7. Clear migration paths from ordinary jQuery, jQuery UI, and jQuery Mobile.

## Reactive HTML. Actual jQuery

Datastar-style reactive attributes use real jQuery inside every expression:

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

The boundary is exact: `$ is real jQuery` and `$name` is the reactive signal named `name`. jQStar is
an independent project and is not affiliated with, sponsored by, endorsed by, or an official
successor to the jQuery project or the OpenJS Foundation. See the
[jQuery ecosystem policy](docs/JQUERY_ECOSYSTEM.md) for the current Core, Migrate, UI, Mobile,
Sizzle, and QUnit decisions.

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

### Modular preview entries

The root entry remains the compatibility path: importing it installs the complete core, Datastar
profile, and UI plugin. The 0.4-track `core`, `ui`, `datastar`, `htmx`, and `turbo` subpaths are
previews until the 1.0 platform audit. They are explicit and side-effect-free, so importing them
does not touch a document or jQuery instance:

```ts
import $ from "jquery";
import { createRenderAdapter, installStarCore } from "jquery-star/core";
import { datastarPlugin } from "jquery-star/datastar";
import { uiPlugin } from "jquery-star/ui";
import "jquery-star/ui.css";

const installed = installStarCore($);
installed.star.use(datastarPlugin);
const ui = installed.star.use(uiPlugin);
const renderAdapter = createRenderAdapter(installed);
```

Core alone includes applications, directives/helpers, observations, middleware, HTML/JSON patches,
the `core.generic` request profile, render coordination, and terminal disposal. Add Datastar only
when its request/SSE contract is needed. Add UI and its CSS only when the component controllers are
needed. Installing the UI plugin creates `installed.star.ui`; it never claims `$.ui`, `$.widget`,
jQuery UI identity, or a Widget Factory contract.

| Entry                          | Formats                 | Import behavior                                        |
| ------------------------------ | ----------------------- | ------------------------------------------------------ |
| `jquery-star`                  | ESM, CommonJS, root UMD | Auto-installs core + Datastar + UI                     |
| `jquery-star/core`             | ESM, CommonJS           | No side effect; call `installStarCore($)`              |
| `jquery-star/datastar`         | ESM, CommonJS           | No side effect; install `datastarPlugin`               |
| `jquery-star/ui`               | ESM, CommonJS           | No side effect; install `uiPlugin`                     |
| `jquery-star/testing`          | ESM, CommonJS           | No side effect; caller supplies DOM, jQuery, runner    |
| `jquery-star/datastar/testing` | ESM, CommonJS           | No side effect; official-SDK Datastar test fixtures    |
| `jquery-star/htmx`             | ESM, CommonJS           | No side effect; install an explicitly versioned bridge |
| `jquery-star/turbo`            | ESM, CommonJS           | No side effect; install an explicitly versioned bridge |
| `jquery-star/ui.css`           | CSS                     | Explicit stylesheet import; never injected by JS       |

Only the composed root has a UMD/script-tag build. Every JavaScript entry has matched ESM and
CommonJS declarations and source maps.

### Testing preview entries

`jquery-star/testing` provides a runner-neutral harness over the explicit core installer. The caller
supplies one same-realm `Window`, `Document`, and jQuery instance; the entry does not create a DOM,
register tests, replace globals, or install a plugin at import time.

```ts
import {
  createResponseController,
  createStarHarness,
  runCoreConformance,
} from "jquery-star/testing";

const createHarness = () => {
  const responses = createResponseController({ window });
  return createStarHarness({ window, document, jQuery: $, responses });
};

const report = await runCoreConformance(createHarness);
```

Harness applications expose their public root, instance, state, and destruction status. Event
helpers trigger native or jQuery events without proxying jQuery. `flush()` is bounded and waits only
for jQStar reactive/enhancement work, queued fixtures, and registered finite tasks, including work
they register transitively. It does not wait for arbitrary timers, animation loops, third-party
promises, or real network idleness. A `StarFlushError` carries a JSON-safe diagnostic containing
only owned operation/request/task IDs, owners, rounds, and elapsed time.

The strict FIFO response controller captures exact requests and supplies JSON, HTML, empty, HTTP
failure, network failure, delay, retry, and abort cases without network passthrough. Its fetch
replacement and `withStarDOMRealm()`'s finite ambient-global lease restore prior property
descriptors after success, setup failure, callback failure, or disposal. Only one ambient realm
lease may be active in a process.

Valid Datastar stream fixtures live in `jquery-star/datastar/testing` and use the official SDK.
Keeping that entry separate prevents Datastar from entering the generic testing or core graph. See
the [testing guide](https://ignibyte.github.io/jqstar/docs/testing/) for teardown limits and runner
integration.

## Observe actions and requests

The root installation can observe every action and backend request owned by its document:

```ts
const stop = $.star.observeOperations((operation) => {
  console.log(operation.kind, operation.phase, operation.id);
});

const app = $("#app").star("instance");
const stopApp = app?.observeOperations((operation) => {
  console.log(operation.owner.id, operation.phase);
});
```

Each action or request emits one `started` record and one `completed`, `cancelled`, or `failed`
record. Requests may also emit `progress` and `retrying`. A request started inside an action carries
that action's ID as `parentId`. Records are frozen, contain JSON data only, and keep one opaque ID
through retries.

Operation records omit headers, bodies, response content, query strings, URL fragments, credentials,
state, elements, events, and live browser objects. URL paths, action labels, and normalized error
messages can still contain application data. Redact those fields before sending records to an
external logger or analytics service. Call the returned function to unsubscribe.

The older `datastar-fetch`, `jquery-star:fetch`, `jquery-star:sse`, and `jquery-star:error` events
remain unchanged for code that needs their existing live payloads.

### 0.1 compatibility baseline

Version 0.1 supports jQuery 4, Node 24 or newer for Node consumers and tooling, ESM, CommonJS,
browser modules, and the `jQueryStar` UMD/CDN global. Shared behavior is blocking in Chromium,
Firefox, and WebKit. Applications boot in ordinary HTML documents and caller-supplied same-origin
frame documents. Application roots inside shadow DOM are not supported.

One document uses one jQStar installation and one canonical jQuery instance. Loading another package
copy or trying to install against a second jQuery instance in that document is unsupported and fails
before it can install competing document behavior.

The jQuery peer is required. A strict package installation rejects jQuery outside `>=4.0.0 <5`. If
peer installation is deliberately bypassed and jQuery is absent, importing `jquery-star` fails
because the `jquery` module cannot be resolved.

The root import intentionally installs `$.fn.star` and `$.star` into the imported jQuery instance.
Its current runtime exports, declarations, directives, named actions, request bytes, events, package
entries, formats, and measured artifact are recorded in `quality/public-baseline.json` and checked
by `npm run test:public-baseline` plus the installed-package gate.

The recorded root surface is stable for later 0.x releases. A stable item receives at least one
minor release of deprecation notice before removal. Version 0.1 publishes no stable error codes. The
`core`, `ui`, `datastar`, `testing`, and `datastar/testing` subpaths are published 0.4 previews;
they are tested package contracts but are not designated stable for 1.0 yet. Private source imports
and undeclared subpaths receive no compatibility promise.

## Source registry

The package ships a copy-in source registry alongside the runtime. Initialize a consuming project,
inspect the catalog, and add only the recipes it needs:

```sh
npx jqstar init
npx jqstar list
npx jqstar list --type block
npx jqstar add button dialog command-palette
npx jqstar add operations-dashboard
npx jqstar add profile-settings
npx jqstar add project-browser
npx jqstar add access-manager
npx jqstar add audit-log
npx jqstar doctor
```

`jquery-star.json` controls the project-relative destination:

```json
{
  "$schema": "./node_modules/jquery-star/schema/jquery-star.schema.json",
  "blocksOutput": "blocks/jquery-star",
  "output": "components/jquery-star"
}
```

`add` refuses to replace an existing file unless `--force` is explicit. `--dry-run` prints every
planned destination without writing it. `--cwd` runs any command against another project directory,
and `list` and `doctor` support `--json` for scripts. `list --type component` and
`list --type block` filter the catalog. Explicit safe file targets in the registry take precedence
over the fallback directories, so one block can install its markup and action module together.
Registry dependencies install before the requested item. Existing dependency files are preserved,
cycles fail before any file is written, and `--no-deps` copies only the requested item. Configs
created before `blocksOutput` was added continue to place untargeted blocks in `output`.

The root `registry.json` follows the current shadcn source-registry vocabulary, including
`registry:block`, explicit file targets, and composition metadata. `jqstar` is the supported
installer because its project config and component/block filtering are specific to this HTML
catalog. The copied files are ordinary HTML fragments. Applications own and edit that markup while
the `jquery-star` package supplies behavior and the compiled theme.

## Components and blocks

The source catalog now includes 109 items: 102 component recipes and seven composed blocks. They are
Button, Button Group, Dialog, Alert Dialog, Sheet, Drawer, Field, Form, Label, Input, Input Group,
File Input, Textarea, Native Select, Checkbox, Radio Group, Switch, Slider, Toggle, Toggle Group,
Collapsible, Accordion, Tabs, Popover, Tooltip, Hover Card, Dropdown Menu, Context Menu, Menubar,
Tree View, Select, Combobox, Calendar, Range Calendar, Date Picker, Date Range Picker, Number Field,
Password Field, Tags Input, Input OTP, Resizable Panels, Scroll Area, Data Table, Toast, Card,
Badge, Alert, Separator, Avatar, Skeleton, Spinner, Progress, Meter, Empty State, Keyboard Key,
Breadcrumb, Pagination, Navigation Menu, Command Palette, Async Form, Sidebar, Carousel, Toolbar,
Stepper, Sortable List, File Upload, Multi Select, Transfer List, Split Button, Time Picker, Color
Picker, Rating, Message, Message Scroller, Search Field, Item, Feed, Questionnaire, Attachment,
Bubble, Aspect Ratio, Chart, Direction, Marker, Table, Typography, Stat, Timeline, Status, Code
Block, Browser Mockup, Diff, Log Viewer, JSON Viewer, Countdown, Connection Status, Terminal, Radial
Progress, Indicator, Dock, Swap, Key Value, Clipboard, Editable, Operations Dashboard, Profile
Settings, Project Browser, Access Manager, and Audit Log. The seven blocks are Command Palette,
Async Form, Operations Dashboard, Profile Settings, Project Browser, Access Manager, and Audit Log.
Import the precompiled theme for the default appearance. Tailwind is used to author this file but is
not required in the consuming application.

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

Stepper models a sequential workflow as an ordered list and source-owned panels. The active trigger
uses `aria-current="step"`; `data-value` is the server-patch boundary. Add `data-linear` to require
adjacent forward progress and native constraint validation. Use
`$.star.ui.stepper.next|previous|go|complete|value()` or `@ui.stepper.*`.

Sortable List preserves each source-owned item while publishing its order as a JSON `data-value` and
repeated hidden inputs from `data-name`. Dragging, keyboard grab/move/drop, and visible Up/Down
buttons produce the same order. Use `$.star.ui.sortable.move|up|down|value()` or `@ui.sortable.*`.

File Upload keeps a real `<input type="file">` as its source, so `new FormData(form)` receives the
browser `FileList` directly. It adds drop handling, removable file rows, `accept`, `data-max-files`,
and `data-max-size` validation. Use `$.star.ui.fileUpload.clear|remove|files()` or
`@ui.fileUpload.*`.

Multi Select generates a multi-select listbox and removable tags from a direct native
`<select multiple>`. Arrow keys, Home, End, and typeahead move listbox focus without changing the
selection. Space toggles the focused option, and Control/Command+A selects up to `data-max`. The
native selected options remain the values in FormData. Use
`$.star.ui.multiSelect.open|close|toggle|set|select|clear|value()` or `@ui.multi-select.*`.

Transfer List keeps two visible native `<select multiple>` controls. The runtime moves the authored
options between available and assigned lists, writes ordered repeated hidden inputs from
`data-name`, and publishes the assignment as JSON `data-value`. Add, remove, add-all, remove-all,
Enter, double-click, and Move Up/Down all use the same cancelable change boundary. Use
`$.star.ui.transferList.add|addAll|remove|removeAll|set|up|down|value()` or `@ui.transfer-list.*`.
Split Button is a zero-runtime composition of a primary Button and Dropdown Menu.

Time Picker wraps `<input type="time">` without replacing its locale-specific picker, required
state, `min`, `max`, or second-based `step`. Earlier and Later buttons call the native stepping
model, and preset buttons use the same validation path. Use
`$.star.ui.timePicker.increment|decrement|set|value()` or `@ui.time-picker.*`.

Color Picker keeps `<input type="color">` as the submitted value. An optional text control mirrors
the browser-normalized value, and swatches provide shortcuts through the same cancelable change
boundary. Use `$.star.ui.colorPicker.set|value()` or `@ui.color-picker.set`.

Rating styles a native radio fieldset, so Arrow keys, required validation, reset, and FormData stay
with the browser. `data-value` accepts server patches, while `set` and `clear` use the same
cancelable change boundary as a native selection. Use `$.star.ui.rating.set|clear|value()` or
`@ui.rating.*`.

Message is source-owned conversation markup with sender, timestamp, content, attachment, action, and
sent-side parts. Message Scroller wraps those articles in a named `role="log"`. It follows messages
appended at the end until the reader scrolls away, then preserves the reading position and counts
unread additions. Use `$.star.ui.messageScroller.latest|follow|isFollowing|unread()` or
`@ui.message-scroller.*`.

Search Field enhances a native `<input type="search">` inside an ordinary search form. The browser
still owns Enter submission, validation, autocomplete, and FormData. Clear, focus, value, and submit
operations are available through `$.star.ui.searchField` and `@ui.search-field.*`; `data-value` and
`data-loading` accept server patches without replacing the focused input.

Item is a zero-runtime, source-owned row with media, title, description, metadata, footer, and
action parts. Feed arranges Item articles into a labelled dynamic structure, publishes
`aria-posinset`, `aria-setsize`, and `aria-busy`, and supports Page Up and Page Down article
navigation. Its visible Load More button is always the backend action boundary. Optional `data-auto`
uses Intersection Observer to activate that same button instead of creating a separate loading path.
Use `$.star.ui.feed.load|complete|fail|reset|state|focus()` or `@ui.feed.*`.

Questionnaire turns direct native `<fieldset>` questions into an ordered form flow. It supports
single, multiple, freeform, skippable, and conditionally disabled questions while preserving radio,
checkbox, hidden skip, and text values in `FormData`. Number shortcuts activate visible choices,
`data-value` can resume or server-patch the active question, and validation stops invalid
submissions before application request handlers run. Use
`$.star.ui.questionnaire.next|previous|go|skip|reset|submit|value|answer|answers()` or
`@ui.questionnaire.*`.

Attachment and Bubble are zero-runtime source recipes. Attachment presents file or image metadata,
upload progress, state, and actions. Bubble presents conversational content and reactions; Message
still owns sender metadata and alignment.

Select keeps a native form control as its value and submission source:

```html
<label for="framework-control">Framework</label>
<div id="framework" data-jqs="select" data-placeholder="Choose a framework">
  <select id="framework-control" data-part="control" data-bind:framework name="framework">
    <optgroup label="Current project">
      <option value="jquery-star">jQStar</option>
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
    <div data-part="option" data-value="jquery-star">jQStar</div>
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
          <th scope="row" data-key="name">jQStar</th>
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

Add `data-processing="manual"` when a backend owns the complete row model. The Project Browser block
is the production server-driven reference. It sends global search, owner and status facets, an
ordered sort array, grouping, page or virtual-window state, and a 5–200 page size as Datastar
signals. Its SQLite store applies migrations, seeds 2,500 deterministic records, executes
allowlisted queries, and uses record versions for conflict-safe inline edits. The server returns
canonical metadata plus row and Pagination patches through the official Datastar SDK.

Column visibility, order, and left pinning stay client-side because they change presentation rather
than the query. The versioned layout survives page reloads and can be changed through drag/drop or
keyboard-operable buttons. Selection stays keyed by `data-row-id` across pages, virtual windows,
groups, edits, and filters.

```sh
npx jqstar add project-browser
```

Set `data-projects-url` on the copied block to your endpoint. The request and response contract is
documented in [the backend guide](docs/BACKEND.md#project-browser-endpoint).

Sortable headers use `data-key`; add `data-type="number"` or `data-type="date"` when text sorting is
not correct. A normal click replaces sorting and cycles ascending, descending, then source order.
Shift-click adds, changes, or removes the column in an ordered multi-sort. Active buttons expose
`data-sort-order`, events include the complete `sorts` array, and
`$.star.ui.dataTable.sorts(target)` reads it. Selection uses stable `data-row-id` values and
select-all applies to the visible page. `$.star.ui.dataTable` and `@ui.dataTable.*` expose sorting,
filtering, page navigation, and selected IDs. Set `data-processing="manual"` when a server owns the
row model; the component publishes state and events without rearranging or hiding rows.

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
    <progress data-jqs="progress" value="100" max="100">100 of 100</progress>
  </div>
</article>

<div data-jqs="alert" data-variant="warning" role="status">
  <strong data-part="title">Review needed</strong>
  <span data-part="description">Two checks remain.</span>
</div>

<span data-jqs="skeleton" aria-hidden="true"></span>
```

Chart uses one native table as its accessible and server-patchable source of truth. The runtime
renders a responsive SVG without adding a charting framework:

```html
<figure id="visitors" data-jqs="chart" data-type="bar">
  <figcaption>Visitors</figcaption>
  <svg data-part="plot"></svg>
  <div data-part="legend"></div>
  <p data-part="status"></p>
  <table data-part="data">
    <caption>
      Monthly visitors
    </caption>
    <thead>
      <tr>
        <th>Month</th>
        <th data-series="visitors">Visitors</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <th>January</th>
        <td>186</td>
      </tr>
      <tr>
        <th>February</th>
        <td>305</td>
      </tr>
    </tbody>
  </table>
</figure>
```

After a backend response changes the table, call `$.star.ui.chart.refresh("#visitors")` or the named
`@ui.chart.refresh('#visitors')` action. Use `@ui.chart.type('line')` from inside the chart to
switch presentation without changing its data.

Code Block preserves the exact authored text and exposes an announced clipboard action:

```html
<div id="payload" data-jqs="code-block">
  <button data-part="copy" data-on:click="@ui.code-block.copy">Copy JSON</button>
  <pre><code data-part="code">{ "status": "healthy" }</code></pre>
  <p data-part="status"></p>
</div>
```

Use `$.star.ui.codeBlock.text("#payload")` to read it or
`await $.star.ui.codeBlock.copy("#payload")` to copy it. Stat, Timeline, Status, Browser Mockup, and
Diff are zero-runtime presentation contracts. Diff uses a native range input, so pointer and
keyboard comparison work without another widget implementation.

Clipboard copies text from a live native control, a `data-part="value"` element, `data-copy-text`,
or an explicit action argument:

```html
<div id="install" data-jqs="clipboard">
  <code data-part="value">npm install jquery jquery-star</code>
  <button data-part="trigger" data-on:click="@ui.clipboard.copy">Copy</button>
  <span data-part="status"></span>
</div>
```

`copy`, `text`, and `state` are available under `$.star.ui.clipboard`. Copying emits cancelable
`jquery-star:clipboard:before-copy`, followed by `copy` or `error`. Values are sent to the Clipboard
API as text and are never inserted as HTML.

Editable keeps a native input, textarea, or select in the document while switching between preview
and edit modes. Enter commits a single-line value, Escape cancels, and native constraint validation
runs before a commit:

```html
<div id="name" data-jqs="editable">
  <div data-part="display">
    <span data-part="preview">Ada Lovelace</span>
    <button data-part="edit" data-on:click="@ui.editable.edit">Edit</button>
  </div>
  <div data-part="editor" hidden>
    <input data-part="control" name="displayName" value="Ada Lovelace" required />
    <button data-on:click="@ui.editable.commit">Apply</button>
    <button data-on:click="@ui.editable.cancel">Cancel</button>
  </div>
  <span data-part="status"></span>
</div>
```

The public API provides `edit`, `commit`, `cancel`, `set`, `value`, and `editing`. Preview updates
use `textContent`, and the native control remains available to `FormData` in display mode.

Log Viewer accepts authored or server-appended list items and exposes bounded append, clear, pause,
resume, minimum-level filtering, follow state, and inspection methods:

```html
<section id="logs" data-jqs="log-viewer" data-level="all" data-max="200">
  <select data-part="filter" aria-label="Minimum log level">
    <option value="all">All levels</option>
    <option value="warn">Warning</option>
    <option value="error">Error</option>
  </select>
  <button data-part="pause" data-on:click="@ui.log-viewer.toggle">Pause logs</button>
  <div data-part="viewport"><ol data-part="entries"></ol></div>
  <p data-part="status"></p>
</section>
```

`$.star.ui.logViewer.append("#logs", entry)` builds every field with `textContent`; strings are not
interpreted as HTML. `filter`, `clear`, `pause`, `resume`, `toggle`, `follow`, and `state` share the
same contract as the `@ui.log-viewer.*` actions. Server patches can append ordinary
`data-part="entry"` list items. The existing document-level enhancement pass updates capacity,
filtering, status, and follow behavior without adding a component Mutation Observer.

JSON Viewer reads one non-executable `script[type="application/json"][data-part="source"]` and
renders nested native disclosures. Use `set`, `value`, `expandAll`, and `collapseAll` under
`$.star.ui.jsonViewer`, or the matching named actions for disclosure changes. Values are rendered as
text, a depth limit prevents unbounded recursion, and rerendering occurs only when the source
signature changes.

Countdown accepts `data-duration` in seconds or an absolute `data-until` deadline. Public `start`,
`until`, `pause`, `resume`, `reset`, `remaining`, and `state` methods are mirrored by named actions
where state changes. All connected countdowns share one clock, and that clock stops when no running
countdown remains. Completion is announced once through the authored status part.

Connection Status, Terminal, Radial Progress, Indicator, Dock, Swap, and Key Value are lightweight
composition contracts. Swap retains one native checkbox, Dock retains ordinary links and
`aria-current`, and Key Value retains a definition list. A backend can update their public data,
ARIA, text, and CSS-variable state without calling a component renderer.

## Self-hosted demo backend

The production-shaped server uses the same API implementation as the local Vite demo. It serves the
built site, `/health`, JSON and multipart routes, and the Datastar SDK SSE routes from one Node
process. `/api/demo/runtime` returns the control-plane snapshot. `/api/demo/runtime/stream` uses the
official SDK to append escaped log-entry HTML and patch the completion signal. The Profile Settings
block uses `/api/demo/profile` for validated JSON persistence and `/api/demo/profile/invite` for a
server-owned invite URL. Project Browser uses `/api/demo/projects` for persistent search and facets,
ordered multi-sort, groups, page and virtual windows, canonical ranges, and row/Pagination patches
through the same SDK. `PATCH /api/demo/projects/:id` validates inline edits and rejects stale record
versions without overwriting them. Access Manager uses `/api/demo/access` to load and persist
ordered permission assignments while the SDK replaces the Transfer List and patches its signals.
Each successful write records a server-owned entry. Audit Log reads those entries from
`/api/demo/access/audit`, patches filtered rows and Pagination, and refreshes when it receives the
Access Manager saved event:

```sh
npm run build:self-hosted
JQS_HOST=127.0.0.1 JQS_PORT=4173 JQS_DATABASE_PATH=./data/projects.sqlite npm run serve:self-hosted
```

`JQS_STATIC_DIR` can point at a different built site directory. `JQS_DATABASE_PATH` defaults to
`data/projects.sqlite` under the working directory. The default request-body limit is 10 MiB. The
server rejects path traversal, applies long-lived caching only to fingerprinted assets, sets frame
and content-type protections, closes SQLite, and shuts down on `SIGINT` or `SIGTERM`.

The deployable Linux unit binds the server to loopback, caps it at 512 MB, and runs it as a
dedicated user. See [the self-hosting runbook](docs/SELF_HOSTING.md) for release directories,
systemd setup, health checks, reverse-proxy requirements, upgrades, and rollback.

The default trusted jQStar engine compiles authored expressions at runtime and therefore requires
`unsafe-eval` in `script-src`. Deployments that need a policy without `unsafe-eval` can select the
finite `jquery-star/csp` runtime described below. Engine selection does not configure the server's
policy.

Badge and Alert accept `default`, `secondary`, `outline`, `success`, and `danger` variants where
applicable; Alert also accepts `warning`. Avatar accepts `sm`, `md`, and `lg` sizes. Skeleton is
decorative and disables its shimmer when the user prefers reduced motion. Use native semantics and
labels around these primitives; `data-jqs` supplies appearance, not replacement accessibility roles.

Breadcrumb keeps its native navigation landmark, list, and links. Pagination keeps the same
progressive HTML and synchronizes `data-page`, `data-page-count`, `aria-current`, boundary state,
and an optional status part. Native links still navigate unless `data-navigation="manual"` is
present:

```html
<nav id="results-pages" data-jqs="pagination" data-page="1" data-page-count="3">
  <a data-part="previous" href="?page=1">Previous</a>
  <a data-part="page" data-page="1" href="?page=1">1</a>
  <a data-part="page" data-page="2" href="?page=2">2</a>
  <a data-part="next" href="?page=2">Next</a>
  <span data-part="status" aria-live="polite"></span>
</nav>
```

Use `$.star.ui.pagination.goTo("#results-pages", 2)`, `next()`, or `previous()`. The matching named
actions are `@ui.pagination.page`, `@ui.pagination.next`, and `@ui.pagination.previous`.
`jquery-star:pagination:before-change` is cancelable and `jquery-star:pagination:change` carries the
old page, new page, and page count. Server patches can replace the authored controls and page
metadata without replacing the component API.

Navigation Menu uses ordinary site-navigation links and composes Popover for disclosure sections
instead of claiming the desktop application `menu` role. Command Palette composes Dialog with
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

## Local verification and manual publishing

GitHub Actions are intentionally not configured. Run the complete proof suite locally before
pushing:

```bash
npm run check
npm run test:package
```

The public framework website is hosted at
[ignibyte.github.io/jqstar](https://ignibyte.github.io/jqstar/) from the `gh-pages` branch until the
planned `jqstar.com` domain is owned and connected. The site is itself a jQStar application: native
multi-page HTML, the real runtime, and no React client. Its main routes are:

- `/` for the framework position and installation path
- `/docs/` for Getting Started, Datastar, API, CSP expression, and component guides
- `/docs/agents/` for agent surfaces, provenance, limits, and reporting guidance
- `/components/lab/` for the exhaustive component, block, backend, and accessibility proof

### Agent-readable website

Agent-first means parity: browser and headless agents can retrieve the same reviewed framework
facts, component contracts, and examples shown to people, with canonical public citations. The site
publishes four source-backed surfaces:

- `/docs/agents/` is the human-readable capability guide.
- `/llms.txt` is the short discovery map.
- `/llms-full.txt` is the bounded reviewed corpus.
- `/jqstar-agent-index.json` is the versioned machine-readable index.

The index drives the documentation search and five optional read-only WebMCP tools: current-page
inspection, documentation search, guide retrieval, component-contract retrieval, and verified
example retrieval. An origin-keyed secure browser must expose the 26 August 2026 Community Group
draft through `document.modelContext`; unsupported browsers keep the ordinary website without
errors. WebMCP is not a W3C Standard, a remote MCP endpoint, or a substitute for the static files.
See the [agent-content guide](https://ignibyte.github.io/jqstar/docs/agents/) for exact limits and
the issue reporting contract.

Publishing is explicit and does not run from a GitHub workflow:

```bash
npm run publish:pages
```

That command runs both local proof suites, builds every website route with `/jqstar/` asset paths
and static backend fallbacks, then publishes `demo-dist` to `gh-pages`.

For visual review, run `npm run demo -- --host 127.0.0.1 --port 5174`, then open
`http://127.0.0.1:5174/`. The Component Lab is at `/components/lab/`. Local development runs the
real JSON and SSE routes, including streams generated with the official Datastar SDK. A future
hosted API can use the same component markup and public action names.

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
| `computed`          | The application's computed values              |
| `args`              | Arguments supplied to the current action       |
| `action(name, ...)` | Run a named action from an expression          |
| `<plugin>.<helper>` | A helper registered by an installed plugin     |

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

## Expression engine boundary

The default `createTrustedExpressionEngine()` implementation uses JavaScript's `Function`
constructor. It owns compiled value and statement caches, preserves `$` as real jQuery, maps `$name`
to reactive state, and reports compilation or evaluation failures with the expression source and
authored attribute location.

`StarExpressionEngine` is the public four-method capability: `compileValue`, `compileStatement`,
`clearCache`, and `dispose`. `installStar($, { expressionEngine })` selects one unique engine object
when the kernel is first installed. An engine cannot be shared between kernels or swapped after
installation. Clearing `$.star`'s expression cache affects only its selected engine, and kernel
disposal invalidates retained evaluators.

The package root auto-installs the trusted engine for 0.1 compatibility. The side-effect-free
`jquery-star/core` installer accepts `expressionEngine` during its first explicit installation. The
separate `jquery-star/csp` entry publishes the finite
[`jqstar-csp-expression/1` contract](docs/CSP_EXPRESSIONS.md) and an explicit `installStarCSP()`
installer. Importing the entry has no installation or DOM-scanning side effect.

## External navigation bridges

`createRenderAdapter()` from `jquery-star/core` releases outgoing applications and enhances incoming
roots around a host-owned mutation. Requests, history, focus, and DOM changes remain host-owned.

The side-effect-free `jquery-star/turbo` and `jquery-star/htmx` previews package that coordination
for their host-specific lifecycle events. Both hosts remain optional and must be installed by the
application.

For Turbo Drive and Frames, pass the exact installed package version because Turbo exposes no
documented runtime version field:

```ts
import * as Turbo from "@hotwired/turbo";
import $ from "jquery";
import { installStarCore } from "jquery-star/core";
import { createTurboBridge } from "jquery-star/turbo";

const { star } = installStarCore($);
const bridge = star.use(createTurboBridge({ $, Turbo, version: "8.0.23" }));

await bridge.whenIdle();
```

The bridge accepts `@hotwired/turbo >=8.0.21 <8.1.0`, wraps only public render events, and never
starts Turbo, visits a URL, sends a request, submits a form, writes history, changes focus, or
chooses how Turbo mutates the DOM. Matching `data-jqs-preserve` roots and uniquely identified
`data-turbo-permanent` roots retain their live identity. Call `bridge.dispose()` to remove bridge
listeners and settle any active ownership transaction.

For htmx, inject the host capability and repeat its exact read-only `htmx.version` value:

```ts
import htmx from "htmx.org";
import $ from "jquery";
import { installStarCore } from "jquery-star/core";
import { createHtmxBridge } from "jquery-star/htmx";

const { star } = installStarCore($);
const bridge = star.use(createHtmxBridge({ $, htmx, version: "2.0.10" }));

await bridge.whenIdle();
```

The htmx bridge accepts `htmx.org >=2.0.0 <2.1.0` and checks that the explicit version matches
`htmx.version`. It observes public request, swap, cleanup, settle, out-of-band, history, and error
events. It never calls `htmx.ajax()`, `htmx.process()`, `htmx.swap()`, or `htmx.trigger()`. Valid
`data-jqs-preserve` and `hx-preserve` roots retain exact live identity. `whenIdle()` waits for
bridge-owned render transactions and jQStar enhancement, not arbitrary htmx requests or network
idleness. `observations()` returns the bounded redacted lifecycle history, and `dispose()` removes
listeners without disposing htmx or the jQStar kernel.

The [interoperability contract](docs/INTEROPERABILITY.md) records both bridges' exact supported
boundaries, event mappings, preservation checks, observations, troubleshooting, and unsupported
flows.

## Transactional plugins

Install structural plugins with `$.star.use()` before the first behavior or attribute application
starts. `STAR_PLUGIN_API_VERSION` is `0.1.0`; a plugin declares a compatible `apiVersion` range and
owns one dot-qualified namespace.

```ts
import { STAR_PLUGIN_API_VERSION, type StarPlugin } from "jquery-star";

const auditPlugin: StarPlugin<{ record(message: string): void }> = {
  name: "acme.audit",
  version: "1.0.0",
  apiVersion: `^${STAR_PLUGIN_API_VERSION}`,
  dependencies: { "acme.session": "^2.0.0" },
  after: ["acme.session"],
  install(registrar) {
    const messages: string[] = [];
    registrar.action("acme.audit.record", ({ args }) => {
      messages.push(String(args?.[0] ?? ""));
    });
    registrar.helper("acme.audit.label", (value: unknown) => `Audit: ${String(value)}`);
    registrar.directive({
      id: "acme.audit.label",
      match: { name: "data-acme.audit:label" },
      mount({ attribute, context, effect, expressions, $element }) {
        const read = expressions.compileValue(attribute.value, {
          attribute: attribute.name,
        });
        effect(() => $element.text(String(read(context))));
        return () => $element.empty();
      },
    });
    registrar.application((application) => {
      application.root.setAttribute("data-audited", "true");
      return () => application.root.removeAttribute("data-audited");
    });
    registrar.cleanup(() => messages.splice(0));
    return { record: (message) => messages.push(message) };
  },
};

const audit = $.star.use(auditPlugin);
audit.record("installed");
```

The registered helper is available to authored expressions, and the directive owns its reactive
effect and cleanup:

```html
<output data-acme.audit:label="acme.audit.label($status)"></output>
```

`use()` returns the same facade when given the same plugin object again. A different object with the
same name is a conflict; jQStar does not serialize or compare factory options. Pass an array to
install a complete graph atomically:

```ts
const [audit, session] = $.star.use([auditPlugin, sessionPlugin] as const);
```

Dependencies and `before`/`after` references must be installed already or included in that array.
jQStar validates the complete graph, uses deterministic topological order, runs synchronous
installers against a staging registrar, and publishes actions, directives, helpers, request
middleware, protocol profiles, observers, hooks, facades, cleanup, and namespace claims only after
every installer succeeds. Supported stable version ranges are `*`, exact, caret, tilde, and
whitespace-joined comparisons such as `>=1.2.0 <2.0.0`. Prerelease, build, and `||` syntax are
rejected.

External plugins cannot use `core`, `ui`, their descendants, or a namespace that overlaps another
plugin. Every plugin action must start with its own namespace, such as `acme.audit.record`. Legacy
`$.star.action()` remains chainable and may replace another legacy action, but cannot write into a
claimed plugin namespace.

A directive declares one exact `{ name: "data-<plugin>:..." }` matcher or one colon-terminated
`{ prefix: "data-<plugin>:" }` matcher. IDs are descendants of the plugin name. Overlapping exact
and prefix matchers are rejected instead of being resolved by priority. The optional integer
priority from `-1000` through `1000` orders different matched attributes on one element; authored
attribute order breaks ties.

`parse()` runs before `mount()` or `update()`. These callbacks are synchronous and receive the raw
and parsed attribute, DOM and jQuery elements, the application context, selected expression engine,
committed helper scope, and `cleanup()`, `effect()`, `report()`, and `task()` capabilities. A
directive has one active record per element and attribute. Attribute changes call `update()` when
provided or clean and remount otherwise. Cleanup runs in reverse order for attribute/subtree
removal, `data-ignore`, patch replacement, application destruction, failed setup, and kernel
disposal.

`task()` is for finite promise-like work. It supplies an `AbortSignal`, participates in
`$.star.whenEnhanced()`, reports rejection while active, and aborts or detaches when the directive
is released. A plugin must still own timers, listeners, requests, or promises it creates outside
these capabilities.

Helpers use dotted JavaScript identifier paths below the plugin namespace, such as
`acme.audit.label`. Their namespace containers are frozen, registered values are not recursively
frozen, and fixed jQStar bindings such as `$`, `state`, `el`, browser globals, and signal names
remain authoritative. A plugin name containing a hyphen cannot publish a helper because jQStar does
not silently rewrite it to a JavaScript identifier.

Installation is synchronous and closes permanently when the first application begins setup, even if
that application rolls back. Application-hook cleanup runs once in reverse order when the
application is destroyed. Plugin cleanup runs once in reverse order during kernel disposal, after
applications are destroyed. An installer must register cleanup for each side effect as soon as it
creates it; jQStar cannot roll back work that was never represented through `registrar.cleanup()`.
Live uninstall, package discovery, arbitrary selector matchers, service registrars, and structural
mutation access are intentionally outside the 0.1 plugin contract.

`runPluginConformance()` from `jquery-star/testing` exercises a plugin against a caller-provided
harness factory. It can verify successful use, facade identity, failed-install rollback, and public
failed-cleanup reporting without importing a runner. Run it against a separately packed plugin
installed beside the packed jQStar tarball; a workspace source alias cannot prove the published
contract. Navigation plugins use `createRenderAdapter()` from `jquery-star/core` so outgoing roots,
`data-jqs-preserve` identity and control state, incoming boot, focus restoration, enhancement, and
operation observations stay within the public lifecycle. See the
[plugin guide](https://ignibyte.github.io/jqstar/docs/plugins/).

### Request middleware

Plugins can stage one pre-dispatch request middleware chain. This is the supported place for
application-owned correlation headers, authorization-header integration, deduplication decisions, or
circuit-breaking without replacing global `fetch`:

```ts
import { STAR_PLUGIN_API_VERSION, type StarPlugin } from "jquery-star";

const sessionHeaders: StarPlugin = {
  name: "acme.session-headers",
  version: "1.0.0",
  apiVersion: `^${STAR_PLUGIN_API_VERSION}`,
  install(registrar) {
    registrar.requestMiddleware({
      id: "authorization",
      async handle(request, next, context) {
        const token = await applicationTokenProvider({ signal: context.signal });
        if (!token) return next(request);

        const outcome = await next({
          ...request,
          headers: [...request.headers, ["Authorization", `Bearer ${token}`]],
        });
        return outcome;
      },
    });
  },
};

$.star.use(sessionHeaders);
```

The definition ID is a lowercase local segment; jQStar qualifies it as
`acme.session-headers.authorization`. Optional `before` and `after` entries use complete qualified
IDs. Plugin dependency order, those explicit constraints, and stable registration order determine
the chain. The complete graph is validated before the plugin transaction commits.

Each callback receives a recursively frozen, data-only descriptor and a request-owned `AbortSignal`.
The descriptor includes the operation ID, method, serialized URL, normalized header tuples,
credentials, bounded body metadata, response target, selector, patch mode, and the selected profile.
It does not expose the body, form values, files, DOM, state, controller, `Request`, `Response`,
stream, or observation hub.

Middleware runs once per logical request, before the first attempt. Retries reuse its final URL,
headers, operation ID, and private body without running the chain again. A callback may change only
the same-origin path or query and add ordinary headers. Final validation rejects changes to origin,
URL credentials, fragment, method, credential mode, authored or protected headers, body metadata,
target, selector, patch mode, or profile before `fetch` runs.

Call `next()` at most once and return its exact outcome. `context.complete()` ends the request
successfully without network dispatch or response patching; the existing backend action result is
`undefined`. `context.cancel()` ends it as middleware cancellation. Throws and rejections keep their
original identity at the action boundary. Application or kernel disposal aborts the signal, closes
`next()`, and ignores late settlement. These rules are enforced by
`StarRequestMiddlewareValidationError` and `StarRequestMiddlewareNextError`.

Authorization remains application and server policy. jQStar does not store or refresh tokens, choose
authentication behavior, redact URLs or custom headers, or replace server-side authorization. The
example only connects an application-owned token provider to an outgoing header. A per-retry
signature or token refresh needs a separately designed dispatch-attempt stage; this middleware is
deliberately once per logical request.

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

Every action selects one protocol profile. The root package defaults to `core.datastar` for 0.1
compatibility. In that profile, GET puts filtered signals in a `datastar` query parameter. POST,
PUT, PATCH, and DELETE send a JSON body; DELETE also includes the query because the TypeScript SDK
reads it there. Signal names beginning with an underscore are private and are left out by default.
The request includes `Datastar-Request: true` and accepts SSE, HTML, and JSON.

Use `core.generic` for an ordinary endpoint that should receive only authored data:

```ts
await app.run(
  $.star.get("/items", {
    profile: "core.generic",
    params: { page: 2 },
  }),
);
```

| Profile         | Outgoing data                                                                                   | Responses                                              |
| --------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `core.generic`  | Explicit params, payload, or form only; no Datastar header, implicit signals, or SSE preference | JSON/`+json`, HTML/XHTML, or empty                     |
| `core.datastar` | Filtered signals and the stable Datastar header/query/body encoding                             | Generic responses plus Datastar hints and streamed SSE |

An explicit generic GET payload uses the `payload` query key. Other explicit generic payloads use a
JSON body. Without an explicit payload, generic requests do not serialize application state. The
generic profile ignores `datastar-*` response hints and rejects SSE; it emits `jquery-star:fetch`,
not `datastar-fetch`.

Trusted structural plugins can add profiles with `registrar.protocolProfile()`. IDs must be below
the plugin namespace. A profile prepares the request synchronously and declares non-overlapping
exact or structured-suffix media adapters. Each adapter receives immutable metadata, scoped patch
capabilities, and one exclusive text-or-stream body lease. Plugin batches validate and commit
profiles atomically with their other registrations. See [Backend integration](docs/BACKEND.md) for
the contract and an example.

Set `contentType: 'form'` to validate and submit the nearest form without signals. URL-encoded forms
use `application/x-www-form-urlencoded`. Forms with `enctype="multipart/form-data"` use `FormData`,
including file inputs. Use `selector` to choose another form.

The selected profile and response media type determine what changes:

| Response            | Result                                                                             |
| ------------------- | ---------------------------------------------------------------------------------- |
| `application/json`  | Deep-patch signals; `null` removes a signal                                        |
| `text/html`         | Morph elements by ID, or use the `datastar-selector` and `datastar-mode` headers   |
| `text/event-stream` | Apply `datastar-patch-signals` and `datastar-patch-elements` events as they arrive |
| `204 No Content`    | Finish without changing the page                                                   |

A JSON response can set `datastar-only-if-missing: true` to add defaults without overwriting
existing signals in `core.datastar`. Its HTML responses can use `datastar-selector`,
`datastar-mode`, and `datastar-use-view-transition`. `core.generic` uses only the action's authored
`target` and `mode`. HTML patch modes are `outer`, `inner`, `replace`, `prepend`, `append`,
`before`, `after`, and `remove`. Outer morphs preserve matching elements, focused controls, unsaved
input values, and existing jQuery handlers. Put `data-ignore-morph` on a subtree that the server
must not change.

HTML responses and Datastar element events run through one application-aware render transaction.
Before a node is removed, nested jQStar applications are destroyed from the inside out while the
outgoing DOM is still connected. Their requests, effects, listeners, directives, mount hooks, and
observers are released even when one cleanup fails. New directives and UI controllers are then
enhanced through their application and document observers.

Use `data-jqs-preserve` on an application root whose live client state must survive a morph:

```html
<section data-jqs-preserve>
  <!-- This subtree remains the same DOM and application instance. -->
</section>
```

Preservation is deliberately narrow. A direct `replace` or `remove` targeting an element that
contains a preserved root is skipped rather than silently moving or destroying that root.
`data-ignore-morph` remains the general Idiomorph escape hatch; `data-jqs-preserve` is the explicit
application-lifecycle contract.

External renderers use the host-neutral core adapter. It coordinates ownership but does not perform
the host's DOM mutation:

```ts
const transaction = renderAdapter.begin(outgoingBoundary, {
  preserveRoots: hostMatchedLiveRoots,
});

const retained = transaction.preservedWithin(outgoingBoundary);
transaction.beforeRemove(actualRemovalBoundary);
hostRendererCommits({ retained });
await transaction.commit([incomingApplicationRoot]);
```

Preserved roots must be connected, inside the outgoing boundary, and owned by the same document at
the start. `beforeRemove()` accepts multiple overlapping removal boundaries and releases each owned
application once, deepest first. Commit verifies every promised root is still the same connected
node, restores preserved focus, boots only explicit unowned incoming roots, and resolves after the
full enhancement barrier. Call `fail(error)` after a failed host mutation; it keeps the original
error while attempting all cleanup. A transaction is terminal after `commit()` or `fail()`.

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

The server can generate those events with the official SDK. No jQStar adapter is needed:

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
- `profile` selects `core.datastar`, `core.generic`, or an installed plugin profile.
- `pending` names a boolean signal. `error` names a signal that receives the final error message.
  These two options are jQStar extensions.
- `retry` is `auto`, `error`, `always`, or `never`. `auto` retries network failures. The defaults
  are 10 retries, a 1-second first wait, a multiplier of 2, and a 30-second maximum wait.
- `requestCancellation: 'auto'` cancels an older matching request from the same element. `cleanup`
  also cancels when that directive or element is removed. `disabled` allows overlap. An
  `AbortController` gives the caller direct control.
- `target` and `mode` override the HTML response headers.

The Datastar profile emits `datastar-fetch` and `jquery-star:fetch`; the generic profile emits only
`jquery-star:fetch`. Read `evt.detail.type` for `started`, `progress`, `retrying`, `finished`,
`retries-failed`, or `error`. Unknown Datastar SSE events are forwarded as `jquery-star:sse`.

Stream patches commit as complete events arrive. If a later event fails, earlier patches remain and
the request fails once. An explicitly enabled retry can replay that partial stream, so use an
idempotent endpoint or disable retries when duplicate effects are unsafe.

JavaScript can create the same actions without an attribute:

```ts
const app = $("#app").star("instance")!;
await app.run($.star.post("/items", { payload: { title: "Proof" } }));
await $.star.whenEnhanced();
```

`app.run()` waits for the response to be consumed. `$.star.whenEnhanced()` additionally waits for
all render transactions already in progress, MutationObserver delivery, directive and UI setup,
finite registered directive tasks, and the resulting reactive flush. Use it before reading DOM
created by an HTML or SSE patch. `$.star.nextUpdate()` keeps its narrower meaning: it waits only for
reactive effect scheduling.

An installation can be closed permanently with `$.star.dispose()`. Disposal rejects new work,
attempts every application, request, task, observer, listener, effect, subscription, hook, plugin,
and service cleanup, releases the document and expression-engine claims, and removes the installed
jQuery properties. It returns one frozen, JSON-safe report with `attempted`, `released`, `failed`,
and `remaining` resources by category and stable owner. Repeated calls return the same report. If a
cleanup fails, `StarDisposalError` aggregates every failure and carries that same report after the
entire sweep.

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

The trusted JavaScript engine compiles expressions with `Function`, so expression directives need
`unsafe-eval` in `script-src`. The exact shorthand `data-on:click="@removeItem"` does not compile
JavaScript and can be used under a stricter policy when the page does not use expression-based
signals, arguments, or bindings.

Never place untrusted text inside a directive. Treat directive values as source code, not as data.
The CSP engine means **no dynamic code construction** in its entry graph. It requires trusted markup
and trusted installed extensions, is not a sandbox, and does not make attacker-authored expressions
safe. It can still reach registered actions, reviewed real-jQuery operations, and the DOM. The page
policy, not jQStar, governs inline scripts, styles, network endpoints, third-party jQuery plugins,
and application code.

Select the CSP runtime before installing plugins or booting applications. Do not import the package
root on the same jQuery instance because the root retains the trusted compatibility engine.

```ts
import $ from "jquery";
import { installStarCSP } from "jquery-star/csp";
import { datastarPlugin } from "jquery-star/datastar";
import { uiPlugin } from "jquery-star/ui";

const installed = installStarCSP($);
installed.star.use([datastarPlugin, uiPlugin]);
installed.star.boot(document);
```

`installStarCSP()` is idempotent for an existing CSP installation and rejects a live incompatible
engine rather than replacing it. Separate jQuery/kernel owners can select trusted and CSP engines
independently. Use `createCSPExpressionEngine()` only when composing through the explicit
`jquery-star/core` engine seam.

A strict starting policy for the proof application is:

```text
default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; font-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'
```

Adapt destinations to the application. Importing `jquery-star/csp` does not add headers or relax a
policy. Inline scripts still need an application-owned hash or nonce if the deployment uses them.

The frozen [`jqstar-csp-expression/1` profile](docs/CSP_EXPRESSIONS.md) documents its grammar,
capabilities, limits, diagnostics, compatibility migrations, and threat boundary. The
[`/docs/csp/`](https://ignibyte.github.io/jqstar/docs/csp/) guide publishes the shorter consumer
version. The `jquery-star/csp` subpath ships as side-effect-free ESM and CommonJS with matched
declarations. Package quality runs the exact packed formats and a strict response-header proof in
Chromium, Firefox, and WebKit.

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
