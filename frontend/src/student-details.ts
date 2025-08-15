document.addEventListener('DOMContentLoaded', async () => {
    const studentNameHeader = document.getElementById('student-name-header');
    const detailsBody = document.getElementById('student-details-body');
    const errorContainer = document.getElementById('error-container');
    const token = localStorage.getItem('jwt_token');

    const urlParams = new URLSearchParams(window.location.search);
    const studentId = urlParams.get('studentId');

    if (!token || !studentId) {
        showError("Token eller student-ID saknas.");
        return;
    }

    try {
        const response = await fetch(`/api/examinator/${studentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Kunde inte hämta studentdata.');
        const data = await response.json();
        renderDetails(data);
    } catch (error) {
        console.error('Error fetching student details:', error);
        showError('Ett fel uppstod vid hämtning av data.');
    }

    function renderDetails(data: any) {
        if (studentNameHeader) {
            studentNameHeader.textContent = `Detaljer för ${data.student.username}`;
        }
        if (detailsBody) {
            detailsBody.innerHTML = '';
            data.details.forEach((subject: any) => {
                const row = document.createElement('tr');
                let actionCell = '<td>-</td>'; // Default för godkända ämnen

                if (subject.status === 'assigned') {
                    actionCell = `<td><button class="btn btn-outline-secondary btn-sm" disabled>Prov Tilldelat</button></td>`;
                } else if (subject.status !== 'passed') {
                    actionCell = `<td><button class="btn btn-success btn-sm create-test-btn" data-subject-id="${subject.subjectId}" data-subject-name="${subject.subjectName}" data-student-name="${data.student.username}">Skapa Prov</button></td>`;
                }
                console.log('Status: ' +  subject.status)
                const statusText = 
                    subject.status === 'locked' ? 'Låst' :
                    subject.status === 'passed' ? 'Godkänd' :
                    subject.status === 'assigned' ? 'Tilldelat' :
                    subject.status === 'not_started' ? 'Inte Startat' :
                    subject.status === 'in_progress' ? 'Pågående' : subject.status;
                row.innerHTML = `
                    <td>${subject.subjectName}</td>
                    <td><span class="status status-${subject.status}">${statusText}</span></td>
                    <td>${subject.attemptsCount}</td>
                    <td>${subject.bestScore || 'N/A'}</td>
                    ${actionCell}
                `;
                detailsBody.appendChild(row);
            });
            // Add event listeners to all new buttons
            document.querySelectorAll('.create-test-btn').forEach(button => {
                button.addEventListener('click', handleCreateTestClick);
            });
        }
        renderAttemptsList(data.attempts, data.details);
    }

    function renderAttemptsList(attempts: any[], subjects: any[]) {
        const attemptsList = document.getElementById('attempts-list');
        if (!attemptsList) return;

        attemptsList.innerHTML = ''; // Rensa listan

        if (attempts.length === 0) {
            attemptsList.innerHTML = '<p>Studenten har inte genomfört några prov än.</p>';
            return;
        }
        
        // Sortera efter inlämningsdatum, nyast först
        attempts.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

        attempts.forEach(attempt => {
            const subject = subjects.find(s => s.subjectId === attempt.subjectId);
            const subjectName = subject ? subject.subjectName : 'Okänt ämne';
            const submittedDate = new Date(attempt.submittedAt).toLocaleString('sv-SE');
            const passedText = attempt.passed ? 'Godkänt' : 'Underkänt';
            const passedClass = attempt.passed ? 'text-success' : 'text-danger';

            const listItem = document.createElement('a');
            listItem.href = `/result.html?attemptId=${attempt._id}&from=student-details&studentId=${studentId}`;
            listItem.className = 'list-group-item list-group-item-action flex-column align-items-start';
            
            listItem.innerHTML = `
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">${subjectName}</h5>
                    <small>${submittedDate}</small>
                </div>
                <p class="mb-1">Resultat: ${attempt.score}/20 - <strong class="${passedClass}">${passedText}</strong></p>
                <small>Inlämningstyp: ${attempt.submissionType || 'manual'}</small>
            `;
            attemptsList.appendChild(listItem);
        });
    }

    async function handleCreateTestClick(event: Event) {
        const button = event.target as HTMLButtonElement;
        const subjectId = button.dataset.subjectId;
        const subjectName = button.dataset.subjectName;
        const studentName = button.dataset.studentName;

        try {
            const response = await fetch('/api/examinator', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action: 'create-test-session', studentId, subjectId })
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Kunde inte starta provskapande.');
            }
            const testData = await response.json();
            
            // Spara data i sessionStorage för att hämta på nästa sida
            sessionStorage.setItem('createTestData', JSON.stringify({
                questions: testData.questions,
                subject: testData.subject, // Skicka med hela objektet
                studentId,
                subjectId,
                studentName
            }));

            window.location.href = '/create-test.html';

        } catch (error) {
            console.error('Error creating test session:', error);
            showError((error as Error).message);
        }
    }

    function showError(message: string) {
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.classList.remove('d-none');
        }
    }
});
