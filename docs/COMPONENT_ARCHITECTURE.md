# jQStar component architecture

## Public contract

Component behavior uses `data-jqs`. Stable internal slots use `data-part`. Runtime state is
reflected in `data-state`. Appearance is allowed to change without changing those attributes.

Dialog `open`, Form actions, Collapsible and Accordion item actions, Menu and Context Menu actions,
and Toggle actions validate an explicit native element as the requested target. A nested control or
other wrong-kind element cannot redirect an explicit call to its nearby component. Matching roots,
selectors and implicit local actions retain their documented behavior. Form `set-errors` and
`clear-errors`, and Toggle `press`, recognize a first native element as a target before interpreting
their value arguments. A wrong-kind control cannot clear its nearby form's custom validity. Dialog
`close` instead takes an optional return value as its first argument.

Combobox, Tabs, Data Table, Chart, Tooltip, Carousel, Hover Card, Select, Popover and File Upload
named actions validate an explicit native root element before operating. A control or another
component's element cannot redirect the action to the component containing the caller. Their
documented selector and implicit local forms remain available. Tree item actions, Carousel `go` and
File Upload `remove` also accept a native component root followed by the item, slide or file value,
as their matching `$.star.ui` methods do.

A retained UI facade rejects calls after its installation is disposed, including after another
installation claims the same document. Keep the facade returned by the current installation. The
following controllers register cleanup with the kernel's Element scopes: Carousel, Countdown,
Message Scroller, Password Field, Number Field, Search Field, Rating, Clipboard, Code Block, Tabs,
Collapsible, Accordion, Dialog, Toolbar, Pagination, Sidebar, Toggle, Toggle Group, Stepper,
Editable, Log Viewer, JSON Viewer, Form, Resizable, File Upload, Sortable, Input OTP, Tags Input,
Tooltip, Hover Card, Popover, Dropdown Menu, Context Menu, Menubar, Color Picker, Time Picker, Multi
Select, Select, Combobox, Tree, Transfer List, Feed, Chart, Data Table, Questionnaire, Toast,
Calendar, Range Calendar, Date Picker and Date Range Picker. Explicit preserved roots and connected
moves retain their work; native removal releases it at observer delivery or before later scoped
acquisition. Countdown retains its absolute deadline for later re-enhancement. Cleanup releases
native listeners and pending work; copied results and serialization failures still settle without
updates to retired controllers. Dialog cleanup closes only modal state opened by this UI
installation. Sidebar releases its media-query listener and cannot reacquire a controller through
its shortcut during removal. Ticket 0006 tracks the remaining cross-cutting review and full
verification of this lifetime contract.

Form cleanup cancels queued reset and invalid notifications and releases handling for internal and
associated external controls. Explicit enhancement can acquire a detached form again after cleanup.
Resizable releases pointer listeners in their original window and returns its handles to idle,
including when pointer capture fails. File Upload preserves a current reset across unchanged
enhancement, while ignoring work for a replaced control or form. Sortable cancels its temporary
ordering on cleanup when the captured parts are still current; replacement parts retain their own
state.

Floating controller cleanup closes runtime-open panels without lifecycle notifications or focus
restoration, releases captured listeners and cancels hover, typeahead and long-press timers in the
window that scheduled them. Unchanged enhancement preserves pending interaction. Tooltip removes
only its generated description token. Open, close and selection callbacks cannot continue a retired
controller, including during native popover calls or replacement enhancement. Floating positioning
uses the component's own window dimensions. Automatic observer enhancement ignores nodes no longer
in its document; explicit detached enhancement remains available.

Color Picker, Time Picker, Multi Select, Select and Combobox own their native/form listeners and
pending reset timers. Cleanup cancels reset work in the scheduling window, and canceled resets or
work for removed/reassociated controls stay inert. Unchanged enhancement retains a current reset;
Select and Combobox also retain it while rewiring option listeners. Selection, query and clear
notifications stop after callback disposal. Multi Select cleanup preserves its selected/empty root
state, and Combobox cleanup preserves inline mode while hiding its panel. Floating choice controls
close siblings only in their own document.

Tree owns its row/item listeners and typeahead timer. Unchanged enhancement and connected moves
retain the search buffer; replaced rows/items acquire current bindings. Selection, expansion and
focus stop when callbacks dispose or replace the controller. Transfer List owns its native select
and button listeners, including reassigning a button's operation, and stops component/native event
chains at the same boundary. Its hidden form inputs belong to the component's document.

Feed owns its native listeners and IntersectionObserver. Retired or superseded observers cannot
activate More. Callback disposal stops loading, pending focus, scrolling and observer acquisition;
observer setup/teardown reentry retains only the current observer. Unchanged enhancement and
connected moves retain that observer. Boundary focus uses the owning document.

Chart captures its document and current table, plot, legend and status. It retains unchanged native
output across adoption, ignores parts below another controller, and commits its render signature
only after guarded output writes finish. Read-only before-render access cannot recursively render;
newer requests, changed parts/data and disposal stop older work. Interrupted output remains
retryable. Data Table keeps one listener set for current header/filter/pagination controls and
native selection. Its facade refreshes replaced parts; native events and named actions honor
cancellation and current disabled/inert constraints. Source/configuration changes and newer
page/filter/sort requests stop older sorting. Proposed sort metadata remains visible before
cancellation without committing rows. Adoption and reacquisition retain selected IDs, initial-only
selection seeding, weak row order, filter and authored disabled state. Invalid initial rows cannot
commit partial selection seeds. Both controllers dispatch events through the owning window and
reject the source installation's actions after adoption. Interrupted listener setup releases partial
bindings; cleanup attempts every captured removal and keeps any newer record acquired during
cleanup.

Questionnaire owns its root/button/form listeners and pending reset timers. Unchanged enhancement
retains a pending reset; replacement or form reassociation retires the old bindings and timers.
Default navigation, submitted state and native answers survive cleanup/reacquisition. Replacement
status nodes receive the live-region attributes. Disposal or a newer transition stops navigation,
skip, validation, answer events, focus/scrolling and submit continuation; canceled older navigation
cannot roll back newer state. Interrupted or reentrant listener setup keeps only the current
binding. Skip controls and reset scheduling belong to the questionnaire's document.

Toast owns captured listeners, dismissal timers and swipe capture. Scope cleanup freezes its
remaining display time for reacquisition; unchanged enhancement retains the current timer, pause
state and announcement. An intentionally dismissed node stays closed on re-enhancement. Pointer,
focus, window and visibility pauses compose, including when a new toast opens while paused. Canceled
swipe dismissal releases capture and resumes the remaining time when other pauses end. Announcements
have their own viewport scope and ten-second lifetime: ordinary dismissal retains them, while
cleanup of a live toast, its viewport or the kernel releases them. Dismissal stops after callback
disposal or newer work, including removal and focus recovery. Show and F8 use available targets in
the installation document, and focus recovery stays in that document. Failed generated toast
creation removes its partial markup. Native setup/cleanup reentry cannot leave extra bindings,
timers, capture or announcements.

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

The 0.1 `$.star.ui` member names, registered `ui.*` actions, and documented component event
contracts are part of the stable-for-0.x baseline. `quality/public-baseline.json` freezes the member
and action census; component semantic tests remain authoritative for targets, cancellation,
payloads, keyboard behavior, and state transitions. `jquery-star:model-write` is an internal
synchronization event and is not a public application event.

- `@ui.dialog.open('#selector', '#initial-focus-selector')`
- `@ui.dialog.close('return-value')`
- `$.star.ui.dialog.open(target, options)`
- `$.star.ui.dialog.close(target, returnValue)`
- `jquery-star:dialog:before-open`
- `jquery-star:dialog:open`
- `jquery-star:dialog:before-close`
- `jquery-star:dialog:close`

The two `before-*` events are cancelable.

Dialog reacquires its native listeners when adopted into another installed document. A preserved
remove/reinsert restores native modality without repeating public open events; a queued close event
from before reopening does not close the current state. Initial and return focus stay in the
dialog's owning document.

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
`<details>` and `<summary>`. Collapsible, Accordion, Editable and Stepper support independent
same-origin document installations and adopted roots. Their destination facades acquire current
resources before use, and source disposal cannot remove the new bindings. Component and synthesized
native events use the destination window. Unchanged enhancement retains exact native listeners.

Native summary clicks preserve pending toggle notifications through unchanged enhancement. A link
inside a summary keeps its native action. Accordion checks cancelable sibling permissions before
letting native named-details exclusion run; a later click cancellation leaves the siblings open. A
newer operation on any item supersedes an older pending Accordion request.

Tabs provide:

- `@ui.tabs.activate('#tabs-selector', 'tab-value')`
- `$.star.ui.tabs.activate(target, tab)` and `$.star.ui.tabs.value(target)`
- `jquery-star:tabs:before-change` and `jquery-star:tabs:change`
- Automatic activation by default and manual activation with `data-activation="manual"`
- Horizontal and vertical orientation with wrapping arrow-key navigation, Home, and End
- Roving `tabindex`, disabled-tab skipping, and stable `tab`/`tabpanel` relationships

`jquery-star:tabs:before-change` is cancelable. A matching `data-value` connects each trigger to its
panel and provides the stable programmatic value. Tabs, Toolbar, Pagination and Sidebar support
independent same-origin document installations and adopted roots. The destination facade acquires
its own current-part listeners before use; disposing the source installation cannot release them.
Component events use the destination window. Unchanged enhancement keeps the exact native bindings,
and Tabs retains manual roving focus. Newer requests, replacement parts, adoption or disposal stop
older callback continuations.

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

Toggle and Toggle Group support independent same-origin documents and adopted roots. Their records
capture resource ownership, retire old listeners before destination use and keep destination
bindings when the source is disposed. Unchanged enhancement preserves generated form inputs and the
current roving tab stop. Explicit empty patched values clear an optional group. Callback revisions
and current items/constraints prevent an old transition from undoing newer work. Group setup
releases provisional listeners if generating native form fields fails; native reset keeps its
current generated values.

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

Popover owns its current direct trigger/content in the installation's document. Facades and private
actions reacquire adopted roots, including after source disposal. Stable enhancement keeps listeners
and focus; adoption retains an open panel and its owned focus. Ordinary removal or disposal closes
silently. Generated title references follow owned current titles without replacing authored names.
An explicit initial-focus selector may reach an interactive control inside a composed component.

Canceled native opening stays closed. Facade calls read settled native state, including a close
immediately after an authored native show. Late toggle delivery reflects the actual panel state, and
callbacks that request newer state stop older show/hide, positioning, focus and notifications.
Previously canceled clicks, outside presses and Escape do not dismiss or activate the panel. Live
disabled and inert constraints apply to the root, trigger and native activation target. Preserved
render movement restores an open native panel; the render barrier retries an ineffective focus
restoration after enhancement only while the target and render are current and focus has not moved
elsewhere.

Tooltip provides:

- Hover and focus activation with `data-delay` and `data-close-delay`
- `@ui.tooltip.open|close('#tooltip-selector')` and equivalent methods under `$.star.ui.tooltip`
- `jquery-star:tooltip:before-open|open|before-close|close`
- Preserved `aria-describedby` tokens, `role="tooltip"`, Escape dismissal, and no focus movement
- Hover persistence across the trigger and tooltip content
- A validation error when tooltip content contains interactive controls

The `before-*` events are cancelable. Tooltip, Popover, and Menu share top-layer fallback and
four-sided collision-aware placement, but keep separate interaction models.

Tooltip binds direct trigger/content parts to their current document and reacquires adopted roots
through enhancement, facades and private actions. Stable enhancement keeps native listeners and the
original pending delay. Adoption retains open and pointer/focus activation state, cancels old timer
handles in their scheduling window and resumes the remaining opening or closing delay in the new
window. An already queued callback cannot override a newer request or replacement timer. Tooltip
does not move focus; ordinary removal/disposal closes silently and releases delayed work.

Description IDs follow current content IDs. Cleanup removes only the runtime's generated token and
preserves authored descriptions, including during cleanup-time reacquisition. Live disabled/inert
constraints and previously canceled or nested native interaction cannot open the tooltip. Native
opening cancellation, later toggle delivery and callbacks requesting newer state determine the
accepted state before positioning or notifications continue. Immediate facade close after authored
native show works before toggle delivery. Preserved render movement restores an open native panel.

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

Hover Card owns current direct parts and native listeners in its installation document. Enhancement,
facades and actions reacquire adopted roots while retaining open state, content focus and the
remaining interaction delay. Stable enhancement preserves its native listeners and pending timer.
Current owned titles supply generated names; authored names remain authoritative. Dismissal returns
focus only when it was inside the card and does not cause immediate reopening. A later deliberate
focus can open the card again. A departure timer cannot close a formerly connected card while its
preserved root is detached; explicitly detached activation remains supported.

Popover, Tooltip and Hover Card share native content ownership. If a native callback changes the
controller kind, the new owner keeps control of that exact content. Requests made during an
in-flight native call settle after it returns; positioning, focus and lifecycle notifications follow
native acceptance and the latest request. Cancellation or a newer request suppresses stale
completion work. Ordinary cleanup remains silent and releases pending work.

An external native popover hide or show updates each floating controller's reflected state when the
native `toggle` event arrives, without repeating its component open/close notification. Popover,
Hover Card and Dropdown Menu also update their trigger's `aria-expanded`; Tooltip and Context Menu
retain their own trigger semantics. Outside dismissal still closes an externally shown panel. Stable
Popover and Hover Card enhancement restores a runtime-open panel if its native overlay disappears,
retaining content focus and positioning it on viewport changes.

Dropdown Menu provides:

- `@ui.menu.open|close|toggle('#menu-selector')` and equivalent methods under `$.star.ui.menu`
- `jquery-star:menu:before-open|open|before-close|close|select`
- Menu-button trigger relationships and `menuitem`, `menuitemcheckbox`, and `menuitemradio` parts
- Arrow Up/Down, Home/End, wrapping focus, character typeahead, Escape, and outside dismissal
- Focusable `data-disabled` items that cannot activate
- Checkbox and radio state reflection plus opt-out of close-on-select
- Focus recovery when server morphing removes the active item

The `before-open`, `before-close`, and `select` events are cancelable. Menu uses the shared floating
primitive for top-layer fallback and placement while owning its composite-widget focus model.

Context Menu reuses the same item, checked-state, typeahead, dismissal, and focus-return engine
while changing only its invocation and placement boundary:

- Native `contextmenu`, Shift+F10, the Context Menu key, and touch long-press invocation
- Pointer-coordinate placement with viewport collision clamping
- `@ui.context-menu.open|close`, matching `$.star.ui.contextMenu` methods, and independently
  namespaced cancelable lifecycle and selection events
- Ordinary clicks on the context surface remain ordinary clicks

Both Menu kinds retain accepted open state, the focused item and remaining typeahead time when
adopted into another installed document. Context Menu also retains its point and remaining touch
long-press time. Stable enhancement preserves these resources. Facades reacquire replaced direct
parts and current items. Opening, selection and focus continuation recheck current ownership and
constraints after callbacks; a newer request supersedes older work. Canceled sibling closure keeps
the new menu closed. Native disabled items are excluded from keyboard exploration, while authored
ARIA/data-disabled items remain focusable without activation. `data-disabled="false"` stays enabled.
An external native popover toggle updates Menu state and `aria-expanded`; a canceled touch press
does not open Context Menu. Nested controllers and canceled native events retain their own behavior.

Menubar composes direct `data-jqs="menu"` children instead of creating a second popup-menu system.
It provides one top-level tab stop, horizontal or vertical roving focus, wrapping Arrow navigation,
Home, End, character typeahead, menu switching while a popup is open, and
`@ui.menubar.open|close|focus` with matching `$.star.ui.menubar` methods. For `open` and `focus`,
two action arguments mean target selector or element followed by menu value. With one string inside
a Menubar, a current direct-child menu value wins before selector lookup; a one-argument `#tools`
value therefore opens a local `data-value="#tools"` menu even when another Menubar has `id="tools"`.
Otherwise a selector matching a Menubar chooses that root, including one-argument actions outside a
Menubar. The static facade accepts the first matching Menubar in its owning document even if an
unrelated element matches the selector earlier. It rejects child Menu parts, missing/invalid targets
and elements from another document.

Menubar retains its roving value and remaining typeahead time across adoption, including when the
source installation is disposed first. Destination facades refresh child Menu ownership without
reopening the child or resetting item focus. A parent close supersedes a pending child opening;
newer parent requests stop older close loops and keyboard switches. Parent state and value reflect
accepted child state after cancellation. Current direct parts, inherited disabled/inert constraints,
and owned keyboard/lifecycle events govern navigation. Stable enhancement keeps listener bindings,
focus and deadlines intact.

Tree View provides:

- Derived `tree`, `treeitem`, `group`, `aria-level`, `aria-posinset`, and `aria-setsize` semantics
- Roving DOM focus with APG Arrow, Home, End, asterisk expansion, and character typeahead behavior
- Independent single or multiple selection, including Space, optional Shift+Arrow extension, and
  Control/Command+A over visible items
- Cancelable selection and expansion boundaries, activation events, and stable server-patched
  `data-value` / `data-expanded` state
- `@ui.tree.select|expand|collapse|toggle|focus` and matching `$.star.ui.tree` methods

Tree keeps selection independent from active exploration. Enhancement and adoption retain selected
values, expanded groups, the roving item and the remaining 500 ms typeahead interval, including when
the source owner is disposed first. Facades use the current item, row, label and group after part
replacement. Owning-window events, callback revisions and live constraints stop older selection,
expansion and focus work when callbacks choose newer state or patch the DOM. Control/Command+A
changes visible enabled items while retaining hidden and disabled selections. Composition, unrelated
modifier keys, nested controllers and native row controls keep their native behavior. Authored item
names and disabled state survive enhancement; removing data-disabled clears only generated ARIA.

Sidebar provides:

- `panel`, `content`, `trigger`, `rail`, and `backdrop` parts within one application-shell root
- Icon, off-canvas, and fixed modes through `data-collapsible`
- A mobile off-canvas boundary below 48rem with Escape, backdrop close, trigger focus return, and
  separate restoration of the desktop state
- Optional `data-storage-key`, a configurable Ctrl/Command shortcut, and server-patched
  `data-value="expanded|collapsed"`
- Cancelable `jquery-star:sidebar:before-change`, `jquery-star:sidebar:change`,
  `@ui.sidebar.open|close|toggle`, and matching `$.star.ui.sidebar` methods

Sidebar captures its media query and storage window from the current document. Adoption recalculates
mobile mode while retaining the desktop preference, including when the source is already disposed.
Entering mobile mode closes the mobile panel; returning to desktop restores that preference. Escape
and backdrop return focus only after an accepted close that remains current. A canceled close or a
change callback that reopens the panel preserves focus inside it.

Carousel provides:

- A labelled carousel region, grouped slides, position-based fallback names, live-status changes,
  and inactive slide hiding
- Previous, next, indicator, orientation-aware keyboard, and pointer-swipe navigation
- Optional looping and automatic rotation that pauses for focus, hover, user navigation, and
  reduced-motion preferences
- Cancelable `jquery-star:carousel:before-change`, plus `change`, `play`, and `pause` events
- `@ui.carousel.next|previous|go|play|pause` and matching `$.star.ui.carousel` methods

Unchanged enhancement retains Carousel's autoplay deadline, bindings and in-progress swipe. Explicit
user pause survives removal and later enhancement. A proposed slide is committed only after
`before-change` accepts it and remains current; newer selection or pause operations stop the older
transition. Normal focus recovery still emits `change`, while disposal or part replacement during a
callback stops subsequent events and scheduling.

On adoption into another installed document, Carousel recomputes native focus pause there while
retaining explicit user pause. Initial enhancement also respects focus already inside the root.
Unchanged enhancement writes button disabled state only when it changes, avoiding repeated
MutationObserver-driven enhancement in native browsers.

Programmatic named actions for Number Field, Time Picker, Rating, Toggle, Toggle Group and Toolbar
accept the component's native root element as an explicit first target, followed by the action's
value or amount where needed. The existing `#id` target and implicit value/amount forms still work.
An element marked as a different component is rejected instead of redirecting the action to a nearby
component. Their matching `$.star.ui` methods use the same element targets.

Input OTP `set`, Search Field `set`, Tags Input `add`/`remove`, Stepper `go`/`complete`, and Multi
Select `set`/`select` also accept their native component root element as an explicit first target.
Their `#id` target and implicit value forms remain available. A root marked as another component is
rejected; it cannot redirect the action to the component containing the caller. The matching
`$.star.ui` methods accept these native roots, and native form controls remain the value source.

Password Field and Sidebar single-target named actions validate an explicitly supplied native
element as that component's root. A different element is rejected even when the caller is inside a
matching component. Their `#id` and implicit local forms remain available.

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

File Upload keeps actual native File objects authoritative, including a new File with the same name,
size, type and modification time. Matching display metadata preserves generated rows and their
listeners. Native clearing, form resets and current form association update the same source.
Immediate destination enhancement or facade use retains files, rows and drag state after adoption;
source disposal cannot retire destination bindings. Native and component events use the owning
window. Canceled resets and newer requests stop older queued work and rollback. Drop and removal
stay inside the current controller; unavailable native controls and disabled fieldsets block facade
changes. The native single-file limit still applies when the root permits more files. Validation and
before-change callbacks cannot mutate private commit arrays or bypass current constraints. Native
DataTransfer writes retain FileList/FormData behavior; a failed write is never replaced with a
shadow files property. The native input remains the submitted value source.

Multi Select provides:

- A direct `<select multiple>` as the source for FormData, constraint validation, reset, disabled
  options, and server-patched option lists
- A labelled `listbox` with `aria-multiselectable`, distinct active and selected states, Space
  toggling, Arrow/Home/End focus movement, typeahead, and Control/Command+A
- Removable selected tags, optional `data-max`, cancelable changes, and JSON root `data-value`
- `@ui.multi-select.open|close|toggle|set|select|clear` and matching `$.star.ui.multiSelect` methods

Multi Select retains native selection/defaults, generated options/tags, active exploration and
typeahead through unchanged enhancement and adoption of the same native parts. Destination
enhancement or facade use reacquires resources immediately, including after source disposal.
Replacing the native control or content panel closes the former popup. Current native labels and
optgroup structure are reflected without overriding authored accessible names.

Disabled preselected options stay selected during UI/API changes and their removal buttons stay
disabled. Native writes and JSON `data-value` patches can still replace selection. Native FormData
omits disabled choices. `data-max` counts retained disabled selections, and Control/Command+A
toggles the available enabled choices within the remaining capacity. Clearing an ordinary required
selection is allowed; the native select then reports its missing-value validity. Composing, modified
selection keys and nested native text controls retain native keyboard behavior.

Newer selection/popup requests supersede older callbacks, including no-ops. Changes to native
selection, current parts, options, disabling or maximum constraints stop stale commits and later
notifications. Accepted resets survive unchanged enhancement; cancellation or newer work invalidates
queued reset notifications. Native popover cancellation leaves the component closed, and preserved
movement restores an open popup without another open notification or lost exploration.

Transfer List provides:

- Two labelled native `<select multiple>` controls for available and assigned options
- Add, remove, all-item, Enter, double-click, and explicit Move Up/Down routes through one state
  path
- Ordered repeated hidden inputs from `data-name` and JSON membership in `data-value`
- Disabled-option protection, cancelable changes, server-patched membership, and detailed added,
  removed, previous, next, and reason event data
- `@ui.transfer-list.add|add-all|remove|remove-all|set|up|down` and matching
  `$.star.ui.transferList` methods

An explicit native root element in any Transfer List named action is validated before operation; a
different component element cannot redirect the action to a nearby list. Selector and implicit forms
retain their existing value-array overloads.

Transfer List keeps assigned membership/order separate from native option highlighting. Stable
enhancement and adoption retain option nodes, highlights/defaults and generated hidden fields,
including when the source owner is disposed first. An explicit root `data-value` patch replaces
membership; otherwise current native membership remains authoritative. Native form reset restores
option highlights to their defaults and updates buttons without reverting assigned membership or
emitting synthetic membership events. Both native select form owners are tracked, including external
forms; canceled, superseded and retired reset work cannot resume.

Disabled native selects, inherited fieldsets and disabled roots block UI changes. Disabled options
retain their assigned membership through `set` and cannot be explicitly reordered; disabled assigned
options and unavailable components are excluded from generated FormData. Explicit HTML/root patches
can still replace membership. Authored button disabling survives rendering, and removing generated
disabling restores live controls. Cancelable events, current constraints and native input/change
callbacks cannot overwrite newer state. Event arrays are copies. Native option double-clicks, button
SVG descendants and ordinary Enter work; canceled events, composition and unrelated modifier
shortcuts retain native behavior. Parts and actions stay in the current controller/document. Native
buttons with the registry's `data-jqs="button"` styling marker remain owned Transfer List parts,
including SVG click targets. Nested controllers retain their own parts and actions.

Time Picker provides:

- A direct `<input type="time">` as the locale UI, validity source, and submitted `HH:mm[:ss]` value
- Earlier/Later controls that respect the native second-based `step`, `min`, `max`, disabled, and
  readonly state
- Preset buttons, invalid/change events, server-patched `data-value`,
  `@ui.time-picker.increment|decrement|set`, and matching `$.star.ui.timePicker` methods

Time Picker captures its native control, buttons, form and document. Enhancement or a facade call in
a destination document replaces the old bindings immediately; source disposal cannot release the
destination's listeners. Silent native edits survive adoption and source disposal. Unchanged
enhancement retains bindings and pending native reset work. Resets honor late cancellation and stop
after a newer request, while callbacks that change the control, its constraints or its ownership
stop the older transition. Stepping probes a cloned native time input and commits only the accepted
value. Nested Time Pickers keep their own preset buttons, and disabled fieldsets prevent facade
changes as well as native interaction.

Color Picker provides:

- A direct `<input type="color">` as the platform picker and submitted value
- An optional editable value and suggested swatches that use one normalization and cancelation path
- A preview, live status, server-patched `data-value`, `@ui.color-picker.set`, and matching
  `$.star.ui.colorPicker` methods

Color Picker retains native values/defaults, text drafts, selection, composition and invalid state
through unchanged enhancement and document adoption. Destination facade use acquires its own
listeners immediately; source disposal cannot release them. Native and component events use the
owning window. A lone `@ui.color-picker.set('#445566')` argument is a color; the explicit form is
`@ui.color-picker.set('#accent', '#445566')`. Modified or composing Enter leaves the draft alone. An
explicit native root element is validated as a Color Picker; a different component element is
rejected without changing the caller's nearby picker. The implicit one-color form still uses that
nearby picker. Native color parsing determines supported literal values, including alpha and color
space support. CSS-wide keywords and context-dependent colors are rejected. Disabled fieldsets,
readonly controls, nested controllers and authored disabled swatches retain their boundaries.
Current native values, root patches and newer requests supersede stale commits and canceled native
rollback. Form reset honors cancellation and newer work while preserving the native default value.

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

Select retains its generated options, exact listeners, typeahead buffer and uncommitted active
option through unchanged enhancement. An adopted root reacquires its destination's resources
immediately, preserving native selection and active exploration even when source disposal occurs
first. Source document handlers and cleanup cannot act on the new owner. Preserved removal and
reinsertion restores a retained runtime-open native popover without another component open event.
Canceling the native opening event also leaves the component closed.

Newer selection or popup requests supersede older callbacks, including same-value and already-open
requests. Changes to the native control, options, form or disabled constraints stop the old commit.
A canceled sibling close prevents another Select from opening, and a sibling callback's newer open
request takes precedence. Composing or modified typing stays native; an empty native selection
starts exploration at the first enabled option without committing it.

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

Combobox retains query drafts, text selection, composition and active-option exploration through
unchanged enhancement and document adoption. Destination enhancement or facade use reacquires the
native listeners immediately, including when source disposal happens first. Original query/value
reset defaults follow each native input's identity, so a selection does not become a new hidden
input reset default. Unchanged enhancement keeps pending accepted resets; cancellation and newer
operations invalidate them.

Newer native edits and select, clear or popup requests supersede older callback continuations.
Selection rechecks current option value, label, visibility and disabled state after before-select.
Readonly controls and disabled fieldsets prevent UI commits while native/model query writes still
update the displayed state. Composing and modified selection keys keep their native behavior.
Preserved native popovers reopen without a second component open event or lost exploration, and
native opening cancellation leaves the component closed. Switching to `data-inline` releases the old
native popup before showing the inline listbox.

Data Table provides:

- Native `table`, `caption`, `thead`, `tbody`, `th`, and `td` semantics without applying
  `role="grid"`
- Ordered column sorting through `data-key`, optional string/number/date comparison, Shift-click
  composition, primary-column `aria-sort`, announced sort priorities, `data-sort-order`, and a
  complete `sorts` event payload
- Local text filtering and page-size pagination, with page reset after sorting or filtering
- Current-page select-all, single or multiple row selection, and stable `data-row-id` state that can
  survive server row replacement
- `@ui.dataTable.sort|filter|page|next|previous` and equivalent methods under `$.star.ui.dataTable`,
  including `sorts(target)` and additive programmatic sorting
- `jquery-star:data-table:before-sort|sort|filter|page|selection-change`
- `data-processing="manual"` for server-owned filtering, sorting, and pagination

`before-sort` is cancelable. Client processing owns the complete local pipeline; manual processing
owns none of it. Mixing server pagination with client-only sorting or filtering would misrepresent
the full result set.

All four Calendar and picker families use document-safe element and Date checks. A moved root keeps
its day elements, selected value and roving focus when acquired by another installed document.
Picker facade access also acquires the child Popover, preserving its open state through source
disposal. Current grids, headers, status nodes, inputs, trigger labels and form associations are
resolved after replacement. Valid ISO years below 100 do not acquire a 1900 century offset.

Rendering guards live writes and caches only completed output. Newer requests, current-part/source
patches and disposal stop older work. Before-change cancellation and newly unavailable dates stop
selection; mutating event details cannot change accepted values. Native events and named actions
honor disabled/inert constraints, canceled activation and nested controller ownership. Direct APIs
retain programmatic availability. Picker native input/change notifications and component events stop
when a newer selection or direct field patch supersedes them. Form reset and the established
keyboard model remain unchanged.

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

Form captures its installation document and acquires listener cleanup before registering native
handlers. Adoption reacquires the destination scope without clearing native values or validity.
Operations snapshot the current native control associations, validation source and Field/message
parts, then check them after callbacks and live writes. Newer requests supersede older work before
argument getters and listener setup. Unchanged enhancement and read-only validity inspection retain
current pending work. Native resets keep microtask timing, honor cancellation and yield to newer
requests; native validation cannot publish an obsolete invalid notification after a newer request.

The native elements collection and reset/checkValidity/reportValidity methods are accessed through
the native Form prototype, preserving fields with those names. Component events use the current
window. Named actions support application-root targets and stay within their installation document.
Native submission and named actions honor canceled events and disabled/inert constraints. Direct
APIs retain programmatic access. Form remembers its own server message and description references
weakly per control, removes obsolete generated references after message replacement and preserves
authored references. On validating controls, a newer authored custom validity message survives
clearing the earlier server error. Disabled controls still support clearing owned server errors.

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

Number Field, Password Field, Search Field and Rating support independent same-origin frame
installations and adopted roots. A destination facade reacquires current native parts and resources
before use. The source installation can then be disposed without removing destination listeners.
Native values, Password Field visibility and Rating selection survive adoption; component and
synthesized native events use the destination window. Newer operations, replaced parts, adoption or
changed native values/constraints stop an older transition after its before-change callbacks.

Number Field, Search Field and Rating follow their native forms on reset. Reset work uses the owning
window, honors cancellation by later listeners and survives unchanged enhancement. Retirement,
form/control replacement and newer operations invalidate queued reset work. Number/Search Field
reset synchronization emits no input/change events; Rating retains its component change event.

Number Field re-enhancement resolves the current number input and increment/decrement buttons. Valid
part replacement releases the former native listeners and binds the new controls, so public APIs and
named actions affect the visible input. Unchanged parts preserve current values, native constraints
and a single listener set; old detached input/change/button events have no effect.

These fields keep the same progressive-enhancement boundary as Select, Date Picker, and Form: native
controls own platform behavior, while the component runtime coordinates only the additional buttons,
tokens, state hooks, and lifecycle contracts.

Password Field re-enhancement recognizes replacement control, toggle and status parts. It releases
listeners on the previous parts and binds the current native input without changing its value or
autocomplete. Repeated enhancement of unchanged parts preserves live Caps Lock status and one
listener set. Use `whenEnhanced()` after a patch before observing the completed component.

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
- Button Group and Split Button visual composition while each action remains a native Button; Split
  Button delegates its secondary actions to Dropdown Menu
- Input Group composition around a native input and File Input styling over the native file picker
- Native `<meter>` ranges with optimum, suboptimal, and low-value presentation
- Card anatomy through semantic `header`, content, and `footer` elements with stable `data-part`
  hooks
- Badge and Alert variants through `data-variant`, without inventing behavior or accessibility roles
- Avatar image or text fallback presentation with `sm`, `md`, and `lg` sizes
- Native `<hr>` separators and `<progress>` indicators with theme styling
- Decorative Skeleton placeholders whose shimmer respects `prefers-reduced-motion`

Label, Native Select, Input Group, File Input, Button Group, Split Button, Meter, Card, Badge,
Alert, Separator, Avatar, Skeleton, and Progress have no component runtime. Authors keep control of
the appropriate native element, label, live-region role, and document structure. The library
contributes only stable selectors, tokens, variants, and responsive presentation.

Navigation and command composition provides:

- Breadcrumb as a labelled navigation landmark with an ordered list and `aria-current="page"`
- Pagination as a labelled navigation landmark with native links plus current and disabled states
- Navigation Menu as ordinary site links with Popover-powered disclosure sections, deliberately
  avoiding application-menu roles
- Command Palette as a modal Dialog containing an inline Combobox listbox

Breadcrumb has no runtime. Pagination progressively enhances its native links with a current page,
page count, boundary state, optional manual-navigation mode, and a cancelable change lifecycle. Its
API exposes `page`, `pageCount`, `goTo`, `next`, and `previous`. Server-patched `data-page` and
`data-page-count` values are accepted by the shared enhancement pass. Modified and non-primary link
clicks retain native navigation without changing the current page, including in manual mode.
Pagination `page`, `next` and `previous` named actions validate an explicit native root element; a
wrong-kind element cannot move the caller's nearby navigation. Navigation Menu inherits Popover
behavior and lifecycle events. Command Palette inherits Dialog and Combobox behavior, including
focus return, Escape, filtering, `aria-activedescendant`, and explicit Enter selection.
`data-inline` keeps Combobox results inside a composition instead of promoting them to a separate
top-layer popover.

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
rendering API. `@ui.message-scroller.follow(root, false)` accepts a matching native root element,
while a lone boolean still controls the containing scroller. Both `follow` and `latest` reject a
wrong-kind explicit element rather than changing that nearby scroller.

Unchanged enhancement retains Message Scroller's observer and pending follow. Removal releases its
observer, listeners and timeout, while follow choice, unread count and known message identities
remain weakly associated with the root for later enhancement. An authored `data-follow` change
overrides the retained choice. Reentrant scrolling, native cancellation or lifecycle events cannot
resume an older operation or focus a retired viewport.

Both controllers own cleanup before native resource acquisition begins. Failed setup releases
earlier resources; a handle returned after retirement is canceled immediately. Cleanup attempts all
registered releases even when one throws, and reports setup and cleanup failures together.

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

Chart re-enhancement renders replacement plot, legend, status or table parts even when their data
and chart type are unchanged. An unchanged tree keeps its rendered content and emits no duplicate
render event. If `before-render` cancels a replacement render, a later enhancement can retry it.
Code Block updates its current code/status references during enhancement, so a pending copy
announces success or failure in the current status while retaining the text that operation copied.

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
- `doctor` checks the project manifest, jQuery and jQStar dependencies, configuration, and component
  directory.

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

- Button, Button Group, and Split Button
- Dialog, Alert Dialog, Sheet, and Drawer
- Field, Form, Label, Input, Input Group, File Input, Textarea, Native Select, Checkbox, Radio
  Group, Switch, Slider, Number Field, Password Field, Tags Input, and Input OTP
- Toggle and Toggle Group
- Collapsible, Accordion, and Tabs
- Popover, Tooltip, Hover Card, Dropdown Menu, Context Menu, and Menubar
- Tree View, Sidebar, Carousel, Toolbar, Stepper, Sortable List, and File Upload
- Multi Select, Transfer List, Time Picker, Color Picker, and Rating
- Message, Message Scroller, Search Field, Item, Feed, Questionnaire, Attachment, and Bubble
- Aspect Ratio, Chart, Direction, Marker, Table, and Typography
- Stat, Timeline, Status, Code Block, Browser Mockup, and Diff
- Clipboard and Editable
- Log Viewer, JSON Viewer, Countdown, Connection Status, Terminal, Radial Progress, Indicator, Dock,
  Swap, and Key Value
- Select, Combobox, and server-backed Autocomplete
- Calendar, Range Calendar, Date Picker, and Date Range Picker
- Data Table and Toast
- Resizable Panels and Scroll Area
- Card, Badge, Alert, Separator, Avatar, Skeleton, Spinner, Progress, Meter, Empty State, and
  Keyboard Key
- Breadcrumb, Pagination, Navigation Menu, Command Palette, and Async Form
- Operations Dashboard as a multi-file block with source-owned markup and typed actions
- Profile Settings as a multi-file native form, persistence, and invite workflow
- Project Browser as a multi-file Search Field, Data Table, Pagination, and Datastar SSE workflow
- Access Manager as a multi-file native select, Transfer List, Split Button, and persisted Datastar
  SSE workflow
- Audit Log as a multi-file Search Field, Data Table, Pagination, and access-history workflow

This 109-item source catalog contains 102 component recipes and seven composed blocks. It is
registry-backed and source-owned. Domain-heavy additions can build on these contracts without
changing the public anatomy.

## Clipboard and Editable

Clipboard resolves its source at copy time, so native input and textarea values do not become stale.
The component sends plain text to `navigator.clipboard.writeText`, uses the legacy selection
fallback only when the Clipboard API is absent, and announces copied or error state through an
authored live status. A cancelable `before-copy` event lets an application enforce its own policy
before browser clipboard access.

The legacy clipboard fallback removes its temporary textarea after selection or copy succeeds,
returns false or throws. Copy failures still reach the component's error state and caller; authored
textarea controls remain connected.

Clipboard and Code Block read current source, trigger and status parts through the owning document.
Their public facades and named actions work in another window without borrowing ambient browser
APIs. They preserve authored status text and description tokens during enhancement; replacement
parts receive current accessibility metadata. Code Block retains its authored initial state.

Both controllers recheck inherited native, ARIA, data-disabled and inert constraints after
before-copy callbacks. A newer request supersedes an older callback continuation. Accepted browser
work keeps its original text and caller result, while only the latest accepted task can publish a
result. Adoption transfers pending work to the destination controller in either disposal order;
Clipboard also retains the remaining reset delay. Ordinary removal or disposal retires output
publication and releases the temporarily disabled Clipboard button. Preserved roots may complete a
pending copy while temporarily detached.

The native Clipboard API and legacy selection fallback belong to the root's window. Capability
lookup and fallback steps stop if callbacks retire that owner. Temporary fallback textareas and
button/reset resources are released even when setup or cleanup throws. A rejected native write
remains an error; it does not trigger a second legacy copy attempt.

Form bindings follow the native control's current form after re-enhancement. Search Field, Rating,
Color Picker, Time Picker, File Upload and Multi Select release the previous form listener when
controls are replaced, components move between forms or a control's `form` attribute changes. An
unchanged controller keeps its current native value when only the form changes; repeated enhancement
does not duplicate submit or reset listeners.

Editable keeps the authored native control connected and named in both display and edit modes.
Adoption preserves the committed value, editing draft and native selection, even after source
installation disposal. Composing keys retain native IME behavior, and a textarea uses modified Enter
for commit. Validation, change and focus callbacks cannot let an older operation overwrite a newer
value or return focus from an editor that was reopened. Its preview is a text-only projection of the
committed value. Enter commits single-line controls, Command+Enter or Control+Enter commits a
textarea, and Escape restores the last committed value. Native `checkValidity()` and
`reportValidity()` run before the cancelable change lifecycle. Component state updates are
idempotent because `data-value` is observed by the shared enhancement pass. Editable
`@ui.editable.edit`, `commit` and `cancel` validate an explicit native root element; a wrong-kind
element is rejected without changing the caller's nearby editor. Their implicit forms still use the
containing Editable root.

## Project Browser

Project Browser keeps its search input, owner and status facets, page-size, grouping and view
selects, table, row-selection checkboxes, column controls, inline edit forms, and page links as
native HTML. Pagination emits the requested page, and Data Table emits the ordered sort array. The
copied typed action module sends complete page or virtual-window state as Datastar signals to
`/api/demo/projects`. The backend allowlists every facet, sort, group, and size before querying the
migration-managed SQLite store.

The official SDK patches `#project-browser-rows`, replaces `#project-browser-pagination`, and
updates canonical count, range, filter, page/window, sort, group, and message signals. Stable
`data-row-id` values let Data Table retain selection across page and window patches, queries, sorts,
groups, and edits.

Group header rows report server aggregates and collapse their following project rows. Project rows
expand to a semantic companion row containing the description, stored version, and edit form.
`PATCH /api/demo/projects/:id` uses the form's expected version; a conflict reloads the canonical
row, announces the failure, and focuses the refreshed editor.

The block persists column visibility, order, and left pinning in a normalized versioned layout. It
reapplies the layout after patches, supports drag/drop and move buttons, and keeps selection and
Project columns visible. Virtual mode renders at most 80 fixed-height rows plus spacers for the
complete result height, with grouping and expansion disabled. Each root owns one current query
controller across controls. Superseded queries and save refreshes cannot finalize the current UI
state. Pending edits keep loading active.

## Access Manager

Access Manager keeps the member picker and both permission lists as native controls. Transfer List
emits ordered membership, and the copied typed action module sends that state to `/api/demo/access`.
The backend stores one assignment per member, replaces `#access-manager-permissions` with official
Datastar SDK element patches, and patches the count, member, message, and permission signals. The
same source block therefore proves local edits, ordinary FormData values, server reload, and
persistence without a component-specific request client.

## Audit Log

Audit Log keeps its member filter, search input, table, and page links as native HTML. Successful
Access Manager writes record the actor, member, ordered result, permission delta, timestamp, and
revision in server-owned history. The save action emits `jquery-star:access-manager:saved` only
after the backend request succeeds. Audit Log listens at the window boundary and refreshes through
`/api/demo/access/audit`, where the Datastar SDK patches filtered rows, Pagination, and result
signals. Either block can still be copied and used alone.

Disclosure re-enhancement binds the current direct summary and content in the owning document.
Replacing those parts removes the old summary's exact click and keyboard listeners before binding
the current summary. Detached old summaries cannot request changes on the current disclosure after
enhancement. Exact cleanup is owned before listener registration, failed cleanup still releases
later listeners, and a record acquired during old cleanup remains current.

Editable re-enhancement resolves current display, preview, editor, native control, edit button and
status parts. Outside editing, a changed explicit root value wins; otherwise it adopts the current
native value. During editing it retains the committed value and current draft, applies editing mode
to current parts, and binds native commit/cancel keys to the current control. Detached old controls
are inert after enhancement. Event detail continues to expose the native element as `control`.

Tabs re-enhancement retains unchanged trigger listeners and replaces them when a trigger, panel or
value changes. A renamed `data-value` takes effect for click, focus and keyboard activation. Current
panel replacement updates ARIA and activation output without retaining old callback data.

Dialog re-enhancement refreshes the title/description associations it generated when parts change.
Removing a part removes its controller-owned reference. Explicit authored `aria-labelledby` and
`aria-describedby` values remain under application control; an authored `aria-label` removes only a
previous controller-generated title reference. Native Dialog listeners remain registered once.

Input OTP and Tags Input resolve current native controls, output containers and status parts.
Unchanged enhancement retains their exact listeners, generated slots/tags and hidden form fields.
Replacing parts or adopting the root retires the old record and acquires current resources in the
destination document. Facades and private actions accept their owning frame's roots; former facades
reject moved targets. Native input, draft selection, tag values and composition behavior survive
adoption. Generated children and events use the owning document/window. A replaced Tags Input list
renders values even if it inherits an old cached signature; native `<ul>` and `<ol>` use `<li>`
tags.

Input OTP follows its current native form on reset, synchronizes its value/slots without input or
change events, honors reset cancellation and invalidates queued work after replacement, adoption or
newer edits. Unchanged enhancement retains pending resets and completion notifications. Input OTP
and Tags Input check current ownership, parts, constraints and operation revisions after callbacks;
older work cannot overwrite a newer value, draft, status or completion. Native form resets preserve
Tags Input's current generated values while resetting its draft according to the native default.

## Runtime control-plane components

Log Viewer keeps authored `<ol>/<li>` semantics while placing `role="log"` and live-region state on
the scrolling viewport. Its API appends text-only structured entries, trims to `data-max`, filters
by minimum severity, and separates pause from data receipt: pausing disables announcements and
follow scrolling but does not discard incoming server entries. Datastar can append the same
source-owned `data-part="entry"` markup directly. The shared enhancement observer notices the new
element and resynchronizes the owning viewer; there is no Log Viewer observer.

Re-enhancement updates Log Viewer's current entries, viewport, filter, pause button and status while
preserving paused/following state. Old native filter and scroll listeners are removed before current
parts are bound. Facade reads and writes also resolve replacement parts. Unchanged enhancement keeps
existing native bindings. Deferred following uses the owning window and scrolls the current viewport
only while the root is connected, following remains enabled and the viewer is unpaused. Adoption
preserves pause/follow state and reacquires listeners in the destination document, even when the
source installation is disposed first. Ordinary removal retires listeners and queued scrolling;
preservation allows incoming data during a temporary detach. Trimming capacity does not reuse
generated entry IDs. Log Viewer named actions validate explicit native root elements before changing
pause, filter, follow or entries; a wrong-kind element cannot redirect them to a nearby viewer.

JSON Viewer renders one `application/json` script into nested native `<details>` branches and
text-only leaf nodes. The source, current parts, effective `data-max-depth` and `data-expanded`
settings determine whether the projection needs refreshing. Its own mutations do not rerender an
unchanged tree. Native open and closed branches are retained by path; an explicit expansion setting
can override them. Adoption reacquires document ownership while preserving an unchanged tree and its
disclosure state.

`set()` serializes API values through the same source boundary. Circular values fail before the
existing document changes. A newer request during serialization, initial enhancement or DOM work
supersedes the older continuation. Serialization failures still reach their callers, but superseded
work cannot publish an error over newer output. DOM failures remain DOM failures and allow a later
render retry. JSON parse failures alone produce the invalid-JSON projection. Disabled and inert user
controls cannot invoke either viewer's named actions; Log Viewer pause continues to affect
announcements and following independently of incoming data. JSON Viewer expansion actions likewise
validate an explicit native root element and reject a different component element without changing
nearby disclosure branches.

Re-enhancement resolves JSON Viewer's current source, tree and status. Replacing any of those parts
refreshes the current rendered result, including parse errors. Empty and whitespace-only sources are
normalized to `null` before comparison, so repeated enhancement of unchanged empty input renders
once and retains its existing tree.

Countdown instances register with one shared interval per owning document. The shared tick removes
disconnected or completed records and clears itself when no running instances remain. Pause stores
remaining time without another timer; resume derives a new absolute deadline. The visible values are
ordinary authored parts, and only the completion status uses a polite announcement so screen readers
are not interrupted every second. Countdown start, until, pause, resume and reset actions validate
an explicit native root element; a wrong-kind element cannot pause or retarget a nearby timer.

Countdown re-enhancement refreshes its current time/value/status parts while preserving the running
or paused deadline state. A running countdown removed from the clock on a disconnected tick is
scheduled again after reinsertion and enhancement. Repeated enhancement keeps one shared interval;
paused and completed countdowns stay off the clock.

Countdown owns a provisional interval before native scheduling begins. Reentrant enhancement shares
that interval; retirement cancels a handle returned after cleanup, and setup failure releases every
participating owner. Cancellation detaches the old interval before calling the platform, allowing
newer work to acquire its replacement. Late callbacks from superseded intervals do nothing.

Each tick captures its participating owners and operation revisions. A completion callback that
disposes a controller, changes its parts or restarts a Countdown stops older work from overwriting
the new state. Start/reset/resume/pause continuations also stop after retirement or newer
operations. Native adoption retires the old document's scheduled work; completion events use the
owning window's event constructor. Weakly retained deadlines and pause state survive scope cleanup
and reinstallation.

Connection Status, Terminal, Radial Progress, Indicator, Dock, Swap, and Key Value have no component
runtime. Their public state is semantic HTML, data attributes, ARIA values, and CSS variables. The
control-plane demo composes all ten components around `/api/demo/runtime` and the SDK-generated
`/api/demo/runtime/stream` route, proving the same application under Vite and the self-hosted Node
server.

## Self-hosted proof backend

`server/api.ts` owns the demo API routes used by both the Vite middleware and the production-shaped
Node server. `server/index.ts` adds safe static-file resolution, cache policy, security headers,
health checks, and graceful shutdown. `npm run test:self-hosted` builds the library, site, and
server, starts the bundled process on an ephemeral port, and verifies the rendered application,
runtime snapshot, Datastar log stream, Project Browser stream, Access Manager persistence, Audit Log
history, and browser-applied backend contracts.

The expression runtime currently uses dynamic function compilation. The self-hosted Content Security
Policy therefore permits `unsafe-eval` for scripts while keeping scripts same-origin and blocking
objects, framing, and foreign base URLs. A stricter policy requires a precompiled or replaced
expression compiler; named actions alone are compatible with that future boundary.

Shared mechanics stay below the public contracts: components reuse floating placement and top-layer
fallback, while each interaction model keeps its own focus, dismissal, state, and event semantics.

### Replacing rendered file and selection parts

Re-enhancing File Upload renders the current native file selection into a replaced or newly added
`data-part="list"`. Multi Select renders current selected values into a replaced `data-part="tags"`
and refreshes tag labels and removal-button disabled state when native options change. Unchanged
parts and values keep their rendered children. Replacing an open Multi Select native control or
content closes and releases the former controller before binding the replacement, including its
floating content and search timer; ordinary close cancellation does not retain that former owner.

Rating, Color Picker and Time Picker also ignore queued native reset callbacks belonging to
controllers whose native parts have since been replaced. Completing enhancement protects the new
control's current value from the former controller's pending reset. Reset callbacks still apply to
the current controller, including unchanged enhancement.

### Native Form association and current floating titles

Form operations include native inputs, selects and textareas associated by the browser, including
controls outside the form with a matching `form` attribute. Native validity, first-invalid focus,
server errors, Field messages and reset use that current association. External native invalid, input
and change events update the enhanced form through its document host; reassociated controls follow
their new form. Contained controls keep their local form event behavior.

Popover and Hover Card refresh their generated title reference after title or content replacement
and enhancement. Removing a title removes its owned `aria-labelledby`; adding an `aria-label`
removes a previous generated reference. Different authored `aria-labelledby` values remain under
application control. Open state, trigger behavior and current content events are preserved.

### Deferred message scrolling and current Feed article labels

Message Scroller checks current following state and root connection before automatic scrolling
queued by initial enhancement or appended messages. A reader's native scroll-away action therefore
keeps its position. Explicit latest/follow operations retain their immediate behavior, and replacing
parts cancels the old controller's pending work.

Feed synchronizes the title/description associations it generated for each current article after
part changes. Removing parts removes their owned references; different authored ARIA remains under
application control, and an authored aria-label removes a generated title reference. Positions,
set-size, loading/cursor state and application-owned result HTML keep their existing roles.

### Resizable replacement and exact Transfer List values

Resizable validates current panels and handles on enhancement, refreshes native key/pointer bindings
when those parts change and cancels the old drag session. Unchanged enhancement preserves an active
drag. Window pointer listeners exist only during a drag and release on completion, cancellation,
replacement or a movement observed after disconnection. Current public sizing and keyboard actions
update current parts. Each controller uses its installation document for target resolution, native
brands, events, storage and window listeners, including after adoption. Intent starts before input
iteration. A newer request or source patch stops older writes, persistence and notifications; event
size arrays are copies. Native and named operations honor canceled events and constrained origins.
Generated IDs avoid document/subtree collisions and authored labels remain intact.

Transfer List compares ordered value arrays without treating characters inside a value as array
separators. Accepted option strings retain their exact value in native options, generated hidden
inputs, root-patched state and public change events.

Stepper retains completed steps and its finished state across adoption, including when the source
installation is already disposed. Unchanged enhancement keeps the roving focus stop. Before-change
events describe the proposed destination; the controller commits selection and completion only after
acceptance. Native validation and completion callbacks are checked for newer operations and current
parts. A constraint changed during before-change is validated again before advancing.

### Canceled Stepper and Menubar transitions

Canceling a Stepper before-change preserves its completed state as well as its selected step and
completed values. Later enhancement reflects that preserved state. Menubar close requests honor a
child Menu's canceled before-close: its root state, value and active trigger reflect any child that
remains open. Accepted transitions keep the existing behavior.

### Sortable current preview parts and exact order

Each Sortable reconciles only hidden inputs owned by its closest Sortable root. Nested controllers
keep independent native form values and stable generated inputs when an outer order changes or its
submission name is removed, including when both controllers use matching names and values.

Sortable preserves an active preview across enhancement while the same list and item identities
remain, including the preview's own reordering. Replacing the list or item membership rebinds an
idle controller to current parts and releases detached callbacks. Ordered value comparisons keep
characters within each item value distinct from item boundaries, including public movement,
root-patched ordering, dropping and canceling a preview. Facade reads observe patched state and
replacement parts. Patched order supersedes a preview; unchanged enhancement retains its listeners.
Native list-background drops work, and an Up/Down button ends a preview before committing its move.
Keyboard reordering restores focus only when native movement left focus on the document body.
Navigation keys retain their native behavior until an item is grabbed.

Native dragging begins on an enabled item handle and publishes its value as plain-text drag data
with a move effect. Dragging over an item reorders the visible preview while the repeated hidden
inputs keep the previously accepted order. A drop on an item or the list background commits the
preview through cancelable `before-change`; a veto restores the old order and reports it in `drop`.
Ending a drag without a drop restores the old order and emits `cancel`. Nested controllers cannot
start an outer Sortable drag.

The installation document owns target resolution and event constructors. Named action arity
separates implicit values beginning with # from explicit selectors or native element targets. Newer
requests, source changes and disposal interrupt rendering and the component/input/change
notification chain. Event value arrays are copied. Native and named interactions honor cancellation
and constrained origins. Generated identifiers are unique without replacing authored IDs or label
associations.

### Current labels and native part replacement

Generated Menu, Select, Combobox and Toast names follow current parts and native labels. Switching
between a label reference and fallback text removes the obsolete generated attribute. Different
authored ARIA remains intact, including Questionnaire descriptions. Dialog, Feed, Popover and Hover
Card use the same ownership rule. Opening Menu, Select or Combobox closes eligible siblings only in
the same document; cancelable close behavior remains available.

Select and Combobox apply native resets after the reset event completes. Canceled resets and queued
work whose controls or form association have changed cannot overwrite or notify replacement parts.
Questionnaire releases replaced navigation buttons, ignores superseded/canceled native reset work,
and preserves submitted state after canceled navigation. Reset selects the first enabled current
question when its original default item has been removed.

Inserted Combobox options and Tree items receive distinct generated IDs without renaming current or
authored nodes. Disabled Tree items cannot activate. Data Table bulk selection counts and changes
only enabled native row controls, while selected IDs remain available across manual page changes.
Initial checked rows seed selection once; later replacement markup does not seed new selections.

Date Picker and Date Range Picker bind and notify their current native controls and Calendar parts.
An empty replacement grid is rendered even if it copied an old cache marker; unchanged grids keep
their day nodes. Pending focus is ignored after control, calendar or Popover ownership changes or
the Popover closes. Calendar selection and Popover cancellation keep their existing public events.

Calendar and both picker compositions release captured listeners when their scope retires, including
while outgoing nodes remain connected during a render. Re-enhancing unchanged parts retains day
nodes, picker bindings and intended queued focus. Reacquisition preserves the month, selected values
and roving focus. Calendar creates days and handles native keyboard focus in its owning document.
Disposal, replacement or newer transitions from selection, month, native input/change or component
callbacks stop older notifications and focus work. Picker listeners and child Calendar/Popover
resources have separate owners; an outgoing child cannot be reacquired through its live picker.

Date Picker and Date Range Picker synchronize Calendar selection and labels after an uncanceled
native form reset without emitting selection events. Replaced controls, form reassociation, disposal
and newer selections invalidate pending reset work. Empty native values remain empty through
enhancement and reacquisition. Calendar attributes seed an empty native control only on the first
successful enhancement; subsequent enhancement uses current native values. Reversed range endpoints
are normalized together in the two inputs and Calendar.

### Questionnaire document and request ownership

Questionnaire retains native answers, default navigation and submitted state when moved to another
installed document. Its facades refresh replaced fieldsets, controls and buttons, and named actions
can target the application root. Parts inside another controller do not become Questionnaire parts.
Events belong to the current window, and a field named `requestSubmit` does not replace the native
submission method used by the API.

Newer requests supersede older native writes, notifications and pending resets. Read-only inspection
during `before-change` exposes the proposed value without committing the DOM; cancellation retains
the prior navigation and submitted state. Native activation honors canceled events, disabled/inert
ancestors and inactive questions. Direct APIs remain available for programmatic changes. Rendering
preserves authored disabled buttons, native validation, form values and description references.

Each request captures current form/part identities, native values/defaults and authored constraints.
Expected native writes update that snapshot before mutation; callbacks that replace parts, patch
values, change constraints/defaults, dispose the owner or start another request stop the older
continuation. Radio-group changes retain native exclusivity. Runtime navigation limits are tracked
separately from authored disabled buttons. Hidden questions carry the native inert attribute, and
fieldset focus uses an explicit tabindex even when the property already reports minus one.

Reset retains its owning-window timer and cancelable native behavior. Unchanged enhancement keeps
that timer; newer explicit requests supersede it. The native Form prototype performs requestSubmit
with the current associated submit button. Listener setup is provisional, and cleanup reentry can
retain a newer record. These contracts preserve validation during form capture before application
request handlers and ordinary FormData serialization of fixed, freeform and skipped answers.

### Toast current-document operations

Toast resolves genuine native elements and named targets within its installation document, including
the application root and controls adopted from another window. The old installation cannot operate
the adopted Toast. Current parts, viewport, source attributes, labels and constraints are checked
after callbacks and live writes. Replaced controls become inert before enhancement. Unchanged
enhancement retains listeners and does not cancel a dismissal started by the application.

Native and named interactions honor cancellation, disabled and inert ancestors. Named clear skips
constrained targets, and named show does not append into a constrained viewport. Direct APIs retain
programmatic access; default direct show still selects the first viewport. Focus movement within the
Toast keeps its timer paused. Dismissal stops if cleanup changes the parent, and recovery focus
cannot cross into a different document. Announcements keep their separate viewport-owned expiry.
Authored labels are preserved and generated references follow current title/description parts.

### Feed current-document operations

Feed acquires native parts within its installation document, including adopted controls and named
actions targeting the application root. Its state facade refreshes direct cursor, done, loading and
error patches. Current parts, article identities, labels, source attributes and ancestor constraints
are checked after application callbacks and live writes. Read-only state inspection during
before-load sees current attributes without superseding that request. Newer explicit requests and
option-getter reentry stop older writes, notifications and pending focus.

The native More button remains the application loading boundary. Before-load cancellation also
prevents the authored click action. Named actions honor native and jQuery cancellation and target
constraints; direct completion/reset/failure/focus retain programmatic access. Failure actions keep
the existing ID-selector-only form with the default message. PageUp/PageDown traverse current
articles, PageDown at the end can load and focus an appended article, and Ctrl+Home/End use the
owning document's surrounding focus targets. Nested controllers retain their keyboard events.

Unchanged enhancement retains listeners and an automatic observer. Patching data-auto or done
reconfigures observation. Explicit completion/reset retain their existing observer replacement
behavior. Setup owns provisional listeners and observers before acquisition; disposal during native
registration retires late handles even when registration then throws. Authored disabled/hidden More
buttons remain constrained through loading, completion and reset. Generated article references
follow current direct items and their title/description parts without replacing authored labels.

Feed generates identifiers only for parts without authored IDs. It prefers the existing identifier
shape and chooses an unused suffix if that name already exists in the document or detached Feed
subtree. This keeps article/title/description references distinct after removal, prepending and
appending while preserving existing article identity and native accessible-name lookup.
