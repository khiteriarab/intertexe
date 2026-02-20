import { Link } from "wouter";
import { User, Heart, List, LogOut, Settings, HelpCircle } from "lucide-react";
import { DESIGNERS } from "@/lib/data";

export default function Account() {
  // Mock logged-in state for prototype
  const isLoggedIn = true;
  const userName = "Jane Doe";
  
  // Mock favorites
  const favoriteDesigners = DESIGNERS.slice(0, 2);

  if (!isLoggedIn) {
    return (
      <div className="py-20 flex flex-col items-center text-center gap-8 max-w-md mx-auto">
        <h1 className="text-4xl font-serif">Account</h1>
        <p className="text-muted-foreground">Log in to save your quiz results, track your material preferences, and save favorite designers.</p>
        <div className="flex flex-col w-full gap-4 mt-4">
          <button className="bg-foreground text-background px-8 py-4 uppercase tracking-widest text-sm hover:bg-foreground/90 transition-colors w-full" data-testid="button-login">
            Log In
          </button>
          <button className="border border-foreground px-8 py-4 uppercase tracking-widest text-sm hover:bg-secondary transition-colors w-full" data-testid="button-signup">
            Create Account
          </button>
        </div>
      </div>
    );
  }

  const menuItems = [
    { icon: User, label: "My Account", href: "#" },
    { icon: Heart, label: "Wishlist", href: "#favorites" },
    { icon: List, label: "Quiz Results", href: "/quiz" },
    { icon: Settings, label: "Country / Region", href: "#" },
    { icon: HelpCircle, label: "Help & Support", href: "#" },
  ];

  return (
    <div className="py-8 md:py-12 flex flex-col md:flex-row gap-12">
      {/* Sidebar */}
      <aside className="w-full md:w-64 shrink-0 flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-serif">Account</h1>
          <p className="text-muted-foreground">Welcome back, {userName}</p>
        </div>

        <nav className="flex flex-col gap-1">
          {menuItems.map(item => (
            <a 
              key={item.label} 
              href={item.href}
              className="flex items-center gap-3 py-3 px-4 -mx-4 hover:bg-secondary/50 transition-colors text-sm uppercase tracking-widest"
              data-testid={`link-account-${item.label.toLowerCase().replace(/[^a-z]/g, '')}`}
            >
              <item.icon className="w-4 h-4 text-muted-foreground" />
              {item.label}
            </a>
          ))}
          <button className="flex items-center gap-3 py-3 px-4 -mx-4 hover:bg-secondary/50 transition-colors text-sm uppercase tracking-widest text-muted-foreground mt-8 text-left">
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-12">
        <section id="favorites" className="flex flex-col gap-6">
          <h2 className="text-2xl font-serif border-b border-border/40 pb-4">Your Wishlist</h2>
          
          {favoriteDesigners.length === 0 ? (
             <div className="py-12 text-center bg-secondary/20 border border-dashed border-border/60">
               <p className="text-muted-foreground">You haven't saved any designers yet.</p>
               <Link href="/designers">
                 <a className="mt-4 inline-block text-sm uppercase tracking-widest border-b border-foreground pb-1">
                   Browse Directory
                 </a>
               </Link>
             </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {favoriteDesigners.map(designer => (
                <Link key={designer.id} href={`/designers/${designer.slug}`}>
                  <a className="group flex flex-col gap-4 border border-border p-4 hover:border-foreground transition-colors" data-testid={`card-favorite-${designer.slug}`}>
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-serif">{designer.name}</h3>
                      <button className="text-foreground p-1" onClick={(e) => e.preventDefault()}>
                        <Heart className="w-4 h-4 fill-foreground" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-auto pt-4 border-t border-border/40">
                      <span className="text-xs uppercase tracking-widest text-muted-foreground">Material Score</span>
                      <span className="text-sm font-medium ml-auto">{designer.natural_fiber_percent}%</span>
                    </div>
                  </a>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-6">
           <h2 className="text-2xl font-serif border-b border-border/40 pb-4">Recent Quiz Result</h2>
           <div className="bg-foreground text-background p-8 flex flex-col gap-4 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-10">
               <List className="w-32 h-32" />
             </div>
             <span className="text-xs uppercase tracking-widest text-background/60 z-10">Profile Type</span>
             <h3 className="text-4xl font-serif z-10">The Purist</h3>
             <p className="text-background/80 max-w-md z-10 font-light">
               Your preference leans heavily towards 100% natural fibers with minimal synthetic tolerance.
             </p>
             <Link href="/quiz">
               <a className="mt-4 border border-background/30 w-fit px-6 py-2 text-xs uppercase tracking-widest hover:bg-background hover:text-foreground transition-colors z-10">
                 Retake Quiz
               </a>
             </Link>
           </div>
        </section>
      </div>
    </div>
  );
}
