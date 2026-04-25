function showToast(msg) {
    let toast = document.createElement("div");
    toast.className = "toast";
    
    // GM: Sửa innerText thành innerHTML để trình duyệt hiểu được các icon/thẻ HTML
    toast.innerHTML = msg; 

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("show");
    }, 10);

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}
