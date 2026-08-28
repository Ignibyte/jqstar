# Component system research

Research snapshot: August 28, 2026.

The useful systems fall into four groups. Full styled libraries prove component coverage. Headless
libraries prove behavior and accessibility. Tailwind libraries prove theming and composition. Source
registries prove distribution. jQuery Star needs one idea from each group instead of copying any one
library.

## Popularity snapshot

The numbers below are npm downloads for August 20–26, 2026, retrieved from the official npm
downloads API. They are a rough reach indicator, not a user count. Transitive dependencies inflate
some packages. Radix Dialog is the clearest example, so its number should not be compared directly
with monolithic packages.

| System      | Measured npm package         | Weekly downloads | What it represents                              |
| ----------- | ---------------------------- | ---------------: | ----------------------------------------------- |
| Radix UI    | `@radix-ui/react-dialog`     |       73,066,557 | Headless accessible primitives                  |
| Material UI | `@mui/material`              |       10,297,200 | Full React component system                     |
| Headless UI | `@headlessui/react`          |        7,138,733 | Unstyled React/Vue behavior                     |
| Bootstrap   | `bootstrap`                  |        6,444,374 | Framework-neutral CSS and JavaScript            |
| Ant Design  | `antd`                       |        3,719,762 | Enterprise React components                     |
| Mantine     | `@mantine/core`              |        2,465,628 | Full React component system                     |
| Chakra UI   | `@chakra-ui/react`           |        1,775,184 | Styled primitives and compositions              |
| daisyUI     | `daisyui`                    |          987,998 | Tailwind semantic component classes             |
| Flowbite    | `flowbite`                   |          645,890 | Tailwind components with data-driven JavaScript |
| Fluent UI   | `@fluentui/react-components` |          375,837 | Microsoft design system components              |
| Shoelace    | `@shoelace-style/shoelace`   |          139,916 | Framework-neutral web components                |

## Patterns worth adopting

| System                                                                             | Pattern to adopt                                                                                                          | Limit we should avoid                                |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| [Radix Primitives](https://www.radix-ui.com/primitives/docs/overview/introduction) | Stable component parts, explicit state attributes, focus management, keyboard contracts, controlled and uncontrolled APIs | React-only component implementation                  |
| [shadcn/ui registry](https://ui.shadcn.com/docs/registry/getting-started)          | Copyable source, registry dependencies, blocks, and framework-neutral file distribution                                   | Treating copied React source as our runtime          |
| [Bootstrap](https://getbootstrap.com/docs/5.3/getting-started/javascript/)         | HTML data APIs, namespaced lifecycle events, programmatic methods, instance cleanup, and a no-build path                  | A second JavaScript plugin system beside jQuery Star |
| [Tailwind CSS](https://tailwindcss.com/docs/theme)                                 | CSS theme variables, static compilation, and user-owned customization                                                     | Utility class strings as the behavioral API          |
| [daisyUI](https://daisyui.com/)                                                    | Semantic CSS classes and many swappable themes                                                                            | Making daisyUI class structure mandatory             |
| [Headless UI](https://headlessui.com/)                                             | Behavior and accessibility independent from appearance                                                                    | Restricting the library to React or Vue              |
| [Material UI](https://mui.com/material-ui/getting-started/)                        | Broad coverage, consistent variants and sizes, documentation depth                                                        | CSS-in-JS and React peer dependencies                |
| [Ant Design](https://ant.design/docs/react/introduce/)                             | Data-heavy components, forms, internationalization, and enterprise states                                                 | Large all-or-nothing runtime assumptions             |
| [Chakra UI](https://chakra-ui.com/docs/components/concepts/overview)               | Reusable compositions and complete form anatomy                                                                           | Styling through JavaScript props                     |
| [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/)                          | The reference component behavior checklist for our tests                                                                  | Inventing keyboard behavior from visual examples     |

## Resulting direction

jQuery Star owns behavior, component anatomy, state attributes, and events. Tailwind 4 compiles the
official theme. Consumers can use the compiled CSS without installing Tailwind. A later daisyUI
adapter can map the same behavior to daisyUI classes. The root shadcn-compatible source registry now
distributes framework-neutral HTML recipes and can later include CSS, TypeScript, tests, and backend
examples.

The first proof contains Button, Dialog, and the native form family:

- Button proves variants, sizes, focus indication, disabled state, and a zero-JavaScript component.
- Dialog proves named actions, native modality, initial focus, focus return, Escape handling,
  cancelable lifecycle events, state attributes, and accessible labelling.
- Field, Input, Textarea, Checkbox, and Switch prove that semantic component anatomy and Tailwind
  styling can sit directly on native controls while jQuery Star's existing `data-bind:*` directives
  remain the state layer.
- Collapsible and Accordion follow the APG
  [Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) and
  [Accordion](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/) relationships while retaining
  native `<details>/<summary>` activation.
- Tabs follow the APG [Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) relationships, roving
  focus, automatic and manual activation modes, orientation-aware navigation, and disabled-item
  skipping while exposing values that survive server-rendered HTML patches.
- Popover uses the HTML Standard's
  [Popover API](https://html.spec.whatwg.org/multipage/popover.html) for top-layer rendering when it
  is available, while jQuery Star owns consistent dismissal, focus, lifecycle, placement, and
  fallback behavior.
- Tooltip follows the APG [Tooltip](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/) reference for
  focus and hover activation, Escape dismissal, persistent trigger focus, `role="tooltip"`, and the
  `aria-describedby` relationship. Because that APG pattern is still marked as work in progress, the
  implementation is also checked directly with keyboard, pointer, and axe tests.
- Dropdown Menu follows the APG [Menu Button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/)
  and [Menu](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/) references for trigger state,
  composite focus, wrapping arrow navigation, Home/End, typeahead, activation, and focusable
  disabled items.
- Toast uses the WAI-ARIA [status and alert roles](https://www.w3.org/TR/wai-aria/#status) through
  separate announcement nodes, follows WCAG's
  [timing guidance](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html), and borrows
  pause, F8 viewport access, swipe, and action-fallback ideas from
  [Radix Toast](https://www.radix-ui.com/primitives/docs/components/toast).
- Select follows the APG [Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) and
  [select-only combobox example](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/)
  for focus, `aria-activedescendant`, keyboard exploration, commit, cancel, and typeahead. It uses
  the APG [Listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) option semantics while
  retaining a native select for ordinary forms.
  [Radix Select](https://www.radix-ui.com/primitives/docs/components/select) provides a useful
  reference for parts, collision-aware placement, and typeahead without imposing its React runtime.
- Combobox uses the editable-combobox contract from the same
  [Combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/): DOM focus remains in the
  input, `aria-activedescendant` identifies the suggested option, Enter accepts a suggestion, and
  Escape closes without forcing a value. jQuery Star keeps the typed query separate from a hidden
  submitted value, so Datastar can replace the result options without replacing the focused input.
- Data Table follows W3C's
  [table header guidance](https://www.w3.org/WAI/tutorials/tables/one-header/) by retaining native
  table elements, captions, and scoped headers. Sort state follows the WAI-ARIA
  [`aria-sort`](https://www.w3.org/TR/wai-aria-1.2/#aria-sort) property. The processing boundary
  follows TanStack Table's
  [client-side versus server-side guidance](https://tanstack.com/table/latest/docs/guide/client-side-vs-server-side):
  filtering, sorting, and pagination operate over the same dataset, and stable backend row IDs keep
  selection meaningful across requests.
- Breadcrumb follows the APG
  [Breadcrumb pattern](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/): a labelled navigation
  landmark contains an ordered list of parent links and the current link uses `aria-current="page"`.
- Navigation Menu follows the APG
  [disclosure navigation example](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/).
  It deliberately avoids `menu` and `menubar` roles because ordinary site links do not implement the
  desktop-application keyboard contract those roles imply.
- Command Palette composes the APG
  [modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) and editable
  [Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) contracts. Inline mode keeps the
  listbox inside the dialog's focus and visual boundary.
- Form delegates its validity model to the HTML Standard's native
  [Constraint Validation API](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#constraint-validation).
  It reflects native failures into stable Field parts and leaves `FormData`, including multipart
  file inputs, on the same backend-action path. Structured backend errors use the standard's
  `setCustomValidity()` hook, so custom server messages participate in the same `ValidityState`
  instead of creating a parallel error model.
- Number Field retains the native number input and its browser-owned stepping behavior while using
  the APG [Spinbutton pattern](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/) as the keyboard
  and naming reference. The added buttons are conveniences, not a replacement ARIA spinbutton.
- Password Field follows the GOV.UK Design System's
  [password input](https://design-system.service.gov.uk/components/password-input/) principle that
  visibility is an explicit button action while the labelled native input and its autocomplete
  contract remain intact.
- Tags Input uses a labelled text control and a separate removable list, informed by React Aria's
  [TagGroup](https://react-spectrum.adobe.com/react-aria/TagGroup.html) removal and keyboard model.
  Repeated hidden inputs preserve ordinary backend serialization instead of exposing an opaque
  client-only value.
- Input OTP follows MDN's
  [one-time password guidance](https://developer.mozilla.org/en-US/docs/Web/Security/Authentication/OTP):
  one native input retains `autocomplete="one-time-code"`, `inputmode="numeric"`, length,
  validation, paste, and form behavior. Visual slots never become six competing focus or autofill
  targets.
- Resizable Panels follows the APG
  [Window Splitter pattern](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/) for separator
  value semantics and orientation-aware Arrow keys, Home, End, and collapse/restore behavior.
- Scroll Area follows Radix's
  [native-scrolling boundary](https://www.radix-ui.com/primitives/docs/components/scroll-area):
  browser overflow remains responsible for wheel, touch, and keyboard scrolling; styling does not
  translate content through a parallel JavaScript scroll model.
- Context Menu and Menubar follow the APG
  [Menu and Menubar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/): the same menu-item
  engine supports popup and persistent menu contexts, Shift+F10 invokes contextual actions, and
  top-level Arrow navigation does not add every command to the page tab sequence.
- Tree View follows the APG [Tree View pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/):
  focus and selection remain distinct, Right and Left Arrow expand, collapse, or traverse levels,
  and multi-selection uses the recommended modifier-free navigation model.
- Toolbar follows the APG [Toolbar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/): the
  group contributes one page tab stop, orientation selects the active Arrow keys, and controls that
  need Arrow keys retain their native input behavior.
- Carousel follows the APG [Carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/):
  the region and slides have explicit role descriptions, rotation can always be stopped, focus and
  hover pause automatic changes, and each unnamed slide receives a position-based accessible name.
- Sidebar adopts shadcn's
  [composable sidebar structure](https://ui.shadcn.com/docs/components/base/sidebar) and its icon,
  off-canvas, and non-collapsible modes without importing React context. jQuery Star keeps the same
  useful Cmd/Ctrl+B convention while storing state on source-owned HTML.
- Stepper uses an ordered list and `aria-current="step"`, matching the platform-neutral semantics
  described by [WAI-ARIA](https://www.w3.org/TR/wai-aria-1.3/#aria-current). Linear forward
  navigation keeps browser constraint validation instead of inventing a second validation layer.
- Sortable List follows WCAG 2.2
  [Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html): visible
  Up and Down buttons provide a single-pointer alternative to dragging, while keyboard reordering
  exposes the same operation.
- File Upload builds on the browser
  [File API](https://developer.mozilla.org/en-US/docs/Web/API/File_API) and
  [file drag-and-drop model](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop).
  The selected `FileList` stays on the native input, which keeps multipart FormData compatible with
  any backend.
- Range Calendar retains the APG
  [Date Picker grid keyboard contract](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/)
  and represents the continuous selection through `aria-selected` grid cells. Endpoint text is
  included in each day button's accessible name, and Date Range Picker retains two native form
  controls rather than serializing an opaque widget value.
- Hover Card follows WCAG 2.2
  [Content on Hover or Focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html):
  it is dismissible with Escape, hoverable across the floating content, and persistent while pointer
  or focus remains inside. Interactive content stays in normal tab order instead of using Tooltip's
  descriptive relationship.
- Alert Dialog follows the APG
  [Alert and Message Dialogs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/) while
  reusing native Dialog modality. Drawer is a presentation variant over that same native behavior,
  not another focus-management system.
- Distribution follows shadcn's
  [framework-neutral source registry](https://ui.shadcn.com/docs/registry/github) format. The
  upstream builder validates all item paths and emits one installable item document per recipe.
