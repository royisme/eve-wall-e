/**
 * Floating button that appears on job listing pages
 * Allows users to quickly open the Wall-E side panel
 */

const BUTTON_ID = "wall-e-floating-button";
const BUTTON_HTML = `
  <button id="${BUTTON_ID}" aria-label="Open Wall-E Assistant" title="Open Wall-E Assistant">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
      <path d="M2 17l10 5 10-5"></path>
      <path d="M2 12l10 5 10-5"></path>
    </svg>
  </button>
`;

const BUTTON_STYLES = `
  #${BUTTON_ID} {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    color: white;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4), 0 2px 4px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    animation: slideInUp 0.4s ease-out;
  }

  #${BUTTON_ID}:hover {
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 8px 16px rgba(102, 126, 234, 0.5), 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  #${BUTTON_ID}:active {
    transform: translateY(0) scale(0.98);
  }

  #${BUTTON_ID} svg {
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
  }

  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Pulse animation when job is detected */
  #${BUTTON_ID}.pulse {
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% {
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4), 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    50% {
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.8), 0 2px 8px rgba(102, 126, 234, 0.3);
    }
  }
`;

function createFloatingButton() {
  // Check if button already exists
  if (document.getElementById(BUTTON_ID)) {
    return;
  }

  // Inject styles
  const styleEl = document.createElement("style");
  styleEl.textContent = BUTTON_STYLES;
  document.head.appendChild(styleEl);

  // Create button
  const container = document.createElement("div");
  container.innerHTML = BUTTON_HTML;
  const button = container.firstElementChild as HTMLButtonElement;

  // Add click handler to open side panel
  button.addEventListener("click", async () => {
    try {
      await chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" });
    } catch (error) {
      console.error("[Wall-E] Failed to open side panel:", error);
    }
  });

  // Insert into page
  document.body.appendChild(button);
  console.log("[Wall-E] Floating button created");
}

function removeFloatingButton() {
  const button = document.getElementById(BUTTON_ID);
  if (button) {
    button.remove();
    console.log("[Wall-E] Floating button removed");
  }
}

function pulseButton() {
  const button = document.getElementById(BUTTON_ID);
  if (button) {
    button.classList.add("pulse");
    setTimeout(() => button.classList.remove("pulse"), 3000);
  }
}

// Export for use in job-detector
export { createFloatingButton, removeFloatingButton, pulseButton };

// Auto-create button when script loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", createFloatingButton);
} else {
  createFloatingButton();
}
