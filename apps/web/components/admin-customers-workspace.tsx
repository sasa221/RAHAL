"use client";

import type {
  AdminCustomerDetail,
  AdminCustomerListItem,
  AdminCustomerPage,
  AdminCustomerStatus,
  ApiSuccess,
} from "@rahal/contracts";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PublicLocale } from "../lib/public-content";
import { WorkspaceShell } from "./workspace-shell";

const copy = {
  ar: {
    kicker: "رحال / علاقات العملاء",
    title: "اعرف العميل بدون كشف خصوصيته.",
    intro: "نظرة تشغيلية آمنة على الحسابات والتحقق والطلبات، مع تحكم مسؤول ومسجل في حالة كل حساب.",
    total: "كل العملاء",
    active: "حساب نشط",
    pending: "ينتظر التحقق",
    restricted: "موقوف أو محظور",
    search: "ابحث بالاسم أو البريد أو الهاتف",
    allStatuses: "كل الحالات",
    allVerification: "كل التحقق",
    verified: "مكتمل التحقق",
    pendingVerification: "تحقق غير مكتمل",
    loading: "نجمع صورة العملاء الآمنة...",
    error: "تعذر تحميل العملاء الآن.",
    retry: "حاول مرة أخرى",
    empty: "لا توجد حسابات تطابق هذه الفلاتر.",
    requests: "طلبات",
    bookings: "حجوزات",
    lastSeen: "آخر نشاط",
    joined: "انضم",
    never: "لا يوجد نشاط بعد",
    email: "البريد",
    phone: "الهاتف",
    close: "إغلاق",
    accountSignal: "إشارة الحساب",
    communication: "تفضيلات التواصل",
    recentRequests: "أحدث الطلبات",
    statusHistory: "سجل حالة الحساب",
    noRequests: "لم ينشئ العميل أي طلب بعد.",
    noHistory: "لا توجد تغييرات إدارية على الحساب.",
    marketing: "تسويق",
    inApp: "داخل الموقع",
    push: "إشعار جهاز",
    changeStatus: "إدارة حالة الحساب",
    activate: "إعادة التفعيل",
    suspend: "إيقاف مؤقت",
    block: "حظر الحساب",
    reason: "سبب القرار (يُحفظ في سجل المراجعة)",
    reasonHint: "اكتب سببًا واضحًا لا يقل عن 10 أحرف",
    confirm: "تأكيد القرار وسحب الجلسات",
    cancel: "إلغاء",
    saving: "جاري الحفظ...",
    protected: "بيانات الاتصال مخفية عمدًا. لا تعرض هذه الصفحة مستندات أو أرقام هوية.",
    loadMore: "عرض المزيد",
    statuses: {
      PENDING_VERIFICATION: "بانتظار التحقق",
      ACTIVE: "نشط",
      SUSPENDED: "موقوف",
      BLOCKED: "محظور",
      ARCHIVED: "مؤرشف",
    },
  },
  en: {
    kicker: "RAHAL / CUSTOMER RELATIONS",
    title: "Know the customer. Protect their privacy.",
    intro:
      "A safe operational view of accounts, verification and requests—with accountable, audited status controls.",
    total: "All customers",
    active: "Active accounts",
    pending: "Awaiting verification",
    restricted: "Suspended or blocked",
    search: "Search name, email or phone",
    allStatuses: "All statuses",
    allVerification: "All verification",
    verified: "Fully verified",
    pendingVerification: "Verification pending",
    loading: "Building the protected customer view...",
    error: "Customers are temporarily unavailable.",
    retry: "Try again",
    empty: "No customer accounts match these filters.",
    requests: "Requests",
    bookings: "Bookings",
    lastSeen: "Last activity",
    joined: "Joined",
    never: "No activity yet",
    email: "Email",
    phone: "Phone",
    close: "Close",
    accountSignal: "Account signal",
    communication: "Communication preferences",
    recentRequests: "Recent requests",
    statusHistory: "Account status history",
    noRequests: "This customer has not created a request yet.",
    noHistory: "No administrative status changes exist.",
    marketing: "Marketing",
    inApp: "In-app",
    push: "Device push",
    changeStatus: "Manage account status",
    activate: "Reactivate",
    suspend: "Suspend temporarily",
    block: "Block account",
    reason: "Decision reason (saved to the audit trail)",
    reasonHint: "Write a clear reason of at least 10 characters",
    confirm: "Confirm and revoke sessions",
    cancel: "Cancel",
    saving: "Saving...",
    protected:
      "Contact details are deliberately masked. Documents and identity numbers never appear here.",
    loadMore: "Load more",
    statuses: {
      PENDING_VERIFICATION: "Verification pending",
      ACTIVE: "Active",
      SUSPENDED: "Suspended",
      BLOCKED: "Blocked",
      ARCHIVED: "Archived",
    },
  },
} as const;

const statusOptions: AdminCustomerStatus[] = [
  "PENDING_VERIFICATION",
  "ACTIVE",
  "SUSPENDED",
  "BLOCKED",
  "ARCHIVED",
];

export function AdminCustomersWorkspace({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];
  const [page, setPage] = useState<AdminCustomerPage | null>(null);
  const [items, setItems] = useState<AdminCustomerListItem[]>([]);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [verification, setVerification] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<AdminCustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [action, setAction] = useState<"ACTIVE" | "SUSPENDED" | "BLOCKED" | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  const load = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      setError(false);
      const params = new URLSearchParams({ locale, status, verification });
      if (search) params.set("query", search);
      if (cursor) params.set("cursor", cursor);
      try {
        const response = await fetch(`/api/admin-customers?${params}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) throw new Error("CUSTOMERS_UNAVAILABLE");
        const next = ((await response.json()) as ApiSuccess<AdminCustomerPage>).data;
        setPage(next);
        setItems((current) => (cursor ? [...current, ...next.items] : next.items));
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [locale, search, status, verification],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const date = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    [locale],
  );

  async function openCustomer(id: string) {
    setDetailLoading(true);
    setSelected(null);
    try {
      const response = await fetch(`/api/admin-customers/${id}?locale=${locale}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      setSelected(((await response.json()) as ApiSuccess<AdminCustomerDetail>).data);
    } finally {
      setDetailLoading(false);
    }
  }

  async function submitStatus() {
    if (!selected || !action || reason.trim().length < 10) return;
    setSaving(true);
    setActionError("");
    try {
      const response = await fetch(`/api/admin-customers/${selected.id}/status?locale=${locale}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: action, reason: reason.trim() }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: { message?: string } };
        throw new Error(payload.error?.message ?? "UPDATE_FAILED");
      }
      setAction(null);
      setReason("");
      await Promise.all([load(), openCustomer(selected.id)]);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "UPDATE_FAILED");
    } finally {
      setSaving(false);
    }
  }

  return (
    <WorkspaceShell activePage="customers" kind="admin" locale={locale}>
      <div className="customers-workspace">
        <section className="customers-hero">
          <div>
            <span>{text.kicker}</span>
            <h1>{text.title}</h1>
            <p>{text.intro}</p>
          </div>
          <div className="customers-privacy-seal" aria-label={text.protected}>
            <i>R</i>
            <strong>PRIVATE</strong>
            <small>{text.protected}</small>
          </div>
        </section>

        <section className="customers-stats" aria-label={text.total}>
          {[
            [text.total, page?.summary.total ?? 0, "01"],
            [text.active, page?.summary.active ?? 0, "02"],
            [text.pending, page?.summary.pendingVerification ?? 0, "03"],
            [text.restricted, page?.summary.restricted ?? 0, "04"],
          ].map(([label, value, index]) => (
            <article key={String(label)}>
              <small>{index}</small>
              <strong>{value}</strong>
              <span>{label}</span>
            </article>
          ))}
        </section>

        <section className="customers-toolbar">
          <label className="customers-search">
            <span aria-hidden="true">⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={text.search}
            />
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label={text.allStatuses}
          >
            <option value="ALL">{text.allStatuses}</option>
            {statusOptions.map((value) => (
              <option key={value} value={value}>
                {text.statuses[value]}
              </option>
            ))}
          </select>
          <select
            value={verification}
            onChange={(event) => setVerification(event.target.value)}
            aria-label={text.allVerification}
          >
            <option value="ALL">{text.allVerification}</option>
            <option value="VERIFIED">{text.verified}</option>
            <option value="PENDING">{text.pendingVerification}</option>
          </select>
        </section>

        {error ? (
          <div className="customers-message">
            <p>{text.error}</p>
            <button onClick={() => void load()}>{text.retry}</button>
          </div>
        ) : null}
        {loading && !items.length ? (
          <div className="customers-loading">
            <i />
            <p>{text.loading}</p>
          </div>
        ) : null}
        {!loading && !error && !items.length ? (
          <div className="customers-message">
            <p>{text.empty}</p>
          </div>
        ) : null}

        <section className="customers-grid">
          {items.map((customer, index) => (
            <button
              className="customer-card"
              key={customer.id}
              onClick={() => void openCustomer(customer.id)}
              style={{ "--delay": `${Math.min(index, 10) * 35}ms` } as React.CSSProperties}
            >
              <header>
                <span>{initials(customer.displayName)}</span>
                <div>
                  <strong>{customer.displayName}</strong>
                  <small>{customer.emailMasked}</small>
                </div>
                <b className={`customer-status customer-status--${customer.status.toLowerCase()}`}>
                  {text.statuses[customer.status]}
                </b>
              </header>
              <div className="customer-card__signal">
                <span className={customer.verification.email ? "is-on" : ""}>@ {text.email}</span>
              </div>
              <dl>
                <div>
                  <dt>{text.requests}</dt>
                  <dd>{customer.reservationCount}</dd>
                </div>
                <div>
                  <dt>{text.bookings}</dt>
                  <dd>{customer.bookingCount}</dd>
                </div>
                <div>
                  <dt>{text.lastSeen}</dt>
                  <dd>
                    {customer.lastActivityAt
                      ? date.format(new Date(customer.lastActivityAt))
                      : text.never}
                  </dd>
                </div>
              </dl>
              <footer>
                <span>
                  {text.joined} {date.format(new Date(customer.createdAt))}
                </span>
                <b>↗</b>
              </footer>
            </button>
          ))}
        </section>
        {page?.nextCursor ? (
          <button
            className="customers-more"
            disabled={loading}
            onClick={() => void load(page.nextCursor ?? undefined)}
          >
            {text.loadMore}
          </button>
        ) : null}

        {detailLoading || selected ? (
          <button
            className="customer-drawer-backdrop"
            aria-label={text.close}
            onClick={() => setSelected(null)}
          />
        ) : null}
        {detailLoading || selected ? (
          <aside className="customer-drawer" aria-live="polite">
            {detailLoading ? (
              <div className="customers-loading">
                <i />
                <p>{text.loading}</p>
              </div>
            ) : selected ? (
              <>
                <header className="customer-drawer__head">
                  <div>
                    <span>{initials(selected.displayName)}</span>
                    <h2>{selected.displayName}</h2>
                    <p>
                      {selected.emailMasked} · {selected.phoneMasked}
                    </p>
                  </div>
                  <button onClick={() => setSelected(null)} aria-label={text.close}>
                    ×
                  </button>
                </header>
                <p className="customer-privacy-note">◇ {text.protected}</p>
                <section>
                  <div className="customer-section-title">
                    <span>01</span>
                    <h3>{text.accountSignal}</h3>
                  </div>
                  <div className="customer-signal-panel">
                    <b
                      className={`customer-status customer-status--${selected.status.toLowerCase()}`}
                    >
                      {text.statuses[selected.status]}
                    </b>
                    <span>
                      {text.requests}: <strong>{selected.reservationCount}</strong>
                    </span>
                    <span>
                      {text.bookings}: <strong>{selected.bookingCount}</strong>
                    </span>
                  </div>
                </section>
                <section>
                  <div className="customer-section-title">
                    <span>02</span>
                    <h3>{text.communication}</h3>
                  </div>
                  <div className="customer-preferences">
                    {[
                      [text.inApp, selected.preferences.inApp],
                      [text.push, selected.preferences.push],
                      [text.email, selected.preferences.email],
                      [text.marketing, selected.preferences.marketing],
                    ].map(([label, enabled]) => (
                      <span className={enabled ? "is-on" : ""} key={String(label)}>
                        <i />
                        {label}
                      </span>
                    ))}
                  </div>
                </section>
                <section>
                  <div className="customer-section-title">
                    <span>03</span>
                    <h3>{text.recentRequests}</h3>
                  </div>
                  <div className="customer-request-list">
                    {selected.recentReservations.length ? (
                      selected.recentReservations.map((request) => (
                        <a
                          href={`${locale === "en" ? "/en" : ""}/admin/requests?request=${request.id}`}
                          key={request.id}
                        >
                          <span>
                            <strong>{request.reference}</strong>
                            <small>{request.vehicleName}</small>
                          </span>
                          <b>{request.status.replaceAll("_", " ")}</b>
                        </a>
                      ))
                    ) : (
                      <p>{text.noRequests}</p>
                    )}
                  </div>
                </section>
                <section>
                  <div className="customer-section-title">
                    <span>04</span>
                    <h3>{text.statusHistory}</h3>
                  </div>
                  <div className="customer-history">
                    {selected.recentStatusChanges.length ? (
                      selected.recentStatusChanges.map((entry) => (
                        <article key={entry.id}>
                          <i />
                          <div>
                            <strong>{entry.actorName}</strong>
                            <p>{entry.reason}</p>
                            <small>{date.format(new Date(entry.createdAt))}</small>
                          </div>
                        </article>
                      ))
                    ) : (
                      <p>{text.noHistory}</p>
                    )}
                  </div>
                </section>
                {selected.status !== "ARCHIVED" ? (
                  <section className="customer-actions">
                    <div className="customer-section-title">
                      <span>05</span>
                      <h3>{text.changeStatus}</h3>
                    </div>
                    <div>
                      {selected.status !== "ACTIVE" ? (
                        <button onClick={() => setAction("ACTIVE")}>{text.activate}</button>
                      ) : null}
                      <button onClick={() => setAction("SUSPENDED")}>{text.suspend}</button>
                      <button className="is-danger" onClick={() => setAction("BLOCKED")}>
                        {text.block}
                      </button>
                    </div>
                  </section>
                ) : null}
              </>
            ) : null}
          </aside>
        ) : null}

        {action && selected ? (
          <div className="customer-modal" role="dialog" aria-modal="true">
            <div>
              <span>{text.changeStatus}</span>
              <h2>{text.statuses[action]}</h2>
              <label>
                {text.reason}
                <textarea
                  autoFocus
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={text.reasonHint}
                  maxLength={300}
                />
              </label>
              {actionError ? <p className="customer-action-error">{actionError}</p> : null}
              <footer>
                <button
                  onClick={() => {
                    setAction(null);
                    setReason("");
                  }}
                >
                  {text.cancel}
                </button>
                <button
                  disabled={saving || reason.trim().length < 10}
                  onClick={() => void submitStatus()}
                >
                  {saving ? text.saving : text.confirm}
                </button>
              </footer>
            </div>
          </div>
        ) : null}
      </div>
    </WorkspaceShell>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
