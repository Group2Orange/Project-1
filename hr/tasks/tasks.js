// =====================================================
// TEMPORARY DATA
// Scrum Master will replace these with API data later
// =====================================================

let employees = [
    {
        id: 1,
        name: "Sarah Jenkins"
    },
    {
        id: 2,
        name: "Ahmad Ali"
    },
    {
        id: 3,
        name: "Lana Ahmad"
    }
];


let tasks = [
    {
        id: 1,
        title: "Prepare Monthly Report",
        description: "Prepare the monthly HR report",
        employeeId: 2,
        priority: "High",
        category: "reporting",
        team: "HR",
        dueDate: "2026-10-10",
        status: "todo"
    },

    {
        id: 2,
        title: "Employee Files Review",
        description: "Review employee documents",
        employeeId: 3,
        priority: "Normal",
        category: "review",
        team: "HR",
        dueDate: "2026-10-05",
        status: "progress"
    }
];


// =====================================================
// VARIABLES
// =====================================================

let deleteTaskId = null;


// =====================================================
// HTML ELEMENTS
// =====================================================

const taskTableBody =
    document.getElementById("taskTableBody");

const searchTask =
    document.getElementById("searchTask");

const filterDate =
    document.getElementById("filterDate");

const clearDate =
    document.getElementById("clearDate");

const createTaskButton =
    document.getElementById("createTaskButton");

const taskModal =
    document.getElementById("taskModal");

const closeTaskModal =
    document.getElementById("closeTaskModal");

const cancelTask =
    document.getElementById("cancelTask");

const taskForm =
    document.getElementById("taskForm");

const editTaskId =
    document.getElementById("editTaskId");

const taskTitle =
    document.getElementById("taskTitle");

const taskDescription =
    document.getElementById("taskDescription");

const assignedTo =
    document.getElementById("assignedTo");

const taskPriority =
    document.getElementById("taskPriority");

const taskCategory =
    document.getElementById("taskCategory");

const taskTeam =
    document.getElementById("taskTeam");

const taskDueDate =
    document.getElementById("taskDueDate");

const modalTitle =
    document.getElementById("modalTitle");

const submitTask =
    document.getElementById("submitTask");


// View Modal

const viewModal =
    document.getElementById("viewModal");

const closeViewModal =
    document.getElementById("closeViewModal");


// Delete Modal

const deleteModal =
    document.getElementById("deleteModal");

const cancelDelete =
    document.getElementById("cancelDelete");

const confirmDelete =
    document.getElementById("confirmDelete");


// Statistics

const totalTasks =
    document.getElementById("totalTasks");

const inProgressCount =
    document.getElementById("inProgressCount");

const overdueCount =
    document.getElementById("overdueCount");

const completedCount =
    document.getElementById("completedCount");

const taskCounter =
    document.getElementById("taskCounter");


// =====================================================
// LOAD EMPLOYEES IN SELECT
// =====================================================

function renderEmployees() {

    assignedTo.innerHTML = `

        <option value="">
            Select employee
        </option>

    `;


    employees.forEach(function (employee) {

        const option =
            document.createElement("option");


        option.value =
            employee.id;


        option.textContent =
            employee.name;


        assignedTo.appendChild(option);

    });

}


// =====================================================
// GET EMPLOYEE BY ID
// =====================================================

function getEmployee(employeeId) {

    return employees.find(
        function (employee) {

            return Number(employee.id) ===
                   Number(employeeId);

        }
    );

}


// =====================================================
// GET EMPLOYEE NAME
// =====================================================

function getEmployeeName(employeeId) {

    const employee =
        getEmployee(employeeId);


    if (employee) {

        return employee.name;

    }


    return "Unknown Employee";

}


// =====================================================
// GET TASK BY ID
// =====================================================

function getTask(taskId) {

    return tasks.find(
        function (task) {

            return Number(task.id) ===
                   Number(taskId);

        }
    );

}


// =====================================================
// CREATE NEW ID
// =====================================================

function generateTaskId() {

    if (tasks.length === 0) {

        return 1;

    }


    const ids =
        tasks.map(
            function (task) {

                return Number(task.id);

            }
        );


    return Math.max(...ids) + 1;

}


// =====================================================
// FORMAT DATE
// =====================================================

function formatDate(date) {

    if (!date) {

        return "-";

    }


    return new Date(
        `${date}T00:00:00`
    ).toLocaleDateString(
        "en-US",
        {
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    );

}


// =====================================================
// STATUS
// =====================================================

function getStatusLabel(status) {

    const statuses = {

        todo: "To Do",

        progress: "In Progress",

        review: "Under Review",

        completed: "Completed"

    };


    return statuses[status] || status;

}


// =====================================================
// STATUS CSS CLASS
// =====================================================

function getStatusClass(status) {

    if (status === "progress") {

        return "in-progress";

    }


    if (status === "review") {

        return "pending";

    }


    if (status === "completed") {

        return "completed";

    }


    return "not-started";

}


// =====================================================
// CHECK OVERDUE
// =====================================================

function isOverdue(task) {

    if (
        !task.dueDate ||
        task.status === "completed"
    ) {

        return false;

    }


    const today =
        new Date();


    today.setHours(
        0,
        0,
        0,
        0
    );


    const dueDate =
        new Date(
            `${task.dueDate}T00:00:00`
        );


    return dueDate < today;

}


// =====================================================
// RENDER TASKS
// =====================================================

function renderTasks(taskList = tasks) {

    taskTableBody.innerHTML = "";


    // -----------------------------------------
    // No Tasks
    // -----------------------------------------

    if (taskList.length === 0) {

        taskTableBody.innerHTML = `

            <tr>

                <td colspan="5">

                    No tasks found.

                </td>

            </tr>

        `;


        taskCounter.textContent =
            "Showing 0 tasks";


        updateStatistics();


        return;

    }


    // -----------------------------------------
    // Render Tasks
    // -----------------------------------------

    taskList.forEach(function (task) {

        const employeeName =
            getEmployeeName(
                task.employeeId
            );


        const overdue =
            isOverdue(task);


        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>

                <strong>
                    ${task.title}
                </strong>

            </td>


            <td>

                ${employeeName}

            </td>


            <td>

                <span
                    class="
                        ${overdue
                            ? "overdue-date"
                            : ""
                        }
                    "
                >

                    ${formatDate(
                        task.dueDate
                    )}

                </span>

            </td>


            <td>

                <span
                    class="
                        status
                        ${getStatusClass(
                            task.status
                        )}
                    "
                >

                    ${getStatusLabel(
                        task.status
                    )}

                </span>

            </td>


            <td>

                <div class="action-buttons">


                    <button
                        type="button"
                        class="action-btn"
                        onclick="
                            viewTask(${task.id})
                        "
                    >

                        <i
                            class="
                                bi
                                bi-eye
                            "
                        ></i>

                    </button>


                    <button
                        type="button"
                        class="action-btn"
                        onclick="
                            editTask(${task.id})
                        "
                    >

                        <i
                            class="
                                bi
                                bi-pencil
                            "
                        ></i>

                    </button>


                    <button
                        type="button"
                        class="
                            action-btn
                            delete
                        "
                        onclick="
                            openDeleteModal(
                                ${task.id}
                            )
                        "
                    >

                        <i
                            class="
                                bi
                                bi-trash
                            "
                        ></i>

                    </button>


                </div>

            </td>

        `;


        taskTableBody.appendChild(row);

    });


    taskCounter.textContent =

        `Showing ${taskList.length} of ${tasks.length} tasks`;


    updateStatistics();

}


// =====================================================
// STATISTICS
// =====================================================

function updateStatistics() {

    // Total Tasks

    totalTasks.textContent =
        tasks.length;


    // In Progress

    inProgressCount.textContent =
        tasks.filter(
            function (task) {

                return task.status ===
                       "progress";

            }
        ).length;


    // Completed

    completedCount.textContent =
        tasks.filter(
            function (task) {

                return task.status ===
                       "completed";

            }
        ).length;


    // Overdue

    overdueCount.textContent =
        tasks.filter(
            function (task) {

                return isOverdue(task);

            }
        ).length;

}


// =====================================================
// SEARCH + FILTER
// =====================================================

function filterTasks() {

    const searchValue =
        searchTask
            .value
            .trim()
            .toLowerCase();


    const dateValue =
        filterDate.value;


    const filteredTasks =
        tasks.filter(
            function (task) {

                const employeeName =
                    getEmployeeName(
                        task.employeeId
                    )
                        .toLowerCase();


                const title =
                    task.title
                        .toLowerCase();


                // Search

                const matchesSearch =

                    title.includes(
                        searchValue
                    )

                    ||

                    employeeName.includes(
                        searchValue
                    );


                // Date

                const matchesDate =

                    dateValue === ""

                    ||

                    task.dueDate ===
                    dateValue;


                return (

                    matchesSearch

                    &&

                    matchesDate

                );

            }
        );


    renderTasks(
        filteredTasks
    );

}


// =====================================================
// SEARCH
// =====================================================

searchTask.addEventListener(
    "input",
    filterTasks
);


// =====================================================
// FILTER DATE
// =====================================================

filterDate.addEventListener(
    "change",
    function () {

        if (filterDate.value) {

            clearDate.style.display =
                "block";

        } else {

            clearDate.style.display =
                "none";

        }


        filterTasks();

    }
);


// =====================================================
// CLEAR DATE
// =====================================================

clearDate.addEventListener(
    "click",
    function () {

        filterDate.value =
            "";


        clearDate.style.display =
            "none";


        filterTasks();

    }
);


// =====================================================
// OPEN CREATE TASK MODAL
// =====================================================

createTaskButton.addEventListener(
    "click",
    function () {

        taskForm.reset();


        editTaskId.value =
            "";


        modalTitle.textContent =
            "Create New Task";


        submitTask.textContent =
            "Create Task";


        taskPriority.value =
            "Normal";


        taskModal.classList.add(
            "show"
        );

    }
);


// =====================================================
// CLOSE TASK MODAL
// =====================================================

function hideTaskModal() {

    taskModal.classList.remove(
        "show"
    );

}


closeTaskModal.addEventListener(
    "click",
    hideTaskModal
);


cancelTask.addEventListener(
    "click",
    hideTaskModal
);


// =====================================================
// CREATE / UPDATE TASK
// =====================================================

taskForm.addEventListener(
    "submit",
    function (event) {

        event.preventDefault();


        const id =
            editTaskId.value;


        // ----------------------------------------
        // Read Form
        // ----------------------------------------

        const taskData = {

            title:
                taskTitle
                    .value
                    .trim(),


            description:
                taskDescription
                    .value
                    .trim(),


            employeeId:
                Number(
                    assignedTo.value
                ),


            priority:
                taskPriority.value,


            category:
                taskCategory.value,


            team:
                taskTeam
                    .value
                    .trim(),


            dueDate:
                taskDueDate.value

        };


        // ----------------------------------------
        // Validation
        // ----------------------------------------

        if (!taskData.title) {

            alert(
                "Please enter task title."
            );


            return;

        }


        if (!taskData.employeeId) {

            alert(
                "Please select an employee."
            );


            return;

        }


        if (!taskData.dueDate) {

            alert(
                "Please select due date."
            );


            return;

        }


        // ----------------------------------------
        // EDIT
        // ----------------------------------------

        if (id) {

            const task =
                getTask(id);


            if (!task) {

                return;

            }


            task.title =
                taskData.title;


            task.description =
                taskData.description;


            task.employeeId =
                taskData.employeeId;


            task.priority =
                taskData.priority;


            task.category =
                taskData.category;


            task.team =
                taskData.team;


            task.dueDate =
                taskData.dueDate;

        }


        // ----------------------------------------
        // CREATE
        // ----------------------------------------

        else {

            const newTask = {

                id:
                    generateTaskId(),


                ...taskData,


                status:
                    "todo"

            };


            tasks.push(
                newTask
            );

        }


        // ----------------------------------------
        // Refresh UI
        // ----------------------------------------

        hideTaskModal();


        renderTasks();

    }
);


// =====================================================
// EDIT TASK
// =====================================================

function editTask(id) {

    const task =
        getTask(id);


    if (!task) {

        return;

    }


    editTaskId.value =
        task.id;


    taskTitle.value =
        task.title;


    taskDescription.value =
        task.description;


    assignedTo.value =
        task.employeeId;


    taskPriority.value =
        task.priority;


    taskCategory.value =
        task.category;


    taskTeam.value =
        task.team;


    taskDueDate.value =
        task.dueDate;


    modalTitle.textContent =
        "Edit Task";


    submitTask.textContent =
        "Save Changes";


    taskModal.classList.add(
        "show"
    );

}


// =====================================================
// VIEW TASK
// =====================================================

function viewTask(id) {

    const task =
        getTask(id);


    if (!task) {

        return;

    }


    document.getElementById(
        "viewTaskTitle"
    ).textContent =
        task.title;


    document.getElementById(
        "viewTaskDescription"
    ).textContent =
        task.description ||
        "No description";


    document.getElementById(
        "viewAssigned"
    ).textContent =
        getEmployeeName(
            task.employeeId
        );


    document.getElementById(
        "viewDueDate"
    ).textContent =
        formatDate(
            task.dueDate
        );


    document.getElementById(
        "viewStatus"
    ).textContent =
        getStatusLabel(
            task.status
        );


    // Optional fields

    const priority =
        document.getElementById(
            "viewPriority"
        );


    if (priority) {

        priority.textContent =
            task.priority;

    }


    const category =
        document.getElementById(
            "viewCategory"
        );


    if (category) {

        category.textContent =
            task.category;

    }


    const team =
        document.getElementById(
            "viewTeam"
        );


    if (team) {

        team.textContent =
            task.team;

    }


    viewModal.classList.add(
        "show"
    );

}


// =====================================================
// CLOSE VIEW
// =====================================================

closeViewModal.addEventListener(
    "click",
    function () {

        viewModal.classList.remove(
            "show"
        );

    }
);


// =====================================================
// DELETE MODAL
// =====================================================

function openDeleteModal(id) {

    deleteTaskId =
        Number(id);


    deleteModal.classList.add(
        "show"
    );

}


// =====================================================
// CANCEL DELETE
// =====================================================

cancelDelete.addEventListener(
    "click",
    function () {

        deleteTaskId =
            null;


        deleteModal.classList.remove(
            "show"
        );

    }
);


// =====================================================
// CONFIRM DELETE
// =====================================================

confirmDelete.addEventListener(
    "click",
    function () {

        if (!deleteTaskId) {

            return;

        }


        tasks =
            tasks.filter(
                function (task) {

                    return (
                        Number(task.id) !==
                        Number(deleteTaskId)
                    );

                }
            );


        deleteTaskId =
            null;


        deleteModal.classList.remove(
            "show"
        );


        renderTasks();

    }
);


// =====================================================
// CLICK OUTSIDE MODAL
// =====================================================

window.addEventListener(
    "click",
    function (event) {

        if (
            event.target ===
            taskModal
        ) {

            hideTaskModal();

        }


        if (
            event.target ===
            viewModal
        ) {

            viewModal.classList.remove(
                "show"
            );

        }


        if (
            event.target ===
            deleteModal
        ) {

            deleteModal.classList.remove(
                "show"
            );

        }

    }
);


// =====================================================
// START PAGE
// =====================================================

function initializePage() {

    renderEmployees();

    renderTasks();

}


initializePage();