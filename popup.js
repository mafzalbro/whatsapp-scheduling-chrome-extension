document?.addEventListener("DOMContentLoaded", () => {
  // Initially show the permission request
  chrome?.storage?.local?.get(["isLoggedIn"], ({ isLoggedIn }) => {
    if (!isLoggedIn) {
      showPermissionRequest();
    }
  });

  chrome.tabs.query({ url: "*://web.whatsapp.com/*" }, (tabs) => {
    if (tabs.length === 0) {
      chrome.tabs.create({ url: "https://web.whatsapp.com", active: true });
    }
  });
});

function showPermissionRequest() {
  const permissionForm = document.getElementById("permission-form");
  const container = document.getElementById("container");
  permissionForm.style.display = "block"; // Show permission request
  container.style.display = "none"; // Hide the schedule form

  // Handle "Allow Permission" click
  document.getElementById("allow-permission").addEventListener("click", () => {
    openWhatsAppWebInBackground((loggedIn) => {
      if (loggedIn) {
        chrome.storage.local.set(
          { whatsappPermission: true, isLoggedIn: true },
          () => {
            permissionForm.style.display = "none";
            container.style.display = "block";
            showScheduleForm();
          }
        );
      } else {
        alert("Please log in to WhatsApp Web to continue.");
      }
    });
  });

  // Handle "Deny Permission" click
  // document.getElementById("deny-permission").addEventListener("click", () => {
  //   alert(
  //     "Permission denied. The extension will not work without access to WhatsApp Web."
  //   );
  // });
}

function showScheduleForm() {
  const permissionForm = document.getElementById("permission-form");
  const container = document.getElementById("container");
  permissionForm.style.display = "none"; // Hide permission request
  container.style.display = "block"; // Show the schedule form
}

console.log(chrome);

function openWhatsAppWebInBackground(callback) {
  // Open WhatsApp Web in a background tab
  chrome.tabs.create(
    { url: "https://web.whatsapp.com", active: false },
    (tab) => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
        if (tabId === tab.id && changeInfo.status === "complete") {
          chrome.scripting.executeScript(
            {
              target: { tabId },
              func: checkWhatsAppLoginStatusOnPage,
            },
            (results) => {
              const isLoggedIn = results[0]?.result;
              console.log("Results from WhatsApp Web:", results, isLoggedIn);
              chrome.tabs.remove(tabId); // Close the background tab
              callback(isLoggedIn);
              chrome.tabs.onUpdated.removeListener(listener); // Clean up the listener
            }
          );
        }
      });
    }
  );
}

function checkWhatsAppLoginStatusOnPage() {
  // Wait for a few seconds before checking the login status
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(!document.body.innerText.includes("Log in"));
    }, 3000); // Wait for 3 seconds
  });
}

function showScheduleForm() {
  document.getElementById("schedule-section").style.display = "block";
}

document.addEventListener("DOMContentLoaded", () => {
  handleHashChange();

  window.addEventListener("hashchange", handleHashChange);

  // Schedule a message
  document
    .getElementById("schedule-form")
    .addEventListener("submit", (event) => {
      event.preventDefault();
      const displayName = document.getElementById("display-name").value.trim();
      const message = document.getElementById("message").value.trim();
      const delayMinutes = parseInt(document.getElementById("delay").value, 10); // Delay in minutes

      if (
        !displayName ||
        !message ||
        isNaN(delayMinutes) ||
        delayMinutes <= 0
      ) {
        alert("Please fill in all fields correctly.");
        return;
      }

      const delayMilliseconds = delayMinutes * 60 * 1000; // Convert minutes to milliseconds
      const scheduleTime = Date.now() + delayMilliseconds;
      const timestamp = new Date().toLocaleString();

      // Save scheduled message with 'sent' set to false
      chrome.storage.local.get("scheduledMessages", ({ scheduledMessages }) => {
        const messages = scheduledMessages || [];
        messages.push({
          displayName,
          message,
          scheduleTime,
          timestamp,
          sent: false, // Added 'sent: false'
        });
        chrome.storage.local.set({ scheduledMessages: messages });
        chrome.tabs.query({ url: "*://web.whatsapp.com/*" }, (tabs) => {
          if (tabs.length === 0) {
            openWhatsAppWebInBackground((loggedIn) => {
              if (loggedIn) {
                permissionForm.style.display = "none";
                container.style.display = "block";
                showScheduleForm();
              } else {
                alert("Please log in to WhatsApp Web to continue.");
              }
            });
          }
        });
        alert("Message scheduled successfully!");
      });

      document.getElementById("schedule-form").reset();
    });

  // View Message History
  document.getElementById("view-history").addEventListener("click", () => {
    window.location.hash = "#history";
  });

  // Back to schedule section
  document.getElementById("back-to-schedule").addEventListener("click", () => {
    window.location.hash = "#schedule";
  });
});

// Handle hash changes to switch between schedule and history views
function handleHashChange() {
  const hash = window.location.hash;

  if (hash === "#history") {
    document.getElementById("schedule-section").style.display = "none";
    document.getElementById("history-section").style.display = "block";
    document.getElementById("view-history").style.display = "none";
    loadHistory();
  } else {
    document.getElementById("schedule-section").style.display = "block";
    document.getElementById("history-section").style.display = "none";
    document.getElementById("view-history").style.display = "inline-block";
  }
}

// Load message history
function loadHistory() {
  chrome.storage.local.get("scheduledMessages", ({ scheduledMessages }) => {
    const list = document.getElementById("history-list");
    const history = scheduledMessages || [];
    const now = Date.now();

    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    let totalMessagesSent = 0;

    list.innerHTML = ""; // Clear existing content

    history.forEach(
      ({ displayName, message, timestamp, scheduleTime, sent }, index) => {
        const sentTime = new Date(timestamp).getTime();
        const timeDiff = Math.floor((now + 10000 - sentTime) / 60000); // Time difference in minutes
        const isScheduled = scheduleTime > now;

        // Create the history box
        const div = document.createElement("div");
        div.classList.add("history-box");

        // Create status
        let statusText = "";
        if (isScheduled) {
          const minutesLeft = Math.floor((scheduleTime - now) / 60000) + 1;
          statusText = `<span class="status scheduled">Scheduled (${minutesLeft} mins left)</span>`;
        } else if (sent) {
          statusText = `<span class="status sent">Sent (${timeDiff} mins ago)</span>`;
          totalMessagesSent++;
        } else {
          statusText = `<span class="status not-sent">Not Sent</span>`;
        }

        div.innerHTML = `
        <div class="header">
          <h3>${displayName}</h3>
          ${statusText}
        </div>
        <p class="message">"${message}"</p>
        <div class="actions">
          <button class="remove-btn">Remove</button>
        </div>
      `;

        // Add remove button functionality
        div.querySelector(".remove-btn").onclick = () => {
          history.splice(index, 1);
          chrome.storage.local.set({ scheduledMessages: history });
          loadHistory(); // Refresh the list
        };

        list.appendChild(div);
      }
    );

    document.getElementById("total-sent-count").textContent = totalMessagesSent;

    if (history.length === 0) {
      list.innerHTML =
        '<p class="no-messages">No messages in the last 24 hours.</p>';
    }
  });
}

setInterval(() => {
  loadHistory();
}, 1000);
