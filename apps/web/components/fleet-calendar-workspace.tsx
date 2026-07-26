"use client";

import type {
  ApiSuccess,
  FleetBlockResult,
  FleetCalendar,
  FleetCalendarEvent,
  FleetCalendarEventKind,
} from "@rahal/contracts";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PublicLocale } from "../lib/public-content";
import { Icon } from "./public-home";
import { WorkspaceShell } from "./workspace-shell";

const dayMs = 24 * 60 * 60 * 1000;

const copy = {
  ar: {
    eyebrow: "عمليات الأسطول",
    title: "كل سيارة. كل يوم. صورة واحدة واضحة.",
    intro:
      "تقويم تشغيلي موحد للحجوزات المؤكدة والإيجارات النشطة والصيانة والحظر، دون عرض أي بيانات للعملاء.",
    today: "اليوم",
    previous: "السابق",
    next: "التالي",
    loading: "جاري تحميل حركة الأسطول…",
    retry: "إعادة المحاولة",
    empty: "لا توجد سيارات نشطة في الأسطول.",
    available: "متاحة",
    occupied: "مشغولة",
    pending: "طلب قيد المراجعة",
    confirmed: "حجز مؤكد",
    active: "إيجار نشط",
    maintenance: "صيانة",
    manual: "حظر إداري",
    vehicles: "السيارات",
    blocking: "أحداث حاجزة",
    requests: "طلبات للمراجعة",
    utilization: "الإشغال",
    manage: "إدارة التوفر",
    manageCopy: "أنشئ فترة صيانة أو حظر إداري. لن يقبل النظام تعارضًا مع حجز مؤكد.",
    vehicle: "السيارة",
    type: "نوع الفترة",
    start: "من",
    end: "إلى",
    reason: "السبب التشغيلي",
    reasonPlaceholder: "مثال: صيانة دورية معتمدة",
    create: "إضافة إلى التقويم",
    creating: "جاري الإضافة…",
    remove: "إزالة",
    removing: "جاري الإزالة…",
    noEvents: "لا توجد حركة خلال هذه الفترة.",
    privacy: "التقويم التشغيلي لا يعرض أسماء العملاء أو بيانات تواصلهم.",
    error: "تعذر تحميل تقويم الأسطول.",
  },
  en: {
    eyebrow: "Fleet operations",
    title: "Every vehicle. Every day. One clear view.",
    intro:
      "A unified operational calendar for confirmed bookings, active rentals, maintenance and holds—without exposing customer data.",
    today: "Today",
    previous: "Previous",
    next: "Next",
    loading: "Loading fleet movement…",
    retry: "Try again",
    empty: "There are no active vehicles in the fleet.",
    available: "Available",
    occupied: "Occupied",
    pending: "Request in review",
    confirmed: "Confirmed booking",
    active: "Active rental",
    maintenance: "Maintenance",
    manual: "Administrative hold",
    vehicles: "Vehicles",
    blocking: "Blocking events",
    requests: "Requests to review",
    utilization: "Utilization",
    manage: "Manage availability",
    manageCopy:
      "Add maintenance or an administrative hold. Confirmed booking conflicts are rejected.",
    vehicle: "Vehicle",
    type: "Period type",
    start: "From",
    end: "To",
    reason: "Operational reason",
    reasonPlaceholder: "Example: approved scheduled service",
    create: "Add to calendar",
    creating: "Adding…",
    remove: "Remove",
    removing: "Removing…",
    noEvents: "No movement during this period.",
    privacy: "The operations calendar never shows customer names or contact details.",
    error: "The fleet calendar could not be loaded.",
  },
} as const;

export function FleetCalendarWorkspace({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];
  const [anchor, setAnchor] = useState(() => startOfUtcDay(new Date()));
  const [calendar, setCalendar] = useState<FleetCalendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [kindFilter, setKindFilter] = useState<"ALL" | FleetCalendarEventKind>("ALL");
  const [busyId, setBusyId] = useState("");
  const days = useMemo(
    () => Array.from({ length: 14 }, (_, index) => new Date(anchor.getTime() + index * dayMs)),
    [anchor],
  );
  const from = toDateInput(days[0]);
  const to = toDateInput(days[days.length - 1]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/fleet/calendar?from=${from}&to=${to}`, {
        credentials: "include",
      });
      if (response.status === 401) {
        window.location.assign(locale === "ar" ? "/auth" : "/en/auth");
        return;
      }
      const payload = (await response.json()) as ApiSuccess<FleetCalendar> & {
        message?: string | string[];
      };
      if (!response.ok) throw new Error(readMessage(payload.message, text.error));
      setCalendar(payload.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : text.error);
    } finally {
      setLoading(false);
    }
  }, [from, locale, text.error, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const allEvents = calendar?.vehicles.flatMap((vehicle) => vehicle.events) ?? [];
  const blockingCount = allEvents.filter((event) => event.blocksAvailability).length;
  const requestCount = allEvents.filter((event) => event.kind === "PENDING").length;
  const occupiedVehicles =
    calendar?.vehicles.filter((vehicle) => vehicle.events.some((event) => event.blocksAvailability))
      .length ?? 0;
  const utilization = calendar?.vehicles.length
    ? Math.round((occupiedVehicles / calendar.vehicles.length) * 100)
    : 0;

  async function submitBlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = Object.fromEntries(new FormData(form)) as Record<string, string>;
    setBusyId("create");
    setError("");
    try {
      const response = await fetch("/api/fleet/blocks", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          vehicleId: input.vehicleId,
          type: input.type,
          startDate: input.startDate,
          endDate: input.endDate,
          reason: input.reason,
        }),
      });
      const payload = (await response.json()) as ApiSuccess<FleetBlockResult> & {
        message?: string | string[];
      };
      if (!response.ok) throw new Error(readMessage(payload.message, text.error));
      form.reset();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : text.error);
    } finally {
      setBusyId("");
    }
  }

  async function removeBlock(id: string) {
    setBusyId(id);
    setError("");
    try {
      const response = await fetch(`/api/fleet/blocks/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = (await response.json()) as ApiSuccess<FleetBlockResult> & {
        message?: string | string[];
      };
      if (!response.ok) throw new Error(readMessage(payload.message, text.error));
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : text.error);
    } finally {
      setBusyId("");
    }
  }

  const labels: Record<FleetCalendarEventKind, string> = {
    PENDING: text.pending,
    CONFIRMED: text.confirmed,
    ACTIVE: text.active,
    MAINTENANCE: text.maintenance,
    MANUAL_BLOCK: text.manual,
  };

  return (
    <WorkspaceShell activePage="fleet" kind="sales" locale={locale}>
      <div className="fleet-workspace" lang={locale}>
        <section className="portal-overview fleet-hero">
          <div>
            <span>{text.eyebrow}</span>
            <h1>{text.title}</h1>
            <p>{text.intro}</p>
          </div>
          <div className="fleet-range-controls">
            <button
              onClick={() => setAnchor(new Date(anchor.getTime() - 14 * dayMs))}
              type="button"
            >
              <Icon name="arrow" size={17} /> {text.previous}
            </button>
            <button onClick={() => setAnchor(startOfUtcDay(new Date()))} type="button">
              {text.today}
            </button>
            <button
              onClick={() => setAnchor(new Date(anchor.getTime() + 14 * dayMs))}
              type="button"
            >
              {text.next} <Icon name="arrow" size={17} />
            </button>
          </div>
        </section>

        <section className="portal-metrics fleet-metrics">
          <article>
            <span>{text.vehicles}</span>
            <strong>{calendar?.vehicles.length ?? "—"}</strong>
            <p>
              {from} — {to}
            </p>
          </article>
          <article>
            <span>{text.blocking}</span>
            <strong>{blockingCount}</strong>
            <p>{text.occupied}</p>
          </article>
          <article>
            <span>{text.requests}</span>
            <strong>{requestCount}</strong>
            <p>{text.pending}</p>
          </article>
          <article>
            <span>{text.utilization}</span>
            <strong>{utilization}%</strong>
            <p>{text.privacy}</p>
          </article>
        </section>

        <div className="fleet-toolbar" role="group" aria-label={text.requests}>
          {(["ALL", "PENDING", "CONFIRMED", "ACTIVE", "MAINTENANCE", "MANUAL_BLOCK"] as const).map(
            (kind) => (
              <button
                aria-pressed={kindFilter === kind}
                key={kind}
                onClick={() => setKindFilter(kind)}
                type="button"
              >
                {kind === "ALL" ? text.vehicles : labels[kind]}
              </button>
            ),
          )}
        </div>

        {error ? (
          <div className="fleet-error">
            {error}
            <button onClick={() => void load()}>{text.retry}</button>
          </div>
        ) : null}
        {loading ? <div className="fleet-state">{text.loading}</div> : null}
        {!loading && calendar && !calendar.vehicles.length ? (
          <div className="fleet-state">{text.empty}</div>
        ) : null}

        {!loading && calendar?.vehicles.length ? (
          <>
            <section className="fleet-calendar-panel">
              <div className="fleet-calendar-head">
                <div>{text.vehicle}</div>
                <div className="fleet-day-heads">
                  {days.map((day) => (
                    <time dateTime={toDateInput(day)} key={day.toISOString()}>
                      <span>
                        {new Intl.DateTimeFormat(locale, {
                          weekday: "short",
                          timeZone: "UTC",
                        }).format(day)}
                      </span>
                      <strong>{day.getUTCDate()}</strong>
                    </time>
                  ))}
                </div>
              </div>
              {calendar.vehicles.map((vehicle) => {
                const events = vehicle.events.filter(
                  (event) => kindFilter === "ALL" || event.kind === kindFilter,
                );
                return (
                  <article className="fleet-calendar-row" key={vehicle.id}>
                    <header>
                      <strong>{vehicle.name}</strong>
                      <span>{vehicle.registrationNumber}</span>
                      <small>{vehicle.branch.name}</small>
                    </header>
                    <div className="fleet-track">
                      <div className="fleet-track-grid">
                        {days.map((day) => (
                          <i key={day.toISOString()} />
                        ))}
                      </div>
                      {events.map((event) => {
                        const position = eventPosition(event, anchor, days.length);
                        if (!position) return null;
                        return (
                          <div
                            className={`fleet-event fleet-event--${event.kind.toLowerCase()}`}
                            key={event.id}
                            style={{
                              insetInlineStart: `${position.left}%`,
                              width: `${position.width}%`,
                            }}
                            title={`${labels[event.kind]} · ${event.reference ?? event.reason ?? ""}`}
                          >
                            <strong>{labels[event.kind]}</strong>
                            <span>{event.reference ?? event.reason}</span>
                            {event.removable ? (
                              <button
                                disabled={busyId === event.id}
                                onClick={() => void removeBlock(event.id)}
                                type="button"
                              >
                                {busyId === event.id ? text.removing : text.remove}
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </section>

            <section className="fleet-agenda">
              {calendar.vehicles.map((vehicle) => {
                const events = vehicle.events.filter(
                  (event) => kindFilter === "ALL" || event.kind === kindFilter,
                );
                if (!events.length) return null;
                return (
                  <article key={`agenda-${vehicle.id}`}>
                    <header>
                      <strong>{vehicle.name}</strong>
                      <span>{vehicle.registrationNumber}</span>
                    </header>
                    {events.map((event) => (
                      <div
                        className={`fleet-agenda-event fleet-event--${event.kind.toLowerCase()}`}
                        key={event.id}
                      >
                        <span>{labels[event.kind]}</span>
                        <strong>{event.reference ?? event.reason}</strong>
                        <time>{formatRange(locale, event.startsAt, event.endsAt)}</time>
                        {event.removable ? (
                          <button
                            disabled={busyId === event.id}
                            onClick={() => void removeBlock(event.id)}
                          >
                            {text.remove}
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </article>
                );
              })}
              {!allEvents.length ? <p>{text.noEvents}</p> : null}
            </section>

            {calendar.canManageBlocks ? (
              <section className="fleet-manage-panel">
                <header>
                  <span>ADMIN CONTROL</span>
                  <h2>{text.manage}</h2>
                  <p>{text.manageCopy}</p>
                </header>
                <form onSubmit={submitBlock}>
                  <label>
                    {text.vehicle}
                    <select name="vehicleId" required>
                      {calendar.vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.name} · {vehicle.registrationNumber}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {text.type}
                    <select name="type" required>
                      <option value="MAINTENANCE">{text.maintenance}</option>
                      <option value="MANUAL_BLOCK">{text.manual}</option>
                    </select>
                  </label>
                  <label>
                    {text.start}
                    <input min={toDateInput(new Date())} name="startDate" required type="date" />
                  </label>
                  <label>
                    {text.end}
                    <input min={toDateInput(new Date())} name="endDate" required type="date" />
                  </label>
                  <label className="fleet-reason">
                    {text.reason}
                    <textarea
                      minLength={10}
                      name="reason"
                      placeholder={text.reasonPlaceholder}
                      required
                      rows={3}
                    />
                  </label>
                  <button disabled={busyId === "create"} type="submit">
                    {busyId === "create" ? text.creating : text.create}
                    <Icon name="arrow" size={17} />
                  </button>
                </form>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </WorkspaceShell>
  );
}

function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function toDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function eventPosition(event: FleetCalendarEvent, anchor: Date, totalDays: number) {
  const start = startOfUtcDay(new Date(event.startsAt)).getTime();
  const rawEnd = startOfUtcDay(new Date(event.endsAt)).getTime();
  const end = Math.max(start + dayMs, rawEnd);
  const rangeStart = anchor.getTime();
  const rangeEnd = rangeStart + totalDays * dayMs;
  if (end <= rangeStart || start >= rangeEnd) return null;
  const clampedStart = Math.max(start, rangeStart);
  const clampedEnd = Math.min(end, rangeEnd);
  return {
    left: ((clampedStart - rangeStart) / dayMs / totalDays) * 100,
    width: Math.max(((clampedEnd - clampedStart) / dayMs / totalDays) * 100, 100 / totalDays),
  };
}

function formatRange(locale: PublicLocale, startsAt: string, endsAt: string) {
  const formatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return `${formatter.format(new Date(startsAt))} — ${formatter.format(new Date(endsAt))}`;
}

function readMessage(message: string | string[] | undefined, fallback: string) {
  return Array.isArray(message) ? message.join(" ") : message || fallback;
}
