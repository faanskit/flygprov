document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const resultDiv = document.getElementById('result');
    const usernameInput = document.getElementById('username') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;

    if (loginForm && resultDiv) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const username = usernameInput.value;
            const password = passwordInput.value;

            resultDiv.className = '';
                        resultDiv.className = '';
            resultDiv.textContent = '';

            try {
                const response = await fetch('/api/auth', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Något gick fel.');
                }

                resultDiv.className = 'success';
                resultDiv.textContent = 'Inloggning lyckades! Omdirigerar...';
                console.log('Token:', data.token);
                
                // Spara token och omdirigera till dashboard
                localStorage.setItem('jwt_token', data.token);
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 1000);

            } catch (error: any) {
                resultDiv.className = 'error';
                resultDiv.textContent = `Fel: ${error.message}`;
            }
        });
    }
});
