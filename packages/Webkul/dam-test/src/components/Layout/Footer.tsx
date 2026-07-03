import { Link } from "react-router-dom";
import { Github, Linkedin, Instagram, BookText, Twitter } from "lucide-react";
import { navLinks, personalInfo } from "@/data/portfolioData";

const socials = [
  { name: "GitHub", icon: Github, href: personalInfo.github },
  { name: "LinkedIn", icon: Linkedin, href: personalInfo.linkedin },
  { name: "Instagram", icon: Instagram, href: personalInfo.instagram },
  { name: "Medium", icon: BookText, href: personalInfo.medium },
  { name: "Twitter", icon: Twitter, href: personalInfo.twitter },
];

const Footer = () => (
  <footer className="border-t border-border">
    <div className="container mx-auto px-6 py-14">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.4fr,1fr,1fr]">
        {/* Brand */}
        <div className="max-w-xs">
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            Prince Kumar Sahni<span className="text-primary">.</span>
          </span>
          <p className="mt-1 font-mono text-xs text-muted-foreground">Software Engineer · New Delhi</p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Building performant, scalable products — from Android apps to full-stack platforms.
          </p>
        </div>

        {/* Navigation */}
        <div>
          <h3 className="mb-4 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Navigation
          </h3>
          <div className="grid grid-cols-2 gap-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className="font-mono text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.name.toLowerCase()}
              </Link>
            ))}
          </div>
        </div>

        {/* Connect */}
        <div>
          <h3 className="mb-4 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Connect
          </h3>
          <div className="flex gap-2">
            {socials.map(({ name, icon: Icon, href }) => (
              <a
                key={name}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={name}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-12 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 sm:flex-row">
        <p className="font-mono text-xs text-muted-foreground">
          © {new Date().getFullYear()} Prince Kumar Sahni — built in New Delhi
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          <a href={`mailto:${personalInfo.email}`} className="transition-colors hover:text-foreground">
            {personalInfo.email}
          </a>
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
