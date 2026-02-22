import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout/Layout";
import NotFound from "@/pages/not-found";

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

import Home from "@/pages/Home";
import JustIn from "@/pages/JustIn";
import Designers from "@/pages/Designers";
import DesignerDetail from "@/pages/DesignerDetail";
import Materials from "@/pages/Materials";
import Quiz from "@/pages/Quiz";
import Account from "@/pages/Account";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import Leaving from "@/pages/Leaving";

function Router() {
  return (
    <Layout>
      <ScrollToTop />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/just-in" component={JustIn} />
        <Route path="/designers" component={Designers} />
        <Route path="/designers/:slug" component={DesignerDetail} />
        <Route path="/materials" component={Materials} />
        <Route path="/quiz" component={Quiz} />
        <Route path="/account" component={Account} />
        <Route path="/about" component={About} />
        <Route path="/contact" component={Contact} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
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
