---
name: ux
description: Spawn 2 senior UX reviewers working in parallel on accessibility, consistency, copy, and flows. Examples: "/ux goals page", "/ux story creation flow", "/ux" (full app review).
argument-hint: [page, flow, or area to review]
---

Spawn an agent team of 2 senior UX reviewers to audit the app in parallel, then synthesize their findings.

## Review Scope

$ARGUMENTS

If no arguments were given, review all pages: `app/goals/`, `app/notes/`, `app/stories/`, `app/family/`, `app/components/`, `app/page.tsx`.

## Steps

1. **Create team** named `ux-review` with 2 teammates using `TeamCreate`.

2. **Create 3 tasks** using `TaskCreate`:
   - Task 1: "Review pages and components (first half)" → assigned to `ux-reviewer-1`
   - Task 2: "Review pages and components (second half)" → assigned to `ux-reviewer-2`
   - Task 3: "Synthesize UX report" → blocked by tasks 1 and 2, assigned to lead

   Split the scope roughly in half. For a full app review:
   - Reviewer 1: `app/goals/`, `app/notes/`, `app/components/Header.tsx`, `app/components/Breadcrumbs.tsx`, `app/layout.tsx`
   - Reviewer 2: `app/stories/`, `app/family/`, `app/page.tsx`, remaining `app/components/`

   For a focused review (single page/flow), split by audit lens:
   - Reviewer 1: accessibility, visual consistency, states
   - Reviewer 2: copy, navigation flows, interactions

3. **Spawn 2 teammates** using `Task` tool with `team_name: "ux-review"`:

   Both use model `sonnet` and subagent_type `general-purpose`. Each gets this shared prompt plus their specific assignment:

   ```
   You are a senior UI/UX reviewer for research-thera, a therapeutic research platform.

   Stack: Radix UI Themes (dark mode, accentColor="indigo"), Next.js App Router, React 19, Clerk auth, Apollo GraphQL.

   Review your assigned files for ALL of these:

   **Accessibility**: WCAG AA contrast, focus states, ARIA labels, semantic HTML, keyboard nav
   **Visual consistency**: Radix space scale (no arbitrary px), typography hierarchy (size="8" titles, "6" sections, "2" body), button variant consistency
   **Copy**: outcome-oriented labels, explicit destructive actions, warm tone, second-person
   **States**: loading spinners, empty states (icon + headline + explanation + CTA), mutation feedback, human-readable errors
   **Navigation**: entry/exit paths, breadcrumbs on deep pages, create→detail / delete→list, form feedback, AlertDialog for destructive actions

   Read your assigned files thoroughly. Report findings as:

   [SEVERITY] Page/Component — description
   File: path:line
   Current: what exists (or "Missing")
   Suggested: specific fix

   Severity: CRITICAL / HIGH / MEDIUM / LOW

   When done, message the lead with your complete findings.
   ```

4. **Wait** for both reviewers to report findings.

5. **Synthesize** into a single report for the user:
   - **Summary**: 1-2 sentences on overall UX health
   - **Findings by severity**: CRITICAL > HIGH > MEDIUM > LOW with `file:line` refs
   - **Top 5 priorities**: most impactful fixes
   - **Quick wins**: LOW items fixable in <10 min

6. **Shut down** both teammates and clean up the team.
