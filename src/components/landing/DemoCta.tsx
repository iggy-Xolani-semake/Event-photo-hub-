"use client";

import clsx from "clsx";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { requestGuestDemo } from "./demoStore";

/**
 * Secondary hero CTA: fires the showcase's guest demo (and scrolls to it) via
 * the demo store, so the hero copy above can stay a server component.
 */
export function DemoCta({ className }: { className?: string }) {
  return (
    <Button variant="secondary" size="lg" onClick={requestGuestDemo} className={clsx(className)}>
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700/80">
        <Play className="h-2.5 w-2.5 fill-current text-violet-300" strokeWidth={0} />
      </span>
      Try Guest Demo
    </Button>
  );
}

export default DemoCta;
