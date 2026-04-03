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
});
