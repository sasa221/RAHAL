# RAHAL interaction inventory

This inventory is the Task 11 release contract. An item is covered only when a test verifies its
result, not merely that it can be clicked. Arabic and English share the same components; the route
audit checks both directions, while every functional journey runs in mobile and desktop Chromium.

| Surface          | Controls and operations                                                                                                                                                              | Functional evidence                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Public           | navigation, language, fleet search, dates, vehicle filters/cards, auth links, branch contact and manual `wa.me`                                                                      | `public-release.spec.ts`, `functional-interactions.spec.ts`                                                               |
| Customer account | profile form, notification preferences, session revoke, sign-out, request filters, request detail, information response, offer response, draft resume/abandon                        | `authenticated-lifecycle.spec.ts`, `functional-interactions.spec.ts`                                                      |
| Reservation      | date/driver form, draft save, customer details, policy tabs/consents, private-document upload/remove, review and submission                                                          | `authenticated-lifecycle.spec.ts`, `document-security.spec.ts`                                                            |
| Sales            | queue filters, claim, protected preview/review, notes, more-information, approval/rejection, alternative offer, contract, branch checklist, confirmation, delivery/return/completion | `authenticated-lifecycle.spec.ts`, `document-security.spec.ts`                                                            |
| Administrator    | dashboard cards, requests, fleet filters/editor/media, document policy, communications, branches, content, policies, customers, staff, reviews, audit and report export              | `dashboard-data.spec.ts`, `branch-management-v2.spec.ts`, `content-management.spec.ts`, `functional-interactions.spec.ts` |
| Shared shell     | sidebar, bottom navigation, notification drawer, install action, prompts, dialogs, focus, Escape and role boundaries                                                                 | `interaction-audit.spec.ts`, `prompt-overlay-audit.spec.ts`, `operational-accessibility.spec.ts`                          |

## Required failure behaviour

- Submit buttons lock while a request is active and one user gesture produces one mutation.
- Server/network failure produces an actionable error and preserves entered values or selected file.
- Native and server validation prevent the request before state mutation.
- Destructive removal/abandon actions require explicit confirmation.
- Dialog focus begins inside the dialog, remains operable by keyboard and Escape closes only when no
  save is in progress.
- Internal links are followed with the current role and must not end in an unauthorized workspace.
- CSV export must produce a real download with the expected content type and headings.

The runtime inventory is enforced by `interaction-audit.spec.ts`. It visits every protected route,
collects visible links, buttons, fields, tabs, filters, uploads and export controls, checks
obstruction, follows internal links under the same role, and fails on an access boundary.
