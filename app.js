const data = window.ROLEBOARD_DATA;
const stages = ["Not Started", "Applied", "OA/Assignment", "Interview", "Offer", "Rejected", "Withdrawn", "Closed"];
const resumeAssessments = window.ROLEBOARD_MATCHES || {};
const MAX_LISTING_AGE_DAYS = 7;
const isRecent = (postedOn, now = new Date()) => {
  const posted = new Date(`${postedOn}T00:00:00`);
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - MAX_LISTING_AGE_DAYS);
  return Number.isFinite(posted.getTime()) && posted <= now && posted >= cutoff;
};
console.assert(isRecent("2026-09-03", new Date("2026-09-03T12:00:00")) && !isRecent("2026-08-26", new Date("2026-09-03T12:00:00")), "Roleboard freshness rule failed");
data.jobs = data.jobs.filter((job) => isRecent(job.postedOn));
data.jobs.forEach((job) => { const assessment = resumeAssessments[job.id]; if (assessment) [job.match, job.fit] = assessment; });
const saved = JSON.parse(localStorage.getItem("roleboard-progress-v1") || "{}");
let expandedId = null;

const $ = (selector) => document.querySelector(selector);
const esc = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
const progressFor = (id) => ({ applied: false, stage: "Not Started", applicationDate: "", followUpDate: "", notes: "", ...(saved[id] || {}) });
const matchBand = (score) => score >= 85 ? ["Excellent", ""] : score >= 70 ? ["Good", ""] : score >= 55 ? ["Partial", "partial"] : ["Weak", "weak"];

function persist(id, patch) {
  saved[id] = { ...progressFor(id), ...patch };
  localStorage.setItem("roleboard-progress-v1", JSON.stringify(saved));
  renderMetrics();
}

function renderMetrics() {
  const progress = data.jobs.map((job) => progressFor(job.id));
  $("#metric-qualified").textContent = data.jobs.length;
  $("#metric-applied").textContent = progress.filter((item) => item.applied).length;
  $("#metric-interviews").textContent = progress.filter((item) => item.stage === "Interview").length;
  $("#metric-offers").textContent = progress.filter((item) => item.stage === "Offer").length;
}

function jobTemplate(job) {
  const p = progressFor(job.id);
  const expanded = expandedId === job.id;
  const [matchLabel, matchClass] = matchBand(job.match);
  return `<article class="job${expanded ? " expanded" : ""}${p.applied ? " applied" : ""}" data-id="${esc(job.id)}">
    <div class="job-main">
      <label class="job-cell apply-check" data-label="Applied"><span class="sr-only">Applied to ${esc(job.company)} ${esc(job.role)}</span><input class="applied-checkbox" type="checkbox" ${p.applied ? "checked" : ""}></label>
      <div class="job-cell company-role" data-label="Company & role"><span class="company">${esc(job.company)}</span><span class="role">${esc(job.role)}</span>${job.urgent ? '<span class="priority">URGENT</span>' : ""}</div>
      <div class="job-cell" data-label="Type"><span class="type-tag">${esc(job.type)}</span></div>
      <div class="job-cell location" data-label="Location"><span>${esc(job.location)}</span><span class="subtle">${esc(job.mode)}</span></div>
      <div class="job-cell pay" data-label="Pay">${esc(job.pay)}</div>
      <div class="job-cell deadline${job.urgent ? " urgent-date" : ""}" data-label="Freshness"><span>${esc(job.posted)}</span><span class="subtle">${esc(job.deadline)}</span></div>
      <div class="job-cell" data-label="Stage"><select class="stage-select" aria-label="Stage for ${esc(job.company)} ${esc(job.role)}">${stages.map((stage) => `<option ${p.stage === stage ? "selected" : ""}>${stage}</option>`).join("")}</select></div>
      <div class="job-cell match-cell ${matchClass}" data-label="Resume match"><span class="match-score">${esc(job.match)}%</span><span class="match-label">${matchLabel}</span><button class="details-button" aria-expanded="${expanded}">${expanded ? "Hide" : "View"}</button></div>
    </div>
    <div class="job-details">
      <div><h3>About the role</h3><p>${esc(job.about)}</p><p class="subtle">Posted: ${esc(job.posted)} · Eligibility: ${esc(job.eligibility)} · Confidence: ${esc(job.confidence)}</p></div>
      <div class="fit"><h3>Resume match · ${esc(job.match)}% (${matchLabel})</h3><div class="match-bar" aria-label="${esc(job.match)} percent resume match"><span style="width:${esc(job.match)}%"></span></div><p>${esc(job.fit)}</p></div>
      <div class="detail-actions"><a class="primary-link" href="${esc(job.apply)}" target="_blank" rel="noreferrer">Apply ↗</a><a class="secondary-link" href="${esc(job.source)}" target="_blank" rel="noreferrer">Source ↗</a></div>
      <div class="meta-grid">
        <label>Application date<input class="application-date" type="date" value="${esc(p.applicationDate)}"></label>
        <label>Follow-up date<input class="follow-up-date" type="date" value="${esc(p.followUpDate)}"></label>
        <label>Personal notes<textarea class="personal-notes" placeholder="Referral, preparation, recruiter contact…">${esc(p.notes)}</textarea></label>
      </div>
    </div>
  </article>`;
}

function renderJobs() {
  const query = $("#search").value.trim().toLowerCase();
  const type = $("#type-filter").value;
  const stage = $("#stage-filter").value;
  const urgentOnly = $("#urgent-filter").checked;
  const filtered = data.jobs.filter((job) => {
    const p = progressFor(job.id);
    const haystack = `${job.company} ${job.role} ${job.location} ${job.about}`.toLowerCase();
    return (!query || haystack.includes(query)) && (type === "all" || job.type === type) && (stage === "all" || p.stage === stage) && (!urgentOnly || job.urgent);
  });
  $("#jobs-list").innerHTML = filtered.map(jobTemplate).join("");
  $("#empty-state").hidden = filtered.length > 0;
}

function renderWatchlist() {
  $("#watchlist-list").innerHTML = data.watchlist.map((item) => `<article class="watch-item">
    <span class="watch-status${item.status === "Closed" ? " closed" : ""}">${esc(item.status)}</span>
    <div class="watch-company"><strong>${esc(item.company)}</strong><span>${esc(item.role)}</span></div>
    <div class="watch-reason">${esc(item.reason)}<br><a href="${esc(item.source)}" target="_blank" rel="noreferrer">View source ↗</a></div>
    <div class="watch-pay">${esc(item.pay)}</div>
  </article>`).join("");
}

$("#stage-filter").insertAdjacentHTML("beforeend", stages.map((stage) => `<option>${stage}</option>`).join(""));
$("#updated").textContent = `Last researched ${data.updated}`;
$("#freshness-rule").textContent = `Hard rule: dated within ${MAX_LISTING_AGE_DAYS} days with an open application or future deadline. Older, undated or closed openings are excluded.`;

document.addEventListener("change", (event) => {
  const jobEl = event.target.closest(".job");
  if (event.target.matches("#type-filter, #stage-filter, #urgent-filter")) return renderJobs();
  if (!jobEl) return;
  const id = jobEl.dataset.id;
  if (event.target.matches(".applied-checkbox")) {
    persist(id, { applied: event.target.checked, stage: event.target.checked && progressFor(id).stage === "Not Started" ? "Applied" : progressFor(id).stage });
    renderJobs();
  } else if (event.target.matches(".stage-select")) {
    persist(id, { stage: event.target.value, applied: event.target.value !== "Not Started" ? true : progressFor(id).applied });
    renderJobs();
  } else if (event.target.matches(".application-date")) persist(id, { applicationDate: event.target.value });
  else if (event.target.matches(".follow-up-date")) persist(id, { followUpDate: event.target.value });
});

document.addEventListener("input", (event) => {
  if (event.target.matches("#search")) return renderJobs();
  if (event.target.matches(".personal-notes")) persist(event.target.closest(".job").dataset.id, { notes: event.target.value });
});

document.addEventListener("click", (event) => {
  if (event.target.matches(".details-button")) {
    const id = event.target.closest(".job").dataset.id;
    expandedId = expandedId === id ? null : id;
    renderJobs();
  }
  if (event.target.matches("#clear-filters")) {
    $("#search").value = ""; $("#type-filter").value = "all"; $("#stage-filter").value = "all"; $("#urgent-filter").checked = false; renderJobs();
  }
  if (event.target.matches(".nav-button")) {
    const view = event.target.dataset.view;
    document.querySelectorAll(".nav-button").forEach((button) => button.classList.toggle("active", button === event.target));
    $("#opportunities-view").hidden = view !== "opportunities";
    $("#watchlist-view").hidden = view !== "watchlist";
  }
});

renderMetrics();
renderJobs();
renderWatchlist();
