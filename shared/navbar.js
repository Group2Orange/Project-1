/*
  Puts the shared navbar into a screen. You don't need to edit this file.

  The navbar itself is plain HTML, in:
    shared/navbar-hr.html         the HR navbar
    shared/navbar-employee.html   the employee navbar
  and its look is in shared/shared.css. Edit those files instead.

  How a screen uses it (full guide in shared/README.md):
    1. Right after <body>:  <nav class="navbar" data-navbar="hr"></nav>          ("hr" or "employee")
    2. At the end of <body>, before the screen's own script:
         <script src="../../shared/navbar.js"></script>

  Open screens with Live Server. When a screen is opened by double-clicking it,
  the browser doesn't allow it to load another file, so the navbar stays empty.
*/

{ // These curly braces keep the names below private, so they never clash with names in a screen's own .js file.

  const themeKey = 'teamspaceTheme';
  const savedTheme = localStorage.getItem(themeKey);
  document.documentElement.dataset.theme = savedTheme === 'dark' ? 'dark' : 'light';
  const themeStyles = document.createElement('link');
  themeStyles.rel = 'stylesheet';
  themeStyles.href = new URL('theme.css', document.currentScript.src).href;
  document.head.append(themeStyles);

  // A screen shows one of two things:
  //   <nav class="navbar" data-navbar="...">        the full navbar (renders a bar)
  //   <div data-navbar-guard="...">                 login/role protection only, no visible bar
  // Both carry the expected role ("hr" or "employee") so the guard below works either way.
  const barPlaceholder = document.querySelector(".navbar[data-navbar]");
  const guardPlaceholder = document.querySelector("[data-navbar-guard]");
  const placeholder = barPlaceholder || guardPlaceholder;

  if (placeholder) {
    let user = null;
    try {
      user = JSON.parse(localStorage.getItem('loggedUser'));
    } catch (error) {
      console.warn('Could not read the logged-in user:', error);
    }
    if (!user?.id || !['HR', 'EMP'].includes(user.role) || !String(user.name || '').trim()) user = null;

    const path = location.pathname;
    const protectedPage = path.includes('/hr/') || path.includes('/employee/');
    const navbarType = barPlaceholder ? barPlaceholder.dataset.navbar : guardPlaceholder.dataset.navbarGuard;
    const expectedRole = navbarType === 'employee' ? 'EMP' : 'HR';
    // HR can read the employee policy page from the main navbar. The HR sidebar
    // still opens the separate policy management page.
    const hrReadingPolicies = user?.role === 'HR' && path.endsWith('/employee/policies/EMPpolicies.html');
    if (protectedPage && !user) {
      location.replace('../../common/login/login.html');
    } else if (protectedPage && user && user.role !== expectedRole && !hrReadingPolicies) {
      location.replace(user.role === 'EMP'
        ? '../../employee/MyWOrkSpace/MyWOrkSpace.html'
        : user.role === 'HR' ? '../../hr/workspace/workspace.html' : '../../common/login/login.html');
    } else if (!barPlaceholder) {
      // Guard-only screen (the dashboards): login/role check passed, there is no bar to render.
    } else {
    // Shared public pages use the navbar that matches the signed-in role.
    const type = hrReadingPolicies ? 'hr'
      : path.includes('/common/') && user?.role === 'EMP'
        ? 'employee' : barPlaceholder.dataset.navbar;
    const file = new URL(`navbar-${type}.html`, document.currentScript.src);

    fetch(file)
      .then((response) => {
        if (!response.ok) throw new Error(`${file} was not found`);
        return response.text();
      })
      .then((html) => {
        // Swap the empty navbar for the real one
        placeholder.outerHTML = html;

        const navbar = document.querySelector(".navbar");
        const loginLink = navbar.querySelector('.navbar-login');
        const userLink = navbar.querySelector('.navbar-user');
        const logoutLink = navbar.querySelector('.navbar-logout');
        loginLink.hidden = Boolean(user);
        userLink.hidden = !user;
        logoutLink.hidden = !user;
        if (!user) {
          navbar.querySelectorAll('.navbar-links a').forEach(link => {
            if (link.pathname.includes('/workspace/') || link.pathname.includes('/policies/')) link.hidden = true;
          });
        }
        logoutLink.addEventListener('click', () => {
          localStorage.removeItem('loggedUser');
          localStorage.removeItem('currentUserId');
          localStorage.removeItem('currentUser');
        });
        const themeButton = navbar.querySelector('.theme-toggle');
        function updateThemeButton() {
          const dark = document.documentElement.dataset.theme === 'dark';
          themeButton.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
          themeButton.querySelector('span').textContent = dark ? 'light_mode' : 'dark_mode';
        }
        if (themeButton) {
          updateThemeButton();
          themeButton.addEventListener('click', () => {
            const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
            document.documentElement.dataset.theme = next;
            localStorage.setItem(themeKey, next);
            updateThemeButton();
          });
        }
        function showIdentity(person) {
          if (!person?.name) return;
          const parts = person.name.trim().split(/\s+/);
          navbar.querySelector('.navbar-user-name').textContent = person.name;
          navbar.querySelector('.navbar-user-role').textContent = person.role === 'HR' ? 'HR' : 'Employee';
          const avatar = navbar.querySelector('.navbar-avatar');
          const initialsText = `${parts[0][0]}${parts.length > 1 ? parts[parts.length - 1][0] : ''}`.toUpperCase();
          const source = String(person.image || '');
          if (source.startsWith('data:image/') || source.startsWith('assets/')) {
            avatar.textContent = ''; // Clear initials temporarily while the image loads
            const image = document.createElement('img');
            image.alt = '';
            image.src = source.startsWith('assets/') ? `../../${source}` : source;
            image.addEventListener('error', () => {
                image.remove();
                avatar.textContent = initialsText; // Restore initials if the image is broken
            });
            avatar.append(image);
          } else {
            avatar.textContent = initialsText; // No image, show initials
          }
        }
        showIdentity(user);
        window.addEventListener('teamspace:profile-changed', () => {
          try { showIdentity(JSON.parse(localStorage.getItem('loggedUser'))); }
          catch { /* Keep the current label. */ }
        });

        const toggle = navbar.querySelector(".navbar-toggle");
        const compactLayout = window.matchMedia("(max-width: 1100px)");

        function setMenuOpen(open) {
          navbar.classList.toggle("is-open", open);
          toggle.setAttribute("aria-expanded", String(open));
          toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
          toggle.querySelector("span").textContent = open ? "close" : "menu";
        }

        toggle.addEventListener("click", () => {
          setMenuOpen(toggle.getAttribute("aria-expanded") !== "true");
        });
        navbar.addEventListener("keydown", (event) => {
          if (event.key === "Escape" && navbar.classList.contains("is-open")) {
            setMenuOpen(false);
            toggle.focus();
          }
        });
        navbar.addEventListener("click", (event) => {
          if (compactLayout.matches && event.target.closest("a")) setMenuOpen(false);
        });
        document.addEventListener("click", (event) => {
          if (!navbar.contains(event.target)) setMenuOpen(false);
        });
        compactLayout.addEventListener("change", () => {
          const focusWillHide = compactLayout.matches
            ? navbar.querySelector(".navbar-links").contains(document.activeElement) ||
              navbar.querySelector(".navbar-right").contains(document.activeElement)
            : document.activeElement === toggle;
          setMenuOpen(false);
          if (focusWillHide) {
            (compactLayout.matches ? toggle : navbar.querySelector(".navbar-brand")).focus();
          }
        });

        // Underline the link of the screen you are on
        for (const link of document.querySelectorAll(".navbar-links a")) {
          if (link.pathname === location.pathname) {
            link.classList.add("active");
            link.setAttribute("aria-current", "page");
          }
        }
      })
      .catch((error) => {
        console.error(
          'navbar.js: could not load the navbar. Check that data-navbar is "hr" or "employee", ' +
          "and open the screen with Live Server (not by double-clicking it).",
          error
        );
      });
    }
  }
}
