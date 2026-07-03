import { Link, useLocation } from "react-router-dom";
import { Home, Search } from "lucide-react";
import { Button } from "@/components/ui/primitives/Button";

const NotFound = () => {
  const location = useLocation();

  return (
    <section className="container mx-auto flex min-h-[70vh] flex-col items-center justify-center px-6 py-16 text-center">
      <span className="font-mono text-xs uppercase tracking-[0.1em] text-primary">
        Error 404
      </span>
      <h1 className="mt-4 font-display text-7xl text-foreground md:text-9xl">
        404
      </h1>
      <p className="mt-6 font-display text-2xl text-foreground md:text-3xl">
        Page Not Found
      </p>
      <p className="mt-4 max-w-md text-muted-foreground">
        Oops! The page you're looking for seems to have wandered off into the
        digital void. Don't worry though, even the best explorers get lost
        sometimes.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="primary">
          <Link to="/">
            <Home className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/blog">
            <Search className="h-4 w-4" />
            Explore Blog
          </Link>
        </Button>
      </div>

      <div className="mt-12 rounded-lg border border-border bg-card px-4 py-3">
        <p className="font-mono text-xs text-muted-foreground">
          Requested path:{" "}
          <span className="text-foreground">{location.pathname}</span>
        </p>
      </div>
    </section>
  );
};

export default NotFound;
