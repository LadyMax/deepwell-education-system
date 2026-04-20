(function (w) {
    "use strict";

    var S = w.DeepwellShared;
    if (!S) {
        console.error("Missing shared-dashboard.js (load before student-messages.js).");
        return;
    }

    var messageCategoryHuman = S.messageCategoryHuman;
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
                        ? "You have 1 unread message in your inbox."
                        : "You have " + count + " unread messages in your inbox.";
                showAppFlash("student-flash", msg, "inbox", undefined, "inbox-unread");
            }
        } catch (_) {}
    };

    St.loadInbox = async function () {
        const page = await getInbox(1, 50);
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
                pick(m, "senderEmail", "SenderEmail") +
                "</td>" +
                "<td>" +
                pick(m, "subject", "Subject") +
                "</td>" +
                "<td>" +
                new Date(pick(m, "createdAt", "CreatedAt")).toLocaleString() +
                "</td>" +
                "<td>" +
                (readAt ? "Yes" : "No") +
                "</td>" +
                "<td>" +
                (readAt
                    ? "—"
                    : '<button type="button" class="btn btn-outline-primary btn-sm mark-read" data-id="' +
                      id +
                      '">Mark read</button>') +
                "</td>";
            tbody.appendChild(tr);
        });
        tbody.querySelectorAll(".mark-read").forEach(function (btn) {
            btn.addEventListener("click", async function () {
                const id = btn.getAttribute("data-id");
                const r = await markMessageRead(id);
                if (!r.ok) {
                    alert(r.message || "Failed to mark as read.");
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
                messageCategoryHuman(pick(m, "senderSuggestedCategory", "SenderSuggestedCategory")) +
                "</td>" +
                "<td>" +
                pick(m, "subject", "Subject") +
                "</td>" +
                "<td>" +
                new Date(pick(m, "createdAt", "CreatedAt")).toLocaleString() +
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
            showAppFlash("student-flash", "Subject and message content are required.", "warning", 4500);
            return;
        }
        try {
            await sendMessage(subject, content, null, topic || undefined);
            showAppFlash("student-flash", "Message sent.", "success", 3500);
            document.getElementById("msg-subject").value = "";
            document.getElementById("msg-content").value = "";
            if (topicSel) topicSel.value = "";
            await St.loadInbox();
            await St.loadSent();
            St.showMessagesTabAndSent();
        } catch (err) {
            showAppFlash("student-flash", err.message || "Failed to send message.", "danger", 6000);
        }
    };
})(typeof window !== "undefined" ? window : this);
