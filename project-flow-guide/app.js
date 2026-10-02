// Read-only teaching simulation. Snippets below are short excerpts from the linked source files.
const flows = [
  {
    id: 'setup', group: 'FOUNDATION', title: 'Start the project', description: 'Two local processes serve the pages and the writable JSON API.',
    caveat: 'The API writes to api/db.json on the computer running json-server. LocalStorage stays inside one browser/profile.',
    steps: [
      { title: 'Prepare the API data', kind: 'Terminal', source: 'package.json', code: `"reset": "node api/reset.js"`, input: 'npm install, then npm run reset', result: 'api/db.json is created from the seed', why: 'The seed is a starting snapshot. Resetting later replaces changes in the working API file.', state: { screen: 'Project files ready', session: 'No signed-in user', browser: 'No app data yet', api: 'api/db.json seeded' } },
      { title: 'Run json-server', kind: 'API', source: 'package.json', code: `"api": "json-server --watch api/db.json --host 127.0.0.1 --port 3000"`, input: 'npm run api', result: 'GET /employees, /policies, /feedback become available', why: 'The browser cannot write JSON files directly; json-server handles GET, POST, and PATCH.', state: { screen: 'Browser still closed', session: 'No signed-in user', browser: 'No app data yet', api: 'Listening on 127.0.0.1:3000' } },
      { title: 'Open the website', kind: 'Browser', source: 'index.html', code: `<li><a href="common/login/login.html">1. Login</a></li>\n<li><a href="common/home/home.html">2. Home and Services</a></li>`, input: 'Open index.html through Live Server and choose a page', result: 'Selected page loads at the Live Server origin', why: 'The site and API use different ports. Keep both processes running while testing.', state: { screen: 'Index, then chosen page', session: 'No signed-in user', browser: 'Origin: Live Server (for example :5500)', api: 'Separate origin: :3000' } }
    ]
  },
  {
    id: 'login', group: 'IDENTITY', title: 'Sign in and choose a role', description: 'The login form checks an employee record, stores a small session, and routes by role.',
    caveat: 'This is a teaching demo: the browser sends a password to a local json-server query. It is not production-grade authentication.',
    steps: [
      { title: 'Submit credentials', kind: 'Input', source: 'common/login/login.js', code: `loginForm.addEventListener('submit', async (event) => {\n  event.preventDefault();\n  const email = emailInput.value.trim().toLowerCase();\n  // Check the API for a matching record.\n});`, input: 'Email + password in login form', result: 'Default form navigation is stopped', why: 'JavaScript controls the request and can show validation errors on the same page.', state: { screen: 'Login form', session: 'No signed-in user', browser: 'Credentials only in form fields', api: 'No request yet' } },
      { title: 'Look up employee', kind: 'GET', source: 'common/login/login.js', code: `const query = new URLSearchParams({ email, password: passwordInput.value });\nconst response = await fetch(\`\${API}/employees?\${query}\`);\nconst matches = await response.json();\nconst employee = matches[0];`, input: 'GET /employees?email=…&password=…', result: 'Matching employee, or “Incorrect email or password”', why: 'The login is reading the API’s employee collection, not Data/employee.json.', state: { screen: 'Login waits for response', session: 'Not saved yet', browser: 'No employee list cached', api: 'Reads /employees from api/db.json' } },
      { title: 'Reject blocked accounts', kind: 'Guard', source: 'common/login/login.js', code: `if (employee.status !== 'Active' && employee.status !== 'Inactive') {\n  setLoginError('This account is not active. Please contact HR.');\n  return;\n}`, input: 'Matched account status', result: 'Blocked users stop here', why: 'The account record is kept, but a blocked account cannot enter the portal.', state: { screen: 'Login error if blocked', session: 'No session for blocked user', browser: 'No employee record stored', api: 'Status remains unchanged' } },
      { title: 'Save identity and route', kind: 'Route', source: 'common/login/login.js', code: `localStorage.setItem('loggedUser', JSON.stringify(loggedUser));\nlocalStorage.setItem('currentUserId', String(employee.id));\nif (employee.firstAttend === true) {\n  window.location.href = '../reset-password/reset-password.html';\n  return;\n}\nwindow.location.href = employee.role === 'HR'\n  ? '../../hr/workspace/workspace.html'\n  : '../../employee/MyWOrkSpace/MyWOrkSpace.html';`, input: 'Valid HR or EMP employee', result: 'First login → password reset; otherwise → role workspace', why: 'Only selected identity fields are stored locally. The full employee list and password are not copied into the session.', state: { screen: 'HR or employee workspace', session: 'loggedUser: id, role, name, email…', browser: 'currentUserId: employee id', api: 'Employee record is unchanged' } }
    ]
  },
  {
    id: 'first-login', group: 'IDENTITY', title: 'First-time password change', description: 'A newly created employee must set a new password before entering the workspace.',
    caveat: 'The password is currently stored in plain text in the demo JSON database. A real deployment needs a backend that hashes passwords.',
    steps: [
      { title: 'HR creates initial access', kind: 'POST', source: 'hr/employees/employees.js', code: `if (!editingId) {\n  if (!data.password) data.password = makeInitialPassword();\n  data.firstAttend = true;\n}\nconst response = await fetch(url, {\n  method: editingId ? 'PATCH' : 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify(data)\n});`, input: 'Add employee in HR directory', result: 'Employee record with firstAttend: true', why: 'The directory generates an initial password when HR leaves that field empty.', state: { screen: 'HR employee directory', session: 'HR remains signed in', browser: 'No new employee data cached', api: 'POST /employees → new JSON record' } },
      { title: 'Login detects first visit', kind: 'Route', source: 'common/login/login.js', code: `if (employee.firstAttend === true) {\n  window.location.href = '../reset-password/reset-password.html';\n  return;\n}`, input: 'New employee signs in with initial password', result: 'Reset Password screen opens', why: 'The workspace route is delayed until the first password update succeeds.', state: { screen: 'Reset Password', session: 'New employee identity stored', browser: 'Initial password is not stored in loggedUser', api: 'firstAttend is still true' } },
      { title: 'Save new password', kind: 'PATCH', source: 'common/reset-password/reset-password.js', code: `const response = await fetch(\`\${API}/employees/\${encodeURIComponent(session.id)}\`, {\n  method: 'PATCH',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({ password: password.value, firstAttend: false })\n});\nlocation.replace(workspaceFor(session.role));`, input: 'Valid matching password fields', result: 'JSON updated; role workspace opens', why: 'The flag changes to false, so later sign-ins skip this screen.', state: { screen: 'Role workspace', session: 'Same loggedUser identity', browser: 'No password stored in session', api: 'PATCH /employees/:id → firstAttend false' } }
    ]
  },
  {
    id: 'navigation', group: 'IDENTITY', title: 'Navbar and role boundaries', description: 'Shared navigation loads the proper template and protects employee and HR pages.',
    caveat: 'These are client-side route checks for a demo. json-server endpoints themselves do not enforce roles.',
    steps: [
      { title: 'Read the saved identity', kind: 'localStorage', source: 'shared/navbar.js', code: `user = JSON.parse(localStorage.getItem('loggedUser'));\nif (!user?.id || !['HR', 'EMP'].includes(user.role)) user = null;`, input: 'Any protected page loads', result: 'Role is available to the navbar', why: 'One small session value drives the shared navigation across pages.', state: { screen: 'Requested page', session: 'loggedUser read', browser: 'Role available to UI', api: 'No request by navbar' } },
      { title: 'Apply route guard', kind: 'Guard', source: 'shared/navbar.js', code: `if (protectedPage && !user) {\n  location.replace('../../common/login/login.html');\n} else if (protectedPage && user && user.role !== expectedRole && !hrReadingPolicies) {\n  location.replace(user.role === 'EMP'\n    ? '../../employee/MyWOrkSpace/MyWOrkSpace.html'\n    : '../../hr/workspace/workspace.html');\n}`, input: 'URL + saved role', result: 'Wrong-role pages redirect to the correct workspace', why: 'HR may read the employee policies page as one deliberate exception.', state: { screen: 'Allowed page or redirect', session: 'Role compared with page', browser: 'No data mutation', api: 'No request by guard' } },
      { title: 'Insert shared navbar', kind: 'UI', source: 'shared/navbar.js', code: `const type = hrReadingPolicies ? 'hr'\n  : path.includes('/common/') && user?.role === 'EMP'\n    ? 'employee' : placeholder.dataset.navbar;\nconst file = new URL(\`navbar-\${type}.html\`, document.currentScript.src);\nfetch(file).then(response => response.text()).then(html => {\n  placeholder.outerHTML = html;\n});`, input: 'data-navbar in page HTML', result: 'HR or employee navbar appears', why: 'The templates are shared files, so one nav change can update many screens.', state: { screen: 'Shared navbar inserted', session: 'Name and role shown', browser: 'HTML template fetched', api: 'No JSON database write' } }
    ]
  },
  {
    id: 'profile', group: 'EMPLOYEE', title: 'Profile and My Details', description: 'The profile and details pages fetch the latest employee record; profile edits PATCH it.',
    caveat: 'The profile page is shared by roles. My Details is employee-only; HR uses its own directory and employee detail screens.',
    steps: [
      { title: 'Fetch the current profile', kind: 'GET', source: 'common/profile/profile.js', code: `const response = await fetch(\`\${API}/employees/\${encodeURIComponent(user.id)}\`);\nconst employee = await response.json();\nreturn { ...employee, fullName: employee.name, employmentStatus: employee.status };`, input: 'Open Profile after login', result: 'Current API values displayed', why: 'The page does not rely on an old copy of all employee details in localStorage.', state: { screen: 'Profile', session: 'ID identifies current user', browser: 'Display values in DOM', api: 'GET /employees/:id' } },
      { title: 'Read My Details', kind: 'GET', source: 'employee/details/details.js', code: `if (!session || session.role !== 'EMP') {\n  window.location.replace(session?.role === 'HR'\n    ? '../../hr/workspace/workspace.html'\n    : '../../common/login/login.html');\n  return;\n}\nconst response = await fetch(\`\${API}/employees/\${encodeURIComponent(session.id)}\`);`, input: 'Employee opens My Details', result: 'Employee fields shown; HR redirected', why: 'The detail view uses the signed-in ID and a role check.', state: { screen: 'My Details', session: 'EMP ID read', browser: 'Current fields shown', api: 'GET /employees/:id' } },
      { title: 'Save a profile edit', kind: 'PATCH', source: 'common/edit-profile/edit-profile.js', code: `const changes = { name, phone: number, ...(newImage ? { image: newImage } : {}) };\nconst response = await fetch(\`\${API}/employees/\${encodeURIComponent(user.id)}\`, {\n  method: 'PATCH',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify(changes)\n});\nlocalStorage.setItem('loggedUser', JSON.stringify(safeUser));`, input: 'Edit name, phone, or image and Save', result: 'API record updated; session label refreshed', why: 'The JSON change persists on the API host; the small local identity is refreshed for the navbar.', state: { screen: 'Updated profile', session: 'Name/image refreshed', browser: 'Current form fields', api: 'PATCH /employees/:id' } }
    ]
  },
  {
    "id": "tasks",
    "group": "EMPLOYEE",
    "title": "My Tasks and workspace progress",
    "description": "Employee tasks now load from and save to the local JSON API.",
    "caveat": "Tasks are in api/db.json on the API host. Another browser using that same server sees updated task data after it reloads.",
    "steps": [
      {
        "title": "Load my tasks",
        "kind": "GET",
        "source": "employee/my-tasks/my-tasks.js",
        "code": "const response = await fetch(`${API}/tasks?employeeId=${encodeURIComponent(user.id)}`);\ntasks = await response.json();",
        "input": "Open My Tasks",
        "result": "Only signed-in employee tasks render",
        "why": "The employee ID filters the shared tasks collection.",
        "state": {
          "screen": "My Tasks board",
          "session": "Employee identity in loggedUser",
          "browser": "No task copy in localStorage",
          "api": "GET /tasks?employeeId=…"
        }
      },
      {
        "title": "Save task changes",
        "kind": "PUT",
        "source": "employee/my-tasks/my-tasks.js",
        "code": "const response = await fetch(`${API}/tasks/${encodeURIComponent(task.id)}`, {\n  method: 'PUT',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify(task)\n});",
        "input": "Move task or submit for review",
        "result": "Changed task is written to api/db.json",
        "why": "The board saves changed records through the API.",
        "state": {
          "screen": "Updated task board",
          "session": "Employee identity in loggedUser",
          "browser": "Current tasks in page memory",
          "api": "PUT /tasks/:id"
        }
      },
      {
        "title": "Refresh sidebar progress",
        "kind": "GET",
        "source": "shared/employee-sidebar.js",
        "code": "const response = await fetch(`http://127.0.0.1:3000/tasks?employeeId=${encodeURIComponent(user.id)}`);\ntasks = await response.json();\nconst progress = tasks.length ? Math.round(completedCount / tasks.length * 100) : 0;",
        "input": "Open page or task-changed event",
        "result": "Progress and task count recalculate",
        "why": "The sidebar derives progress from current API task statuses.",
        "state": {
          "screen": "Sidebar progress updated",
          "session": "Employee identity in loggedUser",
          "browser": "No task copy in localStorage",
          "api": "GET /tasks?employeeId=…"
        }
      },
      {
        "title": "Preview tasks on workspace",
        "kind": "GET",
        "source": "employee/MyWOrkSpace/MyWOrkSpace.js",
        "code": "const response = await fetch(`http://127.0.0.1:3000/tasks?employeeId=${encodeURIComponent(user.id)}`);\ntasks = await response.json();",
        "input": "Open My Workspace",
        "result": "Top three active tasks appear",
        "why": "The workspace uses the same API collection as My Tasks.",
        "state": {
          "screen": "Employee workspace",
          "session": "Employee identity in loggedUser",
          "browser": "Preview in page memory",
          "api": "GET /tasks?employeeId=…"
        }
      }
    ]
  },
  {
    "id": "leave",
    "group": "EMPLOYEE",
    "title": "Leave & Time Off",
    "description": "Leave balances and requests now come from the local API; submissions are shared on that API host.",
    "caveat": "The sample balances and requests you supplied are in api/db.seed.json and api/db.json. A new employee receives a default balance when HR adds their account.",
    "steps": [
      {
        "title": "Open the request dialog",
        "kind": "Route",
        "source": "employee/MyWOrkSpace/MyWOrkSpace.html",
        "code": "<a href=\"../Leave&amp;TimeOff/Leave&amp;TimeOff.html#request-time-off\">Request Time Off</a>",
        "input": "Click Request Time Off",
        "result": "Leave page opens its dialog",
        "why": "The hash signals the existing modal to open.",
        "state": {
          "screen": "Leave request modal",
          "session": "Employee identity in loggedUser",
          "browser": "URL hash only",
          "api": "No write"
        }
      },
      {
        "title": "Load employee leave data",
        "kind": "GET",
        "source": "employee/Leave&TimeOff/Leave&TimeOff.js",
        "code": "var responses = await Promise.all(urls.map(function (url) { return fetch(url); }));\nvar data = await Promise.all(responses.map(function (response) { return response.json(); }));\nemployeeRecord = data[0]; leaveBalances = data[1]; leaveRequests = data[2];",
        "input": "Leave page loads",
        "result": "Current employee balance and requests display",
        "why": "The page reads /employees, /leaveBalances, and /leaveRequests by employee ID.",
        "state": {
          "screen": "Leave balances and history",
          "session": "Employee identity in loggedUser",
          "browser": "No leave data saved locally",
          "api": "GET three API resources"
        }
      },
      {
        "title": "Submit leave request",
        "kind": "POST",
        "source": "employee/Leave&TimeOff/Leave&TimeOff.js",
        "code": "var response = await fetch(API + \"/leaveRequests\", {\n  method: \"POST\",\n  headers: { \"Content-Type\": \"application/json\" },\n  body: JSON.stringify(request)\n});",
        "input": "Submit validated dates and reason",
        "result": "Pending request saved to JSON API",
        "why": "HR Leave Requests can now see and decide on the same record.",
        "state": {
          "screen": "New pending request",
          "session": "Employee identity in loggedUser",
          "browser": "No leave request in localStorage",
          "api": "POST /leaveRequests"
        }
      },
      {
        "title": "HR approves or rejects",
        "kind": "PATCH",
        "source": "hr/requests/requests.js",
        "code": "const response = await fetch(`${API}/leaveRequests/${encodeURIComponent(request.id)}`, {\n  method: 'PATCH', headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({ status, reviewer: session.name })\n});",
        "input": "HR clicks Approve or Reject",
        "result": "Status persists; approval updates balance used",
        "why": "The HR screen reads all requests and writes a decision through the API.",
        "state": {
          "screen": "HR Leave Requests",
          "session": "Employee identity in loggedUser",
          "browser": "No duplicate local request store",
          "api": "PATCH /leaveRequests/:id"
        }
      }
    ]
  },
  {
    "id": "helpdesk",
    "group": "EMPLOYEE",
    "title": "Helpdesk support",
    "description": "Helpdesk drafts, tickets, and meetings now use the local JSON API.",
    "caveat": "Requests are filtered by employeeId. The current local json-server is an educational demo and does not enforce server-side authorization.",
    "steps": [
      {
        "title": "Load my tickets and draft",
        "kind": "GET",
        "source": "employee/helpDesk/helpDesk.js",
        "code": "const [requestsResponse, draftsResponse] = await Promise.all([\n  fetch(`${API}/helpdeskRequests?employeeId=${helpdeskEmployeeId}`),\n  fetch(`${API}/helpdeskDrafts?employeeId=${helpdeskEmployeeId}`)\n]);",
        "input": "Open Helpdesk",
        "result": "Saved tickets and draft render",
        "why": "The page no longer reads helpdesk data from localStorage.",
        "state": {
          "screen": "Helpdesk",
          "session": "Employee identity in loggedUser",
          "browser": "Tickets in page memory",
          "api": "GET /helpdeskRequests and /helpdeskDrafts"
        }
      },
      {
        "title": "Save a draft",
        "kind": "POST / PATCH",
        "source": "employee/helpDesk/helpDesk.js",
        "code": "const response = await fetch(helpdeskDraft ? `${API}/helpdeskDrafts/${encodeURIComponent(helpdeskDraft.id)}` : `${API}/helpdeskDrafts`, {\n  method: helpdeskDraft ? \"PATCH\" : \"POST\",\n  headers: { \"Content-Type\": \"application/json\" }, body: JSON.stringify(draft)\n});",
        "input": "Click Save Draft",
        "result": "Draft persists on API host",
        "why": "A later visit can reload the same draft.",
        "state": {
          "screen": "Draft saved",
          "session": "Employee identity in loggedUser",
          "browser": "No helpdeskDraft localStorage key",
          "api": "POST or PATCH /helpdeskDrafts"
        }
      },
      {
        "title": "Submit a ticket or meeting",
        "kind": "POST",
        "source": "employee/helpDesk/helpDesk.js",
        "code": "const response = await fetch(`${API}/helpdeskRequests`, {\n  method: \"POST\",\n  headers: { \"Content-Type\": \"application/json\" },\n  body: JSON.stringify(request)\n});",
        "input": "Click Submit",
        "result": "New ticket appears; draft is removed",
        "why": "The meeting card is derived from saved meeting-type requests.",
        "state": {
          "screen": "Recent support tickets",
          "session": "Employee identity in loggedUser",
          "browser": "No helpdeskRequests localStorage key",
          "api": "POST /helpdeskRequests"
        }
      }
    ]
  },
  {
    id: 'feedback', group: 'CROSS-ROLE', title: 'Submit feedback', description: 'A contact/feedback form POSTs a submission into the API’s feedback collection.',
    caveat: 'Unlike tasks, leave, and helpdesk, feedback is API-backed and visible to the HR inbox on that API host.',
    steps: [
      { title: 'Build submission', kind: 'Input', source: 'common/contact/contact.js', code: `const feedback = {\n  employeeId: user?.id ? Number(user.id) : null,\n  name: anonymous ? "Anonymous" : (user ? user.name : "Guest User"),\n  category: selectedCategory, subject, message,\n  createdAt: new Date().toISOString(),\n  priority: null, read: false\n};`, input: 'Category, subject, message, optional anonymity', result: 'Feedback object prepared', why: 'The payload includes enough information for HR to sort and review the item.', state: { screen: 'Feedback form', session: 'Identity read if present', browser: 'Submission in memory', api: 'No write yet' } },
      { title: 'Send to API', kind: 'POST', source: 'common/contact/contact.js', code: `const response = await fetch("http://127.0.0.1:3000/feedback", {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify(feedback)\n});`, input: 'Click Send', result: 'New feedback record written to api/db.json', why: 'HR can read this same server-side collection.', state: { screen: 'Success message', session: 'Identity unchanged', browser: 'No feedback copy required', api: 'POST /feedback' } }
    ]
  },
  {
    id: 'hr-directory', group: 'HR', title: 'Employee directory', description: 'HR lists, filters, adds, edits, blocks, and opens employee records.',
    caveat: 'The page uses direct json-server calls. The browser-side HR guard does not secure API endpoints against direct access.',
    steps: [
      { title: 'Load and filter', kind: 'GET', source: 'hr/employees/employees.js', code: `const response = await fetch(\`\${API}/employees\`);\nemployees = await response.json();\nconst result = employees.filter(person =>\n  [person.name, person.email, person.department]\n    .some(value => String(value || '').toLowerCase().includes(query))\n);`, input: 'Open directory or type a search', result: 'Employee table and counts render', why: 'Search and filters run on the loaded array in this browser.', state: { screen: 'HR directory', session: 'HR identity shown', browser: 'Employee array in page memory', api: 'GET /employees' } },
      { title: 'Add or edit employee', kind: 'POST / PATCH', source: 'hr/employees/employees.js', code: `const url = editingId\n  ? \`\${API}/employees/\${encodeURIComponent(editingId)}\`\n  : \`\${API}/employees\`;\nconst response = await fetch(url, {\n  method: editingId ? 'PATCH' : 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify(data)\n});`, input: 'Submit employee dialog', result: 'New or changed employee saved', why: 'A POST creates; a PATCH updates the record in api/db.json.', state: { screen: 'Directory refreshed', session: 'HR identity unchanged', browser: 'List reloaded', api: 'POST or PATCH /employees' } },
      { title: 'Block without deleting', kind: 'PATCH', source: 'hr/employees/employees.js', code: `const nextStatus = person.status === 'Blocked' ? 'Active' : 'Blocked';\nawait fetch(\`\${API}/employees/\${encodeURIComponent(person.id)}\`, {\n  method: 'PATCH',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({ status: nextStatus })\n});`, input: 'Confirm Block or Unblock', result: 'Status changes; employee record remains', why: 'Login rejects Blocked accounts. The current HR account cannot block itself in this UI.', state: { screen: 'Updated status badge', session: 'HR identity unchanged', browser: 'List reloaded', api: 'PATCH status in /employees/:id' } },
      { title: 'Open employee details', kind: 'Route', source: 'hr/employees/employees.js', code: `const detailUrl = id =>\n  \`../employee-details/employee-details.html?id=\${encodeURIComponent(id)}\`;\n// Row click navigates to detailUrl(person.id).`, input: 'Click row or eye icon', result: 'Selected employee details page opens', why: 'The record ID in the URL tells the detail page which employee to load.', state: { screen: 'HR employee details', session: 'HR identity unchanged', browser: 'URL has ?id=…', api: 'Detail page can GET selected record' } }
    ]
  },
  {
    id: 'hr-policies', group: 'HR', title: 'Manage company policies', description: 'HR adds or edits policies. The employee page reads the same API collection.',
    caveat: 'HR navbar Policies opens the read-only employee page. HR sidebar Policies opens the management screen.',
    steps: [
      { title: 'Load policies', kind: 'GET', source: 'hr/policies/policies.js', code: `const response = await fetch(\`\${API}/policies\`);\nconst data = await response.json();\npolicies = data;\nshowPolicies();`, input: 'Open HR Policies in sidebar', result: 'Editable directory of current policies', why: 'The page uses the API collection rather than a hard-coded handbook.', state: { screen: 'HR policy management', session: 'HR identity shown', browser: 'Policies in page memory', api: 'GET /policies' } },
      { title: 'Add a policy', kind: 'POST', source: 'hr/policies/policies.js', code: `const response = await fetch(\`\${API}/policies\`, {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify(policy)\n});`, input: 'Title, category, description', result: 'New policy in API database', why: 'The read-only employee screen can load the new record.', state: { screen: 'New HR policy card', session: 'HR identity unchanged', browser: 'Policies array refreshed', api: 'POST /policies' } },
      { title: 'Employee reads policies', kind: 'GET', source: 'employee/policies/EMPpolicies.js', code: `const response = await fetch(\`\${API}/policies\`);\nconst policies = await response.json();\nfor (const policy of policies) {\n  // Render policy article and in-page link.\n}`, input: 'Open navbar Policies as HR or employee', result: 'Read-only policy cards', why: 'Both roles can read this screen; only the HR sidebar leads to editing.', state: { screen: 'Employee policy view', session: 'HR or EMP stays signed in', browser: 'Policies rendered', api: 'GET /policies' } }
    ]
  },
  {
    id: 'hr-feedback', group: 'HR', title: 'Feedback inbox', description: 'HR loads submitted feedback, filters it, marks it reviewed, and sets priority.',
    caveat: 'Category filter options are built from categories present in the API response, not fixed option tags in the HTML.',
    steps: [
      { title: 'Load submissions', kind: 'GET', source: 'hr/feedback/feedback.js', code: `const response = await fetch(\`\${API}/feedback?_sort=createdAt&_order=desc\`);\nfeedbackItems = await response.json();\nfillCategories();\nrender();`, input: 'Open HR Feedback Inbox', result: 'Cards and summary numbers appear', why: 'HR reads the same /feedback collection written by the contact page.', state: { screen: 'Feedback Inbox', session: 'HR identity shown', browser: 'Feedback array in page memory', api: 'GET /feedback' } },
      { title: 'Build category menu', kind: 'UI', source: 'hr/feedback/feedback.js', code: `const categories = [...new Set(\n  feedbackItems.map(item => item.category).filter(Boolean)\n)].sort();\ncategoryFilter.replaceChildren(\n  new Option('All categories', ''),\n  ...categories.map(value => new Option(value, value))\n);`, input: 'Loaded feedback categories', result: 'Dropdown includes categories actually found', why: 'The HTML has only “All categories”; JavaScript replaces the options after loading data.', state: { screen: 'Category dropdown filled', session: 'HR identity unchanged', browser: 'Filter operates on loaded array', api: 'No write' } },
      { title: 'Review or prioritize', kind: 'PATCH', source: 'hr/feedback/feedback.js', code: `const response = await fetch(\`\${API}/feedback/\${encodeURIComponent(id)}\`, {\n  method: 'PATCH',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify(changes)\n});`, input: 'Mark reviewed or choose priority', result: 'Feedback record updated for later visits', why: 'Unlike localStorage-only requests, this change persists in api/db.json.', state: { screen: 'Updated feedback card', session: 'HR identity unchanged', browser: 'Array updated after response', api: 'PATCH /feedback/:id' } }
    ]
  },
  {
    "id": "hr-workspace",
    "group": "HR",
    "title": "HR workspace and operations",
    "description": "HR sees live employee counts and can act on shared tasks and leave requests.",
    "caveat": "The demo API is local to the host running json-server; it has no production authentication or atomic multi-record transactions.",
    "steps": [
      {
        "title": "Show HR identity",
        "kind": "localStorage",
        "source": "hr/workspace/workspace.js",
        "code": "user = JSON.parse(localStorage.getItem('loggedUser') || '{}');\nconst firstName = user.name?.trim().split(/\\s+/)[0] || 'there';",
        "input": "Open HR workspace",
        "result": "Personalized greeting",
        "why": "Only the small identity is read locally.",
        "state": {
          "screen": "HR workspace",
          "session": "HR identity in loggedUser",
          "browser": "loggedUser identity only",
          "api": "No write"
        }
      },
      {
        "title": "Load live company counts",
        "kind": "GET",
        "source": "hr/workspace/workspace.js",
        "code": "const response = await fetch(`${API}/employees`);\nconst employees = await response.json();\ndocument.getElementById('hrActiveEmployees').textContent = employees.filter(item => item.status === 'Active').length;",
        "input": "Workspace initializes",
        "result": "Total, active, first-time, blocked counts",
        "why": "Numbers derive from the current employee database.",
        "state": {
          "screen": "HR summary cards",
          "session": "HR identity in loggedUser",
          "browser": "Counts in DOM",
          "api": "GET /employees"
        }
      },
      {
        "title": "Manage team work",
        "kind": "POST / PATCH",
        "source": "hr/tasks/tasks.js",
        "code": "const response = await fetch(`${API}/tasks`, {\n  method: 'POST', headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify(task)\n});",
        "input": "Open HR Tasks and assign work",
        "result": "New task appears for the chosen employee",
        "why": "The employee task board reads the same /tasks collection.",
        "state": {
          "screen": "HR Team Tasks",
          "session": "HR identity in loggedUser",
          "browser": "Task list in page memory",
          "api": "POST /tasks"
        }
      },
      {
        "title": "Review leave requests",
        "kind": "PATCH",
        "source": "hr/requests/requests.js",
        "code": "const response = await fetch(`${API}/leaveRequests/${encodeURIComponent(request.id)}`, {\n  method: 'PATCH', headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({ status, reviewer: session.name })\n});",
        "input": "Open HR Leave Requests and decide",
        "result": "Approved or rejected status persists",
        "why": "The employee leave page sees the updated decision on reload.",
        "state": {
          "screen": "HR Leave Requests",
          "session": "HR identity in loggedUser",
          "browser": "No local leave store",
          "api": "PATCH /leaveRequests/:id"
        }
      }
    ]
  },
  {
    id: 'logout', group: 'IDENTITY', title: 'Log out and return', description: 'The shared navbar clears the local identity and opens Login.',
    caveat: 'Logging out clears identity keys, but other browser-local demo data such as tasks may remain in this browser.',
    steps: [
      { title: 'Click Logout', kind: 'Input', source: 'shared/navbar-hr.html', code: `<a class="navbar-logout"\n   href="../../common/login/login.html"\n   title="Logout">Logout</a>`, input: 'Logout action in shared navbar', result: 'Navigation to Login begins', why: 'Employee and HR navbar templates both lead to the shared Login page.', state: { screen: 'Leaving current screen', session: 'Still present briefly', browser: 'Navigation started', api: 'No request' } },
      { title: 'Remove identity keys', kind: 'localStorage', source: 'shared/navbar.js', code: `logoutLink.addEventListener('click', () => {\n  localStorage.removeItem('loggedUser');\n  localStorage.removeItem('currentUserId');\n  localStorage.removeItem('currentUser');\n});`, input: 'Logout click event', result: 'Session keys removed', why: 'The next protected page sees no user and redirects to Login.', state: { screen: 'Login', session: 'No loggedUser', browser: 'Task/leave/helpdesk keys may remain', api: 'Employee data unchanged' } },
      { title: 'Login page clears old session too', kind: 'localStorage', source: 'common/login/login.js', code: `localStorage.removeItem('loggedUser');\nlocalStorage.removeItem('currentUserId');\nlocalStorage.removeItem('currentUser');`, input: 'Login page loads', result: 'Clean login state', why: 'Opening Login itself ends any leftover local session.', state: { screen: 'Login form', session: 'Cleared', browser: 'Unrelated local app data may remain', api: 'No database change' } }
    ]
  }
];

const nav = document.getElementById('flowNav');
const track = document.getElementById('stepTrack');
let currentFlow = 0;
let currentStep = 0;

function chooseFlow(index) {
  currentFlow = index;
  currentStep = 0;
  render();
  if (history.replaceState) history.replaceState(null, '', `#${flows[index].id}`);
}

function chooseStep(index) {
  currentStep = index;
  render();
}

function renderNav() {
  nav.replaceChildren();
  let previousGroup = '';
  flows.forEach((flow, index) => {
    if (flow.group !== previousGroup) {
      const label = document.createElement('div');
      label.className = 'nav-group';
      label.textContent = flow.group;
      nav.append(label);
      previousGroup = flow.group;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'flow-choice';
    button.setAttribute('aria-current', String(index === currentFlow));
    button.innerHTML = `<span class="nav-number">${String(index + 1).padStart(2, '0')}</span>`;
    button.append(document.createTextNode(flow.title));
    button.addEventListener('click', () => chooseFlow(index));
    nav.append(button);
  });
}

function renderTrack(flow) {
  track.replaceChildren();
  flow.steps.forEach((step, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `step-button ${index === currentStep ? 'is-active' : index < currentStep ? 'is-done' : ''}`;
    button.setAttribute('aria-current', String(index === currentStep));
    const number = document.createElement('span');
    number.className = 'step-index';
    number.textContent = `STEP ${String(index + 1).padStart(2, '0')}`;
    button.append(number, document.createTextNode(step.title));
    button.addEventListener('click', () => chooseStep(index));
    track.append(button);
  });
}

function renderState(step) {
  const labels = [
    ['screen', 'Screen / route'],
    ['session', 'Local identity'],
    ['browser', 'Browser storage / memory'],
    ['api', 'API / JSON file']
  ];
  const active = step.kind === 'GET' || step.kind === 'POST' || step.kind === 'PATCH' || step.kind === 'POST / PATCH'
    ? 'api' : step.kind.includes('localStorage') ? 'browser' : 'screen';
  const container = document.getElementById('stateCards');
  container.replaceChildren();
  labels.forEach(([key, label]) => {
    const card = document.createElement('div');
    card.className = `state-card${key === active ? ' is-highlighted' : ''}`;
    const heading = document.createElement('div');
    heading.className = 'state-name';
    heading.textContent = label;
    const chip = document.createElement('span');
    chip.className = 'state-chip';
    chip.textContent = key === active ? 'CHANGES HERE' : '';
    heading.append(chip);
    const value = document.createElement('div');
    value.className = 'state-value';
    value.textContent = step.state[key];
    card.append(heading, value);
    container.append(card);
  });
}

function render() {
  const flow = flows[currentFlow];
  const step = flow.steps[currentStep];
  renderNav();
  renderTrack(flow);
  document.getElementById('flowGroup').textContent = flow.group;
  document.getElementById('flowTitle').textContent = flow.title;
  document.getElementById('flowDescription').textContent = flow.description;
  document.getElementById('flowCount').textContent = `${flow.steps.length} steps`;
  document.getElementById('stepBadge').textContent = step.kind;
  document.getElementById('stepTitle').textContent = step.title;
  document.getElementById('stepDescription').textContent = step.description || step.why;
  document.getElementById('stepInput').textContent = step.input;
  document.getElementById('stepResult').textContent = step.result;
  document.getElementById('sourcePath').textContent = step.source;
  document.getElementById('sourceLink').href = `../${step.source}`;
  document.getElementById('codeSnippet').textContent = step.code;
  document.getElementById('stepWhy').textContent = step.why;
  document.getElementById('flowCaveat').textContent = flow.caveat;
  document.getElementById('playerPosition').textContent = `${currentStep + 1} / ${flow.steps.length}`;
  document.getElementById('previousStep').disabled = currentStep === 0;
  document.getElementById('nextStep').disabled = currentStep === flow.steps.length - 1;
  renderState(step);
}

document.getElementById('previousStep').addEventListener('click', () => chooseStep(Math.max(0, currentStep - 1)));
document.getElementById('nextStep').addEventListener('click', () => chooseStep(Math.min(flows[currentFlow].steps.length - 1, currentStep + 1)));
document.getElementById('restartFlow').addEventListener('click', () => chooseStep(0));
document.addEventListener('keydown', event => {
  if (event.target.closest('button, input, textarea, select')) return;
  if (event.key === 'ArrowRight') document.getElementById('nextStep').click();
  if (event.key === 'ArrowLeft') document.getElementById('previousStep').click();
});
const hashIndex = flows.findIndex(flow => `#${flow.id}` === location.hash);
if (hashIndex >= 0) currentFlow = hashIndex;
render();
