// Funcția pentru gestionarea click-ului pe butonul de login
async function handleLogin() {
    const email = document.querySelector('.email-input').value;
    const password = document.querySelector('.password-input').value;

    // Validare câmpuri
    if (!email || !password) {
        alert('Te rugăm să completezi toate câmpurile!');
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            // Verificăm dacă utilizatorul este autoritate
            if (data.isAuthority) {
                window.location.href = '/authority-dashboard.html';
            } else {
                window.location.href = '/dashboard.html';
            }
        } else {
            alert('Email sau parolă incorectă!');
        }
    } catch (error) {
        alert('A apărut o eroare la autentificare!');
        console.error('Error:', error);
    }
}

// Adăugăm funcționalitatea de navigare către signup
document.querySelector('.sign-up').addEventListener('click', function() {
    window.location.href = '/signup.html';
});
