"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { PublicUniversityCard } from "@/components/universities/public-universities-view";
import { Button } from "@/components/ui/button";
import {
  listPublicUniversities,
  type PublicUniversity,
} from "@/lib/api/public-universities";
import { useT } from "@/lib/i18n";

/** A few of the institutions that are really tracked (from the public API, never typed in here). Hidden if the list cannot be read. */
export function FeaturedUniversities() {
  const { t } = useT();
  const [items, setItems] = useState<PublicUniversity[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    listPublicUniversities("", 0, 3, controller.signal)
      .then((page) => setItems(page.content))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  return (
    <section
      aria-labelledby="featured-title"
      className="page-container section-y"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="featured-title" className="title-section">
            {t("home.featuredTitle")}
          </h2>
          <p className="mt-3 measure text-muted-foreground">
            {t("home.featuredHelp")}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/universities">
            {t("home.exploreUniversities")} <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
      {items && items.length > 0 ? (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((u) => (
            <PublicUniversityCard key={u.slug} u={u} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
