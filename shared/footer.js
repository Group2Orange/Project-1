// Serve pages through Live Server, just like the shared navbar.
{
  const placeholder = document.querySelector('[data-footer]');
  if (placeholder) {
    const file = new URL('footer.html', document.currentScript.src);
    fetch(file)
      .then(response => {
        if (!response.ok) throw new Error(`Footer request failed: ${response.status}`);
        return response.text();
      })
      .then(html => {
        placeholder.outerHTML = html;

        // Policies are different for each user type. footer.html points to the HR policies,
        // so on employee screens we send the footer's policy links to the employee policies instead.
        let role = null;
        try { role = JSON.parse(localStorage.getItem('loggedUser'))?.role; } catch { /* No session. */ }
        if (role === 'EMP') {
          for (const link of document.querySelectorAll('.site-footer a[href$="hr/policies/policies.html"]')) {
            link.setAttribute('href', '../../employee/policies/EMPpolicies.html');
          }
        }
      })
      .catch(error => {
        console.error('Could not load the shared footer. Open this page through Live Server.', error);
        placeholder.textContent = 'TeamSpace HR';
      });
  }
}
