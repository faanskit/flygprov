// frontend/src/test.ts

document.addEventListener('DOMContentLoaded', async () => {
    // State
    let questions: any[] = [];
    let userAnswers: (number | null)[] = [];
    let visitedQuestions: boolean[] = []; // Håller reda på besökta frågor
    let currentQuestionIndex = 0;
    let attemptId: string | null = null;

    // DOM Elements
    const loadingEl = document.getElementById('loading') as HTMLDivElement;
    const errorEl = document.getElementById('error-container') as HTMLDivElement;
    const testContainer = document.getElementById('test-container') as HTMLDivElement;
    const testNameEl = document.getElementById('test-name') as HTMLHeadingElement;
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

        // Markera första frågan som besökt direkt
        visitedQuestions[0] = true;
        renderAll();
    } catch (error) {
        console.error(error);
        showError('Kunde inte ladda provet.');
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
                        <label class="form-check-label" for="q-${question._id}-o-${i}">
                            ${option}
                        </label>
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
            if (userAnswers[i] !== null) {
                dash.classList.add('answered'); // Grön
            } else if (visitedQuestions[i]) {
                dash.classList.add('skipped'); // Röd
            }
            if (i === currentQuestionIndex) {
                dash.classList.add('current'); // Blå
            }
            dash.dataset.index = `${i}`;
            progressBar.appendChild(dash);
        }
    }

    function updateNavButtons() {
        prevBtn.disabled = currentQuestionIndex === 0;
        nextBtn.disabled = currentQuestionIndex === questions.length - 1;
        
        if (userAnswers.every(answer => answer !== null)) {
            submitBtn.classList.remove('d-none');
        } else {
            submitBtn.classList.add('d-none');
        }
    }

    function showError(message: string) {
        loadingEl.classList.add('d-none');
        errorEl.textContent = message;
        errorEl.classList.remove('d-none');
    }

    // --- Navigation & State Change ---
    function changeQuestion(newIndex: number) {
        // Markera nuvarande fråga som besökt innan vi byter
        visitedQuestions[currentQuestionIndex] = true;
        currentQuestionIndex = newIndex;
        // Markera den nya frågan som besökt också
        visitedQuestions[currentQuestionIndex] = true;
        renderAll();
    }

    // --- Event Handlers ---
    function handleAnswerChange(event: Event) {
        const selectedOption = (event.target as HTMLInputElement).value;
        userAnswers[currentQuestionIndex] = parseInt(selectedOption, 10);
        renderProgressBar();
        updateNavButtons();
    }

    prevBtn.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            changeQuestion(currentQuestionIndex - 1);
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentQuestionIndex < questions.length - 1) {
            changeQuestion(currentQuestionIndex + 1);
        }
    });

    progressBar.addEventListener('click', (event) => {
        const target = event.target as HTMLDivElement;
        if (target && target.dataset.index) {
            const newIndex = parseInt(target.dataset.index, 10);
            if (newIndex !== currentQuestionIndex) {
                changeQuestion(newIndex);
            }
        }
    });

    submitBtn.addEventListener('click', async () => {
        if (!attemptId) {
            showError("Kunde inte hitta provförsökets ID. Kan inte lämna in.");
            return;
        }

        // Formatera svaren för backend
        const answersPayload = questions.map((q, index) => ({
            questionId: q._id,
            selectedOptionIndex: userAnswers[index]
        }));

        try {
            const response = await fetch(`/api/tests/${attemptId}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ answers: answersPayload })
            });

            if (!response.ok) {
                throw new Error('Inlämningen misslyckades.');
            }

            // Omdirigera till en resultatsida (som vi skapar senare)
            window.location.href = `/result.html?attemptId=${attemptId}`;

        } catch (error) {
            console.error("Error submitting test:", error);
            showError("Ett fel uppstod vid inlämning. Försök igen.");
        }
    });
});
