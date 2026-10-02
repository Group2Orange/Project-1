const loginForm = document.querySelector('#login-form');

const emailInput = document.querySelector('#email');

const passwordInput = document.querySelector('#password');

const loginError = document.querySelector('#login-error');

const loginButton = document.querySelector('.login-btn');

const passwordToggle = document.querySelector('.password-toggle');


function setLoginError(message) {

  loginError.textContent = message;

  loginError.className = 'login-error';

}


function clearLoginError() {

  loginError.textContent = '';

  loginError.className = 'login-error hidden';

}


function togglePassword() {

  if (passwordInput.type === 'password') {

    passwordInput.type = 'text';

    passwordToggle.textContent = 'visibility_off';

  } else {

    passwordInput.type = 'password';

    passwordToggle.textContent = 'visibility';

  }

}


passwordToggle.addEventListener('click', function () {

  togglePassword();

});


loginForm.addEventListener('submit', function (event) {

  event.preventDefault();

  clearLoginError();


  const email = emailInput.value.trim().toLowerCase();

  const password = passwordInput.value;


  if (email === '' || password === '') {

    setLoginError('Please enter your email and password.');

    return;

  }


  loginButton.disabled = true;


  fetch('../../Data/employee.json')

    .then(function (response) {

      if (!response.ok) {

        throw new Error('Could not load employee data.');

      }

      return response.json();

    })

    .then(function (data) {

      if (!Array.isArray(data.employees)) {

        throw new Error('Invalid employee data.');

      }


      let employee = null;


      for (let i = 0; i < data.employees.length; i++) {

        if (
          typeof data.employees[i].email === 'string' &&
          data.employees[i].email.trim().toLowerCase() === email
        ) {

          employee = data.employees[i];

          break;

        }

      }


      if (employee === null) {

        setLoginError('Invalid email or password.');

        return;

      }


      try {

        const employeeEdits = JSON.parse(
          localStorage.getItem('employeeEdits_' + employee.id)
        );


        if (employeeEdits !== null) {

          if (typeof employeeEdits.password === 'string') {

            employee.password = employeeEdits.password;

          }


          if (typeof employeeEdits.firstAttend === 'boolean') {

            employee.firstAttend = employeeEdits.firstAttend;

          }

        }

      } catch (error) {

        console.log('Could not load local employee edits.');

      }


      if (employee.password !== password) {

        setLoginError('Invalid email or password.');

        return;

      }


      if (employee.status !== 'Active') {

        setLoginError(
          'Your account is not active. Please contact HR.'
        );

        return;

      }


      if (
        employee.role !== 'HR' &&
        employee.role !== 'EMP'
      ) {

        setLoginError(
          'This account has no supported role. Please contact HR.'
        );

        return;

      }


      localStorage.setItem(
        'currentUserId',
        String(employee.id)
      );


      localStorage.setItem(
        'loggedUser',
        JSON.stringify(employee)
      );


      if (employee.firstAttend === true) {

        window.location.href =
          '../reset-password/reset-password.html';

        return;

      }


      if (employee.role === 'HR') {

        window.location.href =
          '../home/home.html';

      } else {

        window.location.href =
          '../../employee/MyWOrkSpace/MyWOrkSpace.html';

      }

    })

    .catch(function (error) {

      console.log(error);

      setLoginError(
        'Something went wrong. Please try again.'
      );

    })

    .finally(function () {

      loginButton.disabled = false;

    });

});