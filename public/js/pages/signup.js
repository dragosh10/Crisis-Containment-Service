// Funcția pentru gestionarea înregistrării
async function handleSignup() {
    const email = document.querySelector('.email-input').value;
    const password = document.querySelector('.password-input').value;
    const confirmPassword = document.querySelector('.confirm-password-input').value;

    // Validare câmpuri
    if (!email || !password || !confirmPassword) {
        alert('Te rugăm să completezi toate câmpurile!');
        return;
    }

    // Validare email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Te rugăm să introduci o adresă de email validă!');
        return;
    }

    // Validare complexitate parolă
    if (password.length < 8) {
        alert('Parola trebuie să aibă cel puțin 8 caractere!');
        return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(password)) {
        alert('Parola trebuie să conțină cel puțin:\n- O literă mare\n- O literă mică\n- Un număr');
        return;
    }

    // Validare parole identice
    if (password !== confirmPassword) {
        alert('Parolele nu coincid!');
        return;
    }

    try {
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            alert('Cont creat cu succes!');
            window.location.href = '/login.html';
        } else {
            alert(data.message || 'Eroare la crearea contului!');
        }
    } catch (error) {
        alert('A apărut o eroare la înregistrare!');
        console.error('Error:', error);
    }
}

// Adăugăm funcționalitatea de navigare către login
document.querySelector('.login-link').addEventListener('click', function() {
    window.location.href = '/login.html';
});
