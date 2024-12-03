setInterval(() => {
  chrome.storage.local.get("scheduledMessages", ({ scheduledMessages }) => {
    if (!scheduledMessages || scheduledMessages.length === 0) return;

    const now = Date.now();

    // Process messages
    scheduledMessages.forEach((message, index) => {
      const { displayName, message: text, scheduleTime, sent } = message;

      // Skip already sent messages
      if (sent) return;

      // Remove messages older than 24 hours
      if (scheduleTime <= now && now - scheduleTime > 24 * 60 * 60 * 1000) {
        console.log(
          `Removing old unsent message for display name: ${displayName}`
        );
        scheduledMessages.splice(index, 1); // Remove the message
        return;
      }

      // Check if the message should be sent now
      if (scheduleTime <= now) {
        chrome.tabs.query({ url: "*://web.whatsapp.com/*" }, (tabs) => {
          if (tabs.length > 0) {
            // Execute script to send the message
            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              func: sendScheduledMessage,
              args: [displayName, text, index],
            });
          } else {
            alert(
              "WhatsApp Web is not open. Please open WhatsApp Web to send scheduled messages."
            );
          }
        });
      }
    });
  });
}, 10000);

function sendScheduledMessage(displayName, text, index) {
  setTimeout(() => {
    // Check if the display name matches the currently open profile
    const profileNameElement = document.querySelector("._amid");
    const messageBox = document.querySelectorAll(
      "div[contenteditable='true']"
    )[1];

    if (
      !profileNameElement ||
      !profileNameElement.innerText.includes(displayName)
    ) {
      console.warn(`Profile not found or does not match: ${displayName}`);
      alert(
        `Profile "${displayName}" is not open in WhatsApp. Please open it to send the message. If not exists then delete message to remove alert!!!`
      );
      return;
    }

    if (!messageBox) {
      console.error("Message box not found.");
      alert("Message box not found. Unable to send the message.");
      return;
    }

    messageBox.focus();
    document.execCommand("insertText", false, text);
    messageBox.dispatchEvent(new Event("input", { bubbles: true }));

    setTimeout(() => {
      const sendButton = document.querySelector(
        ".x1c4vz4f.x2lah0s.xdl72j9.xfect85.x1iy03kw.x1lfpgzf"
      );
      if (!sendButton) {
        console.error("Send button not found.");
        alert(
          "Send button not found. Please ensure you can manually send a message."
        );
        return;
      }

      sendButton.click();
      console.log(`Message sent to "${displayName}" successfully!`);

      // Update message status to "sent"
      chrome.storage.local.get("scheduledMessages", ({ scheduledMessages }) => {
        if (scheduledMessages && scheduledMessages[index]) {
          scheduledMessages[index].sent = true;
          chrome.storage.local.set({ scheduledMessages });
        }
      });
    }, 500);
  }, 1000);
}
