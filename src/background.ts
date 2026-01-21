interface SaveJobMessage {
  type: "SAVE_JOB";
  payload: {
    url: string;
    content: string;
    title?: string;
    company?: string;
  };
}

interface SaveJobResponse {
  success: boolean;
  error?: string;
  jobId?: number;
}

type Message = SaveJobMessage | { type: "GET_AUTH_TOKEN" } | { type: "PING" };

const STORAGE_KEY_SERVER_URL = "serverUrl";
const DEFAULT_SERVER_URL = "http://localhost:3033";

async function getServerUrl(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY_SERVER_URL], (result: { [key: string]: string | undefined }) => {
      resolve(result[STORAGE_KEY_SERVER_URL] || DEFAULT_SERVER_URL);
    });
  });
}

function getAuthToken(): string {
  return chrome.runtime.id;
}

async function saveJobToEve(payload: SaveJobMessage["payload"]): Promise<SaveJobResponse> {
  try {
    const serverUrl = await getServerUrl();
    const token = getAuthToken();

    const response = await fetch(`${serverUrl}/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-eve-token": token,
      },
      body: JSON.stringify({
        url: payload.url,
        content: payload.content,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Eve API error: ${response.status} - ${errorText}` };
    }

    const result = await response.json();
    return { success: true, jobId: result.jobId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: `Failed to connect to Eve: ${message}` };
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "save-job-to-eve",
      title: "Save Job to Eve",
      contexts: ["page", "selection"],
      documentUrlPatterns: [
        "https://*.linkedin.com/jobs/*",
        "https://*.indeed.com/*",
        "https://*.glassdoor.com/*",
        "https://*.greenhouse.io/*",
        "https://*.lever.co/*",
        "https://*.wellfound.com/*",
      ],
    });
    console.log("[Wall-E] Context menu created");
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "save-job-to-eve" || !tab?.id) return;

  console.log("[Wall-E] Context menu clicked, requesting page content...");

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractJobFromPage,
    });

    const jobData = results[0]?.result;
    if (!jobData) {
      console.error("[Wall-E] Failed to extract job data");
      showNotification("Failed to extract job data from page", "error");
      return;
    }

    const response = await saveJobToEve({
      url: tab.url || "",
      content: jobData.content,
      title: jobData.title,
      company: jobData.company,
    });

    if (response.success) {
      showNotification("Job saved to Eve!", "success");
    } else {
      showNotification(response.error || "Failed to save job", "error");
    }
  } catch (error) {
    console.error("[Wall-E] Error saving job:", error);
    showNotification("Error saving job", "error");
  }
});

function extractJobFromPage(): { content: string; title?: string; company?: string } | null {
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

function showNotification(message: string, type: "success" | "error") {
  console.log(`[Wall-E] ${type.toUpperCase()}: ${message}`);
  chrome.runtime.sendMessage({
    type: "NOTIFICATION",
    payload: { message, notificationType: type },
  }).catch(() => {});
}

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  if (message.type === "SAVE_JOB") {
    saveJobToEve(message.payload).then(sendResponse);
    return true;
  }

  if (message.type === "GET_AUTH_TOKEN") {
    sendResponse({ token: getAuthToken() });
    return true;
  }

  if (message.type === "PING") {
    sendResponse({ pong: true });
    return true;
  }

  return false;
});

console.log("[Wall-E] Background service worker initialized");
