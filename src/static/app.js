document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper to escape HTML in participant names/emails
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Clear and reset activity select to avoid duplicated options when refreshing
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants HTML
        let participantsHtml = '';
        if (details.participants && details.participants.length > 0) {
          participantsHtml = `
            <div class="participants">
              <div class="participants-title">Participants</div>
              <ul class="participants-list">
                ${details.participants.map(p => `<li><span class="participant-name">${escapeHtml(p)}</span><button class="delete-participant" data-activity="${escapeHtml(name)}" data-email="${escapeHtml(p)}" title="Unregister">&times;</button></li>`).join('')}
              </ul>
            </div>
          `;
        } else {
          participantsHtml = `
            <div class="participants">
              <div class="participants-title">Participants</div>
              <p class="no-participants">No participants yet</p>
            </div>
          `;
        }

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHtml}
        `;

        activitiesList.appendChild(activityCard);

        // Attach delete handlers for participant buttons inside this card
        activityCard.querySelectorAll('.delete-participant').forEach((btn) => {
          btn.addEventListener('click', async (e) => {
            const activityName = btn.getAttribute('data-activity');
            const email = btn.getAttribute('data-email');

            // Confirm action with the user
            const ok = confirm(`Remove ${email} from ${activityName}?`);
            if (!ok) return;

            try {
              const url = `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`;
              const res = await fetch(url, { method: 'DELETE' });
              const result = await res.json();

              if (res.ok) {
                // Refresh the list to reflect removal
                fetchActivities();
                messageDiv.textContent = result.message;
                messageDiv.className = 'success';
                messageDiv.classList.remove('hidden');
                setTimeout(() => messageDiv.classList.add('hidden'), 4000);
              } else {
                messageDiv.textContent = result.detail || 'Failed to unregister participant';
                messageDiv.className = 'error';
                messageDiv.classList.remove('hidden');
              }
            } catch (err) {
              console.error('Error unregistering participant:', err);
              messageDiv.textContent = 'Failed to unregister. Please try again.';
              messageDiv.className = 'error';
              messageDiv.classList.remove('hidden');
            }
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities to show updated participants immediately
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
