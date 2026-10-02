const darkModeButton = document.getElementById('btn');
const body = document.querySelector('body');


// أول ما تفتح أي صفحة
const theme = localStorage.getItem('theme');

if (theme === 'dark') {
    body.classList.add('dark');

    if (darkModeButton) {
        darkModeButton.checked = true;
    }
}



if (darkModeButton) {

    darkModeButton.addEventListener('click', function() {

        body.classList.toggle('dark');

        if (body.classList.contains('dark')) {

            localStorage.setItem('theme', 'dark');

        } else {

            localStorage.setItem('theme', 'light');

        }

    });

}
