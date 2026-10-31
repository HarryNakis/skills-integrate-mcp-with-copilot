document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const teacherStatus = document.getElementById("teacher-status");
  const teacherLoginButton = document.getElementById("teacher-login-button");
  const teacherLogoutButton = document.getElementById("teacher-logout-button");
  const teacherLoginDialog = document.getElementById("teacher-login-dialog");
  const teacherLoginForm = document.getElementById("teacher-login-form");
  const teacherLoginFeedback = document.getElementById("teacher-login-feedback");
  const teacherAccessNote = document.getElementById("teacher-access-note");
  let teacherToken = null;
  let teacherUsername = null;
  let messageTimeout;

  function showMessage(message, type) {
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    clearTimeout(messageTimeout);
    messageTimeout = setTimeout(() => messageDiv.classList.add("hidden"), 5000);
  }

  function updateTeacherUi() {
    const isTeacher = Boolean(teacherToken);
    teacherStatus.textContent = isTeacher
      ? `Signed in as ${teacherUsername}`
      : "Viewing as a student";
    teacherLoginButton.classList.toggle("hidden", isTeacher);
    teacherLogoutButton.classList.toggle("hidden", !isTeacher);
    teacherAccessNote.classList.toggle("hidden", isTeacher);
    signupForm.querySelectorAll("input, select, button").forEach((control) => {
      control.disabled = !isTeacher;
    });
  }

  function authorizationHeaders() {
    return teacherToken ? { Authorization: `Bearer ${teacherToken}` } : {};
  }

  function handleExpiredSession(response) {
    if (response.status === 401 && teacherToken) {
      teacherToken = null;
      teacherUsername = null;
      updateTeacherUi();
      fetchActivities();
      return true;
    }
    return false;
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      if (!response.ok) {
        throw new Error("Activity request failed");
      }
      const activities = await response.json();

      activitiesList.innerHTML = "";
      activitySelect.replaceChildren(activitySelect.options[0]);

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map((email) => `<li>
                    <span class="participant-email">${email}</span>
                    ${teacherToken ? `<button class="delete-btn" type="button" data-activity="${name}" data-email="${email}">Remove</button>` : ""}
                  </li>`)
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: authorizationHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        const expired = handleExpiredSession(response);
        showMessage(
          expired ? "Your session expired. Please sign in again." : result.detail || "An error occurred",
          "error"
        );
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: authorizationHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        fetchActivities();
      } else {
        const expired = handleExpiredSession(response);
        showMessage(
          expired ? "Your session expired. Please sign in again." : result.detail || "An error occurred",
          "error"
        );
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  teacherLoginButton.addEventListener("click", () => {
    teacherLoginFeedback.classList.add("hidden");
    teacherLoginForm.reset();
    teacherLoginDialog.showModal();
  });

  document.getElementById("teacher-login-cancel").addEventListener("click", () => {
    teacherLoginDialog.close();
  });

  teacherLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("teacher-username").value.trim();
    const password = document.getElementById("teacher-password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.detail || "Sign-in failed");
      }

      teacherToken = result.access_token;
      teacherUsername = result.username;
      updateTeacherUi();
      teacherLoginDialog.close();
      await fetchActivities();
    } catch (error) {
      teacherLoginFeedback.textContent = error.message || "Sign-in failed. Please try again.";
      teacherLoginFeedback.className = "error login-feedback";
    }
  });

  teacherLogoutButton.addEventListener("click", async () => {
    let logoutMessage = "Signed out.";
    try {
      const response = await fetch("/auth/logout", {
        method: "POST",
        headers: authorizationHeaders(),
      });
      if (!response.ok) {
        logoutMessage = "Signed out on this device; the server session could not be revoked.";
      }
    } catch {
      logoutMessage = "Signed out on this device; the server session could not be reached.";
    }

    teacherToken = null;
    teacherUsername = null;
    updateTeacherUi();
    await fetchActivities();
    showMessage(logoutMessage, logoutMessage === "Signed out." ? "success" : "info");
  });

  updateTeacherUi();
  fetchActivities();
});
