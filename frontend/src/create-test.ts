document.addEventListener('DOMContentLoaded', () => {
    const loadingEl = document.getElementById('loading');
    const containerEl = document.getElementById('create-test-container');
    const testContentEl = document.getElementById('test-content');
    const subjectNameEl = document.getElementById('subject-name');
    const studentNameEl = document.getElementById('student-name');
    const testNameInput = document.getElementById('test-name') as HTMLInputElement;
    const questionListEl = document.getElementById('question-list');
    const assignTestBtn = document.getElementById('assign-test-btn') as HTMLButtonElement;
    const backToStudentBtn = document.getElementById('back-to-student-btn') as HTMLAnchorElement;
    const errorContainer = document.getElementById('error-container');
    const successContainer = document.getElementById('success-container');
    const token = localStorage.getItem('jwt_token');

    let testData: { 
        studentId: string, 
        subjectId: string, 
        subjectName: string, 
        studentName: string, 
        questions: any[],
        subject: any // Hela ämnesobjektet
    } | null = null;

    // --- Initialisering ---
    // Visa container direkt för att undvika problem med header-scriptet
    if (containerEl) containerEl.classList.remove('d-none');
    if (testContentEl) testContentEl.style.display = 'none'; // Göm innehållet tills vi är klara

    try {
        const storedData = sessionStorage.getItem('createTestData');
        if (!storedData) throw new Error("Ingen provdata hittades. Gå tillbaka och försök igen.");
        
        testData = JSON.parse(storedData);

        if (subjectNameEl) subjectNameEl.textContent = testData!.subject.name;
        if (studentNameEl) studentNameEl.textContent = testData!.studentName;
        
        const timeLimitInput = document.getElementById('test-time-limit') as HTMLInputElement;
        if (timeLimitInput) timeLimitInput.value = testData!.subject.defaultTimeLimitMinutes;

        if (testNameInput) {
            const today = new Date().toISOString().split('T')[0];
            testNameInput.value = `Prov i ${testData!.subject.name} för ${testData!.studentName} - ${today}`;
        }

        renderQuestionList(testData!.questions);

        // Sätt rätt länk på tillbaka-knappen
        if (backToStudentBtn) {
            backToStudentBtn.href = `/student-details.html?studentId=${testData!.studentId}`;
        }

        if (loadingEl) loadingEl.style.display = 'none'; // Göm laddaren
        if (testContentEl) testContentEl.style.display = 'block'; // Visa innehållet

    } catch (error) {
        showError((error as Error).message);
        if (loadingEl) loadingEl.style.display = 'none';
    }

    // --- Event Listeners ---
    assignTestBtn?.addEventListener('click', handleAssignTest);

    // --- Funktioner ---
    function renderQuestionList(questions: any[]) {
        if (!questionListEl) return;
        questionListEl.innerHTML = '';

        questions.forEach((q, index) => {
            const item = document.createElement('div');
            // Använder 'list-group-item' för konsekvent utseende
            item.className = 'list-group-item d-flex justify-content-between align-items-center';
            item.id = `question-${q._id}`;
            
            // Ny, renare HTML-struktur
            item.innerHTML = `
                <div class="flex-grow-1 me-3">
                    <span class="fw-bold me-2">${index + 1}.</span>
                    ${q.questionText}
                </div>
                <button class="btn btn-sm btn-outline-primary refresh-btn" data-question-id="${q._id}" title="Byt ut fråga">
                    <i class="bi bi-arrow-repeat"></i>
                </button>
            `;
            questionListEl.appendChild(item);
        });

        document.querySelectorAll('.refresh-btn').forEach(button => {
            button.addEventListener('click', handleRefreshClick);
        });
    }

    async function handleRefreshClick(event: Event) {
        // Använd currentTarget för att säkerställa att vi alltid får knappen,
        // även om användaren klickar på ikonen inuti den.
        const button = event.currentTarget as HTMLButtonElement;
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
            // Återaktivera knappen även om det blir fel, så användaren kan försöka igen.
            button.disabled = false;
        }
    }

    async function handleAssignTest() {
        if (!testData) return;
        showError('');
        showSuccess('');

        const timeLimitInput = document.getElementById('test-time-limit') as HTMLInputElement;

        const testPayload = {
            name: testNameInput.value,
            description: `Prov för ${testData.studentName}`,
            timeLimitMinutes: parseInt(timeLimitInput.value, 10),
            subjectId: testData.subjectId,
            questionIds: testData.questions.map(q => q._id),
            assignedStudentIds: [testData.studentId] // Assign directly to the student
        };

        if (!testPayload.name || !testPayload.timeLimitMinutes) {
            showError("Provets namn och tidsgräns är obligatoriska.");
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
