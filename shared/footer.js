// footer.js - puts the shared footer into the page.
//
// A page has an empty footer:   <footer class="site-footer" data-footer></footer>
// and loads this file at the end of the page.
// Open the pages with Live Server: the footer file is loaded with fetch().

async function loadFooter() {
  const placeholder = document.querySelector("[data-footer]");
  if (placeholder === null) {
    return;
  }

  try {
    const response = await fetch("../../shared/footer.html");
    if (!response.ok) {
      console.error("Footer request failed:", response.status);
      placeholder.textContent = "Connectra";
      return;
    }
    placeholder.outerHTML = await response.text();

    // Employees have their own policies page, so their footer links go there.
    let user = null;
    try {
      user = JSON.parse(localStorage.getItem("loggedUser"));
    } catch (error) {
      user = null;
    }
    if (user !== null && user.role === "EMP") {
      const policyLinks = document.querySelectorAll('.site-footer a[href$="hr/policies/policies.html"]');
      policyLinks.forEach(function (link) {
        link.setAttribute("href", "../../employee/policies/EMPpolicies.html");
      });
    }
  } catch (error) {
    console.error("Could not load the shared footer. Open this page with Live Server.", error);
    placeholder.textContent = "Connectra";
  }
}

loadFooter();
