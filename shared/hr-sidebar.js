// hr-sidebar.js - puts the HR sidebar into the page.
//
// A screen has an empty sidebar:
//   <aside class="hr-sidebar" data-hr-sidebar data-hr-sidebar-active="employees"></aside>
// "data-hr-sidebar-active" says which link of the sidebar is the current screen.
// Open the screens with Live Server: the sidebar file is loaded with fetch().

async function loadHrSidebar() {
  const placeholder = document.querySelector("[data-hr-sidebar]");
  if (placeholder === null) {
    return;
  }
  const activePage = placeholder.getAttribute("data-hr-sidebar-active");

  try {
    const response = await fetch("../../shared/hr-sidebar.html");
    if (!response.ok) {
      console.error("HR sidebar: " + response.status);
      placeholder.textContent = "HR navigation is unavailable.";
      return;
    }
    placeholder.outerHTML = await response.text();
    const sidebar = document.querySelector(".hr-sidebar");

    // Mark the link of the current screen.
    const activeLink = sidebar.querySelector('[data-hr-link="' + activePage + '"]');
    if (activeLink !== null) {
      activeLink.className = "is-active";
      activeLink.setAttribute("aria-current", "page");
    }

    // Show the name and photo (or initials) of the logged-in user.
    let user = null;
    try {
      user = JSON.parse(localStorage.getItem("loggedUser"));
    } catch (error) {
      user = null;
    }
    if (user !== null && user.name) {
      const name = user.name.trim();
      const initials = name.split(/\s+/).map(function (word) {
        return word[0];
      }).slice(0, 2).join("").toUpperCase();

      const fallbackImage = "../../common/profile/assets/profile.svg";
      let imageSource = fallbackImage;
      const picture = String(user.image || "");
      if (picture.startsWith("data:image/")) {
        imageSource = picture;
      } else if (picture.startsWith("assets/")) {
        imageSource = "../../" + picture;
      }

      const avatar = sidebar.querySelector(".hr-sidebar-avatar");
      const image = document.createElement("img");
      image.alt = "";
      let usingFallback = imageSource === fallbackImage;
      // "this" is the image that could not be loaded: try the default picture, then the initials.
      image.onerror = function () {
        if (usingFallback) {
          this.remove();
          avatar.textContent = initials;
        } else {
          usingFallback = true;
          this.src = fallbackImage;
        }
      };
      image.src = imageSource;
      avatar.innerHTML = "";
      avatar.appendChild(image);
      sidebar.querySelector(".hr-sidebar-name").textContent = name;
    }

    // Logout forgets the user and opens the login screen.
    sidebar.querySelector("#hrSidebarLogout").addEventListener("click", function () {
      localStorage.removeItem("loggedUser");
      window.location.href = "../../common/login/login.html";
    });

    // The menu button (small screens) opens and closes the links.
    const toggle = sidebar.querySelector(".hr-sidebar-toggle");
    toggle.addEventListener("click", function () {
      const isOpen = toggle.getAttribute("aria-expanded") !== "true";
      sidebar.className = isOpen ? "hr-sidebar is-open" : "hr-sidebar";
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.querySelector("span").textContent = isOpen ? "close" : "menu";
    });
  } catch (error) {
    console.error(error);
    placeholder.textContent = "HR navigation is unavailable.";
  }
}

loadHrSidebar();
