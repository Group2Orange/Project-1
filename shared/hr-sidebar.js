{
  const placeholder = document.querySelector('[data-hr-sidebar]');
  if (placeholder) {
    const active = placeholder.dataset.hrSidebarActive;
    const file = new URL('hr-sidebar.html', document.currentScript.src);
    fetch(file)
      .then(response => {
        if (!response.ok) throw new Error(`HR sidebar: ${response.status}`);
        return response.text();
      })
      .then(html => {
        placeholder.outerHTML = html;
        const sidebar = document.querySelector('.hr-sidebar');
        const link = sidebar.querySelector(`[data-hr-link="${active}"]`);
        if (link) {
          link.classList.add('is-active');
          link.setAttribute('aria-current', 'page');
        }
        try {
          const user = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('loggedUser'));
          if (user?.name) {
            sidebar.querySelector('.hr-sidebar-name').textContent = user.name;
            sidebar.querySelector('.hr-sidebar-avatar').textContent = user.name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
          }
        } catch { /* Keep the generic label. */ }
        const toggle = sidebar.querySelector('.hr-sidebar-toggle');
        toggle.addEventListener('click', () => {
          const open = sidebar.classList.toggle('is-open');
          toggle.setAttribute('aria-expanded', String(open));
          toggle.querySelector('span').textContent = open ? 'close' : 'menu';
        });
      })
      .catch(error => {
        console.error(error);
        placeholder.textContent = 'HR navigation is unavailable.';
      });
  }
}
