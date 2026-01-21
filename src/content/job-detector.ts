const JOB_PAGE_PATTERNS = [
  { host: "linkedin.com", path: "/jobs/" },
  { host: "indeed.com", path: "" },
  { host: "glassdoor.com", path: "/job-listing/" },
  { host: "greenhouse.io", path: "" },
  { host: "lever.co", path: "" },
  { host: "wellfound.com", path: "/jobs/" },
];

function isJobPage(): boolean {
  const url = window.location.href;
  const host = window.location.hostname;
  
  return JOB_PAGE_PATTERNS.some(pattern => 
    host.includes(pattern.host) && 
    (pattern.path === "" || url.includes(pattern.path))
  );
}

function extractJobData(): { content: string; title?: string; company?: string } {
  const url = window.location.href;
  let content = "";
  let title: string | undefined;
  let company: string | undefined;

  if (url.includes("linkedin.com")) {
    const titleEl = document.querySelector(".job-details-jobs-unified-top-card__job-title");
    const companyEl = document.querySelector(".job-details-jobs-unified-top-card__company-name");
    const descEl = document.querySelector(".jobs-description__content");
    title = titleEl?.textContent?.trim();
    company = companyEl?.textContent?.trim();
    content = descEl?.textContent?.trim() || document.body.innerText.substring(0, 10000);
  } else if (url.includes("indeed.com")) {
    const titleEl = document.querySelector("[data-testid='jobsearch-JobInfoHeader-title']") || 
                    document.querySelector(".jobsearch-JobInfoHeader-title");
    const companyEl = document.querySelector("[data-testid='inlineHeader-companyName']") ||
                      document.querySelector(".jobsearch-InlineCompanyRating-companyHeader");
    const descEl = document.querySelector("#jobDescriptionText");
    title = titleEl?.textContent?.trim();
    company = companyEl?.textContent?.trim();
    content = descEl?.textContent?.trim() || document.body.innerText.substring(0, 10000);
  } else if (url.includes("greenhouse.io")) {
    const titleEl = document.querySelector(".app-title") || document.querySelector("h1");
    const companyEl = document.querySelector(".company-name");
    const descEl = document.querySelector("#content") || document.querySelector(".content");
    title = titleEl?.textContent?.trim();
    company = companyEl?.textContent?.trim();
    content = descEl?.textContent?.trim() || document.body.innerText.substring(0, 10000);
  } else if (url.includes("lever.co")) {
    const titleEl = document.querySelector(".posting-headline h2");
    const companyEl = document.querySelector(".posting-categories .sort-by-team");
    const descEl = document.querySelector(".posting-content");
    title = titleEl?.textContent?.trim();
    company = companyEl?.textContent?.trim();
    content = descEl?.textContent?.trim() || document.body.innerText.substring(0, 10000);
  } else if (url.includes("glassdoor.com")) {
    const titleEl = document.querySelector("[data-test='job-title']") || document.querySelector("h1");
    const companyEl = document.querySelector("[data-test='employer-name']");
    const descEl = document.querySelector(".jobDescriptionContent") || document.querySelector("#JobDescriptionContainer");
    title = titleEl?.textContent?.trim();
    company = companyEl?.textContent?.trim();
    content = descEl?.textContent?.trim() || document.body.innerText.substring(0, 10000);
  } else if (url.includes("wellfound.com")) {
    const titleEl = document.querySelector("h1");
    const companyEl = document.querySelector("[data-test='StartupName']");
    const descEl = document.querySelector("[data-test='JobDescription']");
    title = titleEl?.textContent?.trim();
    company = companyEl?.textContent?.trim();
    content = descEl?.textContent?.trim() || document.body.innerText.substring(0, 10000);
  } else {
    title = document.title;
    content = document.body.innerText.substring(0, 10000);
  }

  return { content, title, company };
}

function notifyBackgroundOfJobPage() {
  if (!isJobPage()) return;

  chrome.runtime.sendMessage({
    type: "JOB_PAGE_DETECTED",
    payload: {
      url: window.location.href,
      title: document.title,
    },
  }).catch(() => {});
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "EXTRACT_JOB") {
    const jobData = extractJobData();
    sendResponse(jobData);
    return true;
  }

  if (message.type === "SAVE_CURRENT_PAGE") {
    const jobData = extractJobData();
    chrome.runtime.sendMessage({
      type: "SAVE_JOB",
      payload: {
        url: window.location.href,
        content: jobData.content,
        title: jobData.title,
        company: jobData.company,
      },
    }).then(sendResponse).catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  return false;
});

notifyBackgroundOfJobPage();

console.log("[Wall-E] Job detector content script loaded");
