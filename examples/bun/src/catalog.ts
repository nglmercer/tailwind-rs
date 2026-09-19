import type { ComponentType } from "preact";

import {
  AccordionPage,
  AlertPage,
  AvatarPage,
  BadgePage,
  BreadcrumbsPage,
  ButtonPage,
  CardPage,
  CarouselPage,
  DropdownPage,
  DrawerPage,
  FormsPage,
  JumbotronPage,
  ListPage,
  ModalPage,
  NavbarPage,
  PaginationPage,
  PopoverPage,
  ProgressPage,
  RatingPage,
  SidebarPage,
  SkeletonPage,
  SpinnerPage,
  StepsPage,
  TablePage,
  TabsPage,
  TimelinePage,
  ToastPage,
  BannerPage
} from "./docs/DemoPages.tsx";
import { CompilerLabPage } from "./lab/CompilerLab.tsx";

export const categoryDefinitions = [
  { value: "actions", label: "Actions" },
  { value: "data-display", label: "Data display" },
  { value: "navigation", label: "Navigation" },
  { value: "feedback", label: "Feedback" },
  { value: "data-input", label: "Data input" },
  { value: "layout", label: "Layout" },
  { value: "mockup", label: "Mockup" },
  { value: "tools", label: "Tools" }
] as const;

export type Category = typeof categoryDefinitions[number]["value"];

export interface CatalogItem {
  readonly slug: string;
  readonly name: string;
  readonly category: Category;
  readonly description: string;
  readonly demo: ComponentType;
  readonly code?: string;
  readonly css?: string;
}

export const catalog: readonly CatalogItem[] = [
  { slug: "button", name: "Button", category: "actions", description: "Buttons let people take clear, immediate actions.", demo: ButtonPage, code: `<Button variant="primary">Continue</Button>`, css: `.button-primary { @apply bg-brand-600 text-white shadow-sm; }` },
  { slug: "dropdown", name: "Dropdown", category: "actions", description: "Expose contextual actions without taking the user away from the current view.", demo: DropdownPage, code: `<Dropdown items={["Dashboard", "Settings"]} />` },
  { slug: "modal", name: "Modal", category: "actions", description: "Focus attention on a confirmation or short, high-priority task.", demo: ModalPage, code: `<Modal open={open} onClose={close}>...</Modal>` },
  { slug: "popover", name: "Popover", category: "actions", description: "Show supporting content next to the control that triggered it.", demo: PopoverPage, code: `<Popover>Additional context</Popover>` },

  { slug: "accordion", name: "Accordion", category: "data-display", description: "Progressively disclose related content in compact panels.", demo: AccordionPage, code: `<Accordion items={items} />` },
  { slug: "avatar", name: "Avatar", category: "data-display", description: "Represent people, teams, and online presence with compact identity cues.", demo: AvatarPage, code: `<Avatar src="/avatar.png" alt="Jordan Diaz" />` },
  { slug: "badge", name: "Badge", category: "data-display", description: "Label statuses, metadata, and small pieces of supporting information.", demo: BadgePage, code: `<Badge variant="success">Published</Badge>` },
  { slug: "card", name: "Card", category: "data-display", description: "Compose media, metadata, content, and actions into a contained surface.", demo: CardPage, code: `<Card><CardBody>...</CardBody></Card>` },
  { slug: "carousel", name: "Carousel", category: "data-display", description: "Let people move through a small, related set of visual panels.", demo: CarouselPage, code: `<Carousel slides={slides} />` },
  { slug: "list", name: "List group", category: "data-display", description: "Present related rows with active, secondary, and action states.", demo: ListPage, code: `<ListGroup items={items} active="profile" />` },
  { slug: "table", name: "Table", category: "data-display", description: "Scan structured records with responsive columns and row actions.", demo: TablePage, code: `<Table rows={deployments} />` },
  { slug: "timeline", name: "Timeline", category: "data-display", description: "Show chronological activity, history, or a sequence of milestones.", demo: TimelinePage, code: `<Timeline items={events} />` },

  { slug: "breadcrumbs", name: "Breadcrumbs", category: "navigation", description: "Give users a compact map of their location in a hierarchy.", demo: BreadcrumbsPage, code: `<Breadcrumbs items={items} />` },
  { slug: "navbar", name: "Navbar", category: "navigation", description: "Provide a consistent top-level route between major areas.", demo: NavbarPage, code: `<Navbar brand="utilitycss" links={links} />` },
  { slug: "pagination", name: "Pagination", category: "navigation", description: "Move through a long collection of records one page at a time.", demo: PaginationPage, code: `<Pagination page={1} totalPages={5} />` },
  { slug: "sidebar", name: "Sidebar", category: "navigation", description: "Keep secondary navigation visible beside the current content.", demo: SidebarPage, code: `<Sidebar items={items} />` },
  { slug: "steps", name: "Steps", category: "navigation", description: "Make progress through a multi-step flow visible at a glance.", demo: StepsPage, code: `<Steps current={2} items={items} />` },
  { slug: "tabs", name: "Tabs", category: "navigation", description: "Switch between related views while keeping the surrounding context.", demo: TabsPage, code: `<Tabs value={active} onChange={setActive} items={items} />` },

  { slug: "forms", name: "Forms", category: "data-input", description: "Combine native controls, validation feedback, and actions into a clear form flow.", demo: FormsPage, code: `<form><Input label="Email" /><Button>Save</Button></form>` },

  { slug: "alert", name: "Alert", category: "feedback", description: "Communicate important status, warning, success, or error information.", demo: AlertPage, code: `<Alert variant="success">Profile updated.</Alert>` },
  { slug: "banner", name: "Banner", category: "feedback", description: "Place a persistent, dismissible message across the page layout.", demo: BannerPage, code: `<Banner onDismiss={dismiss}>Announcement</Banner>` },
  { slug: "progress", name: "Progress", category: "feedback", description: "Show determinate progress toward a task or upload completion.", demo: ProgressPage, code: `<Progress value={70} />` },
  { slug: "rating", name: "Rating", category: "feedback", description: "Display a score or collect a small amount of qualitative feedback.", demo: RatingPage, code: `<Rating value={4} max={5} />` },
  { slug: "skeleton", name: "Skeleton", category: "feedback", description: "Reserve space for content while a page or request is loading.", demo: SkeletonPage, code: `<Skeleton lines={3} />` },
  { slug: "spinner", name: "Spinner", category: "feedback", description: "Signal an in-progress operation when its duration is not yet known.", demo: SpinnerPage, code: `<Spinner size="md" />` },
  { slug: "toast", name: "Toast", category: "feedback", description: "Offer lightweight confirmation without interrupting the current task.", demo: ToastPage, code: `<Toast>Item moved successfully.</Toast>` },

  { slug: "drawer", name: "Drawer", category: "layout", description: "Reveal contextual content from the edge of the viewport.", demo: DrawerPage, code: `<Drawer open={open} onClose={close}>...</Drawer>` },
  { slug: "jumbotron", name: "Hero", category: "layout", description: "Create a prominent introductory block for a page or campaign.", demo: JumbotronPage, code: `<Hero title="Build with primitives" />` },

  { slug: "compiler-lab", name: "Compiler Lab", category: "tools", description: "Compile live source against the demo config: generated CSS, diagnostics, browser targets, and per-candidate validation.", demo: CompilerLabPage, code: `POST /api/compile\n{ "source": "<div class=\\"flex\\">…", "browserTarget": "safari-15", "mode": "markup" }`, css: `.flex {\n  display: flex;\n}` }
];

export function getCategoryLabel(category: Category): string {
  return categoryDefinitions.find(item => item.value === category)?.label ?? category;
}
