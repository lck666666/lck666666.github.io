// Mem3R Project Page — JS

document.addEventListener('DOMContentLoaded', () => {
  // Navbar burger toggle (mobile)
  const burger = document.querySelector('.navbar-burger');
  if (burger) {
    burger.addEventListener('click', () => {
      const target = document.getElementById(burger.dataset.target);
      burger.classList.toggle('is-active');
      if (target) target.classList.toggle('is-active');
    });
  }

  // ── In-the-Wild video carousel ──
  const wildVideo = document.getElementById('wild-video');
  const wildLabel = document.getElementById('wild-video-label');
  const prevBtn   = document.getElementById('wild-prev');
  const nextBtn   = document.getElementById('wild-next');
  const dots      = document.querySelectorAll('.wild-dot');

  const wildScenes = [
    { src: 'static/videos/stanford_arch.mp4',        label: '' },
    { src: 'static/videos/stanford_loop.mp4',  label: 'Loop Closure' },
    { src: 'static/videos/sf_chairs.mp4',  label: '' },
    { src: 'static/videos/hk_demo1.mp4',            label: '' },
  ];
  let wildIdx = 0;

  function switchWildVideo(idx) {
    wildIdx = (idx + wildScenes.length) % wildScenes.length;
    const scene = wildScenes[wildIdx];

    wildVideo.style.opacity = '0';
    setTimeout(() => {
      wildVideo.src = scene.src;
      wildVideo.load();
      wildVideo.play();
      if (wildLabel) wildLabel.textContent = scene.label;
      wildVideo.style.opacity = '1';
    }, 250);

    dots.forEach((d, i) => d.classList.toggle('active', i === wildIdx));
  }

  if (prevBtn && nextBtn && wildVideo) {
    prevBtn.addEventListener('click', () => switchWildVideo(wildIdx - 1));
    nextBtn.addEventListener('click', () => switchWildVideo(wildIdx + 1));
    dots.forEach((d, i) => d.addEventListener('click', () => switchWildVideo(i)));
  }
});
