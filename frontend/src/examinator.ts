document.addEventListener('DOMContentLoaded', async () => {
    const studentOverviewBody = document.getElementById('student-overview-body');
    const logoutButton = document.getElementById('logout-button');
    const errorContainer = document.getElementById('error-container');
    const token = localStorage.getItem('jwt_token');

    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('jwt_token');
            window.location.href = '/index.html';
        });
    }

    try {
        const response = await fetch('/api/examinator', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 403) {
            showError("Åtkomst nekad. Du måste vara examinator.");
            return;
        }
        if (!response.ok) {
            throw new Error('Nätverksfel vid hämtning av översikt.');
        }

        const overviewData = await response.json();
        renderOverviewTable(overviewData);

    } catch (error) {
        console.error('Error fetching overview:', error);
        showError('Kunde inte ladda översikten.');
    }

    function renderOverviewTable(overviewData: any[]) {
        if (!studentOverviewBody) return;

        if (overviewData.length === 0) {
            studentOverviewBody.innerHTML = '<tr><td colspan="3">Inga studenter hittades.</td></tr>';
            return;
        }

        overviewData.forEach(student => {
            const row = document.createElement('tr');
            const progressText = `${student.passedSubjects} / ${student.totalSubjects} godkända`;
            
            row.innerHTML = `
                <td>${student.username}</td>
                <td>${progressText}</td>
                <td>
                    <a href="/student-details.html?studentId=${student.studentId}" class="btn btn-primary btn-sm">Visa Detaljer</a>
                </td>
            `;
            studentOverviewBody.appendChild(row);
        });
    }

    function showError(message: string) {
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.classList.remove('d-none');
        }
    }
});
