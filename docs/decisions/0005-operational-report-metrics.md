# ADR 0005: Operational report metric model

## Status

Accepted on 2026-08-08.

## Context

RAHAL administrators need one trustworthy operating view across requests, bookings, branch
deposits, fleet activity, and sales work. Simple totals can be misleading when a booking confirmed
today belongs to a request submitted in an earlier period, when one-to-many joins duplicate a
request, or when a branch deposit is incorrectly described as online revenue.

## Decision

- Confirmation rate is cohort-based: confirmed reservations divided by reservations submitted in
  the same selected period.
- Completed rentals are period activity based on the operational completion timestamp.
- Deposits are reported as countable EGP amounts recorded at the physical branch. They are never
  labelled payment, checkout, or online revenue.
- First-review speed is the median elapsed time from `submittedAt` to the earliest transition to
  `UNDER_REVIEW`; the median limits distortion from extreme delays.
- Fleet utilization is occupied booking days divided by the selected period multiplied by the
  current active-fleet count. The interface discloses that historical fleet-size changes are not
  yet modeled.
- Current and previous periods have equal rolling duration. Supported windows are 7, 30, 90, and
  365 days.
- All report queries may be filtered by an active branch. The API rejects unknown or inactive
  branch identifiers.
- The report API returns aggregate operations, vehicle names, and staff names only. Customer names,
  contact details, documents, identity data, notes, and audit payloads are outside the report
  projection.
- Stable integrity checks cover missing lifecycle timestamps, future submissions, non-positive
  deposits, and deposits without recorded branch attendance.

## Consequences

Cards, trends, funnels, and tables reconcile to one metric model. Administrators can compare
periods without mixing cohort conversion and activity volume. The current-fleet utilization
denominator is an explicit approximation until a historical fleet-capacity snapshot is introduced.
