// JWT-dekodningsfunktion (enkel implementering)
function decodeJwt(token: string): any {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Failed to decode JWT:", e);
        return null;
    }
}

// Funktion för att hämta användarinformation
export function getUser(): { username: string; role: 'student' | 'examinator' | 'admin'; authMethod: string } | null {
    const token = localStorage.getItem('jwt_token');
    const username = localStorage.getItem('username'); // Hämta användarnamn från localStorage

    if (!token || !username) {
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('username');
        return null;
    }

    const decoded = decodeJwt(token);
    if (!decoded) {
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('username');
        return null;
    }

    return {
        username: username,
        role: decoded.role,
        authMethod: decoded.authMethod
    };
}

// Funktion för att logga ut
export function logout(): void {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('username'); // Rensa även användarnamnet
    window.location.href = '/index.html';
}

// Hantera Google-inloggningssvar
async function handleCredentialResponse(response: any) {
    const res = await fetch("/.netlify/functions/google-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential })
    });

    if (res.ok) {
        const data = await res.json();
        console.log("Inloggning lyckades:", data);
        localStorage.setItem("jwt_token", data.jwt); // vår egen server-jwt
        localStorage.setItem('username', data.username);
        
        // Använd befintlig logik för omdirigering
        const user = getUser();
        if (user) {
            switch (user.role) {
                case 'student':
                    window.location.href = '/dashboard.html';
                    break;
                case 'examinator':
                    window.location.href = '/examinator.html';
                    break;
                case 'admin':
                    window.location.href = '/admin.html';
                    break;
                default:
                    window.location.href = '/index.html';
            }
        }
    } else {
        alert("Inloggningen misslyckades");
    }
}

export function showSelectImageModal(onSelect: (id: string, url: string) => void) {
    const modalEl = document.getElementById("imageSelectModal") as HTMLElement;
    const modal = new (window as any).bootstrap.Modal(modalEl);

    // Reset state
    const grid = document.getElementById("image-select-grid")!;
    const loading = document.getElementById("image-select-loading")!;
    const errorContainer = document.getElementById("image-select-error")!;
    const confirmBtn = document.getElementById("confirm-image-select-btn") as HTMLButtonElement;
    confirmBtn.disabled = true;

    grid.innerHTML = "";
    errorContainer.classList.add("d-none");
    loading.classList.remove("d-none");
    
    // Hämta token (justera om du använder annan lagring!)
    const token = localStorage.getItem("jwt_token");
    console.log("Token:", token);

    // Hämta bilder från backend
    fetch("/api/images", {
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    })
        .then(res => res.json())
        .then(images => {
            loading.classList.add("d-none");
            grid.innerHTML = "";

            images.forEach((img: any) => {
                console.log("Image:", img);
                const col = document.createElement("div");
                col.className = "col";

                const thumb = document.createElement("div");
                thumb.className = "card image-thumbnail";
                thumb.dataset.id = img.id;
                thumb.dataset.url = img.thumbnailLink;

                thumb.innerHTML = `
                    <img src="${img.thumbnailLink}" class="card-img-top" alt="${img.name}">
                `;
                console.log("Thumbnail:", thumb);

                thumb.addEventListener("click", () => {
                    grid.querySelectorAll(".image-thumbnail").forEach(el => el.classList.remove("selected"));
                    thumb.classList.add("selected");
                    confirmBtn.disabled = false;
                });

                col.appendChild(thumb);
                grid.appendChild(col);
            });
        })
        .catch(err => {
            loading.classList.add("d-none");
            errorContainer.textContent = "Kunde inte ladda bilder.";
            errorContainer.classList.remove("d-none");
            console.error(err);
        });

    // När användaren bekräftar
    confirmBtn.onclick = () => {
        const selected = grid.querySelector(".image-thumbnail.selected") as HTMLElement;
        if (!selected) return;

        const id = selected.dataset.id!;
        const url = selected.dataset.url!;
        onSelect(id, url);
        modal.hide();
    };

    modal.show();
}

// Exponera funktionen globalt så att Google-biblioteket kan anropa den
(window as any).handleCredentialResponse = handleCredentialResponse;

// Inloggningslogik
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = (document.getElementById('username') as HTMLInputElement).value;
            const password = (document.getElementById('password') as HTMLInputElement).value;
            const resultDiv = document.getElementById('result');

            try {
                const response = await fetch('/api/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('jwt_token', data.token);
                    localStorage.setItem('username', data.user.username); // Spara användarnamnet
                    
                    // Omdirigera baserat på roll
                    const user = getUser();
                    if (user) {
                        switch (user.role) {
                            case 'student':
                                window.location.href = '/dashboard.html';
                                break;
                            case 'examinator':
                                window.location.href = '/examinator.html';
                                break;
                            case 'admin':
                                window.location.href = '/admin.html';
                                break;
                            default:
                                window.location.href = '/index.html';
                        }
                    }
                } else {
                    if (resultDiv) {
                        resultDiv.textContent = data.error || 'Inloggning misslyckades';
                        resultDiv.className = 'error';
                    }
                }
            } catch (error) {
                if (resultDiv) {
                    resultDiv.textContent = 'Ett nätverksfel uppstod.';
                    resultDiv.className = 'error';
                }
            }
        });
    }
});