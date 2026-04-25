// audio.js - Cập nhật bởi GM

const AudioManager = (() => {

  // 1️⃣ Khởi tạo âm thanh
  const sounds = {
    click: new Audio('sounds/click.mp3'),
    hover: new Audio('sounds/hover.mp3'),
    background: new Audio('sounds/ambient.mp3'),
    battle: new Audio('sounds/battle.mp3')
  };

  // 2️⃣ Thiết lập nhạc nền
  sounds.background.loop = true;
  sounds.background.volume = 0.3;

  let bgPlaying = false; 

  // 3️⃣ Hàm phát nhạc nền (Chỉ chạy khi được gọi trực tiếp)
  const startBackground = () => {
    if (sounds.background.paused) {
      sounds.background.play()
        .then(() => {
          bgPlaying = true;
          console.log("🎵 GM: Nhạc nền đã bắt đầu.");
        })
        .catch(err => console.error('❌ GM: Lỗi phát nhạc nền:', err));
    }
  };

  // 4️⃣ Hàm bật/tắt nhạc nền (Dùng cho nút bấm trên giao diện)
  const toggleBackground = () => {
    if (sounds.background.paused) {
      startBackground();
    } else {
      sounds.background.pause();
      bgPlaying = false;
      console.log("🔇 GM: Đã tạm dừng nhạc nền.");
    }
  };

  // 5️⃣ Hàm phát âm thanh hiệu ứng
  const play = (name) => {
    if (!sounds[name]) return;
    sounds[name].currentTime = 0;
    sounds[name].play().catch(err => console.warn(`⚠️ GM: Âm thanh ${name} chờ tương tác.`, err));
  };

  // 6️⃣ Gán âm thanh cho các thành phần UI
  const bindClickSounds = () => {
    document.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => play('click'));
    });
    document.querySelectorAll('.modal button').forEach(btn => {
      btn.addEventListener('click', () => play('click'));
    });
  };

  const bindHoverSounds = () => {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('mouseenter', () => play('hover'));
    });
  };

  // 7️⃣ Khởi tạo hệ thống (Nhưng không tự phát nhạc)
  const init = () => {
    bindClickSounds();
    bindHoverSounds();
    console.log("⚔️ GM: Hệ thống âm thanh đã sẵn sàng (Chờ lệnh).");
  };

  return {
    init,
    playClick: () => play('click'),
    playHover: () => play('hover'),
    playBattle: () => play('battle'),
    startBackground, // Cho phép gọi để bắt đầu lần đầu
    toggleBackground
  };

})();
window.addEventListener('DOMContentLoaded', () => {
  AudioManager.init();
});
