import { Suspense, lazy, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import BottomNav from "./BottomNav";

const BotpressWidget = lazy(() => import("@/components/user/ui/Bot/BotpressWidget"));

function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Scroll to top"
      className="fixed bottom-24 right-4 z-50 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-500 hover:text-green-700 hover:border-green-400 transition-all duration-200 hover:scale-110"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    </button>
  );
}

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pb-0">
        <Outlet />
      </main>
      <Footer />
      <BottomNav />
      <ScrollToTop />
      <Suspense fallback={null}>
        <BotpressWidget />
      </Suspense>
    </div>
  );
}
