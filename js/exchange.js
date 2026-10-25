/* ManiDealsCampus - Campus Exchange Management */

import { 
  auth, 
  db, 
  onAuthStateChanged,
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc 
} from "./firebase-config.js";
import { guardRoute, showToast } from "./app.js";

// Check authentication status
guardRoute(true);

onAuthStateChanged(auth, (user) => {
  if (user) {
    loadExchangeRequests(user.uid);
  }
});

async function loadExchangeRequests(userId) {
  const sentList = document.getElementById("sent-requests-list");
  const recvList = document.getElementById("received-requests-list");

  if (!sentList || !recvList) return;

  sentList.innerHTML = `<div style="text-align:center; padding:2rem;"><div class="loader" style="margin:0 auto 1rem;"></div>Loading sent proposals...</div>`;
  recvList.innerHTML = `<div style="text-align:center; padding:2rem;"><div class="loader" style="margin:0 auto 1rem;"></div>Loading received proposals...</div>`;

  try {
    // Queries
    const sentQ = query(collection(db, "exchanges"), where("senderId", "==", userId));
    const recvQ = query(collection(db, "exchanges"), where("receiverId", "==", userId));

    const [sentSnap, recvSnap] = await Promise.all([
      getDocs(sentQ),
      getDocs(recvQ)
    ]);

    // Render Sent
    if (sentSnap.empty) {
      sentList.innerHTML = `<div class="empty-state"><i class="fas fa-paper-plane"></i><p>You haven't proposed any exchanges yet.</p></div>`;
    } else {
      sentList.innerHTML = "";
      sentSnap.forEach(docSnap => {
        const req = docSnap.data();
        const card = document.createElement("div");
        card.className = "panel-card glass";
        card.style.marginBottom = "1.5rem";
        
        let badgeClass = "badge-pending";
        if (req.status === "accepted") badgeClass = "badge-approved";
        if (req.status === "rejected") badgeClass = "badge-delete";

        card.innerHTML = `
          <div class="panel-header">
            <h3>To: ${req.receiverName}</h3>
            <span class="badge ${badgeClass}">${req.status}</span>
          </div>
          <div style="margin-bottom:1rem;">
            <p><strong>Target Item:</strong> ${req.targetProductTitle}</p>
            <p><strong>Your Proposal Offer:</strong> "${req.proposal}"</p>
          </div>
          <div style="font-size:0.8rem; color:var(--text-muted);">
            Proposed: ${new Date(req.createdAt).toLocaleDateString()}
          </div>
        `;
        sentList.appendChild(card);
      });
    }

    // Render Received
    if (recvSnap.empty) {
      recvList.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i><p>No exchange offers received yet.</p></div>`;
    } else {
      recvList.innerHTML = "";
      recvSnap.forEach(docSnap => {
        const req = docSnap.data();
        const reqId = docSnap.id;
        const card = document.createElement("div");
        card.className = "panel-card glass";
        card.style.marginBottom = "1.5rem";
        card.id = `exchange-${reqId}`;

        let badgeClass = "badge-pending";
        if (req.status === "accepted") badgeClass = "badge-approved";
        if (req.status === "rejected") badgeClass = "badge-delete";

        const isPending = req.status === "pending";

        card.innerHTML = `
          <div class="panel-header">
            <h3>From: ${req.senderName}</h3>
            <span class="badge ${badgeClass}" id="badge-${reqId}">${req.status}</span>
          </div>
          <div style="margin-bottom:1rem;">
            <p><strong>Item They Want:</strong> ${req.targetProductTitle}</p>
            <p><strong>Their Exchange Offer:</strong> "${req.proposal}"</p>
          </div>
          <div style="font-size:0.8rem; color:var(--text-muted); display:flex; justify-content:space-between; align-items:center;">
            <span>Received: ${new Date(req.createdAt).toLocaleDateString()}</span>
            ${isPending ? `
              <div class="pending-actions" id="actions-${reqId}">
                <button class="btn btn-primary btn-sm accept-req-btn" data-id="${reqId}" style="padding: 6px 12px; font-size: 0.8rem;">Accept</button>
                <button class="btn btn-secondary btn-sm reject-req-btn" data-id="${reqId}" style="padding: 6px 12px; font-size: 0.8rem;">Reject</button>
              </div>
            ` : ""}
          </div>
        `;
        recvList.appendChild(card);
      });

      // Attach button events
      document.querySelectorAll(".accept-req-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          const rId = e.currentTarget.getAttribute("data-id");
          await handleStatusChange(rId, "accepted");
        });
      });

      document.querySelectorAll(".reject-req-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          const rId = e.currentTarget.getAttribute("data-id");
          await handleStatusChange(rId, "rejected");
        });
      });
    }

  } catch (err) {
    showToast("Failed to load exchange listings: " + err.message, "error");
  }
}

async function handleStatusChange(requestId, newStatus) {
  try {
    await updateDoc(doc(db, "exchanges", requestId), {
      status: newStatus
    });
    
    showToast(`Exchange proposal ${newStatus}!`, "success");
    
    // Update Badge in UI
    const badge = document.getElementById(`badge-${requestId}`);
    if (badge) {
      badge.className = `badge ${newStatus === 'accepted' ? 'badge-approved' : 'badge-delete'}`;
      badge.textContent = newStatus;
    }
    
    // Remove Action Buttons
    document.getElementById(`actions-${requestId}`)?.remove();
  } catch (err) {
    showToast("Status update failed: " + err.message, "error");
  }
}
