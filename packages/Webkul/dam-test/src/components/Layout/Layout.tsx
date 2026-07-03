import { lazy, ReactNode, Suspense } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Header from "./Header";
import Footer from "./Footer";
import { PageTransition } from "@/components/ui/primitives/PageTransition";

const AIChatbot = lazy(() => import("@/components/AIChatbot"));

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className={`flex-1 ${isHome ? "" : "pt-28"}`}>
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>{children}</PageTransition>
        </AnimatePresence>
      </main>
      <Footer />
      {import.meta.env.VITE_GEMINI_API_KEY ? (
        <Suspense fallback={null}>
          <AIChatbot />
        </Suspense>
      ) : null}
    </div>
  );
};

export default Layout;
