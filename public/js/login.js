
function validateEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(email)) {
        return false;
    }
    
    
    const secureEmail = secureInput(email);
    return secureEmail === email.trim();
}


function setupInputValidation() {
    const emailInput = document.querySelector('.email-input');
    const passwordInput = document.querySelector('.password-input');
    
    if (emailInput) {
        emailInput.addEventListener('input', function(e) {
            
            if (!validateEmail(e.target.value)) {
                console.warn('Dangerous pattern detected in email');
                e.target.value = sanitizeEmailInput(e.target.value);
            }
        });
        
        emailInput.addEventListener('paste', function(e) {
            setTimeout(() => {
              
                if (!validateEmail(e.target.value)) {
                    console.warn('Dangerous pattern detected in pasted email');
                    e.target.value = sanitizeEmailInput(e.target.value);
                }
            }, 0);
        });
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('input', function(e) {
            
            if (!validatePassword(e.target.value)) {
                console.warn('Dangerous pattern detected in password');
                e.target.value = sanitizePasswordInput(e.target.value);
            }
        });
    }
}


document.addEventListener('DOMContentLoaded', function() {
    setupInputValidation();
});

async function handleLogin() {
    const emailInput = document.querySelector('.email-input');
    const passwordInput = document.querySelector('.password-input');
    
    let email = emailInput.value;
    let password = passwordInput.value;

    
    try {
        email = secureInput(email);
        password = secureInput(password);
    } catch (error) {
        alert('Invalid characters detected in input fields!');
        return;
    }

    if (!email || !password) {
        alert('Te rugăm să completezi toate câmpurile!');
        return;
    }

    
    if (!validateEmail(email)) {
        alert('Te rugăm să introduci o adresă de email validă!');
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
           
            if (data.isAuthority) {
                                    window.location.href = '/views/map-authorities.html';
                } else {
                    window.location.href = '/views/map-client.html';
            }
        } else {
            alert('Email sau parolă incorectă!');
        }
    } catch (error) {
        alert('A apărut o eroare la autentificare!');
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

document.querySelector('.sign-up').addEventListener('click', function() {
    window.location.href = '/signup.html';
});


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
