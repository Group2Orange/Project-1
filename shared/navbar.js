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

  // The empty <nav class="navbar" data-navbar="..."> in the screen
  const placeholder = document.querySelector(".navbar[data-navbar]");

  if (placeholder) {
    // data-navbar="hr" loads navbar-hr.html, from the same folder as this file (shared/)
    const file = new URL(`navbar-${placeholder.dataset.navbar}.html`, document.currentScript.src);

    fetch(file)
      .then((response) => {
        if (!response.ok) throw new Error(`${file} was not found`);
        return response.text();
      })
      .then((html) => {
        // Swap the empty navbar for the real one
        placeholder.outerHTML = html;

        const navbar = document.querySelector(".navbar");
        try {
          const user = JSON.parse(localStorage.getItem('loggedUser'));
          if (user?.name) {
            const parts = user.name.trim().split(/\s+/);
            navbar.querySelector('.navbar-user-name').textContent = user.name;
            navbar.querySelector('.navbar-user-role').textContent = user.role === 'HR' ? 'HR' : 'Employee';
            navbar.querySelector('.navbar-avatar').textContent =
              `${parts[0][0]}${parts.length > 1 ? parts[parts.length - 1][0] : ''}`.toUpperCase();
          }
        } catch (error) {
          console.warn('Could not read the logged-in user for the navbar:', error);
        }

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
