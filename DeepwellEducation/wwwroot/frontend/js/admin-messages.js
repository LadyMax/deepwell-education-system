(function (w) {
    "use strict";

    var S = w.DeepwellShared;
    if (!S) {
        console.error("Missing shared-dashboard.js (load before admin-messages.js).");
        return;
    }

    var escapeHtml = S.escapeHtml;
    var messageCategoryHuman = S.messageCategoryHuman;
    var A = w.DeepwellAdmin;
    if (!A || typeof A.formatAiAssistCell !== "function") {
        console.error("Missing admin-ai-format.js (load before admin-messages.js).");
        return;
    }
    var setInlineStatus = A.setInlineStatus || function (id, message) {
        var el = document.getElementById(id);
        if (el) el.textContent = message || "";
    };

    function syncMsgCatConfirmState(row, loading) {
        if (!row) return;
        var sel = row.querySelector(".msg-cat");
        var btn = row.querySelector(".msg-cat-confirm");
        if (!sel || !btn) return;
        var v = sel.value;
        var prev = sel.getAttribute("data-prev-final") || "";
        var dirty = v !== "" && v !== prev;
        if (loading) {
            btn.disabled = true;
            return;
        }
        btn.disabled = !dirty;
    }

    function contactMessagesSummaryText(count) {
        if (count === 0) return "No messages";
        if (count === 1) return "1 message";
        return count + " messages";
    }

    A.renderMessages = async function (options) {
        const msgTable = document.getElementById("msg-table");
        const tbody = document.getElementById("msg-body");
        setInlineStatus("status", "Loading…", "info");
        tbody.innerHTML = "";
        msgTable.classList.add("d-none");

        const page = await w.getAdminMessages(options || { page: 1, pageSize: 50 });
        if (page.forbidden) {
            setInlineStatus("status", A.staffForbiddenNote(), "danger");
            return;
        }
        if (page.error) {
            setInlineStatus("status", page.error, "danger");
            return;
        }
        const items = page.items || page.Items || [];
        setInlineStatus("status", contactMessagesSummaryText(items.length), "info");
        items.sort(function (a, b) {
            var pa = A.priorityRank(
                A.effectiveSuggestedPriority(
                    pick(a, "aiSuggestedPriority", "AiSuggestedPriority"),
                    pick(a, "aiSuggestedCategory", "AiSuggestedCategory"),
                    pick(a, "aiSummary", "AiSummary")
                )
            );
            var pb = A.priorityRank(
                A.effectiveSuggestedPriority(
                    pick(b, "aiSuggestedPriority", "AiSuggestedPriority"),
                    pick(b, "aiSuggestedCategory", "AiSuggestedCategory"),
                    pick(b, "aiSummary", "AiSummary")
                )
            );
            if (pb !== pa) return pb - pa;
            var da = new Date(pick(a, "createdAt", "CreatedAt") || 0).getTime();
            var dbe = new Date(pick(b, "createdAt", "CreatedAt") || 0).getTime();
            return dbe - da;
        });
        items.forEach(function (m) {
            const tr = document.createElement("tr");
            const id = pick(m, "id", "Id");
            const finalCat = pick(m, "finalCategory", "FinalCategory");
            const readAt = pick(m, "readAt", "ReadAt");
            const isRead = !!readAt;
            const contentRaw = pick(m, "content", "Content") || "";
            const preview =
                '<details class="admin-msg-details"><summary class="small">Show</summary><pre class="admin-msg-pre small mb-0 mt-1">' +
                escapeHtml(contentRaw) +
                "</pre></details>";
            const senderTopic = messageCategoryHuman(
                pick(m, "senderSuggestedCategory", "SenderSuggestedCategory")
            );
            const aiCatRaw = pick(m, "aiSuggestedCategory", "AiSuggestedCategory");
            const aiCell = A.formatAiAssistCell(
                aiCatRaw,
                pick(m, "aiConfidence", "AiConfidence"),
                pick(m, "aiSuggestedPriority", "AiSuggestedPriority"),
                pick(m, "aiSummary", "AiSummary"),
                pick(m, "aiSuggestedReplyDraft", "AiSuggestedReplyDraft"),
                pick(m, "aiExtractedJson", "AiExtractedJson"),
                pick(m, "aiModelVersion", "AiModelVersion")
            );
            const needsReassist = aiCatRaw == null || String(aiCatRaw).trim() === "";
            const reassistBlock = needsReassist
                ? '<div class="mt-1"><button type="button" class="btn btn-link btn-sm p-0 msg-reassist-ai" data-id="' +
                  escapeHtml(String(id)) +
                  '">Get AI assist</button><div class="text-muted small">Use if this message was sent without hints.</div></div>'
                : "";
            const senderUserId = pick(m, "senderUserId", "SenderUserId");
            const senderUserName = (pick(m, "senderUserName", "SenderUserName") || "").trim();
            const senderLabel = senderUserName || "—";
            const fromCell = senderUserId
                ? '<button type="button" class="btn btn-link btn-sm p-0 text-left admin-msg-sender-profile" data-user-id="' +
                  escapeHtml(String(senderUserId)) +
                  '" title="Open their account record" aria-label="View sender account">' +
                  escapeHtml(senderLabel) +
                  "</button>"
                : "<span>" + escapeHtml(senderLabel) + "</span>";
            const subjectRaw = pick(m, "subject", "Subject") || "";
            const subjectEsc = escapeHtml(subjectRaw);
            const subjectTitleAttr =
                subjectRaw.trim() !== "" ? ' title="' + escapeHtml(subjectRaw) + '"' : "";
            tr.innerHTML =
                "<td>" +
                fromCell +
                "</td>" +
                "<td" +
                subjectTitleAttr +
                ">" +
                subjectEsc +
                "</td>" +
                "<td>" +
                preview +
                "</td>" +
                "<td>" +
                senderTopic +
                "</td>" +
                "<td>" +
                aiCell +
                reassistBlock +
                "</td>" +
                "<td>" +
                (isRead
                    ? "Yes"
                    : 'No <button type="button" class="btn btn-outline-primary btn-sm ml-2 msg-mark-read" data-id="' +
                      id +
                      '">Mark read</button>') +
                "</td>" +
                '<td class="msg-cat-cell">' +
                '<div class="admin-select-apply">' +
                '<select class="custom-select custom-select-sm msg-cat" data-id="' +
                id +
                '">' +
                '<option value="" selected>Choose…</option>' +
                '<option value="0">Course inquiry</option>' +
                '<option value="1">Complaint</option>' +
                '<option value="2">Feedback</option>' +
                '<option value="3">Other</option>' +
                "</select>" +
                '<button type="button" class="btn btn-outline-secondary btn-sm btn-admin-confirm msg-cat-confirm" data-id="' +
                id +
                '" disabled>Confirm</button>' +
                "</div></td>";
            var msgColLabels = [
                "From",
                "Subject",
                "Message",
                "Sender topic",
                "AI assist",
                "Read",
                "Final category"
            ];
            tr.querySelectorAll("td").forEach(function (td, idx) {
                if (msgColLabels[idx]) td.setAttribute("data-label", msgColLabels[idx]);
            });
            tbody.appendChild(tr);
            const sel = tr.querySelector(".msg-cat");
            if (sel) {
                var prevVal = finalCat != null && finalCat !== "" ? String(finalCat) : "";
                sel.value = prevVal;
                if (prevVal === "") sel.selectedIndex = 0;
                sel.setAttribute("data-prev-final", prevVal);
            }
            syncMsgCatConfirmState(tr);
        });

        tbody.querySelectorAll(".msg-cat").forEach(function (sel) {
            sel.addEventListener("change", function () {
                syncMsgCatConfirmState(sel.closest("tr"));
            });
        });

        tbody.querySelectorAll(".msg-cat-confirm").forEach(function (btn) {
            btn.addEventListener("click", async function () {
                const tr = btn.closest("tr");
                const sel = tr ? tr.querySelector(".msg-cat") : null;
                if (!sel) return;
                const id = sel.getAttribute("data-id");
                const v = sel.value;
                const prev = sel.getAttribute("data-prev-final") || "";
                if (v === "" || v === prev) return;
                syncMsgCatConfirmState(tr, true);
                const r = await w.categorizeMessage(id, Number(v));
                if (!r.ok) {
                    w.showAppFlash("admin-flash", r.message || "Failed to update category.", "danger", 6000);
                    sel.value = prev;
                    syncMsgCatConfirmState(tr);
                    return;
                }
                sel.setAttribute("data-prev-final", v);
                w.showAppFlash("admin-flash", "Category saved.", "success", 3500);
                await A.renderMessages(options);
            });
        });

        tbody.querySelectorAll(".msg-mark-read").forEach(function (btn) {
            btn.addEventListener("click", async function () {
                const id = btn.getAttribute("data-id");
                if (!id) return;
                btn.disabled = true;
                const r = await w.markMessageRead(id);
                if (!r.ok) {
                    btn.disabled = false;
                    w.showAppFlash(
                        "admin-flash",
                        r.message || "Only the receiver can mark this message as read.",
                        "warning",
                        5000
                    );
                    return;
                }
                w.showAppFlash("admin-flash", "Message marked as read.", "success", 3000);
                await A.renderMessages(options);
                await A.refreshAdminInboxUnreadUi(false);
            });
        });

        tbody.querySelectorAll(".msg-reassist-ai").forEach(function (btn) {
            btn.addEventListener("click", async function () {
                const id = btn.getAttribute("data-id");
                if (!id) return;
                btn.disabled = true;
                const r = await w.reassistMessageAi(id);
                if (!r.ok) {
                    btn.disabled = false;
                    w.showAppFlash(
                        "admin-flash",
                        r.message || "Could not get AI assist. Is the AI service running?",
                        "danger",
                        7000
                    );
                    return;
                }
                w.showAppFlash("admin-flash", "AI assist updated.", "success", 3000);
                await A.renderMessages(options);
            });
        });

        if (items.length) msgTable.classList.remove("d-none");
    };
})(typeof window !== "undefined" ? window : this);
