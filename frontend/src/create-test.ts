document.addEventListener('DOMContentLoaded', () => {
    const loadingEl = document.getElementById('loading');
    const containerEl = document.getElementById('create-test-container');
    const subjectNameEl = document.getElementById('subject-name');
    const studentNameEl = document.getElementById('student-name');
    const questionListEl = document.getElementById('question-list');
    const errorContainer = document.getElementById('error-container');
    const token = localStorage.getItem('jwt_token');

    let testData: any = {};

    try {
        const storedData = sessionStorage.getItem('createTestData');
        if (!storedData) {
            throw new Error("Ingen provdata hittades. Gå tillbaka och försök igen.");
        }
        
        testData = JSON.parse(storedData);

        if (subjectNameEl) subjectNameEl.textContent = testData.subjectName;
        if (studentNameEl) studentNameEl.textContent = testData.studentName;

        renderQuestionList(testData.questions);

        if (loadingEl) loadingEl.classList.add('d-none');
        if (containerEl) containerEl.classList.remove('d-none');

    } catch (error) {
        showError((error as Error).message);
    }

    function renderQuestionList(questions: any[]) {
        if (!questionListEl) return;
        questionListEl.innerHTML = '';

        questions.forEach(q => {
            const item = document.createElement('div');
            item.className = 'list-group-item d-flex justify-content-between align-items-center';
            item.id = `question-${q._id}`; // Ge ett ID för enkel åtkomst
            item.innerHTML = `
                <span>${q.questionText}</span>
                <button class="btn btn-sm btn-outline-secondary refresh-btn" data-question-id="${q._id}">
                    &#x21bb; <!-- Refresh icon -->
                </button>
            `;
            questionListEl.appendChild(item);
        });

        // Lägg till event listeners på de nya knapparna
        document.querySelectorAll('.refresh-btn').forEach(button => {
            button.addEventListener('click', handleRefreshClick);
        });
    }

    async function handleRefreshClick(event: Event) {
        const button = event.target as HTMLButtonElement;
        const questionIdToReplace = button.dataset.questionId;
        if (!questionIdToReplace) return;

        button.disabled = true; // Förhindra dubbelklick

        try {
            const currentQuestionIds = testData.questions.map((q: any) => q._id);
            
            const response = await fetch('/api/examinator', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action: 'replace-question',
                    subjectId: testData.subjectId,
                    excludeIds: currentQuestionIds
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Kunde inte byta fråga.');
            }

            const newQuestion = await response.json();

            // Uppdatera den lokala datan
            const questionIndex = testData.questions.findIndex((q: any) => q._id === questionIdToReplace);
            if (questionIndex !== -1) {
                testData.questions[questionIndex] = newQuestion;
                sessionStorage.setItem('createTestData', JSON.stringify(testData)); // Spara ändringen
            }

            // Uppdatera DOM
            const oldQuestionElement = document.getElementById(`question-${questionIdToReplace}`);
            if (oldQuestionElement) {
                oldQuestionElement.id = `question-${newQuestion._id}`;
                oldQuestionElement.querySelector('span')!.textContent = newQuestion.questionText;
                const newButton = oldQuestionElement.querySelector('button')!;
                newButton.dataset.questionId = newQuestion._id;
                newButton.disabled = false;
            }

        } catch (error) {
            showError((error as Error).message);
            button.disabled = false;
        }
    }

    function showError(message: string) {
        if (loadingEl) loadingEl.classList.add('d-none');
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.classList.remove('d-none');
        }
    }
});
