document.addEventListener('DOMContentLoaded', async () => {
    const studentOverviewBody = document.getElementById('student-overview-body');
    const logoutButton = document.getElementById('logout-button');
    const errorContainer = document.getElementById('error-container');
    const passwordChangeModal = document.getElementById('password-change-modal');
    const passwordChangeForm = document.getElementById('password-change-form') as HTMLFormElement;
    const changePasswordBtn = document.getElementById('change-password-btn') as HTMLButtonElement;
    const manualChangePasswordBtn = document.getElementById('change-password-btn-manual') as HTMLButtonElement;
    const errorMessage = document.getElementById('password-change-error');
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

    // Password change form submission
    if (passwordChangeForm) {
        passwordChangeForm.addEventListener('submit', handlePasswordChange);
    }

    // Manual password change button
    if (manualChangePasswordBtn) {
        manualChangePasswordBtn.addEventListener('click', () => {
            showPasswordChangeModal();
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

        // Check if password change is required
        if (overviewData.forcePasswordChange) {
            showPasswordChangeModal();
        }
        
        renderOverviewTable(overviewData.students);

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

    function showPasswordChangeModal() {
        if (passwordChangeModal) {
            passwordChangeModal.style.display = 'block';
        }
    }

    function hidePasswordChangeModal() {
        if (passwordChangeModal) {
            passwordChangeModal.style.display = 'none';
            // Clear form
            if (passwordChangeForm) {
                passwordChangeForm.reset();
            }
            if (errorMessage) {
                errorMessage.style.display = 'none';
            }
        }
    }

    async function handlePasswordChange(event: Event) {
        event.preventDefault();
        
        if (!changePasswordBtn || !errorMessage) return;

        const currentPassword = (document.getElementById('current-password') as HTMLInputElement).value;
        const newPassword = (document.getElementById('new-password') as HTMLInputElement).value;
        const confirmPassword = (document.getElementById('confirm-password') as HTMLInputElement).value;

        // Validation
        if (newPassword !== confirmPassword) {
            errorMessage.textContent = 'De nya lösenorden matchar inte.';
            errorMessage.style.display = 'block';
            return;
        }

        if (newPassword.length < 6) {
            errorMessage.textContent = 'Lösenordet måste vara minst 6 tecken långt.';
            errorMessage.style.display = 'block';
            return;
        }

        // Disable button and show loading
        changePasswordBtn.disabled = true;
        changePasswordBtn.textContent = 'Ändrar lösenord...';

        try {
            const response = await fetch('/api/examinator/change-password', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            if (response.status === 401) {
                localStorage.removeItem('jwt_token');
                window.location.href = '/index.html';
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Kunde inte ändra lösenord');
            }

            // Success - hide modal and refresh page
            hidePasswordChangeModal();
            window.location.reload();

        } catch (error) {
            console.error('Error changing password:', error);
            const errorText = error instanceof Error ? error.message : 'Ett fel uppstod vid lösenordsändring';
            errorMessage.textContent = errorText;
            errorMessage.style.display = 'block';
        } finally {
            // Re-enable button
            changePasswordBtn.disabled = false;
            changePasswordBtn.textContent = 'Ändra lösenord';
        }
    }
});
