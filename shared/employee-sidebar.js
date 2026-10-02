{
  const placeholder = document.querySelector('[data-employee-sidebar]');

  if (placeholder) {
    const sidebarScriptUrl = document.currentScript.src;
    const activePage = placeholder.dataset.sidebarActive;
    const file = new URL('employee-sidebar.html', document.currentScript.src);

    fetch(file)
      .then(response => {
        if (!response.ok) throw new Error(`Sidebar request failed: ${response.status}`);
        return response.text();
      })
      .then(html => {
        placeholder.outerHTML = html;

        const sidebar = document.querySelector('.employee-sidebar');
        try {
          const user = JSON.parse(localStorage.getItem('loggedUser'));
          if (user?.name) {
            const parts = user.name.trim().split(/\s+/);
            sidebar.querySelector('.employee-sidebar-person strong').textContent = user.name;
            sidebar.querySelector('.employee-sidebar-person small').textContent = user.department || user.position || 'Employee';
            sidebar.querySelector('.employee-sidebar-avatar').textContent =
              `${parts[0][0]}${parts.length > 1 ? parts[parts.length - 1][0] : ''}`.toUpperCase();
          }
        } catch (error) {
          console.warn('Could not read the logged-in user for the sidebar:', error);
        }

        const activeLink = sidebar.querySelector(`[data-sidebar-link="${activePage}"]`);
        if (activeLink) {
          activeLink.classList.add('is-active');
          activeLink.setAttribute('aria-current', 'page');
        }

        const toggle = sidebar.querySelector('.employee-sidebar-toggle');
        toggle.addEventListener('click', () => {
          const open = sidebar.classList.toggle('is-open');
          toggle.setAttribute('aria-expanded', String(open));
          toggle.setAttribute('aria-label', open ? 'Hide workspace pages' : 'Show workspace pages');
          toggle.querySelector('span').textContent = open ? 'close' : 'menu';
        });

        function updateTaskSummary() {
          let tasks = [];
          try {
            const saved = JSON.parse(localStorage.getItem('employeeTasks'));
            if (Array.isArray(saved)) tasks = saved;
          } catch (error) {
            console.warn('Could not read saved tasks for the sidebar:', error);
          }

          const activeCount = tasks.filter(task => task.status !== 'completed').length;
          const completedCount = tasks.filter(task => task.status === 'completed').length;
          const progress = tasks.length ? Math.round(completedCount / tasks.length * 100) : 0;

          sidebar.querySelector('#sidebarTaskCount').textContent = activeCount;
          sidebar.querySelector('#weeklyProgressText').textContent = `${progress}%`;
          sidebar.querySelector('#weeklyProgressBar').style.width = `${progress}%`;
          sidebar.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', String(progress));
        }

        updateTaskSummary();
        if (localStorage.getItem('employeeTasks') === null) {
          fetch(new URL('../employee/my-tasks/default-tasks.json', sidebarScriptUrl))
            .then(response => {
              if (!response.ok) throw new Error(`Task data: ${response.status}`);
              return response.json();
            })
            .then(tasks => {
              if (localStorage.getItem('employeeTasks') === null) {
                localStorage.setItem('employeeTasks', JSON.stringify(tasks));
                updateTaskSummary();
                window.dispatchEvent(new Event('teamspace:tasks-changed'));
              }
            })
            .catch(error => console.error('Could not load default task progress:', error));
        }
        window.addEventListener('storage', event => {
          if (event.key === 'employeeTasks') updateTaskSummary();
        });
        window.addEventListener('teamspace:tasks-changed', updateTaskSummary);
      })
      .catch(error => {
        console.error('Could not load the employee sidebar. Open this page through Live Server.', error);
        placeholder.textContent = 'Workspace navigation is unavailable.';
      });
  }
}
