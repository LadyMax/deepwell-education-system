(function (w) {
    "use strict";

    var S = w.DeepwellShared;
    if (!S) {
        console.error("Missing shared-dashboard.js (load before student-messages.js).");
        return;
    }

    var messageCategoryHuman = S.messageCategoryHuman;
    var escapeHtml = S.escapeHtml;
    var St = (w.DeepwellStudent = w.DeepwellStudent || {});

    St.setStudentInboxUnreadBadge = function (count) {
        const el = document.getElementById("student-msg-unread-badge");
        if (!el) return;
        if (count > 0) {
            el.textContent = count > 99 ? "99+" : String(count);
            el.classList.remove("d-none");
        } else {
            el.textContent = "";
            el.classList.add("d-none");
        }
    };

    St.refreshStudentInboxUnreadUi = async function (showIntroFlash) {
        if (typeof getInboxUnreadCount !== "function") return;
        try {
            const data = await getInboxUnreadCount();
            const count = Number(data.count != null ? data.count : data.Count) || 0;
            St.setStudentInboxUnreadBadge(count);
            if (showIntroFlash && count > 0) {
                const msg =
                    count === 1
                        ? "You have 1 unread message in your inbox"
                        : "You have " + count + " unread messages in your inbox";
                showAppFlash("student-flash", msg, "inbox", undefined, "inbox-unread");
            }
        } catch (_) {}
    };

    St.loadInbox = async function () {
        const page = await getInbox(1, 50);
        if (!page.ok) {
            showAppFlash("student-flash", page.message || "Failed to load inbox", "danger", 5000);
        }
        document.getElementById("inbox-loading").classList.add("d-none");
        const items = page.items || page.Items || [];
        if (items.length === 0) {
            document.getElementById("inbox-empty").classList.remove("d-none");
            document.getElementById("inbox-table").classList.add("d-none");
            document.getElementById("inbox-table").classList.remove("d-table");
            return;
        }
        document.getElementById("inbox-empty").classList.add("d-none");
        const tbody = document.getElementById("inbox-body");
        tbody.innerHTML = "";
        items.forEach(function (m) {
            const id = pick(m, "id", "Id");
            const tr = document.createElement("tr");
            const readAt = pick(m, "readAt", "ReadAt");
            tr.innerHTML =
                "<td>" +
                escapeHtml(String(pick(m, "senderEmail", "SenderEmail") || "")) +
                "</td>" +
                "<td>" +
                escapeHtml(String(pick(m, "subject", "Subject") || "")) +
                "</td>" +
                "<td>" +
                escapeHtml(new Date(pick(m, "createdAt", "CreatedAt")).toLocaleString()) +
                "</td>" +
                "<td>" +
                (readAt ? "Yes" : "No") +
                "</td>" +
                "<td>" +
                (readAt
                    ? "—"
                    : '<button type="button" class="btn btn-outline-primary btn-sm mark-read" data-id="' +
                      escapeHtml(String(id)) +
                      '">Mark read</button>') +
                "</td>";
            tbody.appendChild(tr);
        });
        tbody.querySelectorAll(".mark-read").forEach(function (btn) {
            btn.addEventListener("click", async function () {
                const id = btn.getAttribute("data-id");
                const r = await markMessageRead(id);
                if (!r.ok) {
                    showAppFlash("student-flash", r.message || "Failed to mark as read", "danger", 5000);
                    return;
                }
                await St.loadInbox();
                await St.refreshStudentInboxUnreadUi(false);
            });
        });
        document.getElementById("inbox-table").classList.remove("d-none");
        document.getElementById("inbox-table").classList.add("d-table");
    };

    St.loadSent = async function () {
        const page = await getSent(1, 50);
        if (!page.ok) {
            showAppFlash("student-flash", page.message || "Failed to load sent messages", "danger", 5000);
        }
        document.getElementById("sent-loading").classList.add("d-none");
        const items = page.items || page.Items || [];
        if (!items.length) {
            document.getElementById("sent-empty").classList.remove("d-none");
            document.getElementById("sent-table").classList.add("d-none");
            document.getElementById("sent-table").classList.remove("d-table");
            return;
        }
        document.getElementById("sent-empty").classList.add("d-none");
        const tbody = document.getElementById("sent-body");
        tbody.innerHTML = "";
        items.forEach(function (m) {
            const tr = document.createElement("tr");
            tr.innerHTML =
                "<td>" +
                escapeHtml(
                    String(messageCategoryHuman(pick(m, "senderSuggestedCategory", "SenderSuggestedCategory")))
                ) +
                "</td>" +
                "<td>" +
                escapeHtml(String(pick(m, "subject", "Subject") || "")) +
                "</td>" +
                "<td>" +
                escapeHtml(new Date(pick(m, "createdAt", "CreatedAt")).toLocaleString()) +
                "</td>";
            tbody.appendChild(tr);
        });
        document.getElementById("sent-table").classList.remove("d-none");
        document.getElementById("sent-table").classList.add("d-table");
    };

    St.showMessagesTabAndSent = function () {
        if (!window.jQuery || typeof jQuery.fn.tab !== "function") return;
        jQuery("#sc-tab-messages").tab("show");
        window.setTimeout(function () {
            jQuery("#msg-tab-sent").tab("show");
        }, 0);
    };

    St.onSendMessageClick = async function () {
        const subject = document.getElementById("msg-subject").value.trim();
        const content = document.getElementById("msg-content").value.trim();
        const topicSel = document.getElementById("msg-topic");
        const topic = topicSel ? topicSel.value : "";
        if (!subject || !content) {
            showAppFlash("student-flash", "Subject and message content are required", "warning", 4500);
            return;
        }
        var sendRes = await sendMessage(subject, content, null, topic || undefined);
        if (!sendRes.ok) {
            showAppFlash("student-flash", sendRes.message || "Failed to send message", "danger", 6000);
            return;
        }
        showAppFlash("student-flash", "Message sent", "success", 3500);
        document.getElementById("msg-subject").value = "";
        document.getElementById("msg-content").value = "";
        if (topicSel) topicSel.value = "";
        await St.loadInbox();
        await St.loadSent();
        St.showMessagesTabAndSent();
    };
})(typeof window !== "undefined" ? window : this);
