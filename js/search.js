/* ManiDealsCampus - Global Search Module */

document.addEventListener("DOMContentLoaded", () => {
  setupGlobalSearch();
});

function setupGlobalSearch() {
  // Listen for search input submissions across the app
  document.body.addEventListener("keydown", (e) => {
    const searchInput = e.target.closest("#global-search-input") || e.target.closest("#home-search-input");
    if (searchInput && e.key === "Enter") {
      const query = searchInput.value.trim();
      if (query) {
        window.location.href = `products.html?search=${encodeURIComponent(query)}`;
      }
    }
  });

  document.body.addEventListener("click", (e) => {
    const searchBtn = e.target.closest("#global-search-btn") || e.target.closest("#home-search-btn");
    if (searchBtn) {
      const searchBox = searchBtn.closest(".home-search-box") || searchBtn.closest(".search-box-wrapper");
      const input = searchBox.querySelector("input");
      const query = input?.value.trim();
      if (query) {
        window.location.href = `products.html?search=${encodeURIComponent(query)}`;
      }
    }
  });
}
