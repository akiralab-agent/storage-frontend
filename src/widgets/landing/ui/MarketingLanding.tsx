import { useEffect, useState } from "react";

type NavLink = {
  label: string;
  href: string;
};

type FeatureCard = {
  title: string;
  description: string;
  stat: string;
  tone: "blue" | "emerald" | "violet" | "amber" | "rose";
  badge: string;
};

type Step = {
  number: string;
  title: string;
  description: string;
  bullets: string[];
};

type Testimonial = {
  quote: string;
  author: string;
  role: string;
  company: string;
  location: string;
  metric: string;
};

type Plan = {
  name: string;
  description: string;
  price: string;
  period: string;
  facilities: string;
  units: string;
  cta: string;
  popular: boolean;
  features: Array<{ label: string; included: boolean }>;
};

const NAV_LINKS: NavLink[] = [
  { label: "Features", href: "#features" },
  { label: "Dashboard", href: "#dashboard" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" }
];

const TRUSTED_BRANDS = ["SecureStore", "MetroStorage", "HomeSafe", "CityLockers", "NationalVault"];

const FEATURE_CARDS: FeatureCard[] = [
  {
    title: "Multi-Facility Management",
    description:
      "Manage all your locations from one dashboard with real-time synchronization and centralized reporting.",
    stat: "Unlimited facilities",
    tone: "blue",
    badge: "MF"
  },
  {
    title: "Automated Billing and Autopay",
    description:
      "Reduce late payments with automated invoicing, autopay, and smart retry logic for failed charges.",
    stat: "60% fewer late payments",
    tone: "emerald",
    badge: "AB"
  },
  {
    title: "Access Control Integration",
    description:
      "Gate and unit access automation with immediate lock and unlock actions based on payment status.",
    stat: "Real-time access",
    tone: "violet",
    badge: "AC"
  },
  {
    title: "Occupancy and Delinquency Insights",
    description:
      "Visual unit maps, aging reports, and workflows that protect occupancy and recurring revenue.",
    stat: "Live occupancy",
    tone: "amber",
    badge: "OI"
  },
  {
    title: "Mobile-First Operations",
    description:
      "Managers can operate from phone or tablet with fast actions for tenants, billing, and unit status.",
    stat: "iOS and Android",
    tone: "rose",
    badge: "MO"
  }
];

const DASHBOARD_BULLETS = [
  "Real-time occupancy tracking across all facilities",
  "Automated billing with autopay and retry logic",
  "Visual unit map with color-coded status",
  "Delinquency aging reports and workflows",
  "Gate access logs and remote control",
  "Financial reports and tax documentation"
];

const DASHBOARD_STATS = [
  { label: "Active Tenants", value: "2,847" },
  { label: "Monthly Revenue", value: "$145.2K" },
  { label: "Occupancy Rate", value: "92.4%" },
  { label: "System Uptime", value: "99.9%" }
];

const STEPS: Step[] = [
  {
    number: "01",
    title: "Connect",
    description:
      "Import facilities, units, and tenant data in minutes with migration support from your current system.",
    bullets: ["Bulk data import", "Excel and CSV support", "Integration-ready setup"]
  },
  {
    number: "02",
    title: "Automate",
    description:
      "Set billing schedules, access policies, and tenant notifications once and run operations consistently.",
    bullets: ["Auto billing rules", "Access policies", "Collection alerts"]
  },
  {
    number: "03",
    title: "Scale",
    description:
      "Operate more facilities with the same team and keep visibility over occupancy and revenue.",
    bullets: ["Multi-facility overview", "Team permissions", "Growth analytics"]
  }
];

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "StoragePro transformed how we manage our 12 facilities. Automated billing alone saved us 20 hours per week.",
    author: "Michael Rodriguez",
    role: "Operations Director",
    company: "Metro Storage Group",
    location: "Houston, TX",
    metric: "20 hrs/week saved"
  },
  {
    quote:
      "The visual unit map is a game changer. Managers see occupancy instantly and resolve issues from mobile.",
    author: "Sarah Chen",
    role: "Owner",
    company: "SecureSpace Storage",
    location: "Phoenix, AZ",
    metric: "40% faster operations"
  },
  {
    quote:
      "We switched from a legacy stack and increased our collection rate by 35% with autopay and retry flows.",
    author: "David Thompson",
    role: "General Manager",
    company: "American Self Storage",
    location: "Atlanta, GA",
    metric: "35% more collections"
  }
];

const PLANS: Plan[] = [
  {
    name: "Starter",
    description: "Best for single-facility operators",
    price: "$99",
    period: "per month",
    facilities: "1",
    units: "100",
    cta: "Start Free Trial",
    popular: false,
    features: [
      { label: "1 facility", included: true },
      { label: "Up to 100 units", included: true },
      { label: "Automated billing", included: true },
      { label: "Tenant portal", included: true },
      { label: "Multi-facility dashboard", included: false },
      { label: "API access", included: false }
    ]
  },
  {
    name: "Professional",
    description: "For growing multi-facility teams",
    price: "$249",
    period: "per month",
    facilities: "5",
    units: "500",
    cta: "Start Free Trial",
    popular: true,
    features: [
      { label: "Up to 5 facilities", included: true },
      { label: "Up to 500 units", included: true },
      { label: "Automated billing and autopay", included: true },
      { label: "Access control integration", included: true },
      { label: "Priority support", included: true },
      { label: "Dedicated account manager", included: false }
    ]
  },
  {
    name: "Enterprise",
    description: "For operators with custom requirements",
    price: "Custom",
    period: "contact sales",
    facilities: "Unlimited",
    units: "Unlimited",
    cta: "Contact Sales",
    popular: false,
    features: [
      { label: "Unlimited facilities", included: true },
      { label: "Unlimited units", included: true },
      { label: "Custom analytics", included: true },
      { label: "White-label tenant portal", included: true },
      { label: "Full API access", included: true },
      { label: "Dedicated account manager", included: true }
    ]
  }
];

const FOOTER_LINKS: Record<string, string[]> = {
  Product: ["Features", "Dashboard", "Mobile App", "Integrations", "Pricing"],
  Company: ["About", "Careers", "Blog", "Press Kit", "Contact"],
  Resources: ["Documentation", "API Reference", "Help Center", "Webinars", "Community"],
  Legal: ["Privacy Policy", "Terms of Service", "Security", "GDPR", "Cookie Policy"]
};

export default function MarketingLanding() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 16);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(".lp-scroll-animate"));

    if (!elements.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          entry.target.classList.add("lp-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.15
      }
    );

    elements.forEach((element) => {
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const year = new Date().getFullYear();

  const scrollToSection = (href: string) => {
    const target = document.querySelector<HTMLElement>(href);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setIsMobileOpen(false);
  };

  return (
    <div className="lp-root">
      <header className={`lp-navbar${isScrolled ? " lp-navbar--scrolled" : ""}`}>
        <div className="lp-container lp-navbar__inner">
          <a
            href="#top"
            className="lp-brand"
            onClick={(event) => {
              event.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <span className="lp-brand__icon">SP</span>
            <span className="lp-brand__text">StoragePro</span>
          </a>

          <nav className="lp-navbar__links" aria-label="Main navigation">
            {NAV_LINKS.map((link) => (
              <button
                key={link.label}
                type="button"
                className="lp-link-button"
                onClick={() => scrollToSection(link.href)}
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="lp-navbar__actions">
            <a className="lp-btn lp-btn--ghost" href="/status">
              Sign In
            </a>
            <a className="lp-btn lp-btn--primary" href="/status">
              Start Free Trial
            </a>
          </div>

          <button
            type="button"
            className="lp-mobile-toggle"
            aria-expanded={isMobileOpen}
            aria-label="Toggle menu"
            onClick={() => setIsMobileOpen((value) => !value)}
          >
            {isMobileOpen ? "Close" : "Menu"}
          </button>
        </div>

        {isMobileOpen && (
          <div className="lp-container lp-mobile-menu">
            {NAV_LINKS.map((link) => (
              <button
                key={link.label}
                type="button"
                className="lp-mobile-menu__item"
                onClick={() => scrollToSection(link.href)}
              >
                {link.label}
              </button>
            ))}
            <a className="lp-btn lp-btn--ghost" href="/status">
              Sign In
            </a>
            <a className="lp-btn lp-btn--primary" href="/status">
              Start Free Trial
            </a>
          </div>
        )}
      </header>

      <main id="top">
        <section className="lp-hero">
          <div className="lp-hero__pattern" aria-hidden="true" />
          <div className="lp-hero__orb lp-hero__orb--one" aria-hidden="true" />
          <div className="lp-hero__orb lp-hero__orb--two" aria-hidden="true" />

          <div className="lp-container lp-hero__grid">
            <div className="lp-hero__copy">
              <span className="lp-scroll-animate lp-chip" style={{ transitionDelay: "40ms" }}>
                Trusted by 500+ self storage facilities
              </span>
              <h1 className="lp-scroll-animate" style={{ transitionDelay: "120ms" }}>
                The all-in-one platform for <span>self storage</span> management
              </h1>
              <p className="lp-scroll-animate" style={{ transitionDelay: "180ms" }}>
                Streamline operations across facilities with billing automation, access control, and
                real-time occupancy insights for US operators.
              </p>
              <div className="lp-scroll-animate lp-hero__cta" style={{ transitionDelay: "240ms" }}>
                <a className="lp-btn lp-btn--primary lp-btn--large" href="/status">
                  Start Free Trial
                </a>
                <button type="button" className="lp-btn lp-btn--outline lp-btn--large">
                  Watch Demo
                </button>
              </div>
              <div
                className="lp-scroll-animate lp-trust-flags"
                style={{ transitionDelay: "300ms" }}
              >
                <span>
                  <i className="lp-dot lp-dot--emerald" />
                  SOC 2 Compliant
                </span>
                <span>
                  <i className="lp-dot lp-dot--blue" />
                  99.9% Uptime
                </span>
                <span>
                  <i className="lp-dot lp-dot--amber" />
                  24/7 Support
                </span>
              </div>
            </div>

            <div className="lp-scroll-animate lp-hero__media" style={{ transitionDelay: "220ms" }}>
              <div className="lp-hero__media-glow" aria-hidden="true" />
              <div className="lp-hero__image-shell">
                <img src="/dashboard-mockup.jpg" alt="Storage dashboard preview" />
                <div className="lp-glass lp-hero__stats">
                  <div>
                    <strong>87%</strong>
                    <small>Occupancy</small>
                  </div>
                  <div>
                    <strong>$45.2K</strong>
                    <small>MRR</small>
                  </div>
                  <div>
                    <strong>12</strong>
                    <small>Delinquent</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-trust">
          <div className="lp-container">
            <p className="lp-section__eyebrow">
              Trusted by leading self storage operators across the US
            </p>
            <div className="lp-trust__list">
              {TRUSTED_BRANDS.map((name, index) => (
                <span
                  key={name}
                  className="lp-scroll-animate lp-trust__item"
                  style={{ transitionDelay: `${index * 80 + 80}ms` }}
                >
                  <i>{name.slice(0, 2).toUpperCase()}</i>
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="lp-section lp-section--muted">
          <div className="lp-container">
            <div className="lp-section__header">
              <span
                className="lp-scroll-animate lp-section__label"
                style={{ transitionDelay: "20ms" }}
              >
                Features
              </span>
              <h2 className="lp-scroll-animate" style={{ transitionDelay: "90ms" }}>
                Everything you need to run your self storage business
              </h2>
              <p className="lp-scroll-animate" style={{ transitionDelay: "160ms" }}>
                From billing to access control, the platform gives operators a complete operational
                toolkit.
              </p>
            </div>

            <div className="lp-grid lp-grid--features">
              {FEATURE_CARDS.map((feature, index) => (
                <article
                  key={feature.title}
                  className="lp-scroll-animate lp-card lp-card--feature"
                  style={{ transitionDelay: `${index * 80 + 180}ms` }}
                >
                  <span className={`lp-feature-icon lp-feature-icon--${feature.tone}`}>
                    {feature.badge}
                  </span>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                  <footer>
                    <span>{feature.stat}</span>
                    <b aria-hidden="true">-&gt;</b>
                  </footer>
                </article>
              ))}
            </div>

            <div className="lp-scroll-animate lp-chip-grid" style={{ transitionDelay: "520ms" }}>
              {[
                "Tenant portal",
                "E-sign leases",
                "Insurance integration",
                "Auction management"
              ].map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
        </section>

        <section id="dashboard" className="lp-section lp-section--white">
          <div className="lp-container lp-grid lp-grid--dashboard">
            <div
              className="lp-scroll-animate lp-dashboard-media"
              style={{ transitionDelay: "40ms" }}
            >
              <div className="lp-dashboard-media__glow" aria-hidden="true" />
              <div className="lp-dashboard-media__main">
                <img src="/dashboard-mockup.jpg" alt="StoragePro dashboard" />
                <span className="lp-glass lp-live-pill">Live data</span>
              </div>
              <img
                className="lp-dashboard-media__mobile"
                src="/mobile-app.jpg"
                alt="StoragePro mobile app"
              />
            </div>

            <div className="lp-dashboard-copy">
              <span
                className="lp-scroll-animate lp-section__label"
                style={{ transitionDelay: "80ms" }}
              >
                Dashboard
              </span>
              <h2 className="lp-scroll-animate" style={{ transitionDelay: "140ms" }}>
                Your command center for operations
              </h2>
              <p className="lp-scroll-animate" style={{ transitionDelay: "200ms" }}>
                Occupancy, revenue, delinquency, and access logs in one operational view.
              </p>

              <div className="lp-scroll-animate lp-check-grid" style={{ transitionDelay: "280ms" }}>
                {DASHBOARD_BULLETS.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>

              <div className="lp-scroll-animate lp-stat-grid" style={{ transitionDelay: "340ms" }}>
                {DASHBOARD_STATS.map((item) => (
                  <article key={item.label}>
                    <strong>{item.value}</strong>
                    <small>{item.label}</small>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="lp-section lp-section--muted">
          <div className="lp-container">
            <div className="lp-section__header">
              <span
                className="lp-scroll-animate lp-section__label"
                style={{ transitionDelay: "20ms" }}
              >
                How It Works
              </span>
              <h2 className="lp-scroll-animate" style={{ transitionDelay: "90ms" }}>
                Get started in three simple steps
              </h2>
              <p className="lp-scroll-animate" style={{ transitionDelay: "160ms" }}>
                Setup, automate, and scale with onboarding designed for storage teams.
              </p>
            </div>

            <div className="lp-grid lp-grid--steps">
              {STEPS.map((step, index) => (
                <article
                  key={step.title}
                  className="lp-scroll-animate lp-card lp-card--step"
                  style={{ transitionDelay: `${index * 90 + 180}ms` }}
                >
                  <span className="lp-step-tag">Step {step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                  <ul>
                    {step.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section lp-section--white">
          <div className="lp-container">
            <div className="lp-section__header">
              <span
                className="lp-scroll-animate lp-section__label"
                style={{ transitionDelay: "20ms" }}
              >
                Testimonials
              </span>
              <h2 className="lp-scroll-animate" style={{ transitionDelay: "90ms" }}>
                Loved by self storage operators
              </h2>
              <p className="lp-scroll-animate" style={{ transitionDelay: "160ms" }}>
                Operators across the US report less manual work and better collections.
              </p>
            </div>

            <div className="lp-grid lp-grid--testimonials">
              {TESTIMONIALS.map((testimonial, index) => (
                <article
                  key={testimonial.author}
                  className="lp-scroll-animate lp-card lp-card--testimonial"
                  style={{ transitionDelay: `${index * 90 + 180}ms` }}
                >
                  <div className="lp-stars" aria-hidden="true">
                    *****
                  </div>
                  <p className="lp-quote">"{testimonial.quote}"</p>
                  <span className="lp-metric">{testimonial.metric}</span>
                  <footer>
                    <div className="lp-avatar">{testimonial.author.charAt(0)}</div>
                    <div>
                      <strong>{testimonial.author}</strong>
                      <small>
                        {testimonial.role}, {testimonial.company}
                      </small>
                      <small>{testimonial.location}</small>
                    </div>
                  </footer>
                </article>
              ))}
            </div>

            <div className="lp-scroll-animate lp-proof-bar" style={{ transitionDelay: "480ms" }}>
              {[
                { value: "500+", label: "Facilities managed" },
                { value: "$50M+", label: "Revenue processed" },
                { value: "98%", label: "Customer satisfaction" },
                { value: "24/7", label: "Support available" }
              ].map((proof) => (
                <article key={proof.label}>
                  <strong>{proof.value}</strong>
                  <small>{proof.label}</small>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="lp-section lp-section--muted">
          <div className="lp-container">
            <div className="lp-section__header">
              <span
                className="lp-scroll-animate lp-section__label"
                style={{ transitionDelay: "20ms" }}
              >
                Pricing
              </span>
              <h2 className="lp-scroll-animate" style={{ transitionDelay: "90ms" }}>
                Simple and transparent plans
              </h2>
              <p className="lp-scroll-animate" style={{ transitionDelay: "160ms" }}>
                Start with a free trial and scale pricing with your portfolio size.
              </p>
            </div>

            <div className="lp-grid lp-grid--pricing">
              {PLANS.map((plan, index) => (
                <article
                  key={plan.name}
                  className={`lp-scroll-animate lp-card lp-card--pricing${plan.popular ? " lp-card--popular" : ""}`}
                  style={{ transitionDelay: `${index * 100 + 180}ms` }}
                >
                  {plan.popular && <span className="lp-popular-tag">Most Popular</span>}
                  <h3>{plan.name}</h3>
                  <p className="lp-plan-desc">{plan.description}</p>
                  <div className="lp-price-row">
                    <strong>{plan.price}</strong>
                    <small>{plan.period}</small>
                  </div>
                  <div className="lp-limits">
                    <span>
                      <small>Facilities</small>
                      {plan.facilities}
                    </span>
                    <span>
                      <small>Units</small>
                      {plan.units}
                    </span>
                  </div>
                  <ul className="lp-plan-features">
                    {plan.features.map((feature) => (
                      <li key={feature.label} className={feature.included ? "" : "lp-disabled"}>
                        {feature.included ? "+" : "-"} {feature.label}
                      </li>
                    ))}
                  </ul>
                  <a
                    className={`lp-btn ${plan.popular ? "lp-btn--primary" : "lp-btn--dark"}`}
                    href="/status"
                  >
                    {plan.cta}
                  </a>
                </article>
              ))}
            </div>

            <p className="lp-scroll-animate lp-pricing-note" style={{ transitionDelay: "520ms" }}>
              All plans include a 14-day free trial. No credit card required.
            </p>
          </div>
        </section>

        <section className="lp-final-cta">
          <div className="lp-final-cta__pattern" aria-hidden="true" />
          <div className="lp-container lp-final-cta__content">
            <span className="lp-scroll-animate lp-chip" style={{ transitionDelay: "40ms" }}>
              Start your free trial today
            </span>
            <h2 className="lp-scroll-animate" style={{ transitionDelay: "120ms" }}>
              Ready to transform your storage business?
            </h2>
            <p className="lp-scroll-animate" style={{ transitionDelay: "180ms" }}>
              Join operators reducing manual work and improving collections with one platform.
            </p>
            <div
              className="lp-scroll-animate lp-final-cta__actions"
              style={{ transitionDelay: "240ms" }}
            >
              <a className="lp-btn lp-btn--primary lp-btn--large" href="/status">
                Start 14-Day Free Trial
              </a>
              <button type="button" className="lp-btn lp-btn--outline lp-btn--large">
                Schedule Demo
              </button>
            </div>
            <div className="lp-scroll-animate lp-trust-flags" style={{ transitionDelay: "300ms" }}>
              <span>
                <i className="lp-dot lp-dot--emerald" />
                No credit card required
              </span>
              <span>
                <i className="lp-dot lp-dot--blue" />
                14-day trial
              </span>
              <span>
                <i className="lp-dot lp-dot--amber" />
                Cancel anytime
              </span>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer__top">
            <div>
              <a href="#top" className="lp-brand">
                <span className="lp-brand__icon">SP</span>
                <span className="lp-brand__text">StoragePro</span>
              </a>
              <p className="lp-footer__about">
                The all-in-one platform for self storage management. Built for US operators and
                designed for growth.
              </p>
              <p className="lp-footer__contact">
                hello@storagepro.com | 1-800-STOR-PRO | Austin, Texas, USA
              </p>
            </div>

            {Object.entries(FOOTER_LINKS).map(([title, links]) => (
              <div key={title}>
                <h3>{title}</h3>
                <ul>
                  {links.map((label) => (
                    <li key={label}>
                      <a href="#">{label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="lp-footer__newsletter">
            <div>
              <h3>Stay Updated</h3>
              <p>Get the latest product news from StoragePro.</p>
            </div>
            <form
              className="lp-news-form"
              onSubmit={(event) => {
                event.preventDefault();
              }}
            >
              <input type="email" placeholder="Enter your email" aria-label="Email" />
              <button type="submit">Subscribe</button>
            </form>
          </div>

          <div className="lp-footer__bottom">
            <p>Copyright {year} StoragePro. All rights reserved.</p>
            <div className="lp-socials">
              <a href="#">Li</a>
              <a href="#">Tw</a>
              <a href="#">Fb</a>
              <a href="#">Yt</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
