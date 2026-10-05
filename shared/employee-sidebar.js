// employee-sidebar.js - puts the employee sidebar into the page.
//
// A screen has an empty sidebar:
//   <aside class="employee-sidebar" data-employee-sidebar data-sidebar-active="tasks"></aside>
// "data-sidebar-active" says which link of the sidebar is the current screen.
// Open the screens with Live Server: the sidebar file is loaded with fetch().

// Updates the task count and the progress bar in the sidebar.
// The My Tasks screen calls this function every time a task changes.
async function updateSidebarTasks() {
  const sidebar = document.querySelector(".employee-sidebar");
  if (sidebar === null) {
    return;
  }
  // The sidebar file may not be loaded yet. It calls this function again when it is loaded.
  if (sidebar.querySelector("#sidebarTaskCount") === null) {
    return;
  }

  let tasks = [];
  try {
    const user = JSON.parse(localStorage.getItem("loggedUser"));
    if (user !== null && user.id) {
      const response = await fetch("http://127.0.0.1:3000/tasks?employeeId=" + encodeURIComponent(user.id));
      if (response.ok) {
        tasks = await response.json();
      } else {
        console.warn("Could not load task progress.");
      }
    }
  } catch (error) {
    console.warn(error);
  }

  const completedCount = tasks.filter(function (task) {
    return task.status === "completed";
  }).length;
  const activeCount = tasks.length - completedCount;
  let progress = 0;
  if (tasks.length > 0) {
    progress = Math.round(completedCount / tasks.length * 100);
  }

  sidebar.querySelector("#sidebarTaskCount").textContent = activeCount;
  sidebar.querySelector("#weeklyProgressText").textContent = progress + "%";
  sidebar.querySelector("#weeklyProgressBar").style.width = progress + "%";
  sidebar.querySelector('[role="progressbar"]').setAttribute("aria-valuenow", String(progress));
}

async function loadEmployeeSidebar() {
  const placeholder = document.querySelector("[data-employee-sidebar]");
  if (placeholder === null) {
    return;
  }
  const activePage = placeholder.getAttribute("data-sidebar-active");

  try {
    const response = await fetch("../../shared/employee-sidebar.html");
    if (!response.ok) {
      console.error("Sidebar request failed: " + response.status);
      placeholder.textContent = "Workspace navigation is unavailable.";
      return;
    }
    placeholder.outerHTML = await response.text();
    const sidebar = document.querySelector(".employee-sidebar");

    // Show the name, department and photo (or initials) of the logged-in user.
    let user = null;
    try {
      user = JSON.parse(localStorage.getItem("loggedUser"));
    } catch (error) {
      console.warn("Could not read the logged-in user for the sidebar:", error);
    }
    if (user !== null && user.name) {
      const words = user.name.trim().split(/\s+/);
      let initials = words[0][0];
      if (words.length > 1) {
        initials = initials + words[words.length - 1][0];
      }
      initials = initials.toUpperCase();

      sidebar.querySelector(".employee-sidebar-person strong").textContent = user.name;
      sidebar.querySelector(".employee-sidebar-person small").textContent = user.department || user.position || "Employee";

      const avatar = sidebar.querySelector(".employee-sidebar-avatar");
      avatar.textContent = initials;
      const picture = String(user.image || "");
      if (picture.startsWith("data:image/") || picture.startsWith("assets/")) {
        const image = document.createElement("img");
        image.alt = "";
        // "this" is the image that could not be loaded: remove it and show the initials instead.
        image.onerror = function () {
          this.remove();
          avatar.textContent = initials;
        };
        avatar.textContent = "";
        image.src = picture.startsWith("assets/") ? "../../" + picture : picture;
        avatar.appendChild(image);
      }
    }

    // Mark the link of the current screen.
    const activeLink = sidebar.querySelector('[data-sidebar-link="' + activePage + '"]');
    if (activeLink !== null) {
      activeLink.className = "is-active";
      activeLink.setAttribute("aria-current", "page");
    }

    // Logout forgets the user and opens the login screen.
    sidebar.querySelector("#employeeSidebarLogout").addEventListener("click", function () {
      localStorage.removeItem("loggedUser");
      window.location.href = "../../common/login/login.html";
    });

    // The menu button (small screens) opens and closes the links.
    const toggle = sidebar.querySelector(".employee-sidebar-toggle");
    toggle.addEventListener("click", function () {
      const isOpen = toggle.getAttribute("aria-expanded") !== "true";
      sidebar.className = isOpen ? "employee-sidebar is-open" : "employee-sidebar";
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.setAttribute("aria-label", isOpen ? "Hide workspace pages" : "Show workspace pages");
      toggle.querySelector("span").textContent = isOpen ? "close" : "menu";
    });

    updateSidebarTasks();
    window.addEventListener("pageshow", updateSidebarTasks);
  } catch (error) {
    console.error("Could not load the employee sidebar. Open this page with Live Server.", error);
    placeholder.textContent = "Workspace navigation is unavailable.";
  }
}

loadEmployeeSidebar();
