const loggedInEmail = localStorage.getItem("email");

const fullName = document.getElementById("fullName");
const email = document.getElementById("email");

if (loggedInEmail) {

    fetch("employees.json")
        .then(response => response.json())
        .then(data => {

            const employee = data.employees.find(
                emp => emp.email.toLowerCase() === loggedInEmail.toLowerCase()
            );

            if (employee) {

                fullName.value = employee.name;
                email.value = employee.email;

                fullName.readOnly = true;
                email.readOnly = true;

            } else {

                alert("Employee not found.");

            }

        })
        .catch(error => {
            console.error("Error loading employees.json:", error);
        });

} else {

    alert("Please login first.");

}