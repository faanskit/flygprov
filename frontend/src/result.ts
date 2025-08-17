document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const loadingEl = document.getElementById('loading') as HTMLDivElement;
    const errorEl = document.getElementById('error-container') as HTMLDivElement;
    const resultContainer = document.getElementById('result-container') as HTMLDivElement;
    const resultSummary = document.getElementById('result-summary') as HTMLDivElement;
    const questionsReviewContainer = document.getElementById('questions-review-container') as HTMLDivElement;
    const backButton = document.getElementById('back-button') as HTMLAnchorElement;
    const submissionInfoEl = document.getElementById('submission-info') as HTMLParagraphElement;

    // --- Initialization ---
    const urlParams = new URLSearchParams(window.location.search);
    const attemptId = urlParams.get('attemptId');
    const token = localStorage.getItem('jwt_token');

    // Handle back navigation
    const from = urlParams.get('from');
    const studentId = urlParams.get('studentId');

    if (from === 'student-details' && studentId && backButton) {
        backButton.href = `/student-details.html?studentId=${studentId}`;
        backButton.textContent = 'Tillbaka till studentens detaljer';
    }

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
            <h2 class="result-heading">${data.passed ? 'Godkänd!' : 'Underkänd'}</h2>
            <p class="lead mb-0">Du fick ${data.score} av ${totalQuestions} rätt.</p>
        `;
        resultSummary.classList.add(data.passed ? 'passed' : 'failed');

        // Render submission info
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
            
            const isAnswered = selectedOptionIndex !== null && selectedOptionIndex > -1;

            let statusClass = '';
            let statusIcon = '';

            if (isCorrect) {
                statusClass = 'correct';
                statusIcon = '<i class="bi bi-check-circle-fill text-success"></i>';
            } else if (isAnswered) {
                statusClass = 'incorrect';
                statusIcon = '<i class="bi bi-x-circle-fill text-danger"></i>';
            } else {
                statusClass = 'unanswered';
                statusIcon = '<i class="bi bi-x-circle-fill text-danger"></i>';
            }

            let yourAnswerHtml = '';
            if (isAnswered) {
                const yourAnswerClass = isCorrect ? '' : 'your-choice-incorrect';
                yourAnswerHtml = `<span class="answer-text ${yourAnswerClass}">${options[selectedOptionIndex]}</span>`;
            } else {
                yourAnswerHtml = `<span class="answer-text your-choice-unanswered">Inget svar angivet</span>`;
            }

            const correctAnswerHtml = `<span class="answer-text correct-answer-text">${options[correctOptionIndex]}</span>`;

            return `
                <div class="question-review ${statusClass}">
                    <div class="question-header">
                        ${statusIcon}
                        <h6>Fråga ${index + 1}</h6>
                    </div>
                    <p class="question-text">${questionText}</p>
                    <div class="answer-container">
                        <div class="answer-column">
                            <span class="column-title">Ditt svar</span>
                            ${yourAnswerHtml}
                        </div>
                        <div class="answer-column">
                            <span class="column-title">Rätt svar</span>
                            ${correctAnswerHtml}
                        </div>
                    </div>
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