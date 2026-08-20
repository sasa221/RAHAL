"use client";

import type {
  ApiSuccess,
  StaffAdminOverview,
  StaffMember,
  StaffPermissionKey,
  StaffRoleSummary,
} from "@rahal/contracts";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PublicLocale } from "../lib/public-content";
import { WorkspaceShell } from "./workspace-shell";

const copy = {
  ar: {
    eyebrow: "إدارة الفريق",
    title: "الصلاحية الصحيحة، للشخص الصحيح.",
    intro:
      "أنشئ حسابات فريق رحال، أوقف الوصول فورًا، واضبط صلاحيات العمليات الحساسة مع سجل تدقيق غير قابل للتعديل.",
    members: "أعضاء الفريق",
    active: "نشط",
    restricted: "موقوف أو محظور",
    roles: "الأدوار",
    audit: "سجل التغييرات",
    add: "إضافة موظف",
    close: "إغلاق",
    search: "ابحث بالاسم أو البريد",
    noStaff: "لا توجد حسابات فريق مطابقة.",
    selectMember: "اختر موظفًا لمراجعة وصوله",
    profile: "بيانات الحساب",
    permissions: "الصلاحيات الفعالة",
    role: "الدور التشغيلي",
    systemRole: "نوع الحساب",
    status: "حالة الحساب",
    locale: "اللغة المفضلة",
    reason: "سبب التغيير",
    reasonHint: "سبب واضح من 10 أحرف على الأقل — سيظهر في سجل التدقيق",
    saveAccount: "حفظ بيانات الحساب",
    managedEmail: "البريد الثابت الذي تديره الإدارة",
    resetPassword: "إصدار كلمة مرور مؤقتة جديدة",
    resetAccess: "إلغاء الجلسات وإصدار الدخول المؤقت",
    resetHint: "لن تظهر كلمة المرور القديمة. سيُجبر الموظف على تغيير الجديدة بعد الدخول.",
    savePermissions: "حفظ الاستثناءات",
    inherited: "موروثة من الدور",
    allow: "سماح استثنائي",
    deny: "منع استثنائي",
    defaultAccess: "حسب الدور",
    critical: "حساسة",
    lastSeen: "آخر نشاط",
    never: "لا يوجد نشاط",
    created: "تاريخ الإنشاء",
    createTitle: "حساب موظف جديد",
    createIntro: "كلمة المرور مؤقتة وتُسلّم للموظف عبر قناة داخلية آمنة فقط.",
    fullNameEn: "الاسم بالإنجليزية",
    fullNameAr: "الاسم بالعربية",
    email: "البريد الإلكتروني",
    phone: "رقم الهاتف الدولي",
    password: "كلمة مرور مؤقتة",
    create: "إنشاء الحساب",
    saving: "جارٍ الحفظ...",
    saved: "تم حفظ التغيير وتسجيله في سجل التدقيق.",
    failed: "تعذر إتمام التغيير. راجع البيانات والصلاحيات ثم حاول مجددًا.",
    signedOut:
      "تغيير الدور أو الحالة أو الصلاحيات يلغي جلسات الموظف الحالية ويطلب تسجيل الدخول من جديد.",
    roleMatrix: "مصفوفة صلاحيات الأدوار",
    roleMatrixIntro: "تعديل الدور يؤثر على كل الموظفين المرتبطين به ويلغي جلساتهم الحالية.",
    saveRole: "حفظ صلاحيات الدور",
    staffCount: "موظف",
    auditEmpty: "لا توجد تغييرات إدارية مسجلة حتى الآن.",
    actor: "المنفذ",
    action: "الإجراء",
    when: "الوقت",
    SALES: "مبيعات",
    ADMIN: "مدير",
    SUPER_ADMIN: "مدير أعلى",
    ACTIVE: "نشط",
    SUSPENDED: "موقوف مؤقتًا",
    BLOCKED: "محظور",
    PENDING_VERIFICATION: "بانتظار التحقق",
    ARCHIVED: "مؤرشف",
  },
  en: {
    eyebrow: "TEAM OPERATIONS",
    title: "The right access, for the right person.",
    intro:
      "Create Rahal staff accounts, stop access immediately, and control sensitive operational permissions with an immutable audit trail.",
    members: "Team members",
    active: "Active",
    restricted: "Suspended or blocked",
    roles: "Roles",
    audit: "Change log",
    add: "Add employee",
    close: "Close",
    search: "Search name or email",
    noStaff: "No matching staff accounts.",
    selectMember: "Select an employee to review access",
    profile: "Account profile",
    permissions: "Effective permissions",
    role: "Operational role",
    systemRole: "Account type",
    status: "Account status",
    locale: "Preferred language",
    reason: "Change reason",
    reasonHint: "At least 10 clear characters — recorded in the audit log",
    saveAccount: "Save account",
    managedEmail: "Admin-managed fixed email",
    resetPassword: "Issue a new temporary password",
    resetAccess: "Revoke sessions and issue temporary access",
    resetHint:
      "The old password is never shown. The employee must replace the new one after sign-in.",
    savePermissions: "Save overrides",
    inherited: "Inherited from role",
    allow: "Explicit allow",
    deny: "Explicit deny",
    defaultAccess: "Use role",
    critical: "Critical",
    lastSeen: "Last activity",
    never: "No activity",
    created: "Created",
    createTitle: "New staff account",
    createIntro: "The temporary password must be shared through a secure internal channel only.",
    fullNameEn: "English name",
    fullNameAr: "Arabic name",
    email: "Email address",
    phone: "International phone",
    password: "Temporary password",
    create: "Create account",
    saving: "Saving...",
    saved: "The change was saved and recorded in the audit log.",
    failed: "The change could not be completed. Check the data and access rules, then retry.",
    signedOut:
      "Role, status, and permission changes revoke the employee's active sessions and require sign-in again.",
    roleMatrix: "Role permission matrix",
    roleMatrixIntro:
      "A role change affects every linked employee and revokes their active sessions.",
    saveRole: "Save role permissions",
    staffCount: "staff",
    auditEmpty: "No administrative changes have been recorded yet.",
    actor: "Actor",
    action: "Action",
    when: "When",
    SALES: "Sales",
    ADMIN: "Administrator",
    SUPER_ADMIN: "Super administrator",
    ACTIVE: "Active",
    SUSPENDED: "Suspended",
    BLOCKED: "Blocked",
    PENDING_VERIFICATION: "Pending verification",
    ARCHIVED: "Archived",
  },
} as const;

type Tab = "members" | "roles" | "audit";
type OverrideChoice = "default" | "allow" | "deny";

export function StaffManagementWorkspace({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];
  const [overview, setOverview] = useState<StaffAdminOverview | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("members");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [state, setState] = useState<"LOADING" | "READY" | "FORBIDDEN" | "ERROR">("LOADING");
  const [notice, setNotice] = useState<"SAVED" | "ERROR" | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/staff", { credentials: "include", cache: "no-store" });
      if (response.status === 401 || response.status === 403) {
        setState("FORBIDDEN");
        return;
      }
      const payload = (await response.json()) as ApiSuccess<StaffAdminOverview>;
      if (!response.ok) throw new Error("STAFF_OVERVIEW_FAILED");
      setOverview(payload.data);
      setSelectedId((current) =>
        current && payload.data.staff.some((member) => member.id === current)
          ? current
          : (payload.data.staff[0]?.id ?? null),
      );
      setState("READY");
    } catch {
      setState("ERROR");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = overview?.staff.find((member) => member.id === selectedId) ?? null;
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (
      overview?.staff.filter(
        (member) =>
          !term ||
          member.fullNameEn.toLowerCase().includes(term) ||
          member.fullNameAr?.includes(term) ||
          member.email.toLowerCase().includes(term),
      ) ?? []
    );
  }, [overview, query]);

  async function mutate(path: string, method: "POST" | "PATCH" | "PUT", body: unknown) {
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch(path, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("STAFF_MUTATION_FAILED");
      await load();
      setNotice("SAVED");
      return true;
    } catch {
      setNotice("ERROR");
      return false;
    } finally {
      setSaving(false);
    }
  }

  return (
    <WorkspaceShell activePage="staff" kind="admin" locale={locale}>
      <section className="staff-admin">
        <header className="staff-admin__hero">
          <div>
            <span>{text.eyebrow}</span>
            <h1>{text.title}</h1>
            <p>{text.intro}</p>
          </div>
          <button onClick={() => setCreating(true)} type="button">
            <span>+</span>
            {text.add}
          </button>
        </header>

        {state === "LOADING" ? <StaffSkeleton /> : null}
        {state === "FORBIDDEN" ? (
          <div className="staff-admin__state">
            {locale === "ar"
              ? "هذه المساحة للمديرين فقط."
              : "This workspace is for administrators only."}
          </div>
        ) : null}
        {state === "ERROR" ? <div className="staff-admin__state">{text.failed}</div> : null}

        {state === "READY" && overview ? (
          <>
            <div className="staff-metrics">
              <Metric label={text.members} value={overview.staff.length} />
              <Metric
                label={text.active}
                value={overview.staff.filter((member) => member.status === "ACTIVE").length}
              />
              <Metric
                label={text.restricted}
                value={overview.staff.filter((member) => member.status !== "ACTIVE").length}
              />
              <Metric label={text.roles} value={overview.roles.length} />
            </div>

            <nav className="staff-tabs" aria-label={text.eyebrow}>
              {(["members", "roles", "audit"] as const).map((item) => (
                <button
                  className={tab === item ? "is-active" : ""}
                  key={item}
                  onClick={() => setTab(item)}
                  type="button"
                >
                  {text[item]}
                  <b>
                    {item === "members"
                      ? overview.staff.length
                      : item === "roles"
                        ? overview.roles.length
                        : overview.recentAudit.length}
                  </b>
                </button>
              ))}
            </nav>

            {notice ? (
              <p className={`staff-notice staff-notice--${notice.toLowerCase()}`}>
                {notice === "SAVED" ? text.saved : text.failed}
              </p>
            ) : null}

            {tab === "members" ? (
              <div className="staff-members-layout">
                <aside className="staff-directory">
                  <label>
                    <span>{text.search}</span>
                    <input
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={text.search}
                      type="search"
                      value={query}
                    />
                  </label>
                  <div>
                    {filtered.map((member) => (
                      <button
                        className={member.id === selectedId ? "is-active" : ""}
                        key={member.id}
                        onClick={() => setSelectedId(member.id)}
                        type="button"
                      >
                        <Initials member={member} />
                        <span>
                          <strong>{displayName(member, locale)}</strong>
                          <small>{member.email}</small>
                        </span>
                        <i
                          className={`staff-status staff-status--${member.status.toLowerCase()}`}
                        />
                      </button>
                    ))}
                    {!filtered.length ? <p>{text.noStaff}</p> : null}
                  </div>
                </aside>
                {selected ? (
                  <StaffEditor
                    key={selected.updatedAt}
                    locale={locale}
                    member={selected}
                    mutate={mutate}
                    overview={overview}
                    saving={saving}
                  />
                ) : (
                  <div className="staff-admin__state">{text.selectMember}</div>
                )}
              </div>
            ) : null}

            {tab === "roles" ? (
              <RoleMatrix locale={locale} mutate={mutate} overview={overview} saving={saving} />
            ) : null}

            {tab === "audit" ? <AuditLog locale={locale} overview={overview} /> : null}
          </>
        ) : null}
      </section>

      {creating && overview ? (
        <CreateStaffPanel
          locale={locale}
          onClose={() => setCreating(false)}
          onCreate={async (body) => {
            if (await mutate("/api/staff", "POST", body)) setCreating(false);
          }}
          overview={overview}
          saving={saving}
        />
      ) : null}
    </WorkspaceShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article>
      <strong>{String(value).padStart(2, "0")}</strong>
      <span>{label}</span>
    </article>
  );
}

function StaffEditor({
  locale,
  member,
  mutate,
  overview,
  saving,
}: {
  locale: PublicLocale;
  member: StaffMember;
  mutate: (path: string, method: "POST" | "PATCH" | "PUT", body: unknown) => Promise<boolean>;
  overview: StaffAdminOverview;
  saving: boolean;
}) {
  const text = copy[locale];
  const [status, setStatus] = useState(member.status);
  const [systemRole, setSystemRole] = useState(member.systemRole);
  const [roleId, setRoleId] = useState(member.staffRoleId ?? "");
  const [reason, setReason] = useState("");
  const [email, setEmail] = useState(member.email);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [choices, setChoices] = useState<Record<string, OverrideChoice>>(() =>
    Object.fromEntries(
      overview.permissions.map((permission) => {
        const override = member.permissionOverrides.find(
          (item) => item.permissionKey === permission.key,
        );
        return [permission.key, override ? (override.allowed ? "allow" : "deny") : "default"];
      }),
    ),
  );

  return (
    <article className="staff-editor">
      <header>
        <Initials member={member} />
        <div>
          <span>{text.profile}</span>
          <h2>{displayName(member, locale)}</h2>
          <p>
            {member.email} · {member.phone}
          </p>
        </div>
      </header>
      <div className="staff-editor__facts">
        <span>
          <b>{text.lastSeen}</b>
          {formatDate(member.lastSeenAt, locale, text.never)}
        </span>
        <span>
          <b>{text.created}</b>
          {formatDate(member.createdAt, locale, text.never)}
        </span>
      </div>
      <div className="staff-editor__form">
        {member.systemRole === "SALES" ? (
          <label>
            <span>{text.managedEmail}</span>
            <input
              dir="ltr"
              maxLength={254}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </label>
        ) : null}
        <label>
          <span>{text.systemRole}</span>
          <select
            disabled={member.systemRole === "SUPER_ADMIN"}
            onChange={(event) => setSystemRole(event.target.value as StaffMember["systemRole"])}
            value={systemRole}
          >
            <option value="SALES">{text.SALES}</option>
            {overview.capabilities.canManageAdmins ? (
              <option value="ADMIN">{text.ADMIN}</option>
            ) : null}
            {member.systemRole === "SUPER_ADMIN" ? (
              <option value="SUPER_ADMIN">{text.SUPER_ADMIN}</option>
            ) : null}
          </select>
        </label>
        <label>
          <span>{text.role}</span>
          <select onChange={(event) => setRoleId(event.target.value)} value={roleId}>
            <option value="">—</option>
            {overview.roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{text.status}</span>
          <select
            disabled={member.systemRole === "SUPER_ADMIN"}
            onChange={(event) => setStatus(event.target.value as StaffMember["status"])}
            value={status}
          >
            <option value="ACTIVE">{text.ACTIVE}</option>
            <option value="SUSPENDED">{text.SUSPENDED}</option>
            <option value="BLOCKED">{text.BLOCKED}</option>
          </select>
        </label>
      </div>
      <label className="staff-reason">
        <span>{text.reason}</span>
        <textarea
          maxLength={300}
          onChange={(event) => setReason(event.target.value)}
          placeholder={text.reasonHint}
          value={reason}
        />
      </label>
      <button
        className="staff-primary-action"
        disabled={saving || reason.trim().length < 10 || member.systemRole === "SUPER_ADMIN"}
        onClick={() =>
          void mutate(`/api/staff/${member.id}`, "PATCH", {
            ...(member.systemRole === "SALES" ? { email } : {}),
            systemRole,
            staffRoleId: roleId || null,
            status,
            reason,
          })
        }
        type="button"
      >
        {saving ? text.saving : text.saveAccount}
      </button>
      <p className="staff-session-warning">{text.signedOut}</p>

      {member.systemRole === "SALES" ? (
        <section className="staff-permissions">
          <header>
            <span>{text.resetPassword}</span>
          </header>
          <p className="staff-session-warning">{text.resetHint}</p>
          <label className="staff-reason">
            <span>{text.password}</span>
            <input
              autoComplete="new-password"
              maxLength={128}
              minLength={8}
              onChange={(event) => setTemporaryPassword(event.target.value)}
              type="password"
              value={temporaryPassword}
            />
          </label>
          <button
            className="staff-primary-action"
            disabled={saving || reason.trim().length < 10 || temporaryPassword.length < 8}
            onClick={() =>
              void mutate(`/api/staff/${member.id}/reset-access`, "POST", {
                temporaryPassword,
                reason,
              }).then((ok) => {
                if (ok) setTemporaryPassword("");
              })
            }
            type="button"
          >
            {saving ? text.saving : text.resetAccess}
          </button>
        </section>
      ) : null}

      {member.systemRole === "SALES" ? (
        <section className="staff-permissions">
          <header>
            <span>{text.permissions}</span>
            <strong>
              {member.effectivePermissionKeys.length}/{overview.permissions.length}
            </strong>
          </header>
          <div>
            {overview.permissions.map((permission) => {
              const inherited = overview.roles
                .find((role) => role.id === roleId)
                ?.permissionKeys.includes(permission.key);
              return (
                <article key={permission.id}>
                  <span>
                    <strong>{permission.description}</strong>
                    <small>
                      {permission.category}
                      {permission.isCritical ? ` · ${text.critical}` : ""}
                      {inherited ? ` · ${text.inherited}` : ""}
                    </small>
                  </span>
                  <select
                    aria-label={permission.description}
                    disabled={permission.isCritical && !overview.capabilities.canManageAdmins}
                    onChange={(event) =>
                      setChoices((current) => ({
                        ...current,
                        [permission.key]: event.target.value as OverrideChoice,
                      }))
                    }
                    value={choices[permission.key]}
                  >
                    <option value="default">{text.defaultAccess}</option>
                    <option value="allow">{text.allow}</option>
                    <option value="deny">{text.deny}</option>
                  </select>
                </article>
              );
            })}
          </div>
          <button
            className="staff-primary-action"
            disabled={saving || reason.trim().length < 10}
            onClick={() =>
              void mutate(`/api/staff/${member.id}/permissions`, "PUT", {
                reason,
                overrides: Object.entries(choices)
                  .filter(([, choice]) => choice !== "default")
                  .map(([permissionKey, choice]) => ({
                    permissionKey,
                    allowed: choice === "allow",
                  })),
              })
            }
            type="button"
          >
            {saving ? text.saving : text.savePermissions}
          </button>
        </section>
      ) : null}
    </article>
  );
}

function RoleMatrix({
  locale,
  mutate,
  overview,
  saving,
}: {
  locale: PublicLocale;
  mutate: (path: string, method: "POST" | "PATCH" | "PUT", body: unknown) => Promise<boolean>;
  overview: StaffAdminOverview;
  saving: boolean;
}) {
  const text = copy[locale];
  const [selectedRoleId, setSelectedRoleId] = useState(overview.roles[0]?.id ?? "");
  const role = overview.roles.find((item) => item.id === selectedRoleId);
  const [keys, setKeys] = useState<StaffPermissionKey[]>(role?.permissionKeys ?? []);
  const [reason, setReason] = useState("");

  function selectRole(selected: StaffRoleSummary) {
    setSelectedRoleId(selected.id);
    setKeys(selected.permissionKeys);
    setReason("");
  }

  return (
    <section className="staff-role-matrix">
      <header>
        <div>
          <span>{text.roles}</span>
          <h2>{text.roleMatrix}</h2>
          <p>{text.roleMatrixIntro}</p>
        </div>
      </header>
      <div className="staff-role-matrix__layout">
        <nav>
          {overview.roles.map((item) => (
            <button
              className={item.id === selectedRoleId ? "is-active" : ""}
              key={item.id}
              onClick={() => selectRole(item)}
              type="button"
            >
              <strong>{item.name}</strong>
              <small>
                {item.staffCount} {text.staffCount}
              </small>
            </button>
          ))}
        </nav>
        {role ? (
          <div className="staff-role-grid">
            {overview.permissions.map((permission) => (
              <label key={permission.id}>
                <input
                  checked={keys.includes(permission.key)}
                  disabled={!overview.capabilities.canManageRolePermissions}
                  onChange={(event) =>
                    setKeys((current) =>
                      event.target.checked
                        ? [...current, permission.key]
                        : current.filter((key) => key !== permission.key),
                    )
                  }
                  type="checkbox"
                />
                <span>
                  <strong>{permission.description}</strong>
                  <small>
                    {permission.category}
                    {permission.isCritical ? ` · ${text.critical}` : ""}
                  </small>
                </span>
              </label>
            ))}
            <label className="staff-reason">
              <span>{text.reason}</span>
              <textarea
                onChange={(event) => setReason(event.target.value)}
                placeholder={text.reasonHint}
                value={reason}
              />
            </label>
            <button
              className="staff-primary-action"
              disabled={
                !overview.capabilities.canManageRolePermissions ||
                saving ||
                reason.trim().length < 10
              }
              onClick={() =>
                void mutate(`/api/staff/roles/${role.id}/permissions`, "PUT", {
                  permissionKeys: keys,
                  reason,
                })
              }
              type="button"
            >
              {saving ? text.saving : text.saveRole}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function AuditLog({ locale, overview }: { locale: PublicLocale; overview: StaffAdminOverview }) {
  const text = copy[locale];
  return (
    <section className="staff-audit">
      <header>
        <span>{text.audit}</span>
        <h2>{text.audit}</h2>
      </header>
      {overview.recentAudit.length ? (
        <div>
          {overview.recentAudit.map((entry) => (
            <article key={entry.id}>
              <time dateTime={entry.createdAt}>
                {formatDate(entry.createdAt, locale, text.never)}
              </time>
              <span>
                <strong>{entry.action.replaceAll("_", " ")}</strong>
                <small>
                  {entry.entityType} · {entry.entityId ?? "—"}
                </small>
              </span>
              <span>
                <b>{text.actor}</b>
                {entry.actorName}
              </span>
              <p>{entry.reason ?? "—"}</p>
            </article>
          ))}
        </div>
      ) : (
        <p>{text.auditEmpty}</p>
      )}
    </section>
  );
}

function CreateStaffPanel({
  locale,
  onClose,
  onCreate,
  overview,
  saving,
}: {
  locale: PublicLocale;
  onClose: () => void;
  onCreate: (body: unknown) => Promise<void>;
  overview: StaffAdminOverview;
  saving: boolean;
}) {
  const text = copy[locale];
  const [form, setForm] = useState({
    fullNameEn: "",
    fullNameAr: "",
    email: "",
    phone: "+20",
    temporaryPassword: "",
    preferredLocale: locale,
    systemRole: "SALES",
    staffRoleId: overview.roles[0]?.id ?? "",
    reason: "",
  });
  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  return (
    <>
      <button
        aria-label={text.close}
        className="staff-panel-backdrop"
        onClick={onClose}
        type="button"
      />
      <aside className="staff-create-panel">
        <header>
          <div>
            <span>{text.add}</span>
            <h2>{text.createTitle}</h2>
            <p>{text.createIntro}</p>
          </div>
          <button onClick={onClose} type="button">
            ×
          </button>
        </header>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onCreate({
              ...form,
              fullNameAr: form.fullNameAr || undefined,
              staffRoleId: form.staffRoleId || undefined,
            });
          }}
        >
          {(
            [
              ["fullNameEn", text.fullNameEn],
              ["fullNameAr", text.fullNameAr],
              ["email", text.email],
              ["phone", text.phone],
              ["temporaryPassword", text.password],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              <span>{label}</span>
              <input
                minLength={key === "temporaryPassword" ? 8 : 2}
                onChange={(event) => set(key, event.target.value)}
                required={key !== "fullNameAr"}
                type={key === "temporaryPassword" ? "password" : key === "email" ? "email" : "text"}
                value={form[key]}
              />
            </label>
          ))}
          <label>
            <span>{text.systemRole}</span>
            <select
              onChange={(event) => set("systemRole", event.target.value)}
              value={form.systemRole}
            >
              <option value="SALES">{text.SALES}</option>
              {overview.capabilities.canManageAdmins ? (
                <option value="ADMIN">{text.ADMIN}</option>
              ) : null}
            </select>
          </label>
          <label>
            <span>{text.role}</span>
            <select
              onChange={(event) => set("staffRoleId", event.target.value)}
              value={form.staffRoleId}
            >
              <option value="">—</option>
              {overview.roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <label className="staff-reason">
            <span>{text.reason}</span>
            <textarea
              minLength={10}
              onChange={(event) => set("reason", event.target.value)}
              placeholder={text.reasonHint}
              required
              value={form.reason}
            />
          </label>
          <button className="staff-primary-action" disabled={saving} type="submit">
            {saving ? text.saving : text.create}
          </button>
        </form>
      </aside>
    </>
  );
}

function Initials({ member }: { member: StaffMember }) {
  return (
    <i className="staff-avatar">
      {member.fullNameEn
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()}
    </i>
  );
}

function displayName(member: StaffMember, locale: PublicLocale) {
  return locale === "ar" && member.fullNameAr ? member.fullNameAr : member.fullNameEn;
}

function formatDate(value: string | null, locale: PublicLocale, fallback: string) {
  return value
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(value),
      )
    : fallback;
}

function StaffSkeleton() {
  return (
    <div className="staff-skeleton">
      <i />
      <i />
      <i />
    </div>
  );
}
