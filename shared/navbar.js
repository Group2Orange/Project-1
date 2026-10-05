// navbar.js - puts the navbar into the page and protects the page (login + role check).
//
// A screen uses it like this:
//   1. Right after <body>:   <nav class="navbar" data-navbar="hr"></nav>      ("hr" or "employee")
//   2. At the end of <body>: <script src="../../shared/navbar.js"></script>
//
// Some screens only need the protection and no bar:   <div data-navbar-guard="hr" hidden></div>
//
// Open the screens with Live Server: the navbar file is loaded with fetch().

function startNavbar() {
  // ----- Theme: light or dark -----
  if (localStorage.getItem("teamspaceTheme") === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.setAttribute("data-theme", "light");
  }
  const themeStyles = document.createElement("link");
  themeStyles.rel = "stylesheet";
  themeStyles.href = "../../shared/theme.css";
  document.head.appendChild(themeStyles);

  // ----- Who is logged in? (null when nobody is) -----
  function getLoggedUser() {
    let user = null;
    try {
      user = JSON.parse(localStorage.getItem("loggedUser"));
    } catch (error) {
      console.warn("Could not read the logged-in user:", error);
    }
    if (user === null || !user.id || String(user.name || "").trim() === "") {
      return null;
    }
    if (user.role !== "HR" && user.role !== "EMP") {
      return null;
    }
    return user;
  }

  // ----- Show the user's name, role and photo (or initials) in the navbar -----
  function showIdentity(navbar, person) {
    if (person === null || !person.name) {
      return;
    }

    const words = person.name.trim().split(/\s+/);
    let initials = words[0][0];
    if (words.length > 1) {
      initials = initials + words[words.length - 1][0];
    }
    initials = initials.toUpperCase();

    navbar.querySelector(".navbar-user-name").textContent = person.name;
    navbar.querySelector(".navbar-user-role").textContent = person.role === "HR" ? "HR" : "Employee";

    const avatar = navbar.querySelector(".navbar-avatar");
    const picture = String(person.image || "");
    if (picture.startsWith("data:image/") || picture.startsWith("assets/")) {
      avatar.textContent = "";
      const image = document.createElement("img");
      image.alt = "";
      image.src = picture.startsWith("assets/") ? "../../" + picture : picture;
      // "this" is the image that could not be loaded: remove it and show the initials instead.
      image.onerror = function () {
        this.remove();
        avatar.textContent = initials;
      };
      avatar.appendChild(image);
    } else {
      avatar.textContent = initials;
    }
  }

  // The edit-profile screen calls this after the name or photo changes.
  window.updateNavbarIdentity = function () {
    const navbar = document.querySelector(".navbar");
    if (navbar !== null) {
      showIdentity(navbar, getLoggedUser());
    }
  };

  // ----- Find the empty spot in the page -----
  const barPlaceholder = document.querySelector(".navbar[data-navbar]");
  const guardPlaceholder = document.querySelector("[data-navbar-guard]");
  const placeholder = barPlaceholder || guardPlaceholder;
  if (placeholder === null) {
    return;
  }

  const user = getLoggedUser();
  const path = location.pathname;
  const isProtectedPage = path.includes("/hr/") || path.includes("/employee/");

  let navbarType = "";
  if (barPlaceholder !== null) {
    navbarType = barPlaceholder.getAttribute("data-navbar");
  } else {
    navbarType = guardPlaceholder.getAttribute("data-navbar-guard");
  }
  const expectedRole = navbarType === "employee" ? "EMP" : "HR";

  // HR can also read the employee policies page.
  const hrReadsPolicies = user !== null && user.role === "HR" && path.endsWith("/employee/policies/EMPpolicies.html");

  // ----- Protect the page -----
  if (isProtectedPage && user === null) {
    location.replace("../../common/login/login.html");
    return;
  }
  if (isProtectedPage && user.role !== expectedRole && !hrReadsPolicies) {
    if (user.role === "EMP") {
      location.replace("../../employee/MyWOrkSpace/MyWOrkSpace.html");
    } else {
      location.replace("../../hr/workspace/workspace.html");
    }
    return;
  }
  if (barPlaceholder === null) {
    return; // this screen only needs the protection, there is no bar to show
  }

  // ----- Which navbar? Shared screens use the navbar of the person who is logged in -----
  let type = navbarType;
  if (hrReadsPolicies) {
    type = "hr";
  } else if (path.includes("/common/") && user !== null && user.role === "EMP") {
    type = "employee";
  }

  // ----- Fill the navbar and make its buttons work -----
  function setUpNavbar() {
    const navbar = document.querySelector(".navbar");
    const loginLink = navbar.querySelector(".navbar-login");
    const userLink = navbar.querySelector(".navbar-user");
    const logoutLink = navbar.querySelector(".navbar-logout");

    // Nobody logged in: show Login. Someone logged in: show the user and Logout.
    loginLink.hidden = user !== null;
    userLink.hidden = user === null;
    logoutLink.hidden = user === null;

    // Without a login, hide the links that need one.
    if (user === null) {
      navbar.querySelectorAll(".navbar-links a").forEach(function (link) {
        if (link.pathname.includes("/workspace/") || link.pathname.includes("/policies/")) {
          link.hidden = true;
        }
      });
    }

    // Logout forgets the user. The link itself opens the login screen.
    logoutLink.addEventListener("click", function () {
      localStorage.removeItem("loggedUser");
    });

    // Dark / light button (it only works when the button is in the navbar HTML).
    const themeButton = navbar.querySelector(".theme-toggle");
    function showThemeButton() {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      themeButton.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
      themeButton.querySelector("span").textContent = isDark ? "light_mode" : "dark_mode";
    }
    if (themeButton !== null) {
      showThemeButton();
      themeButton.addEventListener("click", function () {
        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        const nextTheme = isDark ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", nextTheme);
        localStorage.setItem("teamspaceTheme", nextTheme);
        showThemeButton();
      });
    }

    showIdentity(navbar, user);

    // The menu button (small screens) opens and closes the links.
    const toggle = navbar.querySelector(".navbar-toggle");
    function setMenuOpen(isOpen) {
      navbar.className = isOpen ? "navbar is-open" : "navbar";
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
      toggle.querySelector("span").textContent = isOpen ? "close" : "menu";
    }
    toggle.addEventListener("click", function () {
      setMenuOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    navbar.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && navbar.className === "navbar is-open") {
        setMenuOpen(false);
        toggle.focus();
      }
    });
    navbar.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setMenuOpen(false);
      });
    });
    document.addEventListener("click", function (event) {
      if (!navbar.contains(event.target)) {
        setMenuOpen(false);
      }
    });

    // Underline the link of the screen you are on.
    navbar.querySelectorAll(".navbar-links a").forEach(function (link) {
      if (link.pathname === location.pathname) {
        link.className = "active";
        link.setAttribute("aria-current", "page");
      }
    });
  }

  // ----- Load the navbar file and put it in place of the empty <nav> -----
  async function loadNavbar() {
    try {
      const response = await fetch("../../shared/navbar-" + type + ".html");
      if (!response.ok) {
        console.error('navbar.js: could not load the navbar. Check that data-navbar is "hr" or "employee".');
        return;
      }
      placeholder.outerHTML = await response.text();
      setUpNavbar();
    } catch (error) {
      console.error("navbar.js: could not load the navbar. Open the screen with Live Server.", error);
    }
  }

  loadNavbar();
}

startNavbar();
