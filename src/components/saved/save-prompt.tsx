"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark } from "lucide-react";
import { Popover } from "radix-ui";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

/**
 * What a visitor gets when they press Save: a friendly explanation that a free account is needed, with Sign up and Log in. Both bring them
 * back to this very page afterwards (the sign-in pages only accept paths on this site).
 */
export function SavePrompt() {
  const { t } = useT();
  const pathname = usePathname();
  const next = encodeURIComponent(pathname);
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button variant="outline" size="sm">
          <Bookmark aria-hidden /> {t("save.save")}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-elevated p-4 shadow-lg"
        >
          <p className="font-semibold">{t("save.promptTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("save.promptBody")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href={`/signup?next=${next}`}>{t("auth.signup")}</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/login?next=${next}`}>{t("auth.login")}</Link>
            </Button>
          </div>
          <Popover.Arrow className="fill-border" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
