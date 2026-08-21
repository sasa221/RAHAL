"use client";

import type {
  SiteContentCta,
  SiteContentDocument,
  SiteContentKey,
  SiteContentTranslation,
} from "@rahal/contracts";

type Props = {
  document: SiteContentDocument;
  locale: "ar" | "en";
  onChange(document: SiteContentDocument): void;
};

const labels = {
  ar: {
    small: "العنوان التعريفي الصغير",
    title: "العنوان الرئيسي",
    description: "الوصف",
    badge: "رسالة الثقة",
    label: "نص الزر",
    destination: "نوع الوجهة",
    href: "الرابط أو القسم",
    media: "رابط الصورة أو الفيديو أو 3D",
    alt: "وصف الوسائط",
    visible: "إظهار القسم",
    notice: "التنبيه المهم",
    itemTitle: "العنوان",
    itemDescription: "الوصف",
    icon: "الأيقونة",
    add: "إضافة عنصر",
    remove: "حذف",
    up: "تحريك لأعلى",
    down: "تحريك لأسفل",
    intro: "المقدمة",
    statement: "الرسالة الأساسية",
    image: "رابط الصورة الاختيارية",
    question: "السؤال",
    answer: "الإجابة",
    category: "التصنيف",
    published: "منشور",
    phone: "رقم هاتف دولي",
    email: "البريد الإلكتروني",
    address: "العنوان",
    hours: "ساعات العمل",
    platform: "اسم منصة التواصل",
    url: "الرابط",
    whatsapp: "رقم واتساب اليدوي",
    whatsappMessage: "رسالة افتتاحية",
    showWhatsapp: "إظهار زر واتساب",
  },
  en: {
    small: "Small heading",
    title: "Primary title",
    description: "Description",
    badge: "Trust message",
    label: "Button label",
    destination: "Destination type",
    href: "Link or section",
    media: "Image, video, or 3D URL",
    alt: "Media description",
    visible: "Show section",
    notice: "Important notice",
    itemTitle: "Title",
    itemDescription: "Description",
    icon: "Icon",
    add: "Add item",
    remove: "Remove",
    up: "Move up",
    down: "Move down",
    intro: "Introduction",
    statement: "Key statement",
    image: "Optional image URL",
    question: "Question",
    answer: "Answer",
    category: "Category",
    published: "Published",
    phone: "International phone number",
    email: "Email address",
    address: "Address",
    hours: "Working hours",
    platform: "Social platform",
    url: "URL",
    whatsapp: "Manual WhatsApp number",
    whatsappMessage: "Opening message",
    showWhatsapp: "Show WhatsApp button",
  },
} as const;

export function createContentDocument(
  key: SiteContentKey,
  locale: "ar" | "en",
  legacy?: SiteContentTranslation,
): SiteContentDocument {
  if (legacy?.document?.kind === key) return structuredClone(legacy.document);
  const eyebrow = legacy?.eyebrow ?? "";
  const title = legacy?.title ?? "";
  const introduction = legacy?.introduction ?? "";
  const statement = legacy?.statement ?? "";
  const items = legacy?.items ?? [];
  if (key === "HOME_HERO")
    return {
      kind: key,
      eyebrow,
      title,
      description: introduction,
      badge: statement,
      primaryCta: {
        label: locale === "ar" ? "استعرض السيارات" : "Browse cars",
        destinationType: "INTERNAL",
        href: locale === "ar" ? "/cars" : "/en/cars",
      },
      secondaryCta: {
        label: locale === "ar" ? "طريقة الحجز" : "How it works",
        destinationType: "SECTION",
        href: "#process",
      },
      media: {
        type: "IMAGE",
        url: "/images/rahal-hero-gem-clean.png",
        alt: locale === "ar" ? "سيارة رحال" : "Rahal car",
      },
      visible: true,
    };
  if (key === "HOME_PROCESS" || key === "HOME_TRUST")
    return {
      kind: key,
      eyebrow,
      title,
      description: introduction,
      ...(key === "HOME_PROCESS" ? { notice: statement } : {}),
      items: items.map((item, index) => ({
        id: `item-${index + 1}`,
        title: item.title,
        description: item.body,
        icon: key === "HOME_PROCESS" ? "check" : "shield",
      })),
    } as SiteContentDocument;
  if (key === "FAQ")
    return {
      kind: key,
      eyebrow,
      title,
      introduction,
      items: items.map((item, index) => ({
        id: `item-${index + 1}`,
        question: item.title,
        answer: item.body,
        category: locale === "ar" ? "عام" : "General",
        published: true,
      })),
    };
  if (key === "CONTACT")
    return {
      kind: key,
      eyebrow,
      title,
      introduction,
      phones: [],
      email: "",
      address: statement,
      workingHours:
        locale === "ar" ? "السبت إلى الخميس، 9 ص–9 م" : "Saturday to Thursday, 9 AM–9 PM",
      socialLinks: [],
      whatsapp: { number: "", message: "", visible: false },
    };
  return {
    kind: key,
    eyebrow,
    title,
    introduction,
    statement,
    sections: items.map((item, index) => ({
      id: `item-${index + 1}`,
      title: item.title,
      body: item.body,
      imageUrl: null,
    })),
    cta: null,
  };
}

export function TypedContentEditor({ document, locale, onChange }: Props) {
  if (document.kind === "HOME_HERO")
    return <HeroEditor document={document} locale={locale} onChange={onChange} />;
  if (document.kind === "HOME_PROCESS" || document.kind === "HOME_TRUST")
    return <OrderedEditor document={document} locale={locale} onChange={onChange} />;
  if (document.kind === "FAQ")
    return <FaqEditor document={document} locale={locale} onChange={onChange} />;
  if (document.kind === "CONTACT")
    return <ContactEditor document={document} locale={locale} onChange={onChange} />;
  return <EditorialEditor document={document} locale={locale} onChange={onChange} />;
}

export function TypedContentPreview({
  document,
  emptyText,
}: {
  document: SiteContentDocument;
  emptyText: string;
}) {
  const heading = "title" in document ? document.title : "";
  if (!heading.trim()) return <p>{emptyText}</p>;

  if (document.kind === "HOME_HERO") {
    return (
      <div className="content-studio__preview-hero">
        <small>{document.eyebrow}</small>
        <h2>{document.title}</h2>
        <p>{document.description}</p>
        <strong>{document.badge}</strong>
        <div className="content-studio__preview-actions">
          <span>{document.primaryCta.label}</span>
          <span>{document.secondaryCta.label}</span>
        </div>
      </div>
    );
  }

  if (document.kind === "HOME_PROCESS" || document.kind === "HOME_TRUST") {
    return (
      <PreviewFrame
        eyebrow={document.eyebrow}
        introduction={document.description}
        items={document.items.map((item) => ({
          id: item.id,
          title: item.title,
          body: item.description,
        }))}
        statement={document.kind === "HOME_PROCESS" ? document.notice : ""}
        title={document.title}
      />
    );
  }

  if (document.kind === "FAQ") {
    return (
      <PreviewFrame
        eyebrow={document.eyebrow}
        introduction={document.introduction}
        items={document.items
          .filter((item) => item.published)
          .map((item) => ({ id: item.id, title: item.question, body: item.answer }))}
        title={document.title}
      />
    );
  }

  if (document.kind === "CONTACT") {
    return (
      <PreviewFrame
        eyebrow={document.eyebrow}
        introduction={document.introduction}
        items={[
          ...document.phones.map((phone) => ({
            id: phone,
            title: phone,
            body: document.workingHours,
          })),
          ...(document.email
            ? [{ id: document.email, title: document.email, body: document.address }]
            : []),
          ...document.socialLinks.map((social) => ({
            id: social.id,
            title: social.platform,
            body: social.url,
          })),
        ]}
        title={document.title}
      />
    );
  }

  return (
    <PreviewFrame
      eyebrow={document.eyebrow}
      introduction={document.introduction}
      items={document.sections.map((section) => ({
        id: section.id,
        title: section.title,
        body: section.body,
      }))}
      statement={document.statement}
      title={document.title}
    />
  );
}

function PreviewFrame({
  eyebrow,
  title,
  introduction,
  statement = "",
  items,
}: {
  eyebrow: string;
  title: string;
  introduction: string;
  statement?: string;
  items: Array<{ id: string; title: string; body: string }>;
}) {
  return (
    <div>
      <small>{eyebrow}</small>
      <h2>{title}</h2>
      <p>{introduction}</p>
      {statement ? <strong>{statement}</strong> : null}
      {items.map((item, index) => (
        <article key={item.id}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <h3>{item.title}</h3>
          <p>{item.body}</p>
        </article>
      ))}
    </div>
  );
}

function HeroEditor({
  document,
  locale,
  onChange,
}: Props & { document: Extract<SiteContentDocument, { kind: "HOME_HERO" }> }) {
  const t = labels[locale];
  const patch = (value: Partial<typeof document>) => onChange({ ...document, ...value });
  return (
    <div className="content-studio__fields">
      <Field label={t.small} value={document.eyebrow} onChange={(eyebrow) => patch({ eyebrow })} />
      <Field label={t.title} value={document.title} onChange={(title) => patch({ title })} />
      <Field
        area
        label={t.description}
        value={document.description}
        onChange={(description) => patch({ description })}
      />
      <Field label={t.badge} value={document.badge} onChange={(badge) => patch({ badge })} />
      <CtaEditor
        cta={document.primaryCta}
        locale={locale}
        onChange={(primaryCta) => patch({ primaryCta })}
      />
      <CtaEditor
        cta={document.secondaryCta}
        locale={locale}
        onChange={(secondaryCta) => patch({ secondaryCta })}
      />
      <label>
        <span>{t.media}</span>
        <input
          value={document.media.url}
          onChange={(event) => patch({ media: { ...document.media, url: event.target.value } })}
        />
      </label>
      <Field
        label={t.alt}
        value={document.media.alt}
        onChange={(alt) => patch({ media: { ...document.media, alt } })}
      />
      <Check
        label={t.visible}
        checked={document.visible}
        onChange={(visible) => patch({ visible })}
      />
    </div>
  );
}

function CtaEditor({
  cta,
  locale,
  onChange,
}: {
  cta: SiteContentCta;
  locale: "ar" | "en";
  onChange(value: SiteContentCta): void;
}) {
  const t = labels[locale];
  return (
    <fieldset className="content-studio__group">
      <Field label={t.label} value={cta.label} onChange={(label) => onChange({ ...cta, label })} />
      <label>
        <span>{t.destination}</span>
        <select
          value={cta.destinationType}
          onChange={(event) =>
            onChange({
              ...cta,
              destinationType: event.target.value as SiteContentCta["destinationType"],
            })
          }
        >
          <option value="INTERNAL">{locale === "ar" ? "صفحة داخل الموقع" : "Internal page"}</option>
          <option value="SECTION">{locale === "ar" ? "قسم في الصفحة" : "Page section"}</option>
          <option value="EXTERNAL">{locale === "ar" ? "موقع خارجي" : "External website"}</option>
        </select>
      </label>
      <Field label={t.href} value={cta.href} onChange={(href) => onChange({ ...cta, href })} />
    </fieldset>
  );
}

function OrderedEditor({
  document,
  locale,
  onChange,
}: Props & { document: Extract<SiteContentDocument, { kind: "HOME_PROCESS" | "HOME_TRUST" }> }) {
  const t = labels[locale];
  const patch = (value: Partial<typeof document>) =>
    onChange({ ...document, ...value } as SiteContentDocument);
  return (
    <>
      <div className="content-studio__fields">
        <Field
          label={t.small}
          value={document.eyebrow}
          onChange={(eyebrow) => patch({ eyebrow })}
        />
        <Field label={t.title} value={document.title} onChange={(title) => patch({ title })} />
        <Field
          area
          label={t.description}
          value={document.description}
          onChange={(description) => patch({ description })}
        />
        {document.kind === "HOME_PROCESS" ? (
          <Field
            label={t.notice}
            value={document.notice}
            onChange={(notice) => patch({ notice })}
          />
        ) : null}
      </div>
      <List
        items={document.items}
        locale={locale}
        add={() =>
          patch({
            items: [
              ...document.items,
              {
                id: crypto.randomUUID(),
                title: "",
                description: "",
                icon: document.kind === "HOME_PROCESS" ? "check" : "shield",
              },
            ],
          })
        }
        remove={(index) => patch({ items: document.items.filter((_, i) => i !== index) })}
        move={(from, to) => patch({ items: move(document.items, from, to) })}
        render={(item, index) => (
          <>
            <Field
              label={t.itemTitle}
              value={item.title}
              onChange={(title) =>
                patch({
                  items: document.items.map((row, i) => (i === index ? { ...row, title } : row)),
                })
              }
            />
            <Field
              area
              label={t.itemDescription}
              value={item.description}
              onChange={(description) =>
                patch({
                  items: document.items.map((row, i) =>
                    i === index ? { ...row, description } : row,
                  ),
                })
              }
            />
            <Field
              label={t.icon}
              value={item.icon}
              onChange={(icon) =>
                patch({
                  items: document.items.map((row, i) => (i === index ? { ...row, icon } : row)),
                })
              }
            />
          </>
        )}
      />
    </>
  );
}

function EditorialEditor({
  document,
  locale,
  onChange,
}: Props & { document: Extract<SiteContentDocument, { kind: "ABOUT" | "HOW_IT_WORKS" }> }) {
  const t = labels[locale];
  const patch = (value: Partial<typeof document>) =>
    onChange({ ...document, ...value } as SiteContentDocument);
  return (
    <>
      <div className="content-studio__fields">
        <Field
          label={t.small}
          value={document.eyebrow}
          onChange={(eyebrow) => patch({ eyebrow })}
        />
        <Field label={t.title} value={document.title} onChange={(title) => patch({ title })} />
        <Field
          area
          label={t.intro}
          value={document.introduction}
          onChange={(introduction) => patch({ introduction })}
        />
        <Field
          area
          label={t.statement}
          value={document.statement}
          onChange={(statement) => patch({ statement })}
        />
      </div>
      <List
        items={document.sections}
        locale={locale}
        add={() =>
          patch({
            sections: [
              ...document.sections,
              { id: crypto.randomUUID(), title: "", body: "", imageUrl: null },
            ],
          })
        }
        remove={(index) => patch({ sections: document.sections.filter((_, i) => i !== index) })}
        move={(from, to) => patch({ sections: move(document.sections, from, to) })}
        render={(item, index) => (
          <>
            <Field
              label={t.itemTitle}
              value={item.title}
              onChange={(title) =>
                patch({
                  sections: document.sections.map((row, i) =>
                    i === index ? { ...row, title } : row,
                  ),
                })
              }
            />
            <Field
              area
              label={t.itemDescription}
              value={item.body}
              onChange={(body) =>
                patch({
                  sections: document.sections.map((row, i) =>
                    i === index ? { ...row, body } : row,
                  ),
                })
              }
            />
            <Field
              label={t.image}
              value={item.imageUrl ?? ""}
              onChange={(imageUrl) =>
                patch({
                  sections: document.sections.map((row, i) =>
                    i === index ? { ...row, imageUrl: imageUrl || null } : row,
                  ),
                })
              }
            />
          </>
        )}
      />
    </>
  );
}

function FaqEditor({
  document,
  locale,
  onChange,
}: Props & { document: Extract<SiteContentDocument, { kind: "FAQ" }> }) {
  const t = labels[locale];
  const patch = (value: Partial<typeof document>) => onChange({ ...document, ...value });
  return (
    <>
      <div className="content-studio__fields">
        <Field
          label={t.small}
          value={document.eyebrow}
          onChange={(eyebrow) => patch({ eyebrow })}
        />
        <Field label={t.title} value={document.title} onChange={(title) => patch({ title })} />
        <Field
          area
          label={t.intro}
          value={document.introduction}
          onChange={(introduction) => patch({ introduction })}
        />
      </div>
      <List
        items={document.items}
        locale={locale}
        add={() =>
          patch({
            items: [
              ...document.items,
              { id: crypto.randomUUID(), question: "", answer: "", category: "", published: true },
            ],
          })
        }
        remove={(index) => patch({ items: document.items.filter((_, i) => i !== index) })}
        move={(from, to) => patch({ items: move(document.items, from, to) })}
        render={(item, index) => (
          <>
            <Field
              label={t.question}
              value={item.question}
              onChange={(question) =>
                patch({
                  items: document.items.map((row, i) => (i === index ? { ...row, question } : row)),
                })
              }
            />
            <Field
              area
              label={t.answer}
              value={item.answer}
              onChange={(answer) =>
                patch({
                  items: document.items.map((row, i) => (i === index ? { ...row, answer } : row)),
                })
              }
            />
            <Field
              label={t.category}
              value={item.category}
              onChange={(category) =>
                patch({
                  items: document.items.map((row, i) => (i === index ? { ...row, category } : row)),
                })
              }
            />
            <Check
              label={t.published}
              checked={item.published}
              onChange={(published) =>
                patch({
                  items: document.items.map((row, i) =>
                    i === index ? { ...row, published } : row,
                  ),
                })
              }
            />
          </>
        )}
      />
    </>
  );
}

function ContactEditor({
  document,
  locale,
  onChange,
}: Props & { document: Extract<SiteContentDocument, { kind: "CONTACT" }> }) {
  const t = labels[locale];
  const patch = (value: Partial<typeof document>) => onChange({ ...document, ...value });
  return (
    <>
      <div className="content-studio__fields">
        <Field
          label={t.small}
          value={document.eyebrow}
          onChange={(eyebrow) => patch({ eyebrow })}
        />
        <Field label={t.title} value={document.title} onChange={(title) => patch({ title })} />
        <Field
          area
          label={t.intro}
          value={document.introduction}
          onChange={(introduction) => patch({ introduction })}
        />
        <Field label={t.email} value={document.email} onChange={(email) => patch({ email })} />
        <Field
          area
          label={t.address}
          value={document.address}
          onChange={(address) => patch({ address })}
        />
        <Field
          area
          label={t.hours}
          value={document.workingHours}
          onChange={(workingHours) => patch({ workingHours })}
        />
        <Field
          label={t.whatsapp}
          value={document.whatsapp.number}
          onChange={(number) => patch({ whatsapp: { ...document.whatsapp, number } })}
        />
        <Field
          label={t.whatsappMessage}
          value={document.whatsapp.message}
          onChange={(message) => patch({ whatsapp: { ...document.whatsapp, message } })}
        />
        <Check
          label={t.showWhatsapp}
          checked={document.whatsapp.visible}
          onChange={(visible) => patch({ whatsapp: { ...document.whatsapp, visible } })}
        />
      </div>
      <List
        items={document.phones}
        locale={locale}
        add={() => patch({ phones: [...document.phones, ""] })}
        remove={(index) => patch({ phones: document.phones.filter((_, i) => i !== index) })}
        move={(from, to) => patch({ phones: move(document.phones, from, to) })}
        render={(phone, index) => (
          <Field
            label={t.phone}
            value={phone}
            onChange={(value) =>
              patch({ phones: document.phones.map((row, i) => (i === index ? value : row)) })
            }
          />
        )}
      />
      <List
        items={document.socialLinks}
        locale={locale}
        add={() =>
          patch({
            socialLinks: [
              ...document.socialLinks,
              { id: crypto.randomUUID(), platform: "", url: "" },
            ],
          })
        }
        remove={(index) =>
          patch({ socialLinks: document.socialLinks.filter((_, i) => i !== index) })
        }
        move={(from, to) => patch({ socialLinks: move(document.socialLinks, from, to) })}
        render={(item, index) => (
          <>
            <Field
              label={t.platform}
              value={item.platform}
              onChange={(platform) =>
                patch({
                  socialLinks: document.socialLinks.map((row, i) =>
                    i === index ? { ...row, platform } : row,
                  ),
                })
              }
            />
            <Field
              label={t.url}
              value={item.url}
              onChange={(url) =>
                patch({
                  socialLinks: document.socialLinks.map((row, i) =>
                    i === index ? { ...row, url } : row,
                  ),
                })
              }
            />
          </>
        )}
      />
    </>
  );
}

function List<T>({
  items,
  locale,
  add,
  remove,
  move: moveItem,
  render,
}: {
  items: T[];
  locale: "ar" | "en";
  add(): void;
  remove(index: number): void;
  move(from: number, to: number): void;
  render(item: T, index: number): React.ReactNode;
}) {
  const t = labels[locale];
  return (
    <div className="content-studio__items">
      <header>
        <h3>{locale === "ar" ? "العناصر المرتبة" : "Ordered items"}</h3>
        <button onClick={add} type="button">
          + {t.add}
        </button>
      </header>
      {items.map((item, index) => (
        <article key={(item as { id?: string }).id ?? index}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          {render(item, index)}
          <div>
            <button disabled={index === 0} onClick={() => moveItem(index, index - 1)} type="button">
              {t.up}
            </button>
            <button
              disabled={index === items.length - 1}
              onClick={() => moveItem(index, index + 1)}
              type="button"
            >
              {t.down}
            </button>
            <button onClick={() => remove(index)} type="button">
              {t.remove}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  area = false,
}: {
  label: string;
  value: string;
  area?: boolean;
  onChange(value: string): void;
}) {
  return (
    <label>
      <span>{label}</span>
      {area ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}
function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange(value: boolean): void;
}) {
  return (
    <label className="content-studio__check">
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>{label}</span>
    </label>
  );
}
function move<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
}
