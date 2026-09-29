# HR Management System (frontend)

A Human Resources Management System built by our university team.
For now it is **wireframes and mockups in plain HTML + CSS**. JavaScript comes later (mainly for storing data).

- Design: calm, professional teal theme
- Fonts: Space Grotesk (headings) and Public Sans (text)
- Icons: Material Symbols
- Layout: a **navbar** (the bar with links at the top) on every screen, no sidebar. **HR and employees have different navbars** (HR has more links).

## How to open the project

1. Open the folder `Project-1` in VS Code.
2. Right-click `index.html` and choose **Open with Live Server**.
3. Click any screen in the list.

Fonts and icons load from the internet (Google Fonts), so you need to be online.

## The folder map (read this first)

```
Project-1/
│
├── index.html              Home page: a list of links to every screen
├── README.md               This file
│
├── common/                 SCREENS USED BY EVERYBODY (built once)
│   ├── login/              login.html + login.css + login.js   <- one folder = one screen
│   ├── home/
│   ├── profile/
│   ├── edit-profile/
│   ├── policies/
│   ├── about/
│   └── contact/
│
├── hr/                     SCREENS ONLY FOR HR STAFF
│   ├── employees/
│   ├── employee-form/
│   ├── employee-details/
│   ├── tasks/
│   ├── task-form/
│   ├── task-review/
│   ├── requests/
│   └── feedback/
│
├── employee/               SCREENS ONLY FOR EMPLOYEES
│   ├── my-tasks/
│   ├── task-details/
│   ├── new-request/
│   └── my-requests/
│
└── guides/
    ├── design-links.md         Figma links (one row per screen) + team colors, fonts and navbar links
    ├── Teammate-Handbook.pdf   for teammates: how to work, the structure, what each folder holds
    └── GitHub-Team-Guide.pdf   for the team leader: GitHub setup and workflow
```

Every screen is a **standalone, empty skeleton**: the `.html` only has the basic page code, the font and icon links, and links to its own `.css` and `.js`. The `.css` and `.js` files are empty. Each teammate fills in their own screens.

## The 19 screens

| # | Screen | Folder |
|---|---|---|
| 1 | Login | `common/login/` |
| 2 | Home and Services | `common/home/` |
| 3 | User Profile | `common/profile/` |
| 4 | Edit Profile | `common/edit-profile/` |
| 5 | Company Policies | `common/policies/` |
| 6 | About Us and Team | `common/about/` |
| 7 | Contact Us and Submit Feedback | `common/contact/` |
| 8 | HR Employee Management | `hr/employees/` |
| 9 | Add or Edit Employee Account | `hr/employee-form/` |
| 10 | Employee Details (HR) | `hr/employee-details/` |
| 11 | HR Task Management | `hr/tasks/` |
| 12 | Create or Edit and Assign Task | `hr/task-form/` |
| 13 | HR Task Submission Review | `hr/task-review/` |
| 14 | HR Leave and Early-Departure Requests | `hr/requests/` |
| 15 | HR Employee Feedback Inbox | `hr/feedback/` |
| 16 | Employee My Tasks | `employee/my-tasks/` |
| 17 | Employee Task Details and Submit Solution | `employee/task-details/` |
| 18 | Submit Leave or Early-Departure Request | `employee/new-request/` |
| 19 | Employee My Leave and Early-Departure Requests | `employee/my-requests/` |

## What is shared

**Nothing is shared between screens.** Each screen is standalone, so nobody has to learn how to link shared files.

- **Colors, fonts and sizes:** everybody takes them from the Figma design. The team's main values are listed in `guides/design-links.md`.
- **The navbar:** each teammate builds it from the Figma design in their own screens (right after `<body>`).
  - Screens in `hr/` show the **HR navbar** (more links).
  - Screens in `employee/` show the **employee navbar**.
  - Screens in `common/` show the HR navbar for now. The `login` screen has no navbar.
  - The list of links for each navbar is in `guides/design-links.md`.
- **Linking to another screen:** go up two folders, then into the group and screen folder:
  `<a href="../../hr/employees/employees.html">Employees</a>`

Later in the course we will learn how to write the navbar **once** and reuse it on every screen. Until then everyone builds their own copy.

## Start your CSS with this

Every screen's CSS starts empty. Paste this at the top so the fonts are applied, then continue with the design:

```css
body {
  margin: 0;
  font-family: "Public Sans", sans-serif;
}

h1, h2, h3 {
  font-family: "Space Grotesk", sans-serif;
}
```

## The one rule to remember

> **Every screen owns its own folder. Only edit your own screens' folders.**
> The shared files (`index.html`, `guides/`) are changed only through a pull request that the team leader reviews.

That way two people never edit the same file, and nobody overwrites anybody's work.

## How a screen is connected

Inside `employee/new-request/new-request.html`:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/...">   <!-- fonts (Google, needs internet) -->
<link rel="stylesheet" href="https://fonts.googleapis.com/...">   <!-- icons (Google, needs internet) -->
<link rel="stylesheet" href="new-request.css">                    <!-- this screen's look -->

<script src="new-request.js"></script>                            <!-- this screen's code -->
```

These lines are already in every screen. Do not change them.

## Need a new screen?

Ask the team leader. He copies an existing screen folder, renames its 3 files and adds it to `index.html`.

## Branch names

One branch per screen, named `screen/` + the group folder + the screen folder, joined with dashes:
`common/home` becomes `screen/common-home`, and `employee/new-request` becomes `screen/employee-new-request`.

## Git workflow

Repository: https://github.com/Group2Orange/Project-1

Teammates: read `guides/Teammate-Handbook.pdf` (how to build your screen and use GitHub).
Team leader: read `guides/GitHub-Team-Guide.pdf`.
