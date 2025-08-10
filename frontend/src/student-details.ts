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
                let actionCell = '<td>-</td>';
                if (subject.status !== 'passed') {
                    actionCell = `<td><button class="btn btn-success btn-sm create-test-btn" data-subject-id="${subject.subjectId}" data-subject-name="${subject.subjectName}" data-student-name="${data.student.username}">Skapa Prov</button></td>`;
                }
                row.innerHTML = `
                    <td>${subject.subjectName}</td>
                    <td><span class="status status-${subject.status}">${subject.status.replace('_', ' ')}</span></td>
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
                ...testData,
                studentId,
                subjectId,
                subjectName,
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
