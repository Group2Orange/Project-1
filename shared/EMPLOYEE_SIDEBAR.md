# Employee sidebar

`employee-sidebar.html`, `employee-sidebar.css`, and `employee-sidebar.js` form one sidebar shared by employee pages.

Add these to another employee page (adjust `../../` if its folder depth differs):

```html
<link rel="stylesheet" href="../../shared/employee-sidebar.css">
```

Place the sidebar inside the page's main layout:

```html
<aside class="employee-sidebar" data-employee-sidebar data-sidebar-active="details" aria-label="Employee workspace"></aside>
```

Load the script near the end of the body:

```html
<script src="../../shared/employee-sidebar.js"></script>
```

Use `workspace`, `details`, `tasks`, `leave`, `policies`, `feedback`, or `helpdesk` for `data-sidebar-active`. The sidebar links are defined in one place, `employee-sidebar.html`.

The sidebar reads the signed-in employee's tasks from `GET /tasks?employeeId=...` on the local API. A page that changes tasks calls `updateSidebarTasks()` (a plain function defined in `employee-sidebar.js`) to refresh the count and the progress bar.
