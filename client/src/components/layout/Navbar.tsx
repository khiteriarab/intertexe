import { Link, useLocation } from "wouter";
import { Search, Heart, User, Menu, Home, Grid, Plus, List } from "lucide-react";

export function Navbar() {
  const [location] = useLocation();

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Just In", href: "/just-in" },
    { name: "Designers", href: "/designers" },
    { name: "Materials", href: "/materials" },
    { name: "Quiz", href: "/quiz" },
  ];

  const mobileNavLinks = [
    { name: "Home", href: "/", icon: Home },
    { name: "Designers", href: "/designers", icon: Grid },
    { name: "Quiz", href: "/quiz", icon: List },
    { name: "Favorites", href: "/account/favorites", icon: Heart },
    { name: "More", href: "/account", icon: Menu },
  ];

  return (
    <>
      {/* Top Navigation (Desktop & Mobile header) */}
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          {/* Mobile Menu Icon */}
          <button className="md:hidden p-2 -ml-2 text-foreground" data-testid="button-mobile-menu">
            <Menu className="w-5 h-5" strokeWidth={1.5} />
          </button>

          {/* Logo */}
          <Link href="/">
            <a className="font-serif text-2xl tracking-widest uppercase font-medium text-foreground" data-testid="link-home-logo">
              Intertexe
            </a>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-8 absolute left-1/2 -translate-x-1/2">
            {navLinks.map((link) => (
              <Link key={link.name} href={link.href}>
                <a 
                  className={`text-sm tracking-wide uppercase transition-colors hover:text-foreground/70 ${
                    location === link.href ? "text-foreground font-medium" : "text-muted-foreground"
                  }`}
                  data-testid={`link-nav-${link.name.toLowerCase().replace(' ', '-')}`}
                >
                  {link.name}
                </a>
              </Link>
            ))}
          </nav>

          {/* Right Icons */}
          <div className="flex items-center space-x-4">
            <button className="p-2 -mr-2 text-foreground hover:text-foreground/70 transition-colors" data-testid="button-search">
              <Search className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <Link href="/account">
              <a className="hidden md:block p-2 text-foreground hover:text-foreground/70 transition-colors" data-testid="link-account">
                <User className="w-5 h-5" strokeWidth={1.5} />
              </a>
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border/40 pb-safe">
        <div className="flex justify-around items-center h-16 px-2">
          {mobileNavLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location === link.href || (link.href !== '/' && location.startsWith(link.href));
            return (
              <Link key={link.name} href={link.href}>
                <a 
                  className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                    isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                  data-testid={`link-mobile-nav-${link.name.toLowerCase()}`}
                >
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
                  <span className="text-[10px] tracking-wider uppercase">{link.name}</span>
                </a>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
