const menuToggle = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".navigation");

menuToggle.addEventListener("click", () => {
  const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isExpanded));
  menuToggle.setAttribute("aria-label", isExpanded ? "Open navigation menu" : "Close navigation menu");
  navigation.classList.toggle("is-open", !isExpanded);
});

navigation.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation menu");
    navigation.classList.remove("is-open");
  }
});

const filterButtons = document.querySelectorAll(".filter-button");
const menuCards = document.querySelectorAll(".menu-card");

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedCategory = button.dataset.filter;
    filterButtons.forEach((filterButton) => {
      const isSelected = filterButton === button;
      filterButton.classList.toggle("is-active", isSelected);
      filterButton.setAttribute("aria-pressed", String(isSelected));
    });
    menuCards.forEach((card) => {
      card.hidden = selectedCategory !== "all" && card.dataset.category !== selectedCategory;
    });
  });
});

const enquiryForm = document.querySelector("#enquiry-form");
const formStatus = document.querySelector("#form-status");

enquiryForm.addEventListener("invalid", () => {
  formStatus.textContent = "Please complete the required fields with a valid email address.";
  formStatus.classList.add("is-error");
}, true);

enquiryForm.addEventListener("input", () => {
  formStatus.textContent = "";
  formStatus.classList.remove("is-error");
});

enquiryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  formStatus.textContent = "Your details are valid for this preview, but have not been sent or saved. A contact service must be connected before enquiries can be received.";
  formStatus.classList.remove("is-error");
});

document.querySelector("#current-year").textContent = new Date().getFullYear();
