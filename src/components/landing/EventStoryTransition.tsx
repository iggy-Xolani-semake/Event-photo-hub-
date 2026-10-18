import Image from "next/image";

export function EventStoryTransition() {
  return (
    <section
      id="event-story"
      aria-labelledby="event-story-title"
      className="photo-story-panel relative isolate flex min-h-[76svh] items-center overflow-hidden bg-slate-950"
    >
      <Image
        src="/images/demo/gallery-01.webp"
        alt="A bride and groom sharing their first dance at an outdoor wedding"
        fill
        sizes="100vw"
        className="absolute inset-0 -z-20 object-cover object-center"
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/80 via-slate-950/35 to-slate-950/10"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-[#fbf8f4] via-transparent to-slate-950/15"
        aria-hidden="true"
      />

      <div className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-200">
            Graduation. Weddings. All the moments between.
          </p>
          <h2
            id="event-story-title"
            className="mt-5 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            Collect Every Guest Photo from Your Event — Without the Hassle
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 md:text-lg">
            From the proud walk across the stage to the last dance of the night, bring everyone&apos;s
            photos together in one place.
          </p>
        </div>
      </div>
    </section>
  );
}

export default EventStoryTransition;
