import Image from "next/image";
import {
  formatEgp,
  getPublicContent,
  getPublicNavigation,
  localizedPath,
  publicVehicles,
  type PublicLocale,
} from "../lib/public-content";
import { getPublicVehicles } from "../lib/public-api";
import { AvailabilitySearch } from "./availability-search";
import { AccountEntryLink } from "./account-entry-link";
import { ExperienceMotion } from "./experience-motion";
import { PublicBranchSurface } from "./public-branch-surface";
import { PublicNotificationEntry } from "./public-notification-entry";

type PublicHomeProps = {
  locale: PublicLocale;
};

type IconName =
  | "arrow"
  | "calendar"
  | "car"
  | "check"
  | "clock"
  | "document"
  | "menu"
  | "phone"
  | "pin"
  | "shield"
  | "users"
  | "whatsapp";

const categoryImages = [
  "/images/white-sedan.jpg",
  "/images/silver-sedan.jpg",
  "/images/black-suv.jpg",
  "/images/rahal-hero-gem.png",
] as const;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <path d="m9 18 6-6-6-6" />,
    calendar: (
      <>
        <path d="M8 2v4M16 2v4M3 10h18" />
        <rect x="3" y="4" width="18" height="17" rx="2" />
      </>
    ),
    car: (
      <>
        <path d="m5 17-1 3M19 17l1 3M3 13l2-6h14l2 6v5H3v-5Z" />
        <path d="M7 14h.01M17 14h.01M5 10h14" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    document: (
      <>
        <path d="M6 2h8l4 4v16H6zM14 2v5h5M9 12h6M9 16h6" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    phone: (
      <path d="M6.6 3.5 9 8 6.8 9.4a15 15 0 0 0 7.8 7.8L16 15l4.5 2.4-.8 3.1c-.2.8-.9 1.3-1.7 1.3C9.3 21.8 2.2 14.7 2.2 6c0-.8.5-1.5 1.3-1.7z" />
    ),
    pin: (
      <>
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    shield: <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Zm-3-11 2 2 4-4" />,
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-4 2.5-7 6-7s6 3 6 7M16 5.5a3 3 0 0 1 0 5.8M17 14c2.4.7 4 2.8 4 6" />
      </>
    ),
    whatsapp: (
      <>
        <path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-4.7a8.5 8.5 0 1 1 16.3-3.8Z" />
        <path d="M8 7.5c.5 4 3 6.5 7 7l1.2-1.7-2.4-1.2-1 1c-1.7-.8-2.8-2-3.5-3.5l1-1L9.2 6Z" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className="icon"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">
        {paths[name]}
      </g>
    </svg>
  );
}

export function RahalLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`rahal-logo${compact ? " rahal-logo--compact" : ""}`} aria-hidden="true">
      <Image
        alt=""
        className="rahal-logo__image"
        height={compact ? 104 : 112}
        priority={!compact}
        src="/images/rahal-logo.png"
        width={compact ? 104 : 112}
      />
    </span>
  );
}

export function Header({ locale, languageHref }: PublicHomeProps & { languageHref?: string }) {
  const content = getPublicContent(locale);
  const navigation = getPublicNavigation(locale);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <a
          className="brand-link"
          href={localizedPath(locale)}
          aria-label={locale === "ar" ? "رحال الرئيسية" : "Rahal home"}
        >
          <RahalLogo />
          <span className="brand-tagline">{content.brandTagline}</span>
        </a>

        <nav className="desktop-navigation" aria-label={content.navigationLabel}>
          {navigation.map(([label, href]) => (
            <a href={href} key={href}>
              {label}
            </a>
          ))}
        </nav>

        <div className="header-actions">
          <a
            className="language-switch"
            href={languageHref ?? content.languageHref}
            hrefLang={locale === "ar" ? "en" : "ar"}
          >
            <span className="language-switch__globe" aria-hidden="true">
              ◎
            </span>
            {content.languageLabel}
          </a>
          <AccountEntryLink
            className="button button--dark header-sign-in"
            locale={locale}
            signInLabel={content.signIn}
          />
          <PublicNotificationEntry locale={locale} />
          <details className="mobile-menu">
            <summary aria-label={content.menuLabel}>
              <Icon name="menu" />
            </summary>
            <nav aria-label={content.navigationLabel}>
              {navigation.map(([label, href]) => (
                <a href={href} key={href}>
                  {label}
                </a>
              ))}
              <a href={languageHref ?? content.languageHref}>{content.languageLabel}</a>
              <AccountEntryLink locale={locale} signInLabel={content.signIn} />
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

export function VehicleCard({
  locale,
  vehicle,
  detailsQuery,
  featured = false,
  compact = false,
}: {
  locale: PublicLocale;
  vehicle: (typeof publicVehicles)[number];
  detailsQuery?: string;
  featured?: boolean;
  compact?: boolean;
}) {
  const content = getPublicContent(locale);
  const isAvailable = vehicle.status === "available";

  return (
    <article
      className={`vehicle-card${featured ? " vehicle-card--featured" : ""}${compact ? " vehicle-card--compact" : ""}`}
      data-reveal
      data-tilt
    >
      <div className="vehicle-card__media">
        <Image
          alt={vehicle.imageAlt[locale]}
          fill
          sizes={
            featured
              ? "(max-width: 760px) 100vw, (max-width: 1100px) 60vw, 65vw"
              : "(max-width: 760px) 100vw, (max-width: 1100px) 40vw, 35vw"
          }
          src={vehicle.image}
        />
        <span className={`status-badge status-badge--${vehicle.status}`}>
          <span aria-hidden="true" />
          {isAvailable ? content.available : content.review}
        </span>
      </div>
      <div className="vehicle-card__body">
        <div className="vehicle-card__heading">
          <div>
            <span className="vehicle-card__category">{vehicle.category[locale]}</span>
            <h3>{vehicle.name[locale]}</h3>
          </div>
          <div className="vehicle-card__price">
            <strong>{formatEgp(vehicle.dailyRateEgp, locale)}</strong>
            <small>{content.perDay}</small>
          </div>
        </div>
        <div className="vehicle-card__specs">
          <span>
            <Icon name="clock" size={17} />
            {vehicle.transmission[locale]}
          </span>
          <span>
            <Icon name="users" size={17} />
            {vehicle.seats} {content.seats}
          </span>
        </div>
        <a
          className="button button--outline"
          href={`${localizedPath(locale, "/cars")}/${vehicle.id}${detailsQuery ? `?${detailsQuery}` : ""}`}
        >
          {content.viewDetails}
          <Icon name="arrow" size={17} />
        </a>
      </div>
    </article>
  );
}

function SectionHeading({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {copy ? <p>{copy}</p> : null}
    </div>
  );
}

export function Footer({ locale }: PublicHomeProps) {
  const content = getPublicContent(locale);
  const navigation = getPublicNavigation(locale);

  return (
    <footer className="site-footer" id="contact">
      <div className="container footer-statement">
        <div>
          <span>{locale === "ar" ? "جاهز تختار رحلتك؟" : "READY TO CHOOSE YOUR JOURNEY?"}</span>
          <strong>
            {locale === "ar"
              ? "ابدأ بعربية تناسب مشوارك."
              : "Start with a car that fits the way you move."}
          </strong>
        </div>
        <a href={localizedPath(locale, "/cars")}>
          {content.heroPrimary}
          <Icon name="arrow" size={20} />
        </a>
      </div>
      <div className="container footer-grid">
        <div className="footer-brand">
          <RahalLogo compact />
          <p>{content.footerCopy}</p>
        </div>
        <div>
          <h2>{content.quickLinks}</h2>
          <div className="footer-links">
            {navigation.map(([label, href]) => (
              <a href={href} key={href}>
                {label}
              </a>
            ))}
            <a href={localizedPath(locale, "/reviews")}>
              {locale === "ar" ? "تجارب العملاء" : "Customer reviews"}
            </a>
            <a href={localizedPath(locale, "/faq")}>
              {locale === "ar" ? "الأسئلة الشائعة" : "FAQ"}
            </a>
            <a href={localizedPath(locale, "/terms")}>
              {locale === "ar" ? "شروط الإيجار" : "Rental terms"}
            </a>
            <a href={localizedPath(locale, "/privacy")}>
              {locale === "ar" ? "الخصوصية" : "Privacy"}
            </a>
            <a href={localizedPath(locale, "/cancellation")}>
              {locale === "ar" ? "سياسة الإلغاء" : "Cancellation policy"}
            </a>
          </div>
        </div>
        <div>
          <h2>{content.contact}</h2>
          <PublicBranchSurface locale={locale} variant="footer" />
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} RAHAL</span>
        <span>{content.legal}</span>
      </div>
    </footer>
  );
}

export async function PublicHome({ locale }: PublicHomeProps) {
  const content = getPublicContent(locale);
  const fleetVehicles = await getPublicVehicles();
  const featuredVehicle =
    fleetVehicles.find((vehicle) => vehicle.id === "graphite-suv") ?? fleetVehicles[0];
  const supportingVehicles = fleetVehicles
    .filter((vehicle) => vehicle.id !== featuredVehicle?.id)
    .slice(0, 2);

  if (!featuredVehicle) return null;

  return (
    <div className="public-site" dir={content.dir} lang={content.htmlLang}>
      <ExperienceMotion />
      <a className="skip-link" href="#main-content">
        {content.skip}
      </a>
      <Header locale={locale} />

      <main id="main-content">
        <section className="hero" id="top">
          <Image
            alt=""
            className="hero__image"
            fill
            priority
            sizes="100vw"
            src="/images/rahal-hero-gem.png"
          />
          <div className="hero__overlay" />
          <div className="hero__grain" aria-hidden="true" />
          <div className="hero__edition" aria-hidden="true">
            <span>01</span>
            <span>{locale === "ar" ? "رحال · مصر" : "RAHAL · EGYPT"}</span>
          </div>
          <div className="container hero__content">
            <span className="eyebrow eyebrow--light">{content.heroEyebrow}</span>
            <h1>{content.heroTitle}</h1>
            <p>{content.heroCopy}</p>
            <div className="hero__actions">
              <a className="button button--gold" href={localizedPath(locale, "/cars")}>
                {content.heroPrimary}
                <Icon name="arrow" size={18} />
              </a>
              <a className="button button--glass" href="#process">
                {content.heroSecondary}
              </a>
            </div>
            <div className="hero__badge">
              <Icon name="shield" size={18} />
              {content.heroBadge}
            </div>
          </div>
        </section>

        <div className="container">
          <AvailabilitySearch locale={locale} />
        </div>

        <section className="section fleet-section" id="fleet" data-reveal>
          <div className="container">
            <div className="heading-row">
              <SectionHeading
                eyebrow={content.fleetEyebrow}
                title={content.fleetTitle}
                copy={content.fleetCopy}
              />
              <a className="text-link" href={localizedPath(locale, "/cars")}>
                {content.viewAll}
                <Icon name="arrow" size={17} />
              </a>
            </div>
            <div className="fleet-showcase">
              <VehicleCard featured locale={locale} vehicle={featuredVehicle} />
              <div className="fleet-showcase__supporting">
                {supportingVehicles.map((vehicle) => (
                  <VehicleCard compact key={vehicle.id} locale={locale} vehicle={vehicle} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section categories-section" id="categories" data-reveal>
          <div className="container">
            <SectionHeading eyebrow={content.categoryEyebrow} title={content.categoryTitle} />
            <div className="category-grid">
              {content.categories.map(([title, description, number], index) => (
                <article className="category-card" data-reveal data-tilt key={title}>
                  <Image
                    alt=""
                    className="category-card__image"
                    fill
                    sizes="(max-width: 680px) 100vw, (max-width: 900px) 50vw, 55vw"
                    src={categoryImages[index]}
                  />
                  <div className="category-card__overlay" />
                  <div className="category-card__content">
                    <div className="category-card__meta">
                      <span className="category-card__number">{number}</span>
                      <span className="category-card__icon">
                        <Icon name={(["car", "clock", "users", "shield"] as IconName[])[index]} />
                      </span>
                    </div>
                    <div>
                      <h3>{title}</h3>
                      <p>{description}</p>
                    </div>
                    <a
                      href={`${localizedPath(locale, "/cars")}?${index === 3 ? "driver=with-driver" : `category=${["economy", "sedan", "suv"][index]}`}`}
                      aria-label={`${content.viewAll}: ${title}`}
                    >
                      <span>{content.viewAll}</span>
                      <Icon name="arrow" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section process-section" id="process" data-reveal>
          <div className="container process-layout">
            <div className="process-intro">
              <SectionHeading
                eyebrow={content.processEyebrow}
                title={content.processTitle}
                copy={content.processCopy}
              />
              <div className="process-notice" role="note">
                <Icon name="shield" size={20} />
                <span>{content.processNotice}</span>
              </div>
              <div className="process-seal">
                <RahalLogo compact />
              </div>
            </div>
            <ol className="process-list">
              {content.steps.map(([title, description], index) => (
                <li data-reveal key={title}>
                  <span className="process-list__number">{String(index + 1).padStart(2, "0")}</span>
                  <div className="process-list__copy">
                    <span className="process-list__kicker">
                      {locale === "ar" ? `الخطوة ${index + 1}` : `STEP ${index + 1}`}
                    </span>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                  <span className="process-list__check">
                    <Icon name="check" size={18} />
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="section trust-section" id="trust" data-reveal>
          <div className="container trust-layout">
            <div className="trust-intro">
              <SectionHeading eyebrow={content.trustEyebrow} title={content.trustTitle} />
              <span className="trust-intro__label">
                {locale === "ar" ? "03 · معايير رحال" : "03 · RAHAL STANDARDS"}
              </span>
            </div>
            <div className="trust-grid">
              {content.trustItems.map(([title, description], index) => (
                <article data-reveal data-tilt key={title}>
                  <div className="trust-card__visual" aria-hidden="true">
                    <span className="trust-card__number">0{index + 1}</span>
                    <span className="trust-card__visual-icon">
                      <Icon name={(["document", "users", "shield"] as IconName[])[index]} />
                    </span>
                    <strong>{(["EGP", "1:1", "••••"] as const)[index]}</strong>
                    <span className="trust-card__visual-line" />
                  </div>
                  <div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <PublicBranchSurface locale={locale} />
      </main>

      <Footer locale={locale} />
    </div>
  );
}
