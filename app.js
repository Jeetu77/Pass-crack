document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('password-input');
    const toggleBtn = document.getElementById('toggle-visibility');
    const iconShow = document.getElementById('icon-show');
    const iconHide = document.getElementById('icon-hide');

    const meterFill = document.getElementById('meter-fill');
    const strengthText = document.getElementById('strength-text');
    const scoreText = document.getElementById('score-text');

    const entropyValue = document.getElementById('entropy-value');
    const crackTime = document.getElementById('crack-time');
    const poolSizeElement = document.getElementById('pool-size');
    const feedbackList = document.getElementById('feedback-list');

    const generateBtn = document.getElementById('generate-btn');
    const suggestionsList = document.getElementById('suggestions-list');

    // Toggle password visibility
    toggleBtn.addEventListener('click', () => {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        if (isPassword) {
            iconShow.classList.add('hidden');
            iconHide.classList.remove('hidden');
        } else {
            iconShow.classList.remove('hidden');
            iconHide.classList.add('hidden');
        }
    });

    // Patterns for testing sequences
    const patterns = {
        lowercase: /[a-z]/,
        uppercase: /[A-Z]/,
        digits: /[0-9]/,
        symbols: /[^a-zA-Z0-9]/,
        sequentialLetters: /(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i,
        sequentialNumbers: /(012|123|234|345|456|567|678|789|890)/,
        qwerty: /(qwe|wer|ert|rty|tyu|yui|uio|iop|asd|sdf|dfg|fgh|ghj|hjk|jkl|zxc|xcv|cvb|vbn|bnm)/i
    };

    // Human readable time formatter
    function formatTime(seconds) {
        if (seconds < 1) return 'Instant';

        const MINUTE = 60;
        const HOUR = 60 * MINUTE;
        const DAY = 24 * HOUR;
        const YEAR = 365 * DAY;
        const CENTURY = 100 * YEAR;

        if (seconds < MINUTE) return `${Math.round(seconds)} seconds`;
        if (seconds < HOUR) return `${Math.round(seconds / MINUTE)} minutes`;
        if (seconds < DAY) return `${Math.round(seconds / HOUR)} hours`;
        if (seconds < YEAR) return `${Math.round(seconds / DAY)} days`;
        if (seconds < CENTURY) return `${Math.round(seconds / YEAR)} years`;
        return 'Centuries+';
    }

    function analyzePassword(password) {
        const len = password.length;
        if (len === 0) {
            updateUI(0, 0, 0, 0, [{ type: 'neutral', msg: 'Enter a password to see analysis.' }]);
            return;
        }

        // 1. Calculate pool size (R)
        let poolSize = 0;
        if (patterns.lowercase.test(password)) poolSize += 26;
        if (patterns.uppercase.test(password)) poolSize += 26;
        if (patterns.digits.test(password)) poolSize += 10;
        if (patterns.symbols.test(password)) poolSize += 32;

        // 2. Calculate Entropy (E = L * log2(R))
        const entropy = poolSize === 0 ? 0 : len * Math.log2(poolSize);

        // 3. Estimate Brute-Force Time
        // Assuming an attacker making 100 Billion guesses per second (high-end GPU cluster)
        const guessesPerSecond = 100_000_000_000;
        const totalCombinations = Math.pow(poolSize, len);
        // On average, it takes 50% of the space to find the password.
        const secondsToCrack = (totalCombinations / 2) / guessesPerSecond;

        // 4. Gather Feedback and Penalities
        const feedback = [];
        let penalty = 0; // Penalty points to subtract from the score

        // Check for predictability
        if (patterns.sequentialLetters.test(password) || patterns.sequentialNumbers.test(password)) {
            feedback.push({ type: 'warning', msg: 'Password contains predictable sequences (e.g. "123" or "abc").' });
            penalty += 15;
        }
        if (patterns.qwerty.test(password)) {
            feedback.push({ type: 'warning', msg: 'Keyboard patterns (e.g. "qwerty") are easy to guess.' });
            penalty += 15;
        }

        // Check for character variety
        const missing = [];
        if (!patterns.uppercase.test(password)) missing.push('uppercase letters');
        if (!patterns.lowercase.test(password)) missing.push('lowercase letters');
        if (!patterns.digits.test(password)) missing.push('numbers');
        if (!patterns.symbols.test(password)) missing.push('symbols');

        if (missing.length > 0 && len > 0) {
            feedback.push({ type: 'warning', msg: `Try adding ${missing.join(', ')} to increase complexity.` });
        }

        // Check length
        if (len < 8) {
            feedback.push({ type: 'warning', msg: 'Password is too short. Aim for at least 12 characters.' });
        } else if (len >= 12 && missing.length <= 1) {
            feedback.push({ type: 'good', msg: 'Great length and character mix.' });
        }

        if (feedback.length === 0 && len > 0) {
            feedback.push({ type: 'good', msg: 'Strong, unpredictable password.' });
        }

        // 5. Calculate final score (0 to 100)
        // Entropy mapping: 
        // < 28 bits: Very weak
        // 28 - 35 bits: Weak
        // 36 - 59 bits: Reasonable
        // 60 - 127 bits: Strong
        // > 127 bits: Very strong

        let rawScore = Math.min((entropy / 100) * 100, 100);
        let finalScore = Math.max(0, Math.min(100, rawScore - penalty));

        // Edge case for purely repeated chars (e.g., 'aaaaaa')
        if (/^(.)\1+$/.test(password)) {
            finalScore = Math.min(finalScore, 5);
            feedback.push({ type: 'warning', msg: 'Repeated characters expose a devastating vulnerability.' });
        }

        updateUI(finalScore, entropy, secondsToCrack, poolSize, feedback);
    }

    function updateUI(score, entropy, time, poolSize, feedback) {
        // Formats
        const fixedEntropy = entropy.toFixed(1);
        const formattedTime = formatTime(time);

        // Update Text
        entropyValue.textContent = `${fixedEntropy} bits`;
        crackTime.textContent = formattedTime;
        poolSizeElement.textContent = String(poolSize);

        // Update meter width and score
        meterFill.style.width = `${score}%`;
        scoreText.textContent = `${Math.round(score)}%`;

        // Update meter colors and label based on score thresholds
        let colorVar, labelText;
        if (score === 0 && input.value.length === 0) {
            meterFill.style.backgroundColor = 'var(--text-secondary)';
            meterFill.style.boxShadow = 'none';
            labelText = 'Awaiting input...';
            strengthText.style.color = 'var(--text-secondary)';
        } else if (score < 20) {
            colorVar = 'var(--color-0)';
            labelText = 'Very Weak';
        } else if (score < 40) {
            colorVar = 'var(--color-1)';
            labelText = 'Weak';
        } else if (score < 60) {
            colorVar = 'var(--color-2)';
            labelText = 'Fair';
        } else if (score < 80) {
            colorVar = 'var(--color-3)';
            labelText = 'Strong';
        } else {
            colorVar = 'var(--color-4)';
            labelText = 'Very Strong';
        }

        if (score > 0 || input.value.length > 0) {
            meterFill.style.backgroundColor = colorVar;
            meterFill.style.boxShadow = `0 0 10px ${colorVar}`;
            strengthText.style.color = colorVar;
            strengthText.textContent = labelText;
        }

        // Update feedback list
        feedbackList.innerHTML = '';
        feedback.forEach(item => {
            const li = document.createElement('li');
            li.className = `feedback-item ${item.type}`;
            li.textContent = item.msg;
            feedbackList.appendChild(li);
        });
    }

    input.addEventListener('input', (e) => {
        analyzePassword(e.target.value);
    });

    // --- Password Suggestion Logic ---
    function generateSecurePassword(length = 16) {
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
        let password = "";

        // Ensure at least one of each required type
        password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
        password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
        password += "0123456789"[Math.floor(Math.random() * 10)];
        password += "!@#$%^&*()_+~`|}{[]:;?><,./-="[Math.floor(Math.random() * 29)];

        // Fill the rest randomly
        for (let i = password.length; i < length; i++) {
            password += charset[Math.floor(Math.random() * charset.length)];
        }

        // Shuffle the string
        return password.split('').sort(() => 0.5 - Math.random()).join('');
    }

    function createSuggestionItem(pwd) {
        const item = document.createElement('div');
        item.className = 'suggestion-item';

        const pwdSpan = document.createElement('span');
        pwdSpan.textContent = pwd;

        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
        copyBtn.title = 'Copy to clipboard';

        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(pwd).then(() => {
                const originalSvg = copyBtn.innerHTML;
                copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                setTimeout(() => { copyBtn.innerHTML = originalSvg; }, 2000);
            });
        });

        item.appendChild(pwdSpan);
        item.appendChild(copyBtn);
        return item;
    }

    function populateSuggestions() {
        suggestionsList.innerHTML = '';
        // Generate 3 strong passwords
        for (let i = 0; i < 3; i++) {
            // Generate lengths between 16 and 20
            const len = Math.floor(Math.random() * 5) + 16;
            const pwd = generateSecurePassword(len);
            suggestionsList.appendChild(createSuggestionItem(pwd));
        }
    }

    generateBtn.addEventListener('click', populateSuggestions);

    // Initial generation
    populateSuggestions();
});
