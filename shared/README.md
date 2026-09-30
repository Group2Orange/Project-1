# Shared files

Things every screen uses: the team colors, the fonts and the navbar.
Change something here once and every screen changes too.

| File | What it is |
|---|---|
| `shared.css` | Team colors (as variables), fonts, page background, and **how the navbar looks** |
| `navbar-hr.html` | **The HR navbar**, in plain HTML (logo, links, user, logout) |
| `navbar-employee.html` | **The employee navbar**, in plain HTML |
| `navbar.js` | Puts the right navbar into each screen. You don't need to edit it |

> **Always open screens with Live Server** (right-click the `.html` file, then **Open with Live Server**).
> If you open a screen by double-clicking it, the browser blocks loading the navbar file and the navbar stays empty.

## Edit the navbar

```
[logo] TeamSpace HR    Home  Employees  Tasks ...           (SJ) Sarah Jenkins   [Logout]
                       ‾‾‾‾                                        HR Lead
 .navbar-brand         .navbar-links                     .navbar-user      .navbar-logout
```

**What it shows** (text, links, logo, name): edit the HTML in `navbar-hr.html` and `navbar-employee.html`, like any HTML file.

- **Add a link:** copy a line inside `<div class="navbar-links">` and change it:
  ```html
  <a href="../../hr/tasks/tasks.html">Tasks</a>
  ```
  Links start with `../../`, the same as linking from your own screen.
- **Remove a link:** delete its line. **Reorder:** move the lines.
- **Change the logo:** edit the text `TeamSpace HR` and the icon name `corporate_fare` (icon names: [fonts.google.com/icons](https://fonts.google.com/icons)).
- **Change the user:** edit `Sarah Jenkins`, `HR Lead`, and the initials `SJ`.
  For a photo, put it in `shared/images/` and replace the initials with `<img src="../../shared/images/sarah.jpg" alt="">`.

The logo and the right side (user, logout) are in **both** files. If you change them in one, change the other too.
You don't mark the current screen's link yourself: `navbar.js` underlines it for you.

**How it looks** (colors, sizes, spacing): edit the `Navbar` part of `shared.css`. Each piece has its own class:

| Piece | Class in `shared.css` |
|---|---|
| The whole bar (height, padding, bottom line) | `.navbar` |
| Logo name / logo box | `.navbar-brand` / `.navbar-logo` |
| Links / current link's underline | `.navbar-links a` / `.navbar-links a.active::after` |
| User: photo, green dot, name, role | `.navbar-avatar`, `.navbar-avatar::after`, `.navbar-user-name`, `.navbar-user-role` |
| Logout button | `.navbar-logout` |

For example, to make the bar taller, change `min-height: 64px;` in `.navbar`.

On smaller screens the navbar squeezes itself (the `@media` rules at the end of `shared.css`):
above 1100px the navbar stays on one row, with tighter spacing on smaller laptops; at 1100px and below a hamburger button opens the links and account controls vertically. The menu closes on Escape, an outside click, link selection, or a change between collapsed and desktop layouts. Keyboard focus remains visible on all links and buttons.

Save, and Live Server refreshes the screen with the change. Every screen is updated.

## How a screen is connected

Every screen already has these lines (example: `common/home/home.html`):

```html
<head>
  ...
  <link rel="stylesheet" href="../../shared/shared.css">   <!-- 1: shared look (BEFORE the screen's own CSS) -->
  <link rel="stylesheet" href="home.css">
</head>
<body>
  <nav class="navbar" data-navbar="hr"></nav>              <!-- 2: the navbar goes here: "hr" or "employee" -->

  <!-- your screen's content -->

  <script src="../../shared/navbar.js"></script>           <!-- 3: loads the navbar (BEFORE the screen's own JS) -->
  <script src="home.js"></script>
</body>
```

Keep your screen's content between the `<nav>` line and the `<script>` lines. Don't delete these 3 lines.

| Screen folder | Navbar |
|---|---|
| `hr/...` | `data-navbar="hr"` |
| `employee/...` | `data-navbar="employee"` |
| `common/...` | `data-navbar="hr"` (for now) |
| `common/login/` | No navbar: only line 1 |

**Why the order matters:** your own CSS comes after `shared.css`, so your CSS can still change anything from it.

## Use the team colors in your CSS

Don't type color codes. Use the variables from `shared.css`:

```css
.save-button {
  background: var(--color-primary-dark);
  color: white;
}

.card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
}

.status-approved {
  color: var(--color-tertiary);
}
```

The colors come from the **Calm Clarity HR** design system:

| Variable | Value | Use it for |
|---|---|---|
| `--color-primary` | `#0e7c86` | Primary (teal): logo, highlights |
| `--color-primary-dark` | `#00626a` | Darker teal: main buttons, active link, hover |
| `--color-primary-light` | `#d4eced` | Light teal: soft backgrounds, rings |
| `--color-secondary` | `#4c6079` | Secondary (slate): navbar links, icons, second-level text |
| `--color-tertiary` | `#059669` | Tertiary (green): success, approved, online |
| `--color-danger` | `#ba1a1a` | Red: delete, errors, rejected |
| `--color-text` | `#14181c` | Neutral: main text |
| `--color-text-muted` | `#4c6079` | Muted text |
| `--color-page` | `#f6f9fe` | Page background |
| `--color-card` | `#ffffff` | Card / box background |
| `--color-surface` | `#e8eef9` | Soft gray-blue boxes, secondary buttons, search box |
| `--color-border` | `#dde3ed` | Borders and divider lines |
| `--font-heading` | Space Grotesk | Headlines |
| `--font-text` | Public Sans | Body text and labels |

`shared.css` already sets the fonts on `body` and `h1, h2, h3`, so you don't need to.

## Add more shared things

**A shared style** (for example a button every screen uses): add it to `shared.css`:

```css
.btn-main {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: var(--color-primary-dark);
  color: white;
  cursor: pointer;
}
```

Every screen can now write `<button class="btn-main">Save</button>`.

**Shared JavaScript** (for example code to save data, later): make a new file here, e.g. `shared/storage.js`.
Load it in a screen the same way as `navbar.js`, before the screen's own script:

```html
<script src="../../shared/storage.js"></script>
```

Functions in it can then be called from the screen's own `.js` file.

## How it works

1. **`shared.css`** is a normal stylesheet. Every screen that links it gets its rules, like having the same CSS pasted at the top of the screen's own file.
   The colors are **CSS variables** (`--color-primary: #0e7c86;`). `var(--color-primary)` reads the value, so changing one line changes the color everywhere.
2. **The empty `<nav class="navbar" data-navbar="hr">`** in each screen marks where the navbar goes and which one it is.
   `shared.css` already gives it its height and background, so the page doesn't jump when the navbar appears.
3. **`navbar.js`** reads `data-navbar`, loads the matching file (`navbar-hr.html` or `navbar-employee.html`), and puts its HTML in place of the empty `<nav>`.
   Then it adds `class="active"` to the link of the screen you're on, so it's underlined.

Plain HTML has no way to include one HTML file inside another. That's why this small JavaScript file does it.
Browsers only allow a page to load another file when the page comes from a server, which is why screens must be opened with Live Server.

## Something is wrong?

| Problem | Check |
|---|---|
| Empty white bar, no navbar | Open the screen with **Live Server**, not by double-clicking. Still empty? Open DevTools (F12), then Console, and read the red error |
| No navbar and no white bar | The `<nav class="navbar" data-navbar="...">` line is missing |
| Red error: `could not load the navbar` | `data-navbar` must be exactly `hr` or `employee`, and the `navbar.js` path must be `../../shared/navbar.js` |
| A navbar link goes to the wrong page | Check its `href` in `navbar-hr.html` / `navbar-employee.html`: it must start with `../../` |
| Colors or fonts look wrong | The `shared.css` `<link>` line is missing, has a wrong path, or comes after your own `.css` |
| My CSS doesn't beat the shared CSS | Your `<link>` must come after `shared.css` |

## Who edits this folder

Like `index.html` and `guides/`, the files in `shared/` affect every screen.
Change them only through a pull request that the team leader reviews.
If you need something new in here, ask the team leader.
