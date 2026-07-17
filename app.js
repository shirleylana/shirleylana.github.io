const displayCopy = (project) => project.approved || project.generated;

function filterProjects(projects, category) {
  if (category === "全部") return projects;
  return projects.filter((project) => displayCopy(project).category === category);
}

if (typeof module !== "undefined") module.exports = { filterProjects };

if (typeof document !== "undefined") {
  const state = { data: null, category: "全部", transition: null };
  const byId = (id) => document.getElementById(id);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function categories() {
    const declared = state.data.site.categories || [];
    const inferred = state.data.projects.map((project) => displayCopy(project).category);
    return ["全部", ...new Set([...declared, ...inferred].filter(Boolean))];
  }

  function renderFilters() {
    const filters = byId("category-filters");
    filters.replaceChildren(...categories().map((category) => {
      const button = element("button", `filter${category === state.category ? " active" : ""}`, category);
      button.type = "button";
      button.role = "tab";
      button.dataset.category = category;
      button.setAttribute("aria-selected", String(category === state.category));
      button.tabIndex = category === state.category ? 0 : -1;
      button.addEventListener("click", () => selectCategory(category));
      button.addEventListener("keydown", moveFilterFocus);
      return button;
    }));
  }

  function moveFilterFocus(event) {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    const tabs = [...byId("category-filters").querySelectorAll('[role="tab"]')];
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const next = (tabs.indexOf(event.currentTarget) + direction + tabs.length) % tabs.length;
    event.preventDefault();
    tabs[next].focus();
    tabs[next].click();
  }

  function card(project, index) {
    const copy = displayCopy(project);
    const link = element("a", "card");
    link.href = project.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.dataset.category = copy.category;
    link.setAttribute("aria-label", `${copy.name}，在 GitHub 中打开`);

    const cover = element("div", `cover ${project.visual || "prism"}`);
    cover.setAttribute("aria-hidden", "true");
    const number = element("span", "card-index", String(index + 1).padStart(2, "0"));
    const type = (copy.technologies || ["PROJECT"])[0];
    const tag = element("span", "card-tag", `${copy.category} · ${type}`);
    const content = element("div", "card-copy");
    content.append(element("h3", "", copy.name));
    content.append(element("p", "value", copy.value));
    const impact = element("div", "impact");
    impact.append(element("b", "", "投产价值"), element("span", "", copy.production_value));
    content.append(impact);
    link.append(cover, number, tag, content, element("span", "arrow", "↗"));
    return link;
  }

  function renderProjects(animate = true) {
    const projects = filterProjects(state.data.projects, state.category);
    const grid = byId("project-grid");
    const update = () => {
      grid.replaceChildren(...projects.map(card));
      byId("project-count").textContent = `${projects.length} / ${state.data.projects.length} PROJECTS`;
      byId("empty-state").hidden = projects.length !== 0;
      if (animate && !reduceMotion) {
        requestAnimationFrame(() => [...grid.children].forEach((item, index) => {
          item.style.setProperty("--delay", `${index * 70}ms`);
          item.classList.add("is-entering");
        }));
      }
    };

    clearTimeout(state.transition);
    if (animate && grid.children.length && !reduceMotion) {
      grid.classList.add("is-leaving");
      state.transition = setTimeout(() => {
        grid.classList.remove("is-leaving");
        update();
      }, 220);
    } else update();
  }

  function selectCategory(category) {
    if (category === state.category) return;
    state.category = category;
    renderFilters();
    renderProjects(true);
  }

  function fallbackSelectCategory(category) {
    const cards = [...byId("project-grid").querySelectorAll(".card")];
    const visible = cards.filter((card) => category === "全部" || card.dataset.category === category);
    cards.forEach((card) => { card.hidden = !visible.includes(card); });
    [...byId("category-filters").querySelectorAll('[role="tab"]')].forEach((button) => {
      const selected = button.dataset.category === category;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    byId("project-count").textContent = `${visible.length} / ${cards.length} PROJECTS`;
    byId("empty-state").hidden = visible.length !== 0;
  }

  function setupFallbackFilters() {
    [...byId("category-filters").querySelectorAll('[role="tab"]')].forEach((button) => {
      button.addEventListener("click", () => {
        if (state.data) selectCategory(button.dataset.category);
        else fallbackSelectCategory(button.dataset.category);
      });
      button.addEventListener("keydown", moveFilterFocus);
    });
  }

  function setupIntro() {
    const intro = byId("intro");
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      intro.classList.add("is-gone");
      window.setTimeout(() => intro.remove(), reduceMotion ? 0 : 850);
    };
    byId("start").addEventListener("click", close);
    intro.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });
    window.setTimeout(close, 3200);
  }

  function setupPointerGlow() {
    const glow = byId("cursor-glow");
    if (reduceMotion || !window.matchMedia("(pointer:fine)").matches) return;
    window.addEventListener("pointermove", (event) => {
      glow.style.transform = `translate3d(${event.clientX - 210}px,${event.clientY - 210}px,0)`;
    }, { passive: true });
  }

  setupFallbackFilters();
  setupIntro();
  setupPointerGlow();

  fetch("projects.json")
    .then((response) => {
      if (!response.ok) throw new Error(`Could not load projects.json (${response.status})`);
      return response.json();
    })
    .then((data) => {
      state.data = data;
      document.title = data.site.title || document.title;
      byId("github-link").href = data.profile.html_url;
      renderFilters();
      renderProjects(false);
    })
    .catch((error) => {
      const fallbackCards = byId("project-grid").querySelectorAll(".card").length;
      if (!fallbackCards) {
        byId("empty-state").hidden = false;
        byId("empty-state").textContent = error.message;
      }
    });
}
