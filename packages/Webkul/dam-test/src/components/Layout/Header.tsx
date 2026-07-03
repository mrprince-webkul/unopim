import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, FileDown } from "lucide-react";
import { navLinks } from "@/data/portfolioData";
import { ThemeToggle } from "@/components/ui/primitives/ThemeToggle";
import princelogo from "@/assets/princesahni-logo.png";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex items-center gap-6 px-6 py-4">
        {/* Wordmark */}
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src={princelogo}
            alt="Prince Kumar Sahni"
            className="h-8 w-8 rounded-md object-cover"
          />
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            Prince Sahni<span className="text-primary">.</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {navLinks.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`relative rounded-md px-3 py-2 font-mono text-[13px] transition-colors ${
                isActive(item.href)
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.name.toLowerCase()}
              {isActive(item.href) && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-x-2 -bottom-px h-px bg-primary"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-2">
          <span className="mr-1 hidden items-center gap-2 font-mono text-[11px] text-muted-foreground lg:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]" />
            available for work
          </span>
          <Link
            to="/resume"
            className="hidden items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground sm:flex"
          >
            <FileDown className="h-3.5 w-3.5" />
            résumé
          </Link>
          <ThemeToggle />
          <button
            onClick={() => setIsMenuOpen((v) => !v)}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground md:hidden"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="overflow-hidden border-t border-border md:hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="container mx-auto flex flex-col gap-1 px-6 py-4">
              {navLinks.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`rounded-md px-3 py-2.5 font-mono text-sm transition-colors ${
                    isActive(item.href)
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {item.name.toLowerCase()}
                </Link>
              ))}
              <Link
                to="/resume"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2.5 font-mono text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <FileDown className="h-4 w-4" /> résumé
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
