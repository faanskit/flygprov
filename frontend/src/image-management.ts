// Singleton-klass för att hantera bilddata
class ImageStore {
    private static instance: ImageStore;
    private images: any[] = [];
    private imagesApi = '/api/images';

    private constructor() {}

    public static getInstance(): ImageStore {
        if (!ImageStore.instance) {
            ImageStore.instance = new ImageStore();
        }
        return ImageStore.instance;
    }

    public async loadImages(): Promise<void> {
        if (this.images.length > 0) {
            console.log("Images already loaded from API.");
            return;
        }
        try {
            const token = localStorage.getItem('jwt_token');
            const response = await fetch(this.imagesApi, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            this.images = await response.json();
        } catch (error) {
            console.error("Failed to load images:", error);
            throw error;
        }
    }

    public getImages(): any[] {
        return this.images;
    }
}

// Funktion för att visa modalen för bildval
export function showSelectImageModal(callback: (id: string, url: string) => void) {
    const images = ImageStore.getInstance().getImages();
    if (images.length === 0) {
        alert("Inga bilder finns att välja. Kontrollera bildhanteringen.");
        return;
    }

    const modalElement = document.getElementById('select-image-modal');
    if (!modalElement) {
        console.error("Modal element not found.");
        return;
    }
    const modalBody = modalElement.querySelector('.modal-body') as HTMLElement;
    // Använd (window as any).bootstrap.Modal för att kringgå TypeScript-felet
    const selectImageModal = new (window as any).bootstrap.Modal(modalElement);

    // Rensa modalens innehåll
    modalBody.innerHTML = '';

    images.forEach(img => {
        const thumb = document.createElement('div');
        thumb.className = 'col-md-3 mb-4 image-thumbnail-card';
        thumb.innerHTML = `
            <div class="card h-100 cursor-pointer">
                <img src="${img.thumbnailLink}" class="card-img-top" alt="${img.name}" style="height: 150px; object-fit: cover;">
                <div class="card-body">
                    <p class="card-text text-truncate">${img.name}</p>
                </div>
            </div>
        `;
        thumb.addEventListener('click', () => {
            callback(img.id, img.thumbnailLink);
            selectImageModal.hide();
        });
        modalBody.appendChild(thumb);
    });

    selectImageModal.show();
}

export const imageStore = ImageStore.getInstance();