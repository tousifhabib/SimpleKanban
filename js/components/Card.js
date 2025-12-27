import { store } from "../store.js";

export default class Card {
  constructor(cardData) {
    this.cardData = cardData;
  }

  render() {
    const template = document.getElementById("cardTemplate");
    const cardEl = template.content.firstElementChild.cloneNode(true);

    cardEl.dataset.cardId = this.cardData.id;

    if (this.cardData.priority && this.cardData.priority !== "none") {
      cardEl.classList.add(`priority-${this.cardData.priority}`);
    }

    if (this.cardData.completed) {
      cardEl.classList.add("completed");
    }

    this.applyAgingStyles(cardEl);

    const labelsContainer = cardEl.querySelector(".card-labels");
    const labels = this.cardData.labels || [];
    if (labelsContainer && labels.length > 0) {
      const allLabels = store.getLabels();
      labels.forEach((labelId) => {
        const label = allLabels.find((l) => l.id === labelId);
        if (!label) return;
        const labelEl = document.createElement("span");
        labelEl.className = "card-label";
        labelEl.style.backgroundColor = label.color;
        labelEl.textContent = label.name;
        labelsContainer.appendChild(labelEl);
      });
    }

    cardEl.querySelector(".card-text").textContent = this.cardData.text;

    if (this.cardData.description && this.cardData.description.trim()) {
      cardEl.classList.add("has-description");
    }

    const metaContainer = cardEl.querySelector(".card-meta");
    if (metaContainer) {
      if (this.cardData.startDate) {
        metaContainer.appendChild(
          this.metaChip(
            "card-start-date",
            "🟢",
            this.formatDate(this.cardData.startDate)
          )
        );
      }

      if (this.cardData.dueDate) {
        metaContainer.appendChild(
          this.metaChip(
            `card-due-date ${this.getDueDateClass()}`,
            "🔴",
            this.formatDate(this.cardData.dueDate)
          )
        );
      }

      if (this.cardData.updatedAt) {
        const activityDiv = document.createElement("div");
        activityDiv.className = "card-last-activity";
        activityDiv.textContent = `Updated ${this.getTimeAgo(
          this.cardData.updatedAt
        )}`;
        metaContainer.appendChild(activityDiv);
      }
    }

    const completeCheckbox = cardEl.querySelector(".card-complete-checkbox");
    if (completeCheckbox) {
      completeCheckbox.checked = this.cardData.completed || false;
    }

    return cardEl;
  }

  getDaysOld() {
    if (!this.cardData.updatedAt) return 0;
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor(
      (new Date() - new Date(this.cardData.updatedAt)) / msPerDay
    );
  }

  getTimeAgo(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return "just now";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }

  applyAgingStyles(cardEl) {
    if (this.cardData.completed) return;

    const days = this.getDaysOld();
    if (days >= 14) cardEl.classList.add("card-aged-3");
    else if (days >= 7) cardEl.classList.add("card-aged-2");
    else if (days >= 3) cardEl.classList.add("card-aged-1");
  }

  metaChip(className, icon, text) {
    const el = document.createElement("span");
    el.className = className;
    el.innerHTML = `<span class="meta-icon">${icon}</span> ${text}`;
    return el;
  }

  formatDate(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }

  getDueDateClass() {
    if (!this.cardData.dueDate || this.cardData.completed) return "";

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dueDate = new Date(this.cardData.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((dueDate - now) / 86400000);

    if (diffDays < 0) return "overdue";
    if (diffDays === 0) return "due-today";
    if (diffDays <= 2) return "due-soon";
    return "";
  }
}
