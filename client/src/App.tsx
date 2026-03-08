import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout/Layout";
import NotFound from "@/pages/not-found";
import { trackPageView } from "@/lib/analytics";

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

function DynamicCanonical() {
  const [location] = useLocation();
  useEffect(() => {
    const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (canonical) {
      canonical.href = `https://www.intertexe.com${location === "/" ? "" : location}`;
    }
    const ogUrl = document.querySelector('meta[property="og:url"]') as HTMLMetaElement;
    if (ogUrl) {
      ogUrl.content = `https://www.intertexe.com${location === "/" ? "" : location}`;
    }
  }, [location]);
  return null;
}

function RouteTracker() {
  const [location] = useLocation();
  useEffect(() => {
    trackPageView(location, document.title);
  }, [location]);
  return null;
}

import Home from "@/pages/Home";
import JustIn from "@/pages/JustIn";
import Designers from "@/pages/Designers";
import DesignersAll from "@/pages/DesignersAll";
import DesignerDetail from "@/pages/DesignerDetail";
import Materials from "@/pages/Materials";
import Quiz from "@/pages/Quiz";
import Account from "@/pages/Account";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import MaterialDetail from "@/pages/MaterialDetail";
import Chat from "@/pages/Chat";
import Leaving from "@/pages/Leaving";
import Shop from "@/pages/Shop";
import CuratedProducts, { ALL_CURATED_SLUGS } from "@/pages/CuratedProducts";
import Scanner from "@/pages/Scanner";
import { FabricCategoryPage, NaturalFabricsPage } from "@/pages/FabricCategoryPage";
import ProductDetail from "@/pages/ProductDetail";

function MaterialRouteHandler({ params }: { params: { slug: string } }) {
  if (ALL_CURATED_SLUGS.includes(params.slug)) {
    return <CuratedProducts pageSlug={params.slug} />;
  }
  return <MaterialDetail />;
}

function Router() {
  return (
    <Layout>
      <ScrollToTop />
      <DynamicCanonical />
      <RouteTracker />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/just-in" component={JustIn} />
        <Route path="/designers" component={Designers} />
        <Route path="/designers/all" component={DesignersAll} />
        <Route path="/designers/:slug" component={DesignerDetail} />
        <Route path="/materials" component={Materials} />
        <Route path="/materials/:slug">{(params) => <MaterialRouteHandler params={params} />}</Route>
        <Route path="/quiz" component={Quiz} />
        <Route path="/shop" component={Shop} />
        <Route path="/chat" component={Chat} />
        <Route path="/account" component={Account} />
        <Route path="/about" component={About} />
        <Route path="/contact" component={Contact} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/product/:id" component={ProductDetail} />
        <Route path="/scanner" component={Scanner} />
        <Route path="/natural-fabrics" component={NaturalFabricsPage} />
        <Route path="/linen-clothing">{() => <FabricCategoryPage categorySlug="linen-clothing" />}</Route>
        <Route path="/silk-clothing">{() => <FabricCategoryPage categorySlug="silk-clothing" />}</Route>
        <Route path="/cotton-clothing">{() => <FabricCategoryPage categorySlug="cotton-clothing" />}</Route>
        <Route path="/wool-clothing">{() => <FabricCategoryPage categorySlug="wool-clothing" />}</Route>
        <Route path="/cashmere-clothing">{() => <FabricCategoryPage categorySlug="cashmere-clothing" />}</Route>
        <Route path="/leaving" component={Leaving} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
