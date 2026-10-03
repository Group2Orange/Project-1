# Design links

Paste the Figma / Stitch link of each screen here so everyone builds from the same design.

| # | Screen | Folder | Design link |
|---|---|---|---|
| 1 | Login | `common/login/` | |
| 2 | Home and Services | `common/home/` | |
| 3 | User Profile | `common/profile/` | |
| 4 | Edit Profile | `common/edit-profile/` | |
| 5 | Company Policies | `common/policies/` | |
| 6 | About Us and Team | `common/about/` | |
| 7 | Contact Us and Submit Feedback | `common/contact/` | |
| 8 | Employee Management | `hr/employees/` | |
| 9 | Add or Edit Employee Account | `hr/employee-form/` | |
| 10 | Employee Details | `hr/employee-details/` | |
| 11 | Task Management | `hr/tasks/` | |
| 12 | Create or Edit and Assign Task | `hr/task-form/` | |
| 13 | Task Submission Review | `hr/task-review/` | |
| 14 | Leave and Early-Departure Requests | `hr/requests/` | |
| 15 | Employee Feedback Inbox | `hr/feedback/` | |
| 16 | My Tasks | `employee/my-tasks/` | |
| 17 | Task Details and Submit Solution | `employee/task-details/` | |
| 18 | Submit Leave or Early-Departure Request | `employee/new-request/` | |
| 19 | My Leave and Early-Departure Requests | `employee/my-requests/` | |

## Team colors and fonts

The team colors come from the **Calm Clarity HR** design system and live in `shared/shared.css` as CSS variables.
Every screen already loads that file, so use the variables instead of typing color codes, e.g. `color: var(--color-primary);`.
The full list with what each one is for is in [`shared/README.md`](../shared/README.md).

| Thing | Value | CSS variable |
|---|---|---|
| Heading font | Space Grotesk | `--font-heading` |
| Text font | Public Sans | `--font-text` |
| Icons | Material Symbols Outlined | |
| Main color (teal) | `#0e7c86` | `--color-primary` |
| Main color, darker (buttons, hover) | `#00626a` | `--color-primary-dark` |
| Light teal (soft backgrounds) | `#d4eced` | `--color-primary-light` |
| Secondary (slate) | `#4c6079` | `--color-secondary` |
| Tertiary (green) | `#059669` | `--color-tertiary` |
| Page background | `#f6f9fe` | `--color-page` |
| Card / box background | `#ffffff` | `--color-card` |
| Border color | `#dde3ed` | `--color-border` |
| Text color | `#14181c` | `--color-text` |
| Muted text color | `#4c6079` | `--color-text-muted` |

## Navbar

The navbar is shared: it's already on every screen (except login), so nobody builds their own.

| Navbar | Shown on | Links (in order) | File |
|---|---|---|---|
| HR | screens in `hr/` and, for now, `common/` | Home, Employees, Tasks, Requests, Feedback, Policies, About, Contact | `shared/navbar-hr.html` |
| Employee | screens in `employee/` | Home, My Tasks, My Requests, Policies, About, Contact | `shared/navbar-employee.html` |

Profile opens from the user's name and photo on the right, and Logout goes to the login screen.
To change the navbar, see "Edit the navbar" in [`shared/README.md`](../shared/README.md).
