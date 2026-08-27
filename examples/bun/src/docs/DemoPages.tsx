import { useState } from "preact/hooks";

import { Accordion, AccordionFlushDemo } from "../components/Accordion.tsx";
import { AlertDemo, BannerDemo } from "../components/Alert.tsx";
import { AvatarDemo } from "../components/Avatar.tsx";
import { BadgeDemo } from "../components/Badge.tsx";
import { Button, ButtonGroupDemo, ButtonSizesDemo, ButtonWithIconsDemo } from "../components/Button.tsx";
import { CardDemo, HorizontalCardDemo, JumbotronDemo, PricingCardDemo } from "../components/Card.tsx";
import { CarouselDemo } from "../components/Carousel.tsx";
import { FormsDemo } from "../components/Forms.tsx";
import { ListGroupDemo, ProgressDemo, RatingDemo, SkeletonDemo, SpinnerDemo, TimelineDemo, ToastDemo } from "../components/Feedback.tsx";
import { Icon } from "../components/Icon.tsx";
import { BreadcrumbDemo, NavbarDemo, PaginationDemo, SidebarDemo, StepperDemo, TabsDemo } from "../components/Navigation.tsx";
import { DrawerDemo, DropdownDemo, ModalDemo, PopoverDemo } from "../components/Overlays.tsx";
import { TableSection } from "../components/TableSection.tsx";
import { ExampleTabs } from "./ExampleTabs.tsx";

export function ButtonPage() {
  return (
    <ExampleTabs
      id="button-examples"
      items={[
        { value: "variants", label: "Variants", content: <div className="flex flex-wrap items-center gap-3"><Button><Icon name="check" className="h-4 w-4" />Primary</Button><Button variant="secondary">Secondary</Button><Button variant="outline">Outline</Button><Button variant="ghost">Ghost</Button><Button variant="danger">Delete</Button><Button variant="success">Success</Button></div> },
        { value: "sizes", label: "Sizes", content: <ButtonSizesDemo /> },
        { value: "icons", label: "Icons", content: <ButtonWithIconsDemo /> },
        { value: "groups", label: "Groups", content: <ButtonGroupDemo /> },
        { value: "states", label: "States", content: <div className="flex flex-wrap items-center gap-3"><Button disabled>Disabled</Button><Button aria-busy="true"><span className="spinner spinner-sm" />Saving…</Button></div> }
      ]}
    />
  );
}

export function DropdownPage() { return <DropdownDemo />; }

export function ModalPage() {
  const [open, setOpen] = useState(false);
  return <div><Button onClick={() => setOpen(true)}>Open modal <Icon name="arrow" className="h-4 w-4" /></Button><ModalDemo open={open} onClose={() => setOpen(false)} /></div>;
}

export function PopoverPage() { return <PopoverDemo />; }

export function AccordionPage() {
  return <ExampleTabs id="accordion-examples" items={[
    { value: "default", label: "Default", content: <Accordion /> },
    { value: "flush", label: "Flush", content: <AccordionFlushDemo /> }
  ]} />;
}

export function AvatarPage() { return <AvatarDemo />; }
export function BadgePage() { return <BadgeDemo />; }

export function CardPage() {
  return <ExampleTabs id="card-examples" items={[
    { value: "basic", label: "Basic", content: <CardDemo /> },
    { value: "pricing", label: "Pricing", content: <PricingCardDemo /> },
    { value: "horizontal", label: "Horizontal", content: <HorizontalCardDemo /> },
    { value: "marketing", label: "Marketing", content: <JumbotronDemo /> }
  ]} />;
}

export function CarouselPage() { return <CarouselDemo />; }
export function ListPage() { return <ListGroupDemo />; }

export function TablePage() {
  const [open, setOpen] = useState(false);
  return <><TableSection onNew={() => setOpen(true)} /><ModalDemo open={open} onClose={() => setOpen(false)} /></>;
}

export function TimelinePage() { return <TimelineDemo />; }
export function BreadcrumbsPage() { return <BreadcrumbDemo />; }
export function NavbarPage() { return <NavbarDemo />; }
export function PaginationPage() { return <PaginationDemo />; }
export function SidebarPage() { return <SidebarDemo />; }
export function StepsPage() { return <StepperDemo />; }
export function TabsPage() { return <TabsDemo />; }

export function FormsPage() {
  return <ExampleTabs id="forms-examples" items={[
    { value: "controls", label: "Controls", content: <FormsDemo /> },
    { value: "validation", label: "Validation", content: <div className="space-y-4"><label className="form-label">Email address<input className="form-input" type="email" value="invalid@example" readOnly /><span className="form-help text-red-600">Enter a valid email address.</span></label><Button variant="danger">Submit with error</Button></div> }
  ]} />;
}

export function AlertPage() { return <AlertDemo />; }

export function BannerPage() {
  const [visible, setVisible] = useState(true);
  return visible ? <BannerDemo onDismiss={() => setVisible(false)} /> : <Button variant="outline" onClick={() => setVisible(true)}>Show banner</Button>;
}

export function ProgressPage() { return <ProgressDemo />; }
export function RatingPage() { return <RatingDemo />; }
export function SkeletonPage() { return <SkeletonDemo />; }
export function SpinnerPage() { return <SpinnerDemo />; }
export function ToastPage() { return <ToastDemo />; }

export function DrawerPage() {
  const [open, setOpen] = useState(false);
  return <><Button variant="outline" onClick={() => setOpen(true)}>Open drawer</Button><DrawerDemo open={open} onClose={() => setOpen(false)} /></>;
}

export function JumbotronPage() { return <JumbotronDemo />; }
