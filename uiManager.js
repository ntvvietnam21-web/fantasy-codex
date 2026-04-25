/**
 * GM UI MANAGER PRO - Quản lý giao diện động qua IndexedDB
 */
const UI_DB_NAME = "FantasyCodex_UI";
const UI_STORE_NAME = "labels";
const UI_DB_VERSION = 1;

let uiDB = null;

const UIManager = {
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(UI_DB_NAME, UI_DB_VERSION);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(UI_STORE_NAME)) {
                    db.createObjectStore(UI_STORE_NAME, { keyPath: "id" });
                }
            };
            request.onsuccess = (e) => {
                uiDB = e.target.result;
                this.applyAll();
                this.bindGMEvents();
                this.injectGlobalStyles(); // Thêm giao diện cho modal
                resolve();
            };
            request.onerror = () => reject("Lỗi mở UI DB");
        });
    },

    // Lưu nhãn
    async saveLabel(id, text) {
        const tx = uiDB.transaction(UI_STORE_NAME, "readwrite");
        const store = tx.objectStore(UI_STORE_NAME);
        await store.put({ id: id, text: text, updatedAt: Date.now() });
        this.applyToElement(id, text);
    },

    // Áp dụng nhãn lên DOM
    applyAll() {
        const tx = uiDB.transaction(UI_STORE_NAME, "readonly");
        const store = tx.objectStore(UI_STORE_NAME);
        store.getAll().onsuccess = (e) => {
            e.target.result.forEach(item => this.applyToElement(item.id, item.text));
        };
    },

    applyToElement(id, text) {
        document.querySelectorAll(`[data-ui="${id}"]`).forEach(el => {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = text;
            else el.innerText = text;
        });
    },

    // --- QUẢN LÝ CHUNG (MODAL) ---
    
    async openAdminPanel() {
        // Lấy tất cả các IDs có data-ui trên trang hiện tại
        const pageElements = Array.from(document.querySelectorAll('[data-ui]'));
        const uiKeys = [...new Set(pageElements.map(el => el.getAttribute('data-ui')))];
        
        // Lấy dữ liệu hiện tại từ DB
        const tx = uiDB.transaction(UI_STORE_NAME, "readonly");
        const savedLabels = await new Promise(res => {
            tx.objectStore(UI_STORE_NAME).getAll().onsuccess = (e) => res(e.target.result);
        });

        // Tạo giao diện Modal
        let modal = document.getElementById('uiAdminModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'uiAdminModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        let html = `
            <div class="modal-content" style="max-width: 600px; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column;">
                <div class="modal-header">
                    <h3><i class="fa-solid fa-pen-to-square"></i> Quản lý nhãn giao diện</h3>
                    <span class="close-modal" onclick="document.getElementById('uiAdminModal').style.display='none'">&times;</span>
                </div>
                <div style="overflow-y: auto; padding: 15px; flex: 1;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="text-align: left; border-bottom: 2px solid var(--border);">
                                <th style="padding: 10px;">ID Mục</th>
                                <th style="padding: 10px;">Nội dung hiển thị</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        uiKeys.forEach(key => {
            const savedItem = savedLabels.find(l => l.id === key);
            const currentText = savedItem ? savedItem.text : (document.querySelector(`[data-ui="${key}"]`).innerText || document.querySelector(`[data-ui="${key}"]`).placeholder);
            
            html += `
                <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 8px; font-size: 11px; color: var(--gold); font-family: monospace;">${key}</td>
                    <td style="padding: 8px;">
                        <input type="text" class="ui-edit-input" data-key="${key}" value="${currentText}" 
                               style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border); color: white; padding: 5px; border-radius: 4px;">
                    </td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
                <div class="modal-footer" style="padding: 15px; text-align: right; border-top: 1px solid var(--border);">
                    <button class="btn-secondary" onclick="document.getElementById('uiAdminModal').style.display='none'">Hủy</button>
                    <button class="btn-primary" onclick="UIManager.saveAllFromPanel()">Lưu tất cả thay đổi</button>
                </div>
            </div>
        `;

        modal.innerHTML = html;
        modal.style.display = 'flex';
    },

    async saveAllFromPanel() {
        const inputs = document.querySelectorAll('.ui-edit-input');
        for (let input of inputs) {
            const key = input.getAttribute('data-key');
            const val = input.value.trim();
            await this.saveLabel(key, val);
        }
        showToast("✨ Đã cập nhật toàn bộ giao diện!");
        document.getElementById('uiAdminModal').style.display = 'none';
    },

    bindGMEvents() {
        window.addEventListener('click', (e) => {
            if (e.altKey) {
                const target = e.target.closest('[data-ui]');
                if (target) {
                    e.preventDefault();
                    const uiId = target.getAttribute('data-ui');
                    const oldText = target.innerText || target.placeholder;
                    const newText = prompt(`[GM] Đổi tên cho: ${uiId}`, oldText);
                    if (newText !== null) this.saveLabel(uiId, newText.trim());
                }
            }
        });
    },

    injectGlobalStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            .ui-edit-input:focus { border-color: var(--gold) !important; outline: none; box-shadow: 0 0 5px var(--gold); }
            #uiAdminModal .modal-content { background: #1a1a2e; border: 1px solid var(--gold); }
        `;
        document.head.appendChild(style);
    }
};

document.addEventListener('DOMContentLoaded', () => UIManager.init());
