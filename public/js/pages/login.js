
async function handleLogin() {
    const email = document.querySelector('.email-input').value;
    const password = document.querySelector('.password-input').value;

 
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
                window.location.href = '/dashboard-autoritati/Dashboard/pages/map-authorities.html';
            } else {
                window.location.href = '/dashboard-client/Dashboard/pages/map-client.html';
            }
        } else {
            alert('Email sau parolă incorectă!');
        }
    } catch (error) {
        alert('A apărut o eroare la autentificare!');
        console.error('Error:', error);
    }
}


document.querySelector('.sign-up').addEventListener('click', function() {
    window.location.href = '/signup.html';
});
