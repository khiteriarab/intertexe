import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="border-t border-border/40 mt-auto bg-foreground text-background mb-14 md:mb-0">
      <div className="container mx-auto px-4 md:px-8 py-10 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          <div className="col-span-2 md:col-span-1 flex flex-col gap-3 md:gap-6 mb-2 md:mb-0">
            <Link href="/" className="font-serif text-xl md:text-2xl tracking-[0.25em] uppercase" data-testid="link-footer-logo">
              <span className="font-light">INTER</span><span className="font-bold">TEXE</span>
            </Link>
            <p className="text-background/60 text-xs md:text-sm leading-relaxed max-w-xs">
              Material-first fashion discovery. We rank designers by what matters most — the quality of their fabrics.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:gap-4">
            <h3 className="text-[10px] md:text-xs uppercase tracking-widest font-medium text-background/40 mb-1 md:mb-2">Explore</h3>
            <Link href="/just-in" className="text-sm text-background/70 hover:text-background transition-colors" data-testid="link-footer-just-in">Just In</Link>
            <Link href="/designers" className="text-sm text-background/70 hover:text-background transition-colors" data-testid="link-footer-designers">Designers</Link>
            <Link href="/materials" className="text-sm text-background/70 hover:text-background transition-colors" data-testid="link-footer-materials">Materials</Link>
            <Link href="/quiz" className="text-sm text-background/70 hover:text-background transition-colors" data-testid="link-footer-quiz">Style Quiz</Link>
          </div>

          <div className="flex flex-col gap-3 md:gap-4">
            <h3 className="text-[10px] md:text-xs uppercase tracking-widest font-medium text-background/40 mb-1 md:mb-2">Account</h3>
            <Link href="/account" className="text-sm text-background/70 hover:text-background transition-colors" data-testid="link-footer-account">My Account</Link>
            <Link href="/account" className="text-sm text-background/70 hover:text-background transition-colors" data-testid="link-footer-wishlist">Wishlist</Link>
            <Link href="/quiz" className="text-sm text-background/70 hover:text-background transition-colors" data-testid="link-footer-quiz-history">Quiz History</Link>
          </div>

          <div className="flex flex-col gap-3 md:gap-4">
            <h3 className="text-[10px] md:text-xs uppercase tracking-widest font-medium text-background/40 mb-1 md:mb-2">Company</h3>
            <Link href="/about" className="text-sm text-background/70 hover:text-background transition-colors" data-testid="link-footer-about">About Us</Link>
            <Link href="/contact" className="text-sm text-background/70 hover:text-background transition-colors" data-testid="link-footer-contact">Contact</Link>
            <Link href="/privacy" className="text-sm text-background/70 hover:text-background transition-colors" data-testid="link-footer-privacy">Privacy Policy</Link>
            <Link href="/terms" className="text-sm text-background/70 hover:text-background transition-colors" data-testid="link-footer-terms">Terms of Service</Link>
          </div>
        </div>

        <div className="border-t border-background/10 mt-10 md:mt-16 pt-6 md:pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] md:text-xs text-background/40 uppercase tracking-widest">
            &copy; {new Date().getFullYear()} Intertexe. All rights reserved.
          </p>
          <div className="flex items-center gap-4 md:gap-6">
            <a href="https://instagram.com/intertexe" target="_blank" rel="noopener noreferrer" className="text-[10px] md:text-xs text-background/40 uppercase tracking-widest hover:text-background transition-colors" data-testid="link-footer-instagram">Instagram</a>
            <a href="https://tiktok.com/@shopintertexe" target="_blank" rel="noopener noreferrer" className="text-[10px] md:text-xs text-background/40 uppercase tracking-widest hover:text-background transition-colors" data-testid="link-footer-tiktok">TikTok</a>
            <a href="https://pinterest.com/shopintertexe" target="_blank" rel="noopener noreferrer" className="text-[10px] md:text-xs text-background/40 uppercase tracking-widest hover:text-background transition-colors" data-testid="link-footer-pinterest">Pinterest</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
