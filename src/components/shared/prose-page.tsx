/** A plain reading page (About, Privacy, Terms, Contact): one title, short sections, a comfortable measure. */
export function ProsePage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated?: string;
  intro: React.ReactNode;
  sections: { heading: string; body: React.ReactNode }[];
}) {
  return (
    <article className="page-container section-y">
      <header className="max-w-2xl">
        <h1 className="title-page">{title}</h1>
        {updated ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated {updated}
          </p>
        ) : null}
        <p className="mt-4 text-lg text-muted-foreground">{intro}</p>
      </header>
      <div className="mt-10 grid max-w-2xl gap-8">
        {sections.map((s) => (
          <section
            key={s.heading}
            aria-labelledby={`h-${s.heading.replace(/\W+/g, "-").toLowerCase()}`}
          >
            <h2
              id={`h-${s.heading.replace(/\W+/g, "-").toLowerCase()}`}
              className="text-xl font-bold"
            >
              {s.heading}
            </h2>
            <div className="mt-2 grid gap-3 text-muted-foreground [&_a]:font-semibold [&_a]:text-primary-soft-foreground [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground">
              {s.body}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
