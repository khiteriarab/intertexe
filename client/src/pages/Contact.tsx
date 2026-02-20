import { Mail, MapPin } from "lucide-react";

export default function Contact() {
  return (
    <div className="py-8 md:py-16 max-w-3xl mx-auto w-full flex flex-col gap-10 md:gap-16">
      <header className="flex flex-col gap-4 md:gap-6">
        <span className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground">Get In Touch</span>
        <h1 className="text-3xl md:text-6xl font-serif" data-testid="text-contact-title">Contact Us</h1>
        <p className="text-base md:text-lg text-foreground/80 font-light leading-relaxed max-w-xl">
          Have a question, want to submit a brand for review, or just want to say hello? We'd love to hear from you.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4 p-6 md:p-8 border border-border/40">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Email</span>
            </div>
            <a
              href="mailto:info@intertexe.com"
              className="text-lg md:text-xl font-serif hover:text-muted-foreground transition-colors"
              data-testid="link-contact-email"
            >
              info@intertexe.com
            </a>
            <p className="text-sm text-muted-foreground">
              We typically respond within 24–48 hours.
            </p>
          </div>

          <div className="flex flex-col gap-4 p-6 md:p-8 border border-border/40">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Follow Us</span>
            </div>
            <div className="flex flex-col gap-3">
              <a href="https://instagram.com/intertexe" target="_blank" rel="noopener noreferrer" className="text-sm hover:text-muted-foreground transition-colors" data-testid="link-contact-instagram">
                Instagram — @intertexe
              </a>
              <a href="https://tiktok.com/@intertexe" target="_blank" rel="noopener noreferrer" className="text-sm hover:text-muted-foreground transition-colors" data-testid="link-contact-tiktok">
                TikTok — @intertexe
              </a>
              <a href="https://pinterest.com/shopintertexe" target="_blank" rel="noopener noreferrer" className="text-sm hover:text-muted-foreground transition-colors" data-testid="link-contact-pinterest">
                Pinterest — @shopintertexe
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <h2 className="text-xl md:text-2xl font-serif">Common Inquiries</h2>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 pb-6 border-b border-border/40">
              <h3 className="font-serif text-base md:text-lg">Submit a Brand</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Know a designer committed to natural fibers? Email us their name and website, and our editorial team will review them for inclusion in the directory.
              </p>
            </div>

            <div className="flex flex-col gap-2 pb-6 border-b border-border/40">
              <h3 className="font-serif text-base md:text-lg">Update Brand Information</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                If you're a brand representative and your listing needs updating, reach out with your brand name and the corrections you'd like made.
              </p>
            </div>

            <div className="flex flex-col gap-2 pb-6 border-b border-border/40">
              <h3 className="font-serif text-base md:text-lg">Press & Partnerships</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                For media inquiries, collaborations, or partnership opportunities, please email us directly.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="font-serif text-base md:text-lg">Account Support</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Having trouble with your account, quiz results, or wishlist? Let us know and we'll help sort it out.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
