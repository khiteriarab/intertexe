import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout/Layout";
import NotFound from "@/pages/not-found";

import Home from "@/pages/Home";
import JustIn from "@/pages/JustIn";
import Designers from "@/pages/Designers";
import DesignerDetail from "@/pages/DesignerDetail";
import Materials from "@/pages/Materials";
import Quiz from "@/pages/Quiz";
import Account from "@/pages/Account";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/just-in" component={JustIn} />
        <Route path="/designers" component={Designers} />
        <Route path="/designers/:slug" component={DesignerDetail} />
        <Route path="/materials" component={Materials} />
        <Route path="/quiz" component={Quiz} />
        <Route path="/account" component={Account} />
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
