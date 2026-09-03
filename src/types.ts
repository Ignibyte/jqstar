import type { StarPlugin, StarPluginFacade } from "./plugin";
import type { StarExpressionHelperScope } from "./directive";
import type { StarDisposalReport } from "./disposal";
import type {
  StarOperationObserver,
  StarOperationSubscriptionOptions,
  StarOperationUnsubscribe,
} from "./observation";

export type StateRecord = Record<string, unknown>;
export type ComputedRecord = Record<string, unknown>;
export type DOMValue = string | number | boolean | null | undefined;
type RequestPayload = DOMValue | Record<string, unknown> | readonly unknown[];
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
  payload?: RequestPayload | ((context: StarContext<State, Computed>) => unknown);
  params?: Record<string, DOMValue>;
  profile?: string;
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
  readonly helpers?: StarExpressionHelperScope;
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
> = (context: StarContext<State, Computed>) => unknown;

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
  observeOperations(
    observer: StarOperationObserver,
    options?: StarOperationSubscriptionOptions,
  ): StarOperationUnsubscribe;
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

export type ContextMenuTarget = string | HTMLElement;

export interface StarContextMenuStatic {
  open(target: ContextMenuTarget, x?: number, y?: number): HTMLElement;
  close(target: ContextMenuTarget): HTMLElement;
}

export type MenubarTarget = string | HTMLElement;

export interface StarMenubarStatic {
  open(target: MenubarTarget, value?: string): HTMLElement;
  close(target: MenubarTarget): HTMLElement;
  focus(target: MenubarTarget, value?: string): HTMLElement;
  value(target: MenubarTarget): string | undefined;
}

export type TreeTarget = string | HTMLElement;

export interface StarTreeStatic {
  select(target: TreeTarget, value: string, selected?: boolean): HTMLElement;
  expand(target: TreeTarget, value: string): HTMLElement;
  collapse(target: TreeTarget, value: string): HTMLElement;
  toggle(target: TreeTarget, value: string): HTMLElement;
  focus(target: TreeTarget, value: string): HTMLElement;
  value(target: TreeTarget): string | string[] | undefined;
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
export interface DataTableSort {
  direction: Exclude<DataTableSortDirection, "none">;
  key: string;
}

export interface StarDataTableStatic {
  sort(
    target: DataTableTarget,
    key: string,
    direction?: DataTableSortDirection,
    additive?: boolean,
  ): HTMLElement;
  sorts(target: DataTableTarget): DataTableSort[];
  filter(target: DataTableTarget, query: string): HTMLElement;
  page(target: DataTableTarget, page: number): HTMLElement;
  next(target: DataTableTarget): HTMLElement;
  previous(target: DataTableTarget): HTMLElement;
  selected(target: DataTableTarget): string[];
}

export type PaginationTarget = string | HTMLElement;

export interface StarPaginationStatic {
  page(target: PaginationTarget): number;
  pageCount(target: PaginationTarget): number;
  goTo(target: PaginationTarget, page: number): HTMLElement;
  next(target: PaginationTarget): HTMLElement;
  previous(target: PaginationTarget): HTMLElement;
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

export type NumberFieldTarget = string | HTMLElement;

export interface StarNumberFieldStatic {
  increment(target: NumberFieldTarget, amount?: number): HTMLElement;
  decrement(target: NumberFieldTarget, amount?: number): HTMLElement;
  set(target: NumberFieldTarget, value: number | string): HTMLElement;
  value(target: NumberFieldTarget): number | undefined;
}

export type PasswordFieldTarget = string | HTMLElement;

export interface StarPasswordFieldStatic {
  show(target: PasswordFieldTarget): HTMLElement;
  hide(target: PasswordFieldTarget): HTMLElement;
  toggle(target: PasswordFieldTarget): HTMLElement;
  visible(target: PasswordFieldTarget): boolean;
}

export type TagsInputTarget = string | HTMLElement;

export interface StarTagsInputStatic {
  add(target: TagsInputTarget, value: string): HTMLElement;
  remove(target: TagsInputTarget, value: string): HTMLElement;
  clear(target: TagsInputTarget): HTMLElement;
  value(target: TagsInputTarget): string[];
}

export type InputOTPTarget = string | HTMLElement;

export interface StarInputOTPStatic {
  set(target: InputOTPTarget, value: string): HTMLElement;
  clear(target: InputOTPTarget): HTMLElement;
  focus(target: InputOTPTarget): HTMLElement;
  value(target: InputOTPTarget): string;
  complete(target: InputOTPTarget): boolean;
}

export type ResizableTarget = string | HTMLElement;

export interface StarResizableStatic {
  set(target: ResizableTarget, sizes: readonly number[]): HTMLElement;
  resize(target: ResizableTarget, handleIndex: number, primarySize: number): HTMLElement;
  collapse(target: ResizableTarget, handleIndex?: number): HTMLElement;
  reset(target: ResizableTarget): HTMLElement;
  value(target: ResizableTarget): number[];
}

export type SidebarTarget = string | HTMLElement;

export interface StarSidebarStatic {
  open(target: SidebarTarget): HTMLElement;
  close(target: SidebarTarget): HTMLElement;
  toggle(target: SidebarTarget): HTMLElement;
  value(target: SidebarTarget): boolean;
}

export type CarouselTarget = string | HTMLElement;

export interface StarCarouselStatic {
  next(target: CarouselTarget): HTMLElement;
  previous(target: CarouselTarget): HTMLElement;
  go(target: CarouselTarget, value: string | number): HTMLElement;
  play(target: CarouselTarget): HTMLElement;
  pause(target: CarouselTarget): HTMLElement;
  value(target: CarouselTarget): string;
}

export type ToolbarTarget = string | HTMLElement;

export interface StarToolbarStatic {
  focus(target: ToolbarTarget, value?: string): HTMLElement;
  next(target: ToolbarTarget): HTMLElement;
  previous(target: ToolbarTarget): HTMLElement;
  value(target: ToolbarTarget): string | undefined;
}

export type StepperTarget = string | HTMLElement;

export interface StarStepperStatic {
  next(target: StepperTarget): HTMLElement;
  previous(target: StepperTarget): HTMLElement;
  go(target: StepperTarget, value: string): HTMLElement;
  complete(target: StepperTarget, value?: string, completed?: boolean): HTMLElement;
  value(target: StepperTarget): string;
}

export type SortableTarget = string | HTMLElement;

export interface StarSortableStatic {
  move(target: SortableTarget, value: string, index: number): HTMLElement;
  up(target: SortableTarget, value: string): HTMLElement;
  down(target: SortableTarget, value: string): HTMLElement;
  value(target: SortableTarget): string[];
}

export type FileUploadTarget = string | HTMLElement;

export interface StarFileUploadStatic {
  clear(target: FileUploadTarget): HTMLElement;
  remove(target: FileUploadTarget, file: number | string): HTMLElement;
  files(target: FileUploadTarget): File[];
}

export type MultiSelectTarget = string | HTMLElement;

export interface StarMultiSelectStatic {
  open(target: MultiSelectTarget): HTMLElement;
  close(target: MultiSelectTarget): HTMLElement;
  toggle(target: MultiSelectTarget): HTMLElement;
  set(target: MultiSelectTarget, values: readonly string[]): HTMLElement;
  select(target: MultiSelectTarget, value: string, selected?: boolean): HTMLElement;
  clear(target: MultiSelectTarget): HTMLElement;
  value(target: MultiSelectTarget): string[];
}

export type TransferListTarget = string | HTMLElement;

export interface StarTransferListStatic {
  add(target: TransferListTarget, values?: readonly string[]): HTMLElement;
  addAll(target: TransferListTarget): HTMLElement;
  remove(target: TransferListTarget, values?: readonly string[]): HTMLElement;
  removeAll(target: TransferListTarget): HTMLElement;
  set(target: TransferListTarget, values: readonly string[]): HTMLElement;
  up(target: TransferListTarget, values?: readonly string[]): HTMLElement;
  down(target: TransferListTarget, values?: readonly string[]): HTMLElement;
  value(target: TransferListTarget): string[];
}

export type TimePickerTarget = string | HTMLElement;

export interface StarTimePickerStatic {
  increment(target: TimePickerTarget, amount?: number): HTMLElement;
  decrement(target: TimePickerTarget, amount?: number): HTMLElement;
  set(target: TimePickerTarget, value: string): HTMLElement;
  value(target: TimePickerTarget): string;
}

export type ColorPickerTarget = string | HTMLElement;

export interface StarColorPickerStatic {
  set(target: ColorPickerTarget, value: string): HTMLElement;
  value(target: ColorPickerTarget): string;
}

export type RatingTarget = string | HTMLElement;

export interface StarRatingStatic {
  set(target: RatingTarget, value: string): HTMLElement;
  clear(target: RatingTarget): HTMLElement;
  value(target: RatingTarget): string | undefined;
}

export type MessageScrollerTarget = string | HTMLElement;

export interface MessageScrollerLatestOptions {
  behavior?: ScrollBehavior;
}

export interface StarMessageScrollerStatic {
  latest(target: MessageScrollerTarget, options?: MessageScrollerLatestOptions): HTMLElement;
  follow(target: MessageScrollerTarget, following?: boolean): HTMLElement;
  isFollowing(target: MessageScrollerTarget): boolean;
  unread(target: MessageScrollerTarget): number;
}

export type SearchFieldTarget = string | HTMLElement;

export interface StarSearchFieldStatic {
  set(target: SearchFieldTarget, value: string): HTMLElement;
  clear(target: SearchFieldTarget): HTMLElement;
  focus(target: SearchFieldTarget): HTMLElement;
  submit(target: SearchFieldTarget): HTMLElement;
  value(target: SearchFieldTarget): string;
}

export type FeedTarget = string | HTMLElement;

export interface FeedState {
  cursor: string | undefined;
  done: boolean;
  loading: boolean;
}

export interface FeedCompleteOptions {
  added?: number;
  cursor?: string;
  done?: boolean;
}

export interface FeedResetOptions {
  cursor?: string;
  message?: string;
}

export interface StarFeedStatic {
  load(target: FeedTarget): HTMLElement;
  complete(target: FeedTarget, options?: FeedCompleteOptions): HTMLElement;
  fail(target: FeedTarget, message: string): HTMLElement;
  reset(target: FeedTarget, options?: FeedResetOptions): HTMLElement;
  state(target: FeedTarget): FeedState;
  focus(target: FeedTarget, index: number): HTMLElement;
}

export type QuestionnaireTarget = string | HTMLElement;
export type QuestionnaireAnswer = string | string[] | undefined;
export type QuestionnaireAnswers = Record<string, QuestionnaireAnswer>;

export interface StarQuestionnaireStatic {
  next(target: QuestionnaireTarget): HTMLElement;
  previous(target: QuestionnaireTarget): HTMLElement;
  go(target: QuestionnaireTarget, value: string | number): HTMLElement;
  skip(target: QuestionnaireTarget): HTMLElement;
  reset(target: QuestionnaireTarget): HTMLElement;
  submit(target: QuestionnaireTarget): HTMLElement;
  value(target: QuestionnaireTarget): string;
  answer(target: QuestionnaireTarget, name: string, answer: QuestionnaireAnswer): HTMLElement;
  answers(target: QuestionnaireTarget): QuestionnaireAnswers;
}

export type ChartTarget = string | HTMLElement;
export type ChartType = "bar" | "line";

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

export interface ChartData {
  labels: string[];
  series: ChartSeries[];
}

export interface StarChartStatic {
  refresh(target: ChartTarget): HTMLElement;
  setType(target: ChartTarget, type: ChartType): HTMLElement;
  type(target: ChartTarget): ChartType;
  data(target: ChartTarget): ChartData;
}

export type CodeBlockTarget = string | HTMLElement;

export interface StarCodeBlockStatic {
  copy(target: CodeBlockTarget): Promise<string>;
  text(target: CodeBlockTarget): string;
}

export type ClipboardTarget = string | HTMLElement;
export type ClipboardState = "idle" | "copying" | "copied" | "error";

export interface StarClipboardStatic {
  copy(target: ClipboardTarget, text?: string): Promise<string>;
  text(target: ClipboardTarget): string;
  state(target: ClipboardTarget): ClipboardState;
}

export type EditableTarget = string | HTMLElement;

export interface StarEditableStatic {
  edit(target: EditableTarget): HTMLElement;
  commit(target: EditableTarget): HTMLElement;
  cancel(target: EditableTarget): HTMLElement;
  set(target: EditableTarget, value: string): HTMLElement;
  value(target: EditableTarget): string;
  editing(target: EditableTarget): boolean;
}

export type LogViewerTarget = string | HTMLElement;
export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFilter = "all" | LogLevel;

export interface LogEntryInput {
  id?: string;
  level?: LogLevel;
  message: string;
  source?: string;
  timestamp?: string | Date;
}

export interface LogViewerState {
  count: number;
  filter: LogFilter;
  following: boolean;
  paused: boolean;
  visible: number;
}

export interface StarLogViewerStatic {
  append(target: LogViewerTarget, entry: LogEntryInput): HTMLElement;
  clear(target: LogViewerTarget): HTMLElement;
  pause(target: LogViewerTarget): HTMLElement;
  resume(target: LogViewerTarget): HTMLElement;
  toggle(target: LogViewerTarget): HTMLElement;
  filter(target: LogViewerTarget, filter: LogFilter): HTMLElement;
  follow(target: LogViewerTarget, following?: boolean): HTMLElement;
  state(target: LogViewerTarget): LogViewerState;
}

export type JSONViewerTarget = string | HTMLElement;

export interface StarJSONViewerStatic {
  set(target: JSONViewerTarget, value: unknown): HTMLElement;
  value(target: JSONViewerTarget): unknown;
  expandAll(target: JSONViewerTarget): HTMLElement;
  collapseAll(target: JSONViewerTarget): HTMLElement;
}

export type CountdownTarget = string | HTMLElement;
export type CountdownUntil = string | number | Date;

export interface CountdownState {
  complete: boolean;
  paused: boolean;
  remaining: number;
  until?: string;
}

export interface StarCountdownStatic {
  start(target: CountdownTarget, durationSeconds?: number): HTMLElement;
  until(target: CountdownTarget, value: CountdownUntil): HTMLElement;
  pause(target: CountdownTarget): HTMLElement;
  resume(target: CountdownTarget): HTMLElement;
  reset(target: CountdownTarget): HTMLElement;
  remaining(target: CountdownTarget): number;
  state(target: CountdownTarget): CountdownState;
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

export type RangeCalendarTarget = string | HTMLElement;

export interface RangeCalendarValue {
  start?: string;
  end?: string;
}

export interface StarRangeCalendarStatic {
  select(target: RangeCalendarTarget, start: CalendarDate, end?: CalendarDate): HTMLElement;
  clear(target: RangeCalendarTarget): HTMLElement;
  month(target: RangeCalendarTarget, date: CalendarDate): HTMLElement;
  next(target: RangeCalendarTarget): HTMLElement;
  previous(target: RangeCalendarTarget): HTMLElement;
  value(target: RangeCalendarTarget): RangeCalendarValue;
}

export type DatePickerTarget = string | HTMLElement;

export interface StarDatePickerStatic {
  open(target: DatePickerTarget): HTMLElement;
  close(target: DatePickerTarget): HTMLElement;
  select(target: DatePickerTarget, date: CalendarDate): HTMLElement;
  value(target: DatePickerTarget): string | undefined;
}

export type DateRangePickerTarget = string | HTMLElement;

export interface StarDateRangePickerStatic {
  open(target: DateRangePickerTarget): HTMLElement;
  close(target: DateRangePickerTarget): HTMLElement;
  select(target: DateRangePickerTarget, start: CalendarDate, end?: CalendarDate): HTMLElement;
  clear(target: DateRangePickerTarget): HTMLElement;
  value(target: DateRangePickerTarget): RangeCalendarValue;
}

export type FormTarget = string | HTMLFormElement;

export interface StarFormValidateOptions {
  focus?: boolean;
  report?: boolean;
}

export type StarFormErrors = Record<string, string | readonly string[] | null | undefined>;

export interface StarFormErrorOptions {
  focus?: boolean;
  replace?: boolean;
}

export interface StarFormStatic {
  validate(target: FormTarget, options?: StarFormValidateOptions): boolean;
  valid(target: FormTarget): boolean;
  focusInvalid(target: FormTarget): HTMLElement | undefined;
  setErrors(
    target: FormTarget,
    errors: StarFormErrors,
    options?: StarFormErrorOptions,
  ): HTMLFormElement;
  clearErrors(target: FormTarget, names?: string | readonly string[]): HTMLFormElement;
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
  readonly contextMenu: StarContextMenuStatic;
  readonly menubar: StarMenubarStatic;
  readonly tree: StarTreeStatic;
  readonly toast: StarToastStatic;
  readonly select: StarSelectStatic;
  readonly combobox: StarComboboxStatic;
  readonly dataTable: StarDataTableStatic;
  readonly pagination: StarPaginationStatic;
  readonly toggle: StarToggleStatic;
  readonly toggleGroup: StarToggleGroupStatic;
  readonly numberField: StarNumberFieldStatic;
  readonly passwordField: StarPasswordFieldStatic;
  readonly tagsInput: StarTagsInputStatic;
  readonly inputOTP: StarInputOTPStatic;
  readonly resizable: StarResizableStatic;
  readonly sidebar: StarSidebarStatic;
  readonly carousel: StarCarouselStatic;
  readonly toolbar: StarToolbarStatic;
  readonly stepper: StarStepperStatic;
  readonly sortable: StarSortableStatic;
  readonly fileUpload: StarFileUploadStatic;
  readonly multiSelect: StarMultiSelectStatic;
  readonly transferList: StarTransferListStatic;
  readonly timePicker: StarTimePickerStatic;
  readonly colorPicker: StarColorPickerStatic;
  readonly rating: StarRatingStatic;
  readonly messageScroller: StarMessageScrollerStatic;
  readonly searchField: StarSearchFieldStatic;
  readonly feed: StarFeedStatic;
  readonly questionnaire: StarQuestionnaireStatic;
  readonly chart: StarChartStatic;
  readonly codeBlock: StarCodeBlockStatic;
  readonly clipboard: StarClipboardStatic;
  readonly editable: StarEditableStatic;
  readonly logViewer: StarLogViewerStatic;
  readonly jsonViewer: StarJSONViewerStatic;
  readonly countdown: StarCountdownStatic;
  readonly calendar: StarCalendarStatic;
  readonly rangeCalendar: StarRangeCalendarStatic;
  readonly datePicker: StarDatePickerStatic;
  readonly dateRangePicker: StarDateRangePickerStatic;
  readonly form: StarFormStatic;
  enhance(root?: ParentNode): void;
}

export interface StarCoreStatic {
  readonly version: string;
  dispose(): StarDisposalReport;
  use<Facade>(plugin: StarPlugin<Facade>): Facade;
  use<const Plugins extends readonly StarPlugin[]>(
    plugins: Plugins,
  ): { readonly [Key in keyof Plugins]: StarPluginFacade<Plugins[Key]> };
  action<State extends StateRecord = StateRecord, Computed extends ComputedRecord = ComputedRecord>(
    name: string,
    action: StarAction<State, Computed>,
  ): StarCoreStatic;
  boot(root?: Element | string): JQuery;
  clearExpressionCache(): void;
  observeOperations(
    observer: StarOperationObserver,
    options?: StarOperationSubscriptionOptions,
  ): StarOperationUnsubscribe;
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
  whenEnhanced(): Promise<void>;
}

export interface StarStatic extends StarCoreStatic {
  readonly ui: StarUIStatic;
  action<State extends StateRecord = StateRecord, Computed extends ComputedRecord = ComputedRecord>(
    name: string,
    action: StarAction<State, Computed>,
  ): StarStatic;
}

export interface StarJQueryMethod {
  (): JQuery;
  <State extends StateRecord, Computed extends ComputedRecord = ComputedRecord>(
    definition: StarDefinition<State, Computed>,
  ): JQuery;
  (command: "destroy" | "refresh"): JQuery;
  <State extends StateRecord = StateRecord, Computed extends ComputedRecord = ComputedRecord>(
    command: "instance",
  ): StarInstance<State, Computed> | undefined;
  <State extends StateRecord = StateRecord>(command: "state"): State | undefined;
}

export type StarInstalledJQuery = JQueryStatic & {
  readonly fn: JQueryStatic["fn"] & { star: StarJQueryMethod };
  readonly star: StarCoreStatic;
};

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
