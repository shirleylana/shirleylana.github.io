const state = { data: null, category: "全部" };

const byId = (id) => document.getElementById(id);
const displayCopy = (project) => project.approved || project.generated;

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderProfile() {
  const { profile, site } = state.data;
  document.documentElement.lang = site.language || "en";
  document.documentElement.style.setProperty("--accent", site.theme_color || "#77543d");
  document.title = site.title || `${profile.name || profile.login} Projects`;
  byId("profile-name").textContent = profile.name || profile.login;
  byId("profile-bio").textContent = profile.bio || site.title || "Projects";
  const link = byId("profile-link");
  link.href = profile.html_url;
  const avatar = byId("profile-avatar");
  if (profile.avatar_url) {
    avatar.src = profile.avatar_url;
    avatar.alt = `${profile.name || profile.login} avatar`;
    avatar.hidden = false;
  }
}

function categories() {
  const declared = state.data.site.categories || [];
  const inferred = state.data.projects.map((project) => displayCopy(project).category);
  return ["全部", ...new Set([...declared, ...inferred].filter(Boolean))];
}

function renderTabs() {
  const nav = byId("category-tabs");
  nav.replaceChildren();
  categories().forEach((category, index) => {
    const button = createElement("button", "tab", category);
    button.type = "button";
    button.role = "tab";
    button.id = `tab-${index}`;
    button.setAttribute("aria-selected", String(category === state.category));
    button.tabIndex = category === state.category ? 0 : -1;
    button.addEventListener("click", () => selectCategory(category));
    button.addEventListener("keydown", moveTabFocus);
    nav.append(button);
  });
}

function moveTabFocus(event) {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  const tabs = [...byId("category-tabs").querySelectorAll('[role="tab"]')];
  const current = tabs.indexOf(event.currentTarget);
  const direction = event.key === "ArrowRight" ? 1 : -1;
  const next = (current + direction + tabs.length) % tabs.length;
  event.preventDefault();
  tabs[next].focus();
  tabs[next].click();
}

function selectCategory(category) {
  state.category = category;
  renderTabs();
  renderProjects();
}

function projectCard(project) {
  const copy = displayCopy(project);
  const article = createElement("article", "project-card");
  article.dataset.category = copy.category;
  article.append(createElement("p", "project-card__category", copy.category));
  article.append(createElement("h3", "", copy.name));
  article.append(createElement("p", "project-card__value", copy.value));

  const impact = createElement("p", "project-card__impact");
  impact.append(createElement("strong", "", "投产价值"));
  impact.append(document.createTextNode(copy.production_value));
  article.append(impact);

  const footer = createElement("div", "project-card__footer");
  const technologies = createElement("ul", "tech-list");
  (copy.technologies || []).forEach((technology) => technologies.append(createElement("li", "", technology)));
  const link = createElement("a", "project-card__link", "GitHub ↗");
  link.href = project.url;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.setAttribute("aria-label", `Open ${copy.name} on GitHub`);
  footer.append(technologies, link);
  article.append(footer);
  return article;
}

function renderProjects() {
  const projects = state.data.projects.filter((project) => {
    return state.category === "全部" || displayCopy(project).category === state.category;
  });
  const grid = byId("project-grid");
  grid.replaceChildren(...projects.map(projectCard));
  byId("project-count").textContent = `${projects.length} ${projects.length === 1 ? "project" : "projects"}`;
  byId("empty-state").hidden = projects.length !== 0;
}

fetch("projects.json")
  .then((response) => {
    if (!response.ok) throw new Error(`Could not load projects.json (${response.status})`);
    return response.json();
  })
  .then((data) => {
    state.data = data;
    renderProfile();
    renderTabs();
    renderProjects();
  })
  .catch((error) => {
    byId("empty-state").hidden = false;
    byId("empty-state").textContent = error.message;
  });
