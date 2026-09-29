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

There is no shared CSS file. Everybody takes colors, fonts and sizes from the Figma design, so please use exactly these values.
Wadea fills in the color values from the design.

| Thing | Value |
|---|---|
| Heading font | Space Grotesk |
| Text font | Public Sans |
| Icons | Material Symbols Outlined |
| Main color (teal) | |
| Main color, darker (hover) | |
| Light teal (soft backgrounds) | |
| Page background | |
| Card / box background | |
| Border color | |
| Text color | |
| Muted text color | |

## Navbar links

Every screen (except login) has a navbar. HR has more links than employees. This list is a proposal: Wadea adjusts it to match the design.
Use the same names and order on every screen.

| Navbar | Links (in order) |
|---|---|
| HR (screens in `hr/` and, for now, `common/`) | Home, Employees, Tasks, Requests, Feedback, Policies, About, Contact, Profile |
| Employee (screens in `employee/`) | Home, My Tasks, My Requests, Policies, About, Contact, Profile |

Where each link goes (from any screen, go up two folders):

| Link | Path |
|---|---|
| Home | `../../common/home/home.html` |
| Employees | `../../hr/employees/employees.html` |
| Tasks | `../../hr/tasks/tasks.html` |
| Requests | `../../hr/requests/requests.html` |
| Feedback | `../../hr/feedback/feedback.html` |
| My Tasks | `../../employee/my-tasks/my-tasks.html` |
| My Requests | `../../employee/my-requests/my-requests.html` |
| Policies | `../../common/policies/policies.html` |
| About | `../../common/about/about.html` |
| Contact | `../../common/contact/contact.html` |
| Profile | `../../common/profile/profile.html` |
