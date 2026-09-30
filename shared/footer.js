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
      .then(html => { placeholder.outerHTML = html; })
      .catch(error => {
        console.error('Could not load the shared footer. Open this page through Live Server.', error);
        placeholder.textContent = 'TeamSpace HR';
      });
  }
}
