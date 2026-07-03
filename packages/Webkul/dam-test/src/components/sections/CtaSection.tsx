import { Link } from "react-router-dom";
import { personalInfo } from "@/data/portfolioData";
import { Button } from "@/components/ui/primitives/Button";
import { Reveal } from "@/components/ui/primitives/Reveal";

const CtaSection = () => (
  <section className="container mx-auto px-6 py-24">
    <Reveal>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-16 text-center md:py-20">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid opacity-70" />
        <div className="relative">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Let's build something</p>
          <h2 className="mx-auto mt-4 max-w-2xl text-balance font-display text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            Have a problem worth <span className="text-gradient">solving?</span>
          </h2>
          <p className="mt-4 font-mono text-sm text-muted-foreground">{personalInfo.email}</p>
          <div className="mt-8 flex justify-center">
            <Button asChild variant="primary">
              <Link to="/contact">Start a conversation →</Link>
            </Button>
          </div>
        </div>
      </div>
    </Reveal>
  </section>
);

export default CtaSection;
