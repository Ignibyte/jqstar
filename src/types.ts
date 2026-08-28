export type StateRecord = Record<string, unknown>;
export type ComputedRecord = Record<string, unknown>;
export type DOMValue = string | number | boolean | null | undefined;
export type BackendMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type PatchMode =
  "outer" | "inner" | "replace" | "prepend" | "append" | "before" | "after" | "remove";
export type PatchNamespace = "html" | "svg" | "mathml";
export type RetryMode = "auto" | "error" | "always" | "never";
export type RequestCancellation = "auto" | "cleanup" | "disabled" | AbortController;

export interface SignalFilter {
  include?: RegExp;
  exclude?: RegExp;
}

export interface PatchSignalsOptions {
  onlyIfMissing?: boolean;
  removeNull?: boolean;
}

export interface PatchElementsOptions {
  selector?: string;
  mode?: PatchMode;
  namespace?: PatchNamespace;
  useViewTransition?: boolean;
  viewTransitionSelector?: string;
}

export interface BackendActionOptions<
  State extends StateRecord = StateRecord,
  Computed extends ComputedRecord = ComputedRecord,
> {
  contentType?: "json" | "form";
  filterSignals?: SignalFilter;
  headers?: HeadersInit;
  openWhenHidden?: boolean;
  payload?: unknown | ((context: StarContext<State, Computed>) => unknown);
  params?: Record<string, DOMValue>;
  selector?: string | null;
  target?: string;
  mode?: PatchMode;
  pending?: string;
  error?: string;
  retry?: RetryMode;
  retryInterval?: number;
  retryScaler?: number;
  retryMaxWait?: number;
  retryMaxCount?: number;
  requestCancellation?: RequestCancellation;
  credentials?: RequestCredentials;
}

export interface FetchLifecycleDetail {
  type: "started" | "progress" | "finished" | "error" | "retrying" | "retries-failed";
  method: BackendMethod;
  url: string;
  attempt: number;
  loaded?: number;
  total?: number;
  response?: Response;
  error?: unknown;
  aborted?: boolean;
}

export interface SSEMessage {
  event: string;
  data: string;
  id?: string;
  retry?: number;
}

export interface StarContext<
  State extends StateRecord = StateRecord,
  Computed extends ComputedRecord = ComputedRecord,
> {
  $: JQueryStatic;
  state: State;
  computed: Readonly<Computed>;
  root: Element;
  $root: JQuery<Element>;
  element?: Element;
  $element?: JQuery<Element>;
  event?: JQuery.Event | Event;
  args?: readonly unknown[];
  instance: StarInstance<State, Computed>;
}

export type Value<
  Result,
  State extends StateRecord = StateRecord,
  Computed extends ComputedRecord = ComputedRecord,
> = Result | ((context: StarContext<State, Computed>) => Result);

export type StarAction<
  State extends StateRecord = StateRecord,
  Computed extends ComputedRecord = ComputedRecord,
> = (context: StarContext<State, Computed>) => unknown | Promise<unknown>;

export interface EventOptions<
  State extends StateRecord = StateRecord,
  Computed extends ComputedRecord = ComputedRecord,
> {
  action: string | StarAction<State, Computed>;
  prevent?: boolean;
  stop?: boolean;
  once?: boolean;
  debounce?: number;
  throttle?: number;
}

export type EventBinding<
  State extends StateRecord = StateRecord,
  Computed extends ComputedRecord = ComputedRecord,
> = string | StarAction<State, Computed> | EventOptions<State, Computed>;

export interface ModelBinding {
  path: string;
  event?: string;
}

export interface UIRule<
  State extends StateRecord = StateRecord,
  Computed extends ComputedRecord = ComputedRecord,
> {
  text?: Value<DOMValue, State, Computed>;
  html?: Value<DOMValue, State, Computed>;
  show?: Value<boolean, State, Computed>;
  disabled?: Value<boolean, State, Computed>;
  class?: Record<string, Value<boolean, State, Computed>>;
  attr?: Record<string, Value<DOMValue, State, Computed>>;
  prop?: Record<string, Value<DOMValue, State, Computed>>;
  style?: Record<string, Value<string | number | null, State, Computed>>;
  model?: string | ModelBinding;
  on?: Record<string, EventBinding<State, Computed>>;
  mount?: (context: StarContext<State, Computed>) => void | (() => void);
  unmount?: (context: StarContext<State, Computed>) => void;
}

export type ComputedDefinition<State extends StateRecord, Computed extends ComputedRecord> = {
  [Key in keyof Computed]: (
    context: Omit<StarContext<State, Computed>, "computed"> & {
      computed: Readonly<Computed>;
    },
  ) => Computed[Key];
};

export interface StarDefinition<
  State extends StateRecord = StateRecord,
  Computed extends ComputedRecord = ComputedRecord,
> {
  state?: State;
  computed?: ComputedDefinition<State, Computed>;
  actions?: Record<string, StarAction<State, Computed>>;
  ui?: Record<string, UIRule<State, Computed>>;
}

export interface StarInstance<
  State extends StateRecord = StateRecord,
  Computed extends ComputedRecord = ComputedRecord,
> {
  readonly mode: "attributes" | "behavior";
  readonly root: Element;
  readonly $root: JQuery<Element>;
  readonly state: State;
  readonly computed: Readonly<Computed>;
  readonly destroyed: boolean;
  run(
    action: string | StarAction<State, Computed>,
    overrides?: Partial<StarContext<State, Computed>>,
  ): Promise<unknown>;
  refresh(): void;
  destroy(): void;
}

export type DialogTarget = string | HTMLDialogElement;

export interface DialogOpenOptions {
  initialFocus?: string | HTMLElement;
  trigger?: Element;
}

export interface StarDialogStatic {
  open(target: DialogTarget, options?: DialogOpenOptions): HTMLDialogElement;
  close(target: DialogTarget, returnValue?: string): HTMLDialogElement;
}

export type DisclosureTarget = string | HTMLDetailsElement;

export interface StarDisclosureStatic {
  open(target: DisclosureTarget): HTMLDetailsElement;
  close(target: DisclosureTarget): HTMLDetailsElement;
  toggle(target: DisclosureTarget): HTMLDetailsElement;
}

export type TabsTarget = string | HTMLElement;
export type TabTarget = string | HTMLElement;

export interface StarTabsStatic {
  activate(target: TabsTarget, tab: TabTarget): HTMLElement;
  value(target: TabsTarget): string | undefined;
}

export type PopoverTarget = string | HTMLElement;

export interface StarPopoverStatic {
  open(target: PopoverTarget): HTMLElement;
  close(target: PopoverTarget): HTMLElement;
  toggle(target: PopoverTarget): HTMLElement;
}

export type TooltipTarget = string | HTMLElement;

export interface StarTooltipStatic {
  open(target: TooltipTarget): HTMLElement;
  close(target: TooltipTarget): HTMLElement;
}

export type HoverCardTarget = string | HTMLElement;

export interface StarHoverCardStatic {
  open(target: HoverCardTarget): HTMLElement;
  close(target: HoverCardTarget): HTMLElement;
}

export type MenuTarget = string | HTMLElement;

export interface StarMenuStatic {
  open(target: MenuTarget): HTMLElement;
  close(target: MenuTarget): HTMLElement;
  toggle(target: MenuTarget): HTMLElement;
}

export type ToastTarget = string | HTMLElement;
export type ToastPriority = "polite" | "assertive";
export type ToastVariant = "default" | "success" | "warning" | "danger";

export interface ToastOptions {
  title?: string;
  description: string;
  duration?: number | false;
  priority?: ToastPriority;
  variant?: ToastVariant;
  viewport?: ToastTarget;
}

export interface StarToastStatic {
  show(options: string | ToastOptions): HTMLElement;
  dismiss(target: ToastTarget): HTMLElement;
  clear(): void;
}

export type SelectTarget = string | HTMLElement;

export interface StarSelectStatic {
  select(target: SelectTarget, value: string): HTMLElement;
  open(target: SelectTarget): HTMLElement;
  close(target: SelectTarget): HTMLElement;
  toggle(target: SelectTarget): HTMLElement;
  value(target: SelectTarget): string;
}

export type ComboboxTarget = string | HTMLElement;

export interface StarComboboxStatic {
  select(target: ComboboxTarget, value: string): HTMLElement;
  clear(target: ComboboxTarget): HTMLElement;
  open(target: ComboboxTarget): HTMLElement;
  close(target: ComboboxTarget): HTMLElement;
  toggle(target: ComboboxTarget): HTMLElement;
  value(target: ComboboxTarget): string;
  query(target: ComboboxTarget): string;
}

export type DataTableTarget = string | HTMLElement;
export type DataTableSortDirection = "ascending" | "descending" | "none";

export interface StarDataTableStatic {
  sort(target: DataTableTarget, key: string, direction?: DataTableSortDirection): HTMLElement;
  filter(target: DataTableTarget, query: string): HTMLElement;
  page(target: DataTableTarget, page: number): HTMLElement;
  next(target: DataTableTarget): HTMLElement;
  previous(target: DataTableTarget): HTMLElement;
  selected(target: DataTableTarget): string[];
}

export type ToggleTarget = string | HTMLButtonElement;

export interface StarToggleStatic {
  press(target: ToggleTarget, pressed?: boolean): HTMLButtonElement;
  toggle(target: ToggleTarget): HTMLButtonElement;
  pressed(target: ToggleTarget): boolean;
}

export type ToggleGroupTarget = string | HTMLElement;

export interface StarToggleGroupStatic {
  select(target: ToggleGroupTarget, value: string, pressed?: boolean): HTMLElement;
  toggle(target: ToggleGroupTarget, value: string): HTMLElement;
  value(target: ToggleGroupTarget): string | string[] | undefined;
}

export type CalendarTarget = string | HTMLElement;
export type CalendarDate = string | Date;

export interface StarCalendarStatic {
  select(target: CalendarTarget, date: CalendarDate): HTMLElement;
  month(target: CalendarTarget, date: CalendarDate): HTMLElement;
  next(target: CalendarTarget): HTMLElement;
  previous(target: CalendarTarget): HTMLElement;
  value(target: CalendarTarget): string | undefined;
}

export type DatePickerTarget = string | HTMLElement;

export interface StarDatePickerStatic {
  open(target: DatePickerTarget): HTMLElement;
  close(target: DatePickerTarget): HTMLElement;
  select(target: DatePickerTarget, date: CalendarDate): HTMLElement;
  value(target: DatePickerTarget): string | undefined;
}

export type FormTarget = string | HTMLFormElement;

export interface StarFormValidateOptions {
  focus?: boolean;
  report?: boolean;
}

export interface StarFormStatic {
  validate(target: FormTarget, options?: StarFormValidateOptions): boolean;
  valid(target: FormTarget): boolean;
  focusInvalid(target: FormTarget): HTMLElement | undefined;
  reset(target: FormTarget): HTMLFormElement;
}

export interface StarUIStatic {
  readonly dialog: StarDialogStatic;
  readonly collapsible: StarDisclosureStatic;
  readonly accordion: StarDisclosureStatic;
  readonly tabs: StarTabsStatic;
  readonly popover: StarPopoverStatic;
  readonly tooltip: StarTooltipStatic;
  readonly hoverCard: StarHoverCardStatic;
  readonly menu: StarMenuStatic;
  readonly toast: StarToastStatic;
  readonly select: StarSelectStatic;
  readonly combobox: StarComboboxStatic;
  readonly dataTable: StarDataTableStatic;
  readonly toggle: StarToggleStatic;
  readonly toggleGroup: StarToggleGroupStatic;
  readonly calendar: StarCalendarStatic;
  readonly datePicker: StarDatePickerStatic;
  readonly form: StarFormStatic;
  enhance(root?: ParentNode): void;
}

export interface StarStatic {
  readonly version: string;
  readonly ui: StarUIStatic;
  action<State extends StateRecord = StateRecord, Computed extends ComputedRecord = ComputedRecord>(
    name: string,
    action: StarAction<State, Computed>,
  ): StarStatic;
  boot(root?: Element | string): JQuery;
  clearExpressionCache(): void;
  get<State extends StateRecord = StateRecord, Computed extends ComputedRecord = ComputedRecord>(
    url: string,
    options?: BackendActionOptions<State, Computed>,
  ): StarAction<State, Computed>;
  post<State extends StateRecord = StateRecord, Computed extends ComputedRecord = ComputedRecord>(
    url: string,
    options?: BackendActionOptions<State, Computed>,
  ): StarAction<State, Computed>;
  put<State extends StateRecord = StateRecord, Computed extends ComputedRecord = ComputedRecord>(
    url: string,
    options?: BackendActionOptions<State, Computed>,
  ): StarAction<State, Computed>;
  patch<State extends StateRecord = StateRecord, Computed extends ComputedRecord = ComputedRecord>(
    url: string,
    options?: BackendActionOptions<State, Computed>,
  ): StarAction<State, Computed>;
  delete<State extends StateRecord = StateRecord, Computed extends ComputedRecord = ComputedRecord>(
    url: string,
    options?: BackendActionOptions<State, Computed>,
  ): StarAction<State, Computed>;
  nextUpdate(): Promise<void>;
}

declare global {
  interface JQuery {
    star(): JQuery;
    star<State extends StateRecord, Computed extends ComputedRecord = ComputedRecord>(
      definition: StarDefinition<State, Computed>,
    ): JQuery;
    star(command: "destroy" | "refresh"): JQuery;
    star<State extends StateRecord = StateRecord, Computed extends ComputedRecord = ComputedRecord>(
      command: "instance",
    ): StarInstance<State, Computed> | undefined;
    star<State extends StateRecord = StateRecord>(command: "state"): State | undefined;
  }

  interface JQueryStatic {
    star: StarStatic;
  }
}
