async function handleSignup() {
    const email = document.querySelector('.email-input').value;
    const password = document.querySelector('.password-input').value;
    const confirmPassword = document.querySelector('.confirm-password-input').value;

   
    if (!email || !password || !confirmPassword) {
        alert('Te rugăm să completezi toate câmpurile!');
        return;
    }

    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Te rugăm să introduci o adresă de email validă!');
        return;
    }

   
    if (password.length < 8) {
        alert('Parola trebuie să aibă cel puțin 8 caractere!');
        return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(password)) {
        alert('Parola trebuie să conțină cel puțin:\n- O literă mare\n- O literă mică\n- Un număr');
        return;
    }

   
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

function togglePassword(inputClass) {
    const passwordInput = document.querySelector('.' + inputClass);
    const toggleButton = passwordInput.nextElementSibling;
    const eyeIcon = toggleButton.querySelector('.eye-icon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.classList.add('show-password');
    } else {
        passwordInput.type = 'password';
        eyeIcon.classList.remove('show-password');
    }
}

document.querySelector('.login-link').addEventListener('click', function() {
    window.location.href = '/login.html';
});

// Pro Tips Cycling Functionality
const tips = [
    {
        image: '/images/firefighter.png',
        topic: 'what to do in an EARTHQUAKE?',
        content: `
            <p>• Drop down to the ground so the earthquake doesn't <strong>knock you down</strong></p>
            <p>• Cover your <strong>head and neck</strong> with your arms to protect you from falling debris. If possible, crawl under a <strong>sturdy desk, table or other piece of furniture</strong> for additional protection. Stay away from glass, windows, outside doors and walls, and other items that could fall.</p>
            <p>• Hold on to any sturdy item you can <strong>until the shaking stops</strong></p>
        `
    },
    {
        image: '/images/fire.png',
        topic: 'FIRE PREVENTION tips?',
        content: `
            <p>• Install <strong>smoke detectors</strong> on every level of your home and test them monthly</p>
            <p>• Keep <strong>fire extinguishers</strong> in key areas like the kitchen and garage, and learn how to use them properly</p>
            <p>• Create and practice a <strong>fire escape plan</strong> with your family, identifying two ways out of every room</p>
            <p>• Never leave <strong>cooking unattended</strong> and keep flammable items away from heat sources</p>
        `
    },
    {
        image: '/images/flood.png',
        topic: 'how to prepare for FLOODS?',
        content: `
            <p>• Know your area's <strong>flood risk</strong> and evacuation routes before disaster strikes</p>
            <p>• Create a <strong>flood emergency kit</strong> with water, non-perishable food, flashlights, and important documents in waterproof containers</p>
            <p>• Never drive through <strong>flooded roads</strong> - just 6 inches of moving water can knock you down, and 12 inches can carry away a vehicle</p>
            <p>• Move to <strong>higher ground</strong> immediately if you receive a flood warning</p>
        `
    }
];

let currentTipIndex = 0;

function changeTip(direction) {
    currentTipIndex += direction;
    
    if (currentTipIndex >= tips.length) {
        currentTipIndex = 0;
    } else if (currentTipIndex < 0) {
        currentTipIndex = tips.length - 1;
    }
    
    updateTipDisplay();
}

function updateTipDisplay() {
    const tip = tips[currentTipIndex];
    
    document.getElementById('tipImage').src = tip.image;
    document.getElementById('tipTopic').textContent = tip.topic;
    document.getElementById('tipText').innerHTML = tip.content;
}
