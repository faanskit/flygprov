document.addEventListener('DOMContentLoaded', () => {
    const loadingEl = document.getElementById('loading');
    const containerEl = document.getElementById('create-test-container');
    const subjectNameEl = document.getElementById('subject-name');
    const studentNameEl = document.getElementById('student-name');
    const testNameInput = document.getElementById('test-name') as HTMLInputElement;
    const questionListEl = document.getElementById('question-list');
    const assignTestBtn = document.getElementById('assign-test-btn');
    const errorContainer = document.getElementById('error-container');
    const successContainer = document.getElementById('success-container');
    const token = localStorage.getItem('jwt_token');

    let testData: { 
        studentId: string, 
        subjectId: string, 
        subjectName: string, 
        studentName: string, 
        questions: any[] 
    } | null = null;

    // --- Initialisering ---
    try {
        const storedData = sessionStorage.getItem('createTestData');
        if (!storedData) throw new Error("Ingen provdata hittades. Gå tillbaka och försök igen.");
        
        testData = JSON.parse(storedData);

        if (subjectNameEl) subjectNameEl.textContent = testData!.subjectName;
        if (studentNameEl) studentNameEl.textContent = testData!.studentName;
        if (testNameInput) {
            const today = new Date().toISOString().split('T')[0];
            testNameInput.value = `Prov i ${testData!.subjectName} för ${testData!.studentName} - ${today}`;
        }

        renderQuestionList(testData!.questions);

        if (loadingEl) loadingEl.classList.add('d-none');
        if (containerEl) containerEl.classList.remove('d-none');

    } catch (error) {
        showError((error as Error).message);
    }

    // --- Event Listeners ---
    assignTestBtn?.addEventListener('click', handleAssignTest);

    // --- Funktioner ---
    function renderQuestionList(questions: any[]) {
        if (!questionListEl) return;
        questionListEl.innerHTML = '';

        questions.forEach(q => {
            const item = document.createElement('div');
            item.className = 'list-group-item d-flex justify-content-between align-items-center';
            item.id = `question-${q._id}`;
            item.innerHTML = `
                <span>${q.questionText}</span>
                <button class="btn btn-sm btn-outline-secondary refresh-btn" data-question-id="${q._id}">&#x21bb;</button>
            `;
            questionListEl.appendChild(item);
        });

        document.querySelectorAll('.refresh-btn').forEach(button => {
            button.addEventListener('click', handleRefreshClick);
        });
    }

    async function handleRefreshClick(event: Event) {
        const button = event.target as HTMLButtonElement;
        const questionIdToReplace = button.dataset.questionId;
        if (!questionIdToReplace || !testData) return;

        button.disabled = true;
        showError('');

        try {
            const currentQuestionIds = testData.questions.map((q: any) => q._id);
            
            const response = await fetch('/api/examinator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
            const questionIndex = testData.questions.findIndex((q: any) => q._id === questionIdToReplace);
            if (questionIndex !== -1) {
                testData.questions[questionIndex] = newQuestion;
                sessionStorage.setItem('createTestData', JSON.stringify(testData));
            }

            renderQuestionList(testData.questions);

        } catch (error) {
            showError((error as Error).message);
        }
    }

    async function handleAssignTest() {
        if (!testData) return;
        showError('');
        showSuccess('');

        const testPayload = {
            name: testNameInput.value,
            description: `Prov för ${testData.studentName}`,
            timeLimitMinutes: 60, // Defaulting to 60 minutes
            subjectId: testData.subjectId,
            questionIds: testData.questions.map(q => q._id),
            assignedStudentIds: [testData.studentId] // Assign directly to the student
        };

        if (!testPayload.name) {
            showError("Provets namn är obligatoriskt.");
            return;
        }

        if (assignTestBtn) assignTestBtn.disabled = true;

        try {
            const response = await fetch('/api/tests-management', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(testPayload)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Ett fel uppstod när provet skulle tilldelas.');
            }

            showSuccess(`Provet har tilldelats till ${testData.studentName}.`);
            sessionStorage.removeItem('createTestData');
            if (assignTestBtn) assignTestBtn.textContent = "Tilldelat!";

            const navigationContainer = document.getElementById('navigation-container');
            if (navigationContainer) {
                navigationContainer.innerHTML = `<a href="/student-details.html?studentId=${testData.studentId}" class="btn btn-secondary">Tillbaka till studentens översikt</a>`;
            }

        } catch (error) {
            showError((error as Error).message);
            if (assignTestBtn) assignTestBtn.disabled = false;
        }
    }

    function showError(message: string) {
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.classList.toggle('d-none', !message);
        }
    }
    
    function showSuccess(message: string) {
        if (successContainer) {
            successContainer.textContent = message;
            successContainer.classList.toggle('d-none', !message);
        }
    }
});
