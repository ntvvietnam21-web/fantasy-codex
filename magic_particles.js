// ============================================================
// FANTASY CODEX PRO — MAGIC PARTICLES (BỤI MA THUẬT)
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    // 1. Tạo Canvas
    const canvas = document.createElement("canvas");
    canvas.id = "magicParticlesCanvas";
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.zIndex = "-1";
    canvas.style.pointerEvents = "none";
    document.body.prepend(canvas);

    const ctx = canvas.getContext("2d");
    let particles = [];
    const particleCount = window.innerWidth < 768 ? 50 : 120; // Ít hạt hơn trên mobile để mượt

    // 2. Xử lý Resize
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener("resize", resize);
    resize();

    // 3. Lớp Particle
    class Particle {
        constructor() {
            this.reset();
            // Khởi tạo ngẫu nhiên trên toàn màn hình lúc ban đầu
            this.y = Math.random() * canvas.height; 
        }

        reset() {
            this.x = Math.random() * canvas.width;
            this.y = canvas.height + 10;
            this.size = Math.random() * 2 + 0.5;
            this.speedX = Math.random() * 0.6 - 0.3;
            this.speedY = Math.random() * -0.8 - 0.2; // Bay lên từ từ
            
            // Màu sắc phép thuật: Trắng, Vàng nhạt, Hồng nhạt, Xanh lơ, Tím nhạt
            const colors = ['#ffffff', '#fde047', '#fbcfe8', '#bfdbfe', '#e9d5ff'];
            this.color = colors[Math.floor(Math.random() * colors.length)];
            
            this.opacity = Math.random() * 0.5 + 0.1;
            this.fadeSpeed = Math.random() * 0.01 + 0.005;
            this.fadeDirection = Math.random() > 0.5 ? 1 : -1;
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            
            // Hiệu ứng lấp lánh (chớp tắt nhẹ)
            this.opacity += this.fadeSpeed * this.fadeDirection;
            if (this.opacity >= 0.8) this.fadeDirection = -1;
            if (this.opacity <= 0.1) this.fadeDirection = 1;

            // Chạm viền hoặc bay khỏi màn hình
            if (this.y < -10) {
                this.reset();
            }
            if (this.x < -10) this.x = canvas.width + 10;
            if (this.x > canvas.width + 10) this.x = -10;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.opacity;
            ctx.fill();
            
            // Viền phát sáng nhẹ
            ctx.shadowBlur = this.size * 3;
            ctx.shadowColor = this.color;
        }
    }

    // 4. Khởi tạo mảng
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }

    // 5. Vòng lặp Animation
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();
        }
        requestAnimationFrame(animate);
    }
    
    // Bắt đầu
    animate();
});
