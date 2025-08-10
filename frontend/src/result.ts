// frontend/src/result.ts

document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const loadingEl = document.getElementById('loading') as HTMLDivElement;
    const errorEl = document.getElementById('error-container') as HTMLDivElement;
    const resultContainer = document.getElementById('result-container') as HTMLDivElement;
    const resultSummary = document.getElementById('result-summary') as HTMLDivElement;
    const questionsReviewContainer = document.getElementById('questions-review-container') as HTMLDivElement;

    // --- Initialization ---
    const urlParams = new URLSearchParams(window.location.search);
    const attemptId = urlParams.get('attemptId');
    const token = localStorage.getItem('jwt_token');

    if (!attemptId || !token) {
        showError('Provförsöks-ID eller token saknas.');
        return;
    }

    try {
        // Denna endpoint måste vi skapa
        const response = await fetch(`/api/attempts/${attemptId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Kunde inte hämta resultat.');

        const data = await response.json();
        
        renderResult(data);

        loadingEl.classList.add('d-none');
        resultContainer.classList.remove('d-none');

    } catch (error) {
        console.error(error);
        showError('Ett fel uppstod vid hämtning av resultat.');
    }

    function renderResult(data: any) {
        // Render summary
        resultSummary.innerHTML = `
            <h2>${data.attempt.passed ? 'Godkänd!' : 'Underkänd'}</h2>
            <p>Du fick ${data.attempt.score} av ${data.questions.length} rätt.</p>
        `;
        resultSummary.classList.add(data.attempt.passed ? 'passed' : 'failed');

        // Render question-by-question review
        questionsReviewContainer.innerHTML = data.questions.map((q: any, index: number) => {
            const userAnswer = data.attempt.answers.find((a: any) => a.questionId === q._id);
            const userOptionIndex = userAnswer ? userAnswer.selectedOptionIndex : -1;
            const isCorrect = userAnswer ? userAnswer.isCorrect : false;

            return `
                <div class="question-review ${isCorrect ? 'correct' : 'incorrect'}">
                    <h6>Fråga ${index + 1}</h6>
                    <p>${q.questionText}</p>
                    <ul>
                        ${q.options.map((opt: string, i: number) => `
                            <li class="${i === q.correctOptionIndex ? 'correct-answer' : ''} ${i === userOptionIndex && !isCorrect ? 'text-danger' : ''}">
                                ${opt}
                                ${i === q.correctOptionIndex ? ' (Rätt svar)' : ''}
                                ${i === userOptionIndex ? ' (Ditt svar)' : ''}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }).join('');
    }

    function showError(message: string) {
        loadingEl.classList.add('d-none');
        errorEl.textContent = message;
        errorEl.classList.remove('d-none');
    }
});
