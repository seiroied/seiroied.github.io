// This is the core script for your Mini App
document.addEventListener("DOMContentLoaded", () => {
  const tg = window.Telegram.WebApp;
  const form = document.getElementById("userInfoForm");
  const messageBox = document.getElementById("messageBox");

  // Your Google Apps Script Web App URL
  const GAS_URL =
    "https://script.google.com/macros/s/AKfycbzdCDW2bArm57Irhhe-_gdZIZDkRQrLgey1PNrgH8SySk-64JXUu2nlu-hHvypGGhA/exec";

  // Initialize the Telegram Mini App
  tg.ready();

  // Expand the app to full height
  tg.expand();

  // Configure and show the main button in Telegram, which will submit the form
  tg.MainButton.text = "ببت اطلاعات";
  tg.MainButton.show();

  // When the main button is clicked, it programmatically submits the form
  tg.MainButton.onClick(() => {
    // Check if the form is valid before submitting
    if (form.checkValidity()) {
      submitFormData();
    } else {
      // If form is not valid, you can show a hint or just rely on browser validation popups
      tg.showAlert("Please fill out all required fields.");
    }
  });

  // We listen for the 'submit' event, which is triggered by MainButton.onClick
  form.addEventListener("submit", (event) => {
    event.preventDefault(); // Prevent default browser submission
    submitFormData();
  });

  async function submitFormData() {
    // Disable button to prevent multiple submissions
    tg.MainButton.showProgress();
    tg.MainButton.disable();

    // Get form data
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Add Telegram user info if available
    if (tg.initDataUnsafe.user) {
      data.telegram_user_id = tg.initDataUnsafe.user.id;
      data.telegram_username = tg.initDataUnsafe.user.username || "N/A";
      data.telegram_first_name = tg.initDataUnsafe.user.first_name;
      data.telegram_last_name = tg.initDataUnsafe.user.last_name || "N/A";
    }

    try {
      // Send data to Google Apps Script using fetch
      const response = await fetch(GAS_URL, {
        method: "POST",
        redirect: "follow", // Important for GAS
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "text/plain;charset=utf-8", // GAS needs text/plain for POST
        },
      });

      const result = await response.json();

      if (result.status === "success") {
        // Show success message
        showMessage(
          "Data submitted successfully! This window will close shortly.",
          "success"
        );
        // Optionally, send a confirmation message back to the bot
        tg.sendData(
          JSON.stringify({ status: "success", message: "Form submitted!" })
        );
        // Close the Mini App after a short delay
        setTimeout(() => {
          tg.close();
        }, 2000);
      } else {
        throw new Error(result.message || "An unknown error occurred.");
      }
    } catch (error) {
      // Show error message if submission fails
      showMessage(`Error: ${error.message}`, "error");
      tg.MainButton.hideProgress();
      tg.MainButton.enable();
    }
  }

  function showMessage(message, type) {
    messageBox.textContent = message;
    messageBox.className = `message-box ${type}`;
    messageBox.style.display = "block";
  }
});
