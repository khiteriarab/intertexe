import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="border-t border-border/40 mt-auto bg-foreground text-background">
      <div className="container mx-auto px-4 md:px-8 py-16 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 md:gap-8">
          <div className="col-span-2 md:col-span-1 flex flex-col gap-6">
            <Link href="/" className="font-serif text-2xl tracking-widest uppercase font-medium" data-testid="link-footer-logo">
              Intertexe
            </Link>
            <p className="text-background/60 text-sm leading-relaxed max-w-xs">
              Material-first fashion discovery. We rank designers by what matters most — the quality of their fabrics.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-xs uppercase tracking-widest font-medium text-background/40 mb-2">Explore</h3>
            <Link href="/just-in" className="text-sm text-background/70 hover:text-background transition-colors" data-testid="link-footer-just-in">Just In</Link>
            <Link href="/designers" className="text-sm text-background/70 hover:text-background transition-colors" data-testid="link-footer-designers">Designers</Link>
            <Link href="/materials" className="text-sm text-background/70 hover:text-background transition-colors" data-testid="link-footer-materials">Materials</Link>
            <Link href="/quiz" className="text-sm text-background/70 hover:text-background transition-colors" data-testid="link-footer-quiz">Style Quiz</Link>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-xs uppercase tracking-widest font-medium text-background/40 mb-2">Account</h3>
            <Link href="/account" className="text-sm text-background/70 hover:text-background transition-colors" data-testid="link-footer-account">My Account</Link>
            <Link href="/account" className="text-sm text-background/70 hover:text-background transition-colors" data-testid="link-footer-wishlist">Wishlist</Link>
            <Link href="/quiz" className="text-sm text-background/70 hover:text-background transition-colors" data-testid="link-footer-quiz-history">Quiz History</Link>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-xs uppercase tracking-widest font-medium text-background/40 mb-2">Company</h3>
            <span className="text-sm text-background/70">About Us</span>
            <span className="text-sm text-background/70">Contact</span>
            <span className="text-sm text-background/70">Privacy Policy</span>
            <span className="text-sm text-background/70">Terms of Service</span>
          </div>
        </div>

        <div className="border-t border-background/10 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-background/40 uppercase tracking-widest">
            &copy; {new Date().getFullYear()} Intertexe. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="https://instagram.com/intertexe" target="_blank" rel="noopener noreferrer" className="text-xs text-background/40 uppercase tracking-widest hover:text-background transition-colors" data-testid="link-footer-instagram">Instagram</a>
            <a href="https://tiktok.com/@intertexe" target="_blank" rel="noopener noreferrer" className="text-xs text-background/40 uppercase tracking-widest hover:text-background transition-colors" data-testid="link-footer-tiktok">TikTok</a>
            <a href="https://pinterest.com/shopintertexe" target="_blank" rel="noopener noreferrer" className="text-xs text-background/40 uppercase tracking-widest hover:text-background transition-colors" data-testid="link-footer-pinterest">Pinterest</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
