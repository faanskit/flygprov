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
        const response = await fetch(`/api/attempts/${attemptId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Kunde inte hämta resultat.');
        }

        const resultData = await response.json();
        
        renderResult(resultData);

        loadingEl.classList.add('d-none');
        resultContainer.classList.remove('d-none');

    } catch (error) {
        console.error(error);
        showError((error as Error).message);
    }

    function renderResult(data: any) {
        // Render summary
        const totalQuestions = data.detailedAnswers.length;
        resultSummary.innerHTML = `
            <h2>${data.passed ? 'Godkänd!' : 'Underkänd'}</h2>
            <p>Du fick ${data.score} av ${totalQuestions} rätt.</p>
        `;
        resultSummary.classList.add(data.passed ? 'passed' : 'failed');

        // Render submission info
        const submissionInfoEl = document.getElementById('submission-info');
        if (submissionInfoEl) {
            if (data.submissionType === 'auto') {
                submissionInfoEl.textContent = 'Provet lämnades in automatiskt eftersom tiden tog slut.';
            } else if (data.submissionType === 'manual') {
                submissionInfoEl.textContent = 'Provet lämnades in manuellt av användaren.';
            } else {
                submissionInfoEl.textContent = 'Inlämningsmetod ej specificerad.';
            }
        }

        // Render question-by-question review
        questionsReviewContainer.innerHTML = data.detailedAnswers.map((answer: any, index: number) => {
            const { questionText, options, correctOptionIndex, selectedOptionIndex, isCorrect } = answer;

            return `
                <div class="question-review ${isCorrect ? 'correct' : 'incorrect'}">
                    <h6>Fråga ${index + 1}</h6>
                    <p class="fw-bold">${questionText}</p>
                    <ul class="list-unstyled">
                        ${options.map((opt: string, i: number) => {
                            let classes = '';
                            let labels = '';
                            if (i === correctOptionIndex) {
                                classes += 'correct-answer';
                                labels += ' (Rätt svar)';
                            }
                            if (i === selectedOptionIndex) {
                                if (!isCorrect) classes += ' text-danger';
                                labels += ' (Ditt svar)';
                            }
                            return `<li class="${classes}">${opt}${labels}</li>`;
                        }).join('')}
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
