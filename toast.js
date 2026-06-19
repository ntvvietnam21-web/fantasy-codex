// toast.js - Chỉ định nghĩa showToast nếu chưa tồn tại (tránh conflict với effects.js)
if (typeof showToast !== "function") {
    window.showToast = function showToast(msg, type = "info") {
        let toast = document.createElement("div");
        toast.className = "toast " + type;

        // Dùng innerHTML để hỗ trợ icon/emoji trong msg
        toast.innerHTML = msg;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add("show");
        }, 10);

        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    };
}
