import { renderHeader } from './header';
import { showSelectImageModal } from "./main";

// Represents a generic user in the system
interface User {
    userId: string;
    username: string;
    email?: string;
    authMethod: 'local' | 'google';
    status: 'active' | 'archived';
    createdAt: string;
    forcePasswordChange: boolean;
}

// Response from creating a new user
interface CreateUserResponse {
    userId: string;
    username: string;
    email?: string;
    authMethod: 'local' | 'google';
    tempPassword: string;
}

// Manages a specific user type (e.g., Examiners, Students)
class UserManagement {
    private userType: 'Examiner' | 'Student';
    private apiEndpoint: string;
    private tableBody: HTMLElement;
    private loadingSpinner: HTMLElement;
    private errorContainer: HTMLElement;
    private successContainer: HTMLElement;
    private createButton: HTMLElement;
    private filterButtons: NodeListOf<HTMLInputElement>;

    private currentFilter: string = 'all';
    private users: User[] = [];
    private modals: any = {};

    constructor(userType: 'Examiner' | 'Student', apiEndpoint: string) {
        this.userType = userType;
        this.apiEndpoint = apiEndpoint;

        const lowerCaseType = userType.toLowerCase();
        
        this.tableBody = document.getElementById(`${lowerCaseType}s-table-body`)!;
        this.loadingSpinner = document.getElementById(`${lowerCaseType}-loading-spinner`)!;
        this.errorContainer = document.getElementById(`${lowerCaseType}-error-container`)!;
        this.successContainer = document.getElementById(`${lowerCaseType}-success-container`)!;
        this.createButton = document.getElementById(`create-${lowerCaseType}-btn`)!;
        this.filterButtons = document.querySelectorAll(`input[name="${lowerCaseType}StatusFilter"]`);

        if (!this.tableBody || !this.loadingSpinner || !this.errorContainer || !this.createButton) {
            console.error(`Initialization failed for ${userType}. Missing one or more required DOM elements.`);
            return;
        }

        this.initializeModals();
        this.bindEvents();
        this.loadUsers();
    }

    private initializeModals(): void {
        this.modals.createUser = new (window as any).bootstrap.Modal(document.getElementById(`create${this.userType}Modal`));
        this.modals.success = new (window as any).bootstrap.Modal(document.getElementById('successModal'));
        this.modals.confirmation = new (window as any).bootstrap.Modal(document.getElementById('confirmationModal'));
    }

    private bindEvents(): void {
        this.filterButtons.forEach(button => {
            button.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                this.currentFilter = target.value;
                this.filterUsers();
            });
        });

        this.createButton.addEventListener('click', () => {
            this.showCreateUserModal();
        });
        // Lyssna på klick på hela tabellen
        this.tableBody.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const button = target.closest('.dropdown-item');
            if (button) {
                const action = button.classList.contains('archive-user') ? 'archive' :
                            button.classList.contains('delete-user') ? 'delete' :
                            button.classList.contains('reset-password') ? 'reset-password' : null;
                const userId = (button as HTMLElement).dataset.userId;

                if (action && userId) {
                    const row = button.closest('tr');
                    const username = row?.querySelector('td:first-child')?.textContent || '';
                    this.handleAction(action, userId, username);
                }
            }
        });

        const createSubmit = document.getElementById(`create-${this.userType.toLowerCase()}-submit`);
        if (createSubmit) {
            createSubmit.addEventListener('click', () => {
                this.createUser();
            });
        }
        // Lägg till event listener för authMethod-toggle
        const authSelect = document.getElementById('authMethod') as HTMLSelectElement;
        if (authSelect) {
            authSelect.addEventListener('change', (e) => {
                const value = (e.target as HTMLSelectElement).value;
                document.getElementById('localFields')?.classList.toggle('d-none', value !== 'local');
                document.getElementById('googleFields')?.classList.toggle('d-none', value !== 'google');
            });
        }
    }

    private async loadUsers(): Promise<void> {
        this.showLoading(true);
        this.hideMessages();

        try {
            const token = localStorage.getItem('jwt_token');
            if (!token) {
                window.location.href = '/index.html';
                return;
            }

            console.log(`Loading ${this.userType}s from ${this.apiEndpoint}...`);
            const response = await fetch(this.apiEndpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 403) {
                this.showError("Åtkomst nekad. Du måste vara administratör.");
                return;
            }
            if (response.status === 401) {
                this.showError("Din session har gått ut. Logga in igen.");
                localStorage.removeItem('jwt_token');
                setTimeout(() => window.location.href = '/index.html', 2000);
                return;
            }
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

            this.users = await response.json();
            console.log(`${this.userType}s loaded:`, this.users);
            this.renderTable();
            this.filterUsers();

        } catch (error) {
            console.error(`Error loading ${this.userType}s:`, error);
            this.showError(error instanceof Error ? error.message : `Kunde inte ladda ${this.userType.toLowerCase()}er.`);
        } finally {
            this.showLoading(false);
        }
    }

    private renderTable(): void {
        this.tableBody.innerHTML = '';
        if (this.users.length === 0) {
            this.tableBody.innerHTML = `<tr><td colspan="7" class="text-center">Inga ${this.userType.toLowerCase()}er hittades.</td></tr>`;
            return;
        }
        this.users.forEach(user => this.tableBody.appendChild(this.createRow(user)));
    }

    private createRow(user: User): HTMLTableRowElement {
        const row = document.createElement('tr');
        const statusClass = user.status === 'active' ? 'success' : 'secondary';
        const statusText = user.status === 'active' ? 'Aktiv' : 'Arkiverad';
        const passwordStatus = user.forcePasswordChange ? 'Nej' : 'Ja';
        const passwordClass = user.forcePasswordChange ? 'warning' : 'success';
        const createdAt = new Date(user.createdAt).toLocaleDateString('sv-SE');
    
        row.innerHTML = `
            <td>${user.username}</td>
            <td><span class="badge bg-${statusClass}">${statusText}</span></td>
            <td>${createdAt}</td>
            <td><span class="badge bg-${passwordClass}">${passwordStatus}</span></td>
            <td>${user.email || 'N/A'}</td>
            <td>${user.authMethod}</td>
            <td>${this.createActionMenu(user)}</td>
        `;
        return row;
    }

    // Lägg till createActionMenu (saknas i din kod – lägg till hela metoden efter createRow)
    private createActionMenu(user: User): string {
        const archiveOption = `<li><a class="dropdown-item text-warning archive-user" href="#" data-user-id="${user.userId}"><i class="bi bi-archive me-2"></i> Arkivera</a></li>`;
        const reactivateOption = `<li><a class="dropdown-item text-success archive-user" href="#" data-user-id="${user.userId}"><i class="bi bi-arrow-clockwise me-2"></i> Återaktivera</a></li>`;
        const resetPasswordOption = user.authMethod === 'local' ? `<li><a class="dropdown-item reset-password" href="#" data-user-id="${user.userId}"><i class="bi bi-key me-2"></i> Återställ lösenord</a></li>` : '';
        const deleteOption = `<li><a class="dropdown-item text-danger delete-user" href="#" data-user-id="${user.userId}"><i class="bi bi-trash me-2"></i> Ta bort permanent</a></li>`;

        let options = (user.status === 'active' ? archiveOption : reactivateOption) + resetPasswordOption + '<li><hr class="dropdown-divider"></li>' + deleteOption;

        return `
            <div class="dropdown">
                <button class="btn btn-sm dropdown-toggle neutral-dropdown" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="bi bi-three-dots-vertical"></i>
                </button>
                <ul class="dropdown-menu">${options}</ul>
            </div>`;
    }

    private filterUsers(): void {
        this.tableBody.querySelectorAll('tr').forEach(row => {
            const statusText = row.querySelector('td:nth-child(2)')?.textContent?.trim();
            let shouldShow = this.currentFilter === 'all' ||
                             (this.currentFilter === 'active' && statusText === 'Aktiv') ||
                             (this.currentFilter === 'archived' && statusText === 'Arkiverad');
            (row as HTMLElement).style.display = shouldShow ? '' : 'none';
        });
    }

    private showCreateUserModal(): void {
        const form = document.getElementById(`create-${this.userType.toLowerCase()}-form`) as HTMLFormElement;
        if (form) form.reset();
        this.modals.createUser.show();
    }

    private async createUser(): Promise<void> {
        const authMethod = (document.getElementById('authMethod') as HTMLSelectElement).value as 'local' | 'google';
        let username = '';
        let email = '';
        if (authMethod === 'local') {
           username = (document.getElementById(`new-${this.userType.toLowerCase()}-username`) as HTMLInputElement).value.trim();
           if (!username) {
               alert('Användarnamn krävs för local autentisering.');
               return;
           }
       } else {
           email = (document.getElementById(`new-${this.userType.toLowerCase()}-email`) as HTMLInputElement).value.trim();
           if (!email) {
               alert('Email krävs för Google autentisering.');
               return;
            }
        }

        const submitBtn = document.getElementById(`create-${this.userType.toLowerCase()}-submit`) as HTMLButtonElement;
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Skapar...';

        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, authMethod, email })
            });

            if (response.status === 409) throw new Error('Användarnamnet finns redan.');
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

            const data: CreateUserResponse = await response.json();
            this.modals.createUser.hide();

            let successText;
            if (authMethod === 'local' && data.tempPassword) {
                // Använd showSuccessModal för lokala användare för att visa temporärt lösenord
                this.showSuccessModal('Ny användare skapad', `Användare: ${data.username}<br>Temporärt lösenord: <strong>${data.tempPassword}</strong>`);
            } else {
                // Använd showSuccess för Google-användare
                this.showSuccess(`Ny Google-${this.userType.toLowerCase()} skapad: ${data.email || data.username}`);
            }

            this.loadUsers();

        } catch (error) {
            this.showError(error instanceof Error ? error.message : `Kunde inte skapa ${this.userType.toLowerCase()}.`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    private handleAction(action: string, userId: string, username: string): void {
        const actions: { [key: string]: { message: string, func: () => void } } = {
            'archive': { message: `Är du säker på att du vill arkivera ${this.userType.toLowerCase()}en "${username}"?`, func: () => this.performAction('PUT', `${this.apiEndpoint}/${userId}/archive`, 'arkiverats') },
            'reactivate': { message: `Är du säker på att du vill återaktivera ${this.userType.toLowerCase()}en "${username}"?`, func: () => this.performAction('PUT', `${this.apiEndpoint}/${userId}/reactivate`, 'återaktiverats') },
            'reset-password': { message: `Är du säker på att du vill återställa lösenordet för "${username}"?`, func: () => this.resetPassword(userId) },
            'delete': { message: `Är du helt säker på att du vill permanent ta bort "${username}"? All data raderas.`, func: () => this.performAction('DELETE', `${this.apiEndpoint}/${userId}`, 'tagits bort permanent') }
        };

        const selectedAction = actions[action];
        if (!selectedAction) return;

        (document.getElementById('confirmation-message')!).textContent = selectedAction.message;
        (document.getElementById('confirm-action-btn')!).onclick = selectedAction.func;
        this.modals.confirmation.show();
        setTimeout(() => {
            (document.getElementById('confirm-action-btn') as HTMLButtonElement)?.focus();
        }, 200);
    }

    private async performAction(method: 'PUT' | 'DELETE', url: string, successVerb: string): Promise<void> {
        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(url, { method, headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            
            this.modals.confirmation.hide();
            this.showSuccess(`${this.userType}en har ${successVerb}.`);
            this.loadUsers();
        } catch (error) {
            this.modals.confirmation.hide();
            this.showError(error instanceof Error ? error.message : `Kunde inte utföra åtgärden.`);
        }
    }

    private async resetPassword(userId: string): Promise<void> {
        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(`${this.apiEndpoint}/${userId}/reset-password`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            
            const result = await response.json();
            this.modals.confirmation.hide();
            this.showSuccessModal('Lösenord återställt!', `<strong>Nytt temporärt lösenord:</strong> <code>${result.tempPassword}</code>`);
            this.loadUsers();
        } catch (error) {
            this.modals.confirmation.hide();
            this.showError(error instanceof Error ? error.message : 'Kunde inte återställa lösenordet.');
        }
    }

    private showLoading(show: boolean): void {
        this.loadingSpinner.classList.toggle('d-none', !show);
    }

    private showError(message: string): void {
        this.errorContainer.textContent = message;
        this.errorContainer.classList.remove('d-none');
    }

    private showSuccess(message: string): void {
        this.successContainer.textContent = message;
        this.successContainer.classList.remove('d-none');
        setTimeout(() => this.successContainer.classList.add('d-none'), 5000);
    }

    private hideMessages(): void {
        this.errorContainer.classList.add('d-none');
        this.successContainer.classList.add('d-none');
    }

    private showSuccessModal(title: string, message: string): void {
        // Göm eventuella andra öppna modals först för att undvika konflikter
        this.modals.confirmation.hide();
        
        (document.getElementById('successModalLabel')!).textContent = title;
        (document.getElementById('success-message')!).innerHTML = message;
        this.modals.success.show();
    }
}

class SubjectManagement {
    private apiEndpoint = '/api/admin-subjects';
    private listContainer: HTMLElement;
    private loadingSpinner: HTMLElement;
    private errorContainer: HTMLElement;
    private successContainer: HTMLElement;
    private createButton: HTMLElement;
    private modals: any = {};
    private subjects: any[] = []; // Cache for subjects
    private questionManagement: QuestionManagement;

    constructor(questionManagement: QuestionManagement) {
        this.questionManagement = questionManagement;
        this.listContainer = document.getElementById('subjects-list')!;
        this.loadingSpinner = document.getElementById('subject-loading-spinner')!;
        this.errorContainer = document.getElementById('subject-error-container')!;
        this.successContainer = document.getElementById('subject-success-container')!;
        this.createButton = document.getElementById('create-subject-btn')!;

        if (!this.listContainer || !this.loadingSpinner || !this.errorContainer || !this.createButton) {
            console.error("Initialization failed for SubjectManagement. Missing one or more required DOM elements.");
            return;
        }

        this.initializeModals();
        this.bindEvents();
        this.loadSubjects(); // Restore the call to load subjects
    }

    private initializeModals(): void {
        this.modals.subject = new (window as any).bootstrap.Modal(document.getElementById('subjectModal'));
        this.modals.confirmation = new (window as any).bootstrap.Modal(document.getElementById('confirmationModal'));
    }

    private bindEvents(): void {
        this.createButton.addEventListener('click', () => this.showSubjectModal());
        document.getElementById('save-subject-btn')?.addEventListener('click', () => this.saveSubject());
    }

    public async loadSubjects(): Promise<void> {
        this.showLoading(true);
        this.hideMessages();

        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(this.apiEndpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            
            this.subjects = await response.json();
            this.renderList(this.subjects);

        } catch (error) {
            this.showError(error instanceof Error ? error.message : 'Kunde inte ladda ämnen.');
        } finally {
            this.showLoading(false);
        }
    }

    private renderList(subjects: any[]): void {
        this.listContainer.innerHTML = '';
        if (subjects.length === 0) {
            this.listContainer.innerHTML = '<p class="text-center">Inga ämnen hittades.</p>';
            return;
        }

        subjects.forEach(subject => {
            const item = document.createElement('div');
            item.className = 'list-group-item d-flex justify-content-between align-items-center';
            item.innerHTML = `
                <div>
                    <h5 class="mb-1">${subject.name} (${subject.code})</h5>
                    <p class="mb-1">${subject.description || 'Ingen beskrivning.'}</p>
                    <small>Tidsgräns: ${subject.defaultTimeLimitMinutes} minuter</small>
                </div>
                <div>
                    <button class="btn btn-sm btn-outline-secondary me-2" data-action="edit" data-subject-id="${subject._id}">
                        <i class="bi bi-pencil"></i> Redigera
                    </button>
                    <button class="btn btn-sm btn-outline-danger" data-action="delete" data-subject-id="${subject._id}" data-subject-name="${subject.name}">
                        <i class="bi bi-trash"></i> Ta bort
                    </button>
                </div>
            `;
            this.listContainer.appendChild(item);
        });

        this.listContainer.querySelectorAll('button[data-action]').forEach(button => {
            button.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const action = target.dataset.action;
                const subjectId = target.dataset.subjectId!;
                if (action === 'edit') {
                    this.showSubjectModal(subjectId);
                } else if (action === 'delete') {
                    const subjectName = target.dataset.subjectName!;
                    this.handleDelete(subjectId, subjectName);
                }
            });
        });
    }

    private showSubjectModal(subjectId?: string): void {
        const form = document.getElementById('subject-form') as HTMLFormElement;
        const modalLabel = document.getElementById('subjectModalLabel')!;
        const saveButton = document.getElementById('save-subject-btn')!;
        const subjectIdInput = document.getElementById('subject-id') as HTMLInputElement;

        form.reset();
        subjectIdInput.value = subjectId || '';

        if (subjectId) {
            const subject = this.subjects.find(s => s._id === subjectId);
            if (!subject) {
                this.showError("Kunde inte hitta ämnet att redigera.");
                return;
            }
            modalLabel.textContent = 'Redigera Ämne';
            saveButton.textContent = 'Spara ändringar';
            (document.getElementById('subject-name') as HTMLInputElement).value = subject.name;
            (document.getElementById('subject-code') as HTMLInputElement).value = subject.code;
            (document.getElementById('subject-description') as HTMLTextAreaElement).value = subject.description;
            (document.getElementById('subject-time-limit') as HTMLInputElement).value = subject.defaultTimeLimitMinutes;
        } else {
            modalLabel.textContent = 'Skapa Nytt Ämne';
            saveButton.textContent = 'Skapa Ämne';
        }
        this.modals.subject.show();
    }

    private async saveSubject(): Promise<void> {
        const subjectId = (document.getElementById('subject-id') as HTMLInputElement).value;
        const form = document.getElementById('subject-form') as HTMLFormElement;
        const name = (form.querySelector('#subject-name') as HTMLInputElement).value;
        const code = (form.querySelector('#subject-code') as HTMLInputElement).value;
        const description = (form.querySelector('#subject-description') as HTMLTextAreaElement).value;
        const defaultTimeLimitMinutes = (form.querySelector('#subject-time-limit') as HTMLInputElement).value;

        if (!name || !code || !defaultTimeLimitMinutes) {
            this.showError("Namn, kod och tidsgräns är obligatoriska.");
            return;
        }

        const isEditing = !!subjectId;
        const url = isEditing ? `${this.apiEndpoint}/${subjectId}` : this.apiEndpoint;
        const method = isEditing ? 'PUT' : 'POST';

        const submitBtn = document.getElementById('save-subject-btn') as HTMLButtonElement;
        submitBtn.disabled = true;

        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(url, {
                method,
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, code, description, defaultTimeLimitMinutes })
            });

            if (response.status === 409) throw new Error('En ämneskod måste vara unik.');
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

            this.modals.subject.hide();
            this.showSuccess(`Ämnet har ${isEditing ? 'uppdaterats' : 'skapats'}.`);
            await this.loadSubjects(); // Reload subjects to get fresh data
            this.questionManagement.loadSubjects();

        } catch (error) {
            this.showError(error instanceof Error ? error.message : 'Kunde inte spara ämnet.');
        } finally {
            submitBtn.disabled = false;
        }
    }

    private handleDelete(subjectId: string, subjectName: string): void {
        const message = `Är du helt säker på att du vill ta bort ämnet "${subjectName}"? Alla frågor som är kopplade till detta ämne kommer också att raderas permanent. Denna åtgärd kan inte ångras.`;
        
        (document.getElementById('confirmation-message')!).textContent = message;
        (document.getElementById('confirm-action-btn')!).onclick = () => this.performDelete(subjectId);
        this.modals.confirmation.show();
    }

    private async performDelete(subjectId: string): Promise<void> {
        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(`${this.apiEndpoint}/${subjectId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            
            const result = await response.json();
            this.modals.confirmation.hide();
            this.showSuccess(`Ämnet och ${result.deletedQuestionsCount} tillhörande frågor har tagits bort.`);
            await this.loadSubjects();
            this.questionManagement.loadSubjects();
            this.questionManagement.clearQuestions();
        } catch (error) {
            this.modals.confirmation.hide();
            this.showError(error instanceof Error ? error.message : 'Kunde inte ta bort ämnet.');
        }
    }

    private showLoading(show: boolean): void { this.loadingSpinner.classList.toggle('d-none', !show); }
    private showError(message: string): void { this.errorContainer.textContent = message; this.errorContainer.classList.remove('d-none'); }
    private showSuccess(message: string): void { this.successContainer.textContent = message; this.successContainer.classList.remove('d-none'); setTimeout(() => this.hideMessages(), 5000); }
    private hideMessages(): void { this.errorContainer.classList.add('d-none'); this.successContainer.classList.add('d-none'); }
}

class QuestionManagement {
    private questionsApi = '/api/admin-questions';
    private subjectsApi = '/api/admin-subjects';
    private imagesApi = '/api/images';
    private subjectSelect: HTMLSelectElement;
    private filterInput: HTMLInputElement;
    private createButton: HTMLButtonElement;
    private listContainer: HTMLElement;
    private loadingSpinner: HTMLElement;
    private errorContainer: HTMLElement;
    private successContainer: HTMLElement;
    private modals: any = {};
    private questions: any[] = [];
    private availableImages: any[] = []; // Cache for available images
    private currentSubjectId: string | null = null;
    private currentStatusFilter: 'all' | 'active' | 'inactive' = 'all';
    private currentSelectedImage: { id: string, thumbnailLink: string } | null = null;

    constructor() {
        this.subjectSelect = document.getElementById('subject-select') as HTMLSelectElement;
        this.filterInput = document.getElementById('question-filter') as HTMLInputElement;
        this.createButton = document.getElementById('create-question-btn') as HTMLButtonElement;
        this.listContainer = document.getElementById('questions-list')!;
        this.loadingSpinner = document.getElementById('question-loading-spinner')!;
        this.errorContainer = document.getElementById('question-error-container')!;
        this.successContainer = document.getElementById('question-success-container')!;

        this.initializeModals();
        this.bindEvents();
        this.loadInitialData();
    }

    private initializeModals(): void {
        this.modals.editQuestion = new (window as any).bootstrap.Modal(document.getElementById('editQuestionModal'));
        this.modals.confirmation = new (window as any).bootstrap.Modal(document.getElementById('confirmationModal'));
        this.modals.imageSelect = new (window as any).bootstrap.Modal(document.getElementById('imageSelectModal'));
    }

    private bindEvents(): void {
        this.subjectSelect.addEventListener('change', () => {
            this.currentSubjectId = this.subjectSelect.value;
            this.filterInput.disabled = false;
            this.createButton.disabled = false;
            this.loadQuestions();
        });

        this.filterInput.addEventListener('input', () => this.renderQuestions());
        this.createButton.addEventListener('click', () => this.showEditModal());
        document.getElementById('save-question-btn')?.addEventListener('click', () => this.saveQuestion());

        document.querySelectorAll('input[name="questionStatusFilter"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.currentStatusFilter = (e.target as HTMLInputElement).value as 'all' | 'active' | 'inactive';
                this.renderQuestions();
            });
        });

        document.getElementById('select-image-btn')?.addEventListener('click', () => this.openImageSelector());
        document.getElementById('remove-image-btn')?.addEventListener('click', () => this.removeImage());
        document.getElementById('confirm-image-select-btn')?.addEventListener('click', () => this.confirmImageSelection());
    }

    private async loadInitialData(): Promise<void> {
        await this.loadSubjects();
        await this.loadAvailableImages(); // Load images at startup
    }

    private async loadAvailableImages(): Promise<void> {
        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(this.imagesApi, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Could not load images');
            this.availableImages = await response.json();
        } catch (error) {
            console.error("Failed to load available images:", error);
            // Non-critical error, the user can still select images, but previews on edit won't work.
        }
    }

    public async loadSubjects(): Promise<void> {
        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(this.subjectsApi, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Could not load subjects');
            const subjects = await response.json();

            this.subjectSelect.innerHTML = '<option selected disabled value="">Välj ett ämne...</option>';
            subjects.forEach((s: any) => {
                const option = document.createElement('option');
                option.value = s._id;
                option.textContent = s.name;
                this.subjectSelect.appendChild(option);
            });
        } catch (error) {
            this.subjectSelect.innerHTML = '<option selected disabled>Kunde inte ladda ämnen</option>';
            this.showError(error instanceof Error ? error.message : 'Okänt fel');
        }
    }

    public async loadQuestions(): Promise<void> {
        if (!this.currentSubjectId) return;
        this.showLoading(true);
        this.hideMessages();
        this.listContainer.innerHTML = '';

        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(`${this.questionsApi}?subjectId=${this.currentSubjectId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            this.questions = await response.json();
            this.renderQuestions();
        } catch (error) {
            this.showError(error instanceof Error ? error.message : 'Kunde inte ladda frågor.');
        } finally {
            this.showLoading(false);
        }
    }

    private renderQuestions(): void {
        this.listContainer.innerHTML = '';
        const filterText = this.filterInput.value.toLowerCase();

        const filteredQuestions = this.questions.filter(q => {
            const textMatch = q.questionText.toLowerCase().includes(filterText);
            const isActive = q.active !== false;
            const statusMatch = this.currentStatusFilter === 'all' ||
                                (this.currentStatusFilter === 'active' && isActive) ||
                                (this.currentStatusFilter === 'inactive' && !isActive);
            return textMatch && statusMatch;
        });

        if (filteredQuestions.length === 0) {
            this.listContainer.innerHTML = '<p class="text-center mt-3">Inga frågor matchade filtret.</p>';
            return;
        }

        filteredQuestions.forEach(q => {
            const card = document.createElement('div');
            card.className = 'card mb-2';
            const isActive = q.active !== false;

            const image = this.availableImages.find(img => img.id === q.imageId);
            const imageElement = image 
                ? `<img src="${image.thumbnailLink}" alt="Frågebild" style="width: 60px; height: 60px; object-fit: cover; border-radius: 5px;">`
                : (q.imageId ? `<div style="width: 60px; height: 60px;" class="d-flex align-items-center justify-content-center"><i class="bi bi-image-alt text-muted" style="font-size: 24px;"></i></div>` : '<div style="width: 60px;"></div>'); // Empty div for alignment

            card.innerHTML = `
                <div class="card-body d-flex align-items-center">
                    <div class="flex-grow-1">
                        <p class="card-text mb-1">${q.questionText}</p>
                        <span class="badge bg-${isActive ? 'success' : 'secondary'}">${isActive ? 'Aktiv' : 'Inaktiv'}</span>
                    </div>
                    <div class="mx-3">
                        ${imageElement}
                    </div>
                    <div class="d-flex flex-shrink-0">
                        <button class="btn btn-sm btn-outline-secondary me-2" data-action="edit" data-question-id="${q._id}"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-outline-${isActive ? 'warning' : 'success'} me-2" data-action="toggle" data-question-id="${q._id}" data-active="${isActive}">
                            ${isActive ? '<i class="bi bi-toggle-off"></i>' : '<i class="bi bi-toggle-on"></i>'}
                        </button>
                        <button class="btn btn-sm btn-outline-danger" data-action="delete" data-question-id="${q._id}"><i class="bi bi-trash"></i></button>
                    </div>
                </div>
            `;
            this.listContainer.appendChild(card);
        });

        this.listContainer.querySelectorAll('button[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLButtonElement;
                const action = target.dataset.action;
                const id = target.dataset.questionId!;
                if (action === 'edit') this.showEditModal(id);
                if (action === 'toggle') this.toggleQuestionStatus(id, target.dataset.active === 'true');
                if (action === 'delete') this.handleDeleteQuestion(id);
            });
        });
    }

    public clearQuestions(): void {
        this.listContainer.innerHTML = '<p class="text-center text-muted mt-3">Välj ett ämne för att visa frågor.</p>';
        this.questions = [];
        this.subjectSelect.selectedIndex = 0;
        this.currentSubjectId = null;
        this.filterInput.value = '';
        this.filterInput.disabled = true;
        this.createButton.disabled = true;
    }

    private handleDeleteQuestion(questionId: string): void {
        const message = `Är du säker på att du vill ta bort denna fråga permanent? Åtgärden kan inte ångras.`;
        (document.getElementById('confirmation-message')!).textContent = message;
        (document.getElementById('confirm-action-btn')!).onclick = () => this.performDeleteQuestion(questionId);
        this.modals.confirmation.show();
    }

    private async performDeleteQuestion(questionId: string): Promise<void> {
        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(`${this.questionsApi}/${questionId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            this.modals.confirmation.hide();
            this.showSuccess(`Frågan har tagits bort.`);
            this.loadQuestions();
        } catch (error) {
            this.modals.confirmation.hide();
            this.showError(error instanceof Error ? error.message : 'Kunde inte ta bort frågan.');
        }
    }

    private showEditModal(questionId?: string): void {
        const form = document.getElementById('edit-question-form') as HTMLFormElement;
        form.reset();
        this.removeImage();
        (document.getElementById('question-id') as HTMLInputElement).value = questionId || '';
        (document.getElementById('select-image-btn') as HTMLElement).classList.remove('d-none');

        const modalLabel = document.getElementById('editQuestionModalLabel')!;
        if (questionId) {
            modalLabel.textContent = 'Redigera Fråga';
            const question = this.questions.find(q => q._id === questionId);
            if (question) {
                (document.getElementById('question-text') as HTMLTextAreaElement).value = question.questionText;
                for (let i = 0; i < 4; i++) {
                    (document.getElementById(`option-${i}`) as HTMLInputElement).value = question.options[i] || '';
                }
                (form.querySelector(`input[name="correctOption"][value="${question.correctOptionIndex}"]`) as HTMLInputElement).checked = true;
                
                if (question.imageId) {
                    const image = this.availableImages.find(img => img.id === question.imageId);
                    if (image) {
                        (document.getElementById('question-image-id') as HTMLInputElement).value = image.id;
                        const previewContainer = document.getElementById('image-preview-container') as HTMLElement;
                        const previewImg = document.getElementById('question-image-preview') as HTMLImageElement;
                        previewImg.src = image.thumbnailLink;
                        previewContainer.classList.remove('d-none');
                        (document.getElementById('remove-image-btn') as HTMLElement).classList.remove('d-none');
                    } else {
                        // Image ID exists but image not found in cache (e.g., deleted from Drive)
                        this.showError("Bilden som är kopplad till frågan kunde inte hittas. Den kan ha tagits bort.");
                    }
                }
            }
        } else {
            modalLabel.textContent = 'Skapa Ny Fråga';
        }
        this.modals.editQuestion.show();
    }

    private async saveQuestion(): Promise<void> {
        const questionId = (document.getElementById('question-id') as HTMLInputElement).value;
        const imageId = (document.getElementById('question-image-id') as HTMLInputElement).value;
        const questionText = (document.getElementById('question-text') as HTMLTextAreaElement).value;
        const options = [
            (document.getElementById('option-0') as HTMLInputElement).value,
            (document.getElementById('option-1') as HTMLInputElement).value,
            (document.getElementById('option-2') as HTMLInputElement).value,
            (document.getElementById('option-3') as HTMLInputElement).value,
        ];
        const correctOptionIndex = parseInt((document.querySelector('input[name="correctOption"]:checked') as HTMLInputElement)?.value);

        if (!questionText || options.some(o => !o) || isNaN(correctOptionIndex)) {
            this.showError("Alla fält måste fyllas i.");
            return;
        }

        const url = questionId ? `${this.questionsApi}/${questionId}` : this.questionsApi;
        const method = questionId ? 'PUT' : 'POST';
        const bodyPayload: any = {
            subjectId: this.currentSubjectId,
            questionText,
            options,
            correctOptionIndex,
            imageId: imageId || null
        };

        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(url, {
                method,
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            
            this.modals.editQuestion.hide();
            this.showSuccess(`Frågan har ${questionId ? 'uppdaterats' : 'skapats'}.`);
            this.loadQuestions();
        } catch (error) {
            this.showError(error instanceof Error ? error.message : 'Kunde inte spara frågan.');
        }
    }

    private openImageSelector(): void {
        this.modals.imageSelect.show();
        this.renderImageSelector(this.availableImages);
        this.currentSelectedImage = null;
        (document.getElementById('confirm-image-select-btn') as HTMLButtonElement).disabled = true;
    }

    private renderImageSelector(images: any[]): void {
        const grid = document.getElementById('image-select-grid')!;
        const loading = document.getElementById('image-select-loading')!;
        const error = document.getElementById('image-select-error')!;
        
        loading.style.display = 'none'; // Images are pre-loaded
        error.classList.add('d-none');
        grid.innerHTML = '';

        if (images.length === 0) {
            grid.innerHTML = '<p class="text-center col-12">Inga bilder hittades.</p>';
            return;
        }

        images.forEach(image => {
            const col = document.createElement('div');
            col.className = 'col';
            col.innerHTML = `
                <div class="card h-100 image-select-card" data-image-id="${image.id}" data-thumbnail-link="${image.thumbnailLink}">
                    <img src="${image.thumbnailLink}" class="card-img-top" alt="${image.name}">
                    <div class="card-body">
                        <p class="card-text small">${image.name}</p>
                    </div>
                </div>
            `;
            grid.appendChild(col);
        });

        grid.querySelectorAll('.image-select-card').forEach(card => {
            card.addEventListener('click', (e) => this.handleImageSelection(e));
        });
    }

    private handleImageSelection(event: Event): void {
        const card = (event.currentTarget as HTMLElement);
        document.querySelectorAll('.image-select-card.selected').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.currentSelectedImage = {
            id: card.dataset.imageId!,
            thumbnailLink: card.dataset.thumbnailLink!
        };
        (document.getElementById('confirm-image-select-btn') as HTMLButtonElement).disabled = false;
    }

    private confirmImageSelection(): void {
        if (!this.currentSelectedImage) return;

        (document.getElementById('question-image-id') as HTMLInputElement).value = this.currentSelectedImage.id;
        const previewContainer = document.getElementById('image-preview-container') as HTMLElement;
        const previewImg = document.getElementById('question-image-preview') as HTMLImageElement;
        
        previewImg.src = this.currentSelectedImage.thumbnailLink;
        previewContainer.classList.remove('d-none');
        (document.getElementById('remove-image-btn') as HTMLElement).classList.remove('d-none');

        this.modals.imageSelect.hide();
    }

    private removeImage(): void {
        (document.getElementById('question-image-id') as HTMLInputElement).value = '';
        const previewContainer = document.getElementById('image-preview-container') as HTMLElement;
        const previewImg = document.getElementById('question-image-preview') as HTMLImageElement;
        
        previewImg.src = '';
        previewContainer.classList.add('d-none');
        (document.getElementById('remove-image-btn') as HTMLElement).classList.add('d-none');
    }

    private async toggleQuestionStatus(questionId: string, currentStatus: boolean): Promise<void> {
        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(`${this.questionsApi}/${questionId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: !currentStatus })
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            
            this.showSuccess(`Frågans status har ändrats.`);
            this.loadQuestions();
        } catch (error) {
            this.showError(error instanceof Error ? error.message : 'Kunde inte ändra status.');
        }
    }

    private showLoading(show: boolean): void { this.loadingSpinner.classList.toggle('d-none', !show); }
    private showError(message: string): void { this.errorContainer.textContent = message; this.errorContainer.classList.remove('d-none'); setTimeout(() => this.hideMessages(), 5000); }
    private showSuccess(message: string): void { this.successContainer.textContent = message; this.successContainer.classList.remove('d-none'); setTimeout(() => this.hideMessages(), 5000); }
    private hideMessages(): void { this.errorContainer.classList.add('d-none'); this.successContainer.classList.add('d-none'); }
}

class ImageManagement {
    private imagesApi = '/api/images';
    private adminImagesApi = '/api/admin-images';
    private fileInput: HTMLInputElement;
    private uploadButton: HTMLButtonElement;
    private uploadSpinner: HTMLElement;
    private galleryGrid: HTMLElement;
    private loadingSpinner: HTMLElement;
    private errorContainer: HTMLElement;
    private successContainer: HTMLElement;
    private confirmationModal: any;

    private fileToUpload: { content: string, name: string, type: string } | null = null;

    constructor() {
        this.fileInput = document.getElementById('image-file-input') as HTMLInputElement;
        this.uploadButton = document.getElementById('upload-image-btn') as HTMLButtonElement;
        this.uploadSpinner = document.getElementById('upload-spinner') as HTMLElement;
        this.galleryGrid = document.getElementById('image-gallery-grid') as HTMLElement;
        this.loadingSpinner = document.getElementById('image-gallery-loading') as HTMLElement;
        this.errorContainer = document.getElementById('image-gallery-error') as HTMLElement;
        this.successContainer = document.getElementById('image-gallery-success') as HTMLElement;
        this.confirmationModal = new (window as any).bootstrap.Modal(document.getElementById('confirmationModal'));

        this.bindEvents();
        this.loadImages();
    }

    private bindEvents(): void {
        this.fileInput.addEventListener('change', () => this.prepareFile());
        this.uploadButton.addEventListener('click', () => this.uploadFile());
    }

    private async loadImages(): Promise<void> {
        this.showLoading(true);
        this.hideMessages();
        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(this.imagesApi, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            const images = await response.json();
            this.renderGallery(images);
        } catch (error) {
            this.showError(error instanceof Error ? error.message : 'Kunde inte ladda bilder.');
        } finally {
            this.showLoading(false);
        }
    }

    private renderGallery(images: any[]): void {
        this.galleryGrid.innerHTML = '';
        if (images.length === 0) {
            this.galleryGrid.innerHTML = '<p class="text-center text-muted col-12">Inga bilder hittades.</p>';
            return;
        }
        images.forEach(image => {
            const col = document.createElement('div');
            col.className = 'col';
            col.innerHTML = `
                <div class="card h-100">
                    <img src="${image.thumbnailLink}" class="card-img-top" alt="${image.name}" style="aspect-ratio: 1 / 1; object-fit: cover;">
                    <div class="card-body text-center">
                        <button class="btn btn-sm btn-outline-danger" data-image-id="${image.id}" data-image-name="${image.name}">
                            <i class="bi bi-trash"></i> Ta bort
                        </button>
                    </div>
                </div>
            `;
            this.galleryGrid.appendChild(col);
        });

        this.galleryGrid.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const imageId = target.dataset.imageId!;
                const imageName = target.dataset.imageName!;
                this.handleDelete(imageId, imageName);
            });
        });
    }

    private prepareFile(): void {
        const file = this.fileInput.files?.[0];
        if (!file) {
            this.uploadButton.disabled = true;
            this.fileToUpload = null;
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            // result is "data:image/jpeg;base64,...." - we need to split it
            const base64Content = result.split(',')[1];
            this.fileToUpload = {
                content: base64Content,
                name: file.name,
                type: file.type
            };
            this.uploadButton.disabled = false;
        };
        reader.onerror = () => {
            this.showError("Kunde inte läsa filen.");
            this.uploadButton.disabled = true;
            this.fileToUpload = null;
        };
        reader.readAsDataURL(file);
    }

    private async uploadFile(): Promise<void> {
        if (!this.fileToUpload) return;

        this.uploadButton.disabled = true;
        this.uploadSpinner.classList.remove('d-none');
        this.hideMessages();

        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(this.adminImagesApi, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: this.fileToUpload.name,
                    fileContent: this.fileToUpload.content,
                    mimeType: this.fileToUpload.type
                })
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            
            this.showSuccess("Bilden har laddats upp!");
            this.fileInput.value = ''; // Reset file input
            this.fileToUpload = null;
            this.loadImages(); // Refresh gallery
        } catch (error) {
            this.showError(error instanceof Error ? error.message : 'Uppladdningen misslyckades.');
        } finally {
            this.uploadSpinner.classList.add('d-none');
        }
    }

    private handleDelete(imageId: string, imageName: string): void {
        const message = `Är du säker på att du vill ta bort bilden "${imageName}"? Detta kan inte ångras.`;
        (document.getElementById('confirmation-message')!).textContent = message;
        (document.getElementById('confirm-action-btn')!).onclick = () => this.performDelete(imageId);
        this.confirmationModal.show();
    }

    private async performDelete(imageId: string): Promise<void> {
        this.confirmationModal.hide();
        this.hideMessages();
        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(`${this.adminImagesApi}/${imageId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 409) {
                throw new Error("Bilden används av en eller flera frågor och kan inte tas bort.");
            }
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }
            
            this.showSuccess("Bilden har tagits bort.");
            this.loadImages(); // Refresh gallery
        } catch (error) {
            this.showError(error instanceof Error ? error.message : 'Kunde inte ta bort bilden.');
        }
    }

    private showLoading(show: boolean): void { this.loadingSpinner.style.display = show ? 'block' : 'none'; }
    private showError(message: string): void { this.errorContainer.textContent = message; this.errorContainer.classList.remove('d-none'); }
    private showSuccess(message: string): void { this.successContainer.textContent = message; this.successContainer.classList.remove('d-none'); setTimeout(() => this.hideMessages(), 5000); }
    private hideMessages(): void { this.errorContainer.classList.add('d-none'); this.successContainer.classList.add('d-none'); }
}

class ImportManagement {
    private apiEndpoint = '/api/admin-import';
    private fileInput: HTMLInputElement;
    private analyzeButton: HTMLButtonElement;
    private resultsContainer: HTMLElement;
    private summaryContainer: HTMLElement;
    private previewContainer: HTMLElement;
    private confirmButton: HTMLButtonElement;
    private cancelButton: HTMLButtonElement;
    private loadingSpinner: HTMLElement;
    private errorContainer: HTMLElement;
    private successContainer: HTMLElement;
    private questionsToImport: any[] = [];
    private questionManagement: QuestionManagement;
    private existingImages: Record<string, string> = {};
    private newImagesNeeded: string[] = [];
    private imageHandlingSection: HTMLElement;
    private unhandledImages: Set<string> = new Set();

    constructor(questionManagement: QuestionManagement) {
        this.questionManagement = questionManagement;
        this.fileInput = document.getElementById('csv-file-input') as HTMLInputElement;
        this.analyzeButton = document.getElementById('analyze-csv-btn') as HTMLButtonElement;
        this.resultsContainer = document.getElementById('import-results-container')!;
        this.summaryContainer = document.getElementById('import-summary')!;
        this.previewContainer = document.getElementById('import-preview')!;
        this.confirmButton = document.getElementById('confirm-import-btn') as HTMLButtonElement;
        this.cancelButton = document.getElementById('cancel-import-btn') as HTMLButtonElement;
        this.loadingSpinner = document.getElementById('import-loading-spinner')!;
        this.errorContainer = document.getElementById('import-error-container')!;
        this.successContainer = document.getElementById('import-success-container')!;
        this.imageHandlingSection = document.getElementById('image-handling-section')!;
        if (!this.imageHandlingSection) {
            console.error('Image handling section not found in DOM');
        }
        this.bindEvents();
    }

    private bindEvents(): void {
        this.fileInput.addEventListener('change', () => {
            this.analyzeButton.disabled = !this.fileInput.files || this.fileInput.files.length === 0;
            this.resetView(false);
        });

        this.analyzeButton.addEventListener('click', () => this.analyzeFile());
        this.confirmButton.addEventListener('click', () => this.executeImport());
        this.cancelButton.addEventListener('click', () => this.resetView(true));
    }

    private analyzeFile(): void {
        const file = this.fileInput.files?.[0];
        if (!file) return;

        this.showLoading(true);
        this.hideMessages();
        this.resultsContainer.classList.add('d-none');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                const token = localStorage.getItem('jwt_token');
                const response = await fetch(`${this.apiEndpoint}/analyze`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'text/csv' },
                    body: content
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
                
                const result = await response.json();
                this.questionsToImport = result.newQuestions;
                this.existingImages = result.existingImages;
                this.newImagesNeeded = result.newImagesNeeded;
                this.displayResults(result.newQuestions, result.duplicatesCount);
            } catch (error) {
                this.showError(error instanceof Error ? error.message : 'Kunde inte analysera filen.');
            } finally {
                this.showLoading(false);
            }
        };
        reader.readAsText(file);
    }

    private displayResults(newQuestions: any[], duplicatesCount: number): void {
        this.summaryContainer.textContent = `Hittade ${newQuestions.length} nya frågor och ${duplicatesCount} dubbletter. ${Object.keys(this.existingImages).length} befintliga bilder, ${this.newImagesNeeded.length} nya behövs.`;        
        this.previewContainer.innerHTML = '';
        if (newQuestions.length === 0) {
            console.error("Inga nya frågor att importera.");
            this.previewContainer.innerHTML = '<div class="list-group-item">Inga nya frågor att importera. Kontrollera att ämnet är korrekt och att filen innehåller giltiga frågor.</div>';
            this.confirmButton.disabled = true;
        } else {
            newQuestions.slice(0, 10).forEach(q => { // Preview max 10 questions
                const item = document.createElement('div');
                item.className = 'list-group-item';
                item.textContent = q.questionText;
                this.previewContainer.appendChild(item);
            });
            if (newQuestions.length > 10) {
                 this.previewContainer.innerHTML += `<div class="list-group-item text-muted">...och ${newQuestions.length - 10} till.</div>`;
            }
            this.confirmButton.disabled = false;
        }
        
        this.resultsContainer.classList.remove('d-none');

        // Image handling section
        this.imageHandlingSection.innerHTML = '';
        this.imageHandlingSection.classList.add('d-none');
        this.unhandledImages.clear();

        const questionsWithImages = newQuestions.filter(q => q.imageName);
        if (questionsWithImages.length > 0) {
            this.imageHandlingSection.classList.remove('d-none');
            // Group by unique image name for efficiency
            const imageMap = new Map<string, any[]>();
            questionsWithImages.forEach(q => {
                const list = imageMap.get(q.imageName) || [];
                list.push(q);
                imageMap.set(q.imageName, list);
            });

            imageMap.forEach((questions, imageName) => {
                this.unhandledImages.add(imageName);
                const item = document.createElement('div');
                item.className = 'list-group-item d-flex justify-content-between align-items-center';
                item.innerHTML = `
                    <div>
                        <strong>Bild: ${imageName}</strong><br>
                        <small>Används i ${questions.length} fråg${questions.length > 1 ? 'or' : 'a'}: 
                        ${questions.map(q => q.questionText).slice(0, 2).join(', ')}${questions.length > 2 ? '...' : ''}</small>
                    </div>
                    <div>
                        ${this.existingImages[imageName] ? `<button class="btn btn-sm btn-primary me-2 link-existing" data-image="${imageName}">Koppla till identifierad</button>` : ''}
                        <button class="btn btn-sm btn-secondary me-2 select-image" data-image="${imageName}">Välj från systemet</button>
                        <input type="file" class="d-none upload-input" accept="image/*" data-image="${imageName}">
                        <button class="btn btn-sm btn-success upload-new" data-image="${imageName}">Ladda upp ny...</button>
                    </div>
                `;
                this.imageHandlingSection.appendChild(item);
            });

            // Event listeners
            (this.imageHandlingSection.querySelectorAll('.link-existing') as NodeListOf<HTMLElement>).forEach(btn => {
                btn.addEventListener('click', () => this.handleLinkExisting(btn.dataset.image!));
            });
            (this.imageHandlingSection.querySelectorAll('.select-image') as NodeListOf<HTMLElement>).forEach(btn => {
                btn.addEventListener('click', () => this.handleSelectImage(btn.dataset.image!));
            });
            (this.imageHandlingSection.querySelectorAll('.upload-new') as NodeListOf<HTMLElement>).forEach(btn => {
                btn.addEventListener('click', () => {
                    const input = btn.parentElement!.querySelector('.upload-input') as HTMLInputElement;
                    input.click();
                });
            });
            (this.imageHandlingSection.querySelectorAll('.upload-input') as NodeListOf<HTMLInputElement>).forEach(input => {
                input.addEventListener('change', (e) => this.handleUploadNew(input.dataset.image!, e));
            });
        }

        this.updateImportButton();
    }

    private handleLinkExisting(imageName: string) {
        const imageId = this.existingImages[imageName];
        this.assignImageToQuestions(imageName, imageId);
        this.markImageHandled(imageName);
    }

    private async handleSelectImage(imageName: string) {
        showSelectImageModal((id: string, url: string) => {
            this.assignImageToQuestions(imageName, id);
            this.markImageHandled(imageName);
        });
    }

    private async handleUploadNew(imageName: string, event: Event) {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        try {
            const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                reader.onerror = error => reject(error);
            });

            const fileContent = await toBase64(file);
            const response = await fetch('/api/admin-images', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: file.name, fileContent, mimeType: file.type }),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            const { id } = await response.json();
            this.assignImageToQuestions(imageName, id);
            this.markImageHandled(imageName);
        } catch (error) {
            this.showError(error instanceof Error ? error.message : 'Kunde inte ladda upp bilden.');
        }
    }

    private assignImageToQuestions(imageName: string, imageId: string) {
        this.questionsToImport = this.questionsToImport.map(q =>
            q.imageName === imageName ? { ...q, imageId, imageName: undefined } : q
        );
    }

    private markImageHandled(imageName: string) {
        this.unhandledImages.delete(imageName);
        const item = this.imageHandlingSection.querySelector(`[data-image="${imageName}"]`)?.closest('.list-group-item');
        if (item) {
            item.classList.add('bg-success', 'text-white');
            item.querySelector('div:last-child')!.innerHTML = '<span class="badge bg-light text-dark">Klar</span>';
        }
        this.updateImportButton();
    }

    private updateImportButton() {
        this.confirmButton.disabled = this.questionsToImport.length === 0 || this.unhandledImages.size > 0;
    }
    private async executeImport(): Promise<void> {
        this.showLoading(true);
        this.confirmButton.disabled = true;
        this.cancelButton.disabled = true;

        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(`${this.apiEndpoint}/execute`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ questionsToImport: this.questionsToImport })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            
            const result = await response.json();
            this.showSuccess(`${result.insertedCount} frågor har importerats.`);
            this.resetView(true);
            this.questionManagement.loadQuestions();
        } catch (error) {
            this.showError(error instanceof Error ? error.message : 'Importen misslyckades.');
        } finally {
            this.showLoading(false);
            this.confirmButton.disabled = false;
            this.cancelButton.disabled = false;
        }
    }

    private resetView(clearFileInput: boolean): void {
        if (clearFileInput) {
            this.fileInput.value = '';
            this.analyzeButton.disabled = true;
        }
        this.resultsContainer.classList.add('d-none');
        this.hideMessages();
    }

    private showLoading(show: boolean): void { this.loadingSpinner.classList.toggle('d-none', !show); }
    private showError(message: string): void { this.errorContainer.textContent = message; this.errorContainer.classList.remove('d-none'); }
    private showSuccess(message: string): void { this.successContainer.textContent = message; this.successContainer.classList.remove('d-none'); }
    private hideMessages(): void { this.errorContainer.classList.add('d-none'); this.successContainer.classList.add('d-none'); }
}

// Main Admin Panel Logic
document.addEventListener('DOMContentLoaded', () => {
    renderHeader();

    // Initialize user management for examiners
    new UserManagement('Examiner', '/api/admin-examiners');
    
    // Initialize user management for students
    new UserManagement('Student', '/api/admin-students');

    // Initialize question management
    const questionManagement = new QuestionManagement();

    // Initialize subject management
    new SubjectManagement(questionManagement);

    // Initialize import management
    new ImportManagement(questionManagement);

    // Initialize image management
    new ImageManagement();

    // Initialize password change handler
    initializePasswordChangeHandler();
});

function initializePasswordChangeHandler() {
    const submitButton = document.getElementById('change-password-submit') as HTMLButtonElement;
    const passwordChangeForm = document.getElementById('password-change-form') as HTMLFormElement;
    const errorContainer = document.getElementById('password-change-error');
    const token = localStorage.getItem('jwt_token');

    if (!submitButton || !passwordChangeForm || !errorContainer) {
        return;
    }

    submitButton.addEventListener('click', async () => {
        const currentPassword = (document.getElementById('current-password') as HTMLInputElement).value;
        const newPassword = (document.getElementById('new-password') as HTMLInputElement).value;
        const confirmPassword = (document.getElementById('confirm-password') as HTMLInputElement).value;

        errorContainer.classList.add('d-none');

        if (newPassword !== confirmPassword) {
            errorContainer.textContent = 'De nya lösenorden matchar inte.';
            errorContainer.classList.remove('d-none');
            return;
        }

        if (newPassword.length < 6) {
            errorContainer.textContent = 'Lösenordet måste vara minst 6 tecken långt.';
            errorContainer.classList.remove('d-none');
            return;
        }

        submitButton.disabled = true;

        try {
            const response = await fetch('/api/examinator/change-password', { // Using examinator endpoint for admin
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Kunde inte byta lösenord.');
            }

            // Success
            const modalEl = document.getElementById('password-change-modal');
            if (modalEl) {
                const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
                modal?.hide();
            }
            passwordChangeForm.reset();
            // Show success message
            window.location.reload();


        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Ett okänt fel uppstod.';
            errorContainer.textContent = errorMessage;
            errorContainer.classList.remove('d-none');
        } finally {
            submitButton.disabled = false;
        }
    });
}
