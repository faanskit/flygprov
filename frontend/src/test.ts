// frontend/src/test.ts

document.addEventListener('DOMContentLoaded', async () => {
    // State
    let questions: any[] = [];
    let userAnswers: (number | null)[] = [];
    let visitedQuestions: boolean[] = [];
    let currentQuestionIndex = 0;
    let attemptId: string | null = null;
    let timerInterval: number | null = null;

    // DOM Elements
    const loadingEl = document.getElementById('loading') as HTMLDivElement;
    const errorEl = document.getElementById('error-container') as HTMLDivElement;
    const testContainer = document.getElementById('test-container') as HTMLDivElement;
    const testNameEl = document.getElementById('test-name') as HTMLHeadingElement;
    const timerEl = document.getElementById('timer') as HTMLDivElement;
    const questionNumberEl = document.getElementById('question-number') as HTMLSpanElement;
    const progressBar = document.getElementById('progress-bar') as HTMLDivElement;
    const questionCard = document.getElementById('question-card') as HTMLDivElement;
    const prevBtn = document.getElementById('prev-btn') as HTMLButtonElement;
    const nextBtn = document.getElementById('next-btn') as HTMLButtonElement;
    const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;

    // --- Initialization ---
    const urlParams = new URLSearchParams(window.location.search);
    const testId = urlParams.get('testId');
    const token = localStorage.getItem('jwt_token');

    if (!testId || !token) {
        showError('Prov-ID eller token saknas. Gå tillbaka till dashboarden och försök igen.');
        return;
    }

    try {
        const response = await fetch(`/api/tests/${testId}/start`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(`Failed to fetch test: ${response.statusText}`);
        
        const data = await response.json();
        questions = data.questions;
        attemptId = data.attemptId;
        userAnswers = new Array(questions.length).fill(null);
        visitedQuestions = new Array(questions.length).fill(false);

        testNameEl.textContent = data.testName;
        loadingEl.classList.add('d-none');
        testContainer.classList.remove('d-none');

        visitedQuestions[0] = true;
        startTimer(data.timeLimitMinutes);
        renderAll();
    } catch (error) {
        console.error(error);
        showError('Kunde inte ladda provet.');
    }

    // --- Timer ---
    function startTimer(minutes: number) {
        console.log(`Starting timer for ${minutes} minutes`);
        let seconds = minutes * 60;
        
        timerInterval = window.setInterval(() => {
            seconds--;

            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

            // Varningar
            if (seconds <= 300 && seconds > 60) { // 5 minuter
                timerEl.classList.add('blinking');
            } else if (seconds <= 60) {
                timerEl.classList.add('blinking', 'urgent'); // Både röd och blinkande
            } else {
                timerEl.classList.remove('blinking', 'urgent');
            }

            if (seconds <= 0) {
                if(timerInterval) clearInterval(timerInterval);
                submitTest('auto');
            }
        }, 1000);
    }

    // --- Rendering Functions ---
    function renderAll() {
        renderQuestion();
        renderProgressBar();
        updateNavButtons();
    }

    function renderQuestion() {
        const question = questions[currentQuestionIndex];
        questionNumberEl.textContent = `${currentQuestionIndex + 1}`;
        
        questionCard.innerHTML = `
            <div class="card-body">
                <h5 class="card-title">Fråga ${currentQuestionIndex + 1}</h5>
                <p class="card-text">${question.questionText}</p>
                ${question.options.map((option: string, i: number) => `
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="question-${question._id}" id="q-${question._id}-o-${i}" value="${i}" ${userAnswers[currentQuestionIndex] === i ? 'checked' : ''}>
                        <label class="form-check-label" for="q-${question._id}-o-${i}">${option}</label>
                    </div>
                `).join('')}
            </div>
        `;
        questionCard.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', handleAnswerChange);
        });
    }

    function renderProgressBar() {
        progressBar.innerHTML = '';
        for (let i = 0; i < questions.length; i++) {
            const dash = document.createElement('div');
            dash.className = 'progress-dash';
            if (userAnswers[i] !== null) dash.classList.add('answered');
            else if (visitedQuestions[i]) dash.classList.add('skipped');
            if (i === currentQuestionIndex) dash.classList.add('current');
            dash.dataset.index = `${i}`;
            progressBar.appendChild(dash);
        }
    }

    function updateNavButtons() {
        prevBtn.disabled = currentQuestionIndex === 0;
        nextBtn.disabled = currentQuestionIndex === questions.length - 1;
        
        const allAnswered = userAnswers.every(answer => answer !== null);
        submitBtn.classList.toggle('d-none', !allAnswered);
    }

    function showError(message: string) {
        loadingEl.classList.add('d-none');
        errorEl.textContent = message;
        errorEl.classList.remove('d-none');
    }

    // --- Navigation & State Change ---
    function changeQuestion(newIndex: number) {
        visitedQuestions[currentQuestionIndex] = true;
        currentQuestionIndex = newIndex;
        visitedQuestions[currentQuestionIndex] = true;
        renderAll();
    }

    // --- Event Handlers & Submission ---
    function handleAnswerChange(event: Event) {
        const selectedOption = (event.target as HTMLInputElement).value;
        userAnswers[currentQuestionIndex] = parseInt(selectedOption, 10);
        renderProgressBar();
        updateNavButtons();
    }

    async function submitTest(submissionType: 'manual' | 'auto' = 'manual') {
        if (timerInterval) clearInterval(timerInterval);
        if (!attemptId) {
            showError("Kunde inte hitta provförsökets ID. Kan inte lämna in.");
            return;
        }

        // Inaktivera alla knappar
        submitBtn.disabled = true;
        prevBtn.disabled = true;
        nextBtn.disabled = true;

        const answersPayload = questions.map((q, index) => ({
            questionId: q._id,
            selectedOptionIndex: userAnswers[index]
        }));

        try {
            const response = await fetch(`/api/tests/${attemptId}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ answers: answersPayload, submissionType: submissionType })
            });

            if (!response.ok) throw new Error('Inlämningen misslyckades.');
            window.location.href = `/result.html?attemptId=${attemptId}`;
        } catch (error) {
            console.error("Error submitting test:", error);
            showError("Ett fel uppstod vid inlämning. Försök igen.");
        }
    }

    prevBtn.addEventListener('click', () => changeQuestion(currentQuestionIndex - 1));
    nextBtn.addEventListener('click', () => changeQuestion(currentQuestionIndex + 1));
    progressBar.addEventListener('click', (event) => {
        const target = event.target as HTMLDivElement;
        if (target && target.dataset.index) changeQuestion(parseInt(target.dataset.index, 10));
    });
    submitBtn.addEventListener('click', () => submitTest('manual'));
});