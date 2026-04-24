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

    /** Subject column: show styled flyout only when one-line text is truncated (not native title). */
    function syncMsgSubjectTruncationForRow(tr) {
        if (!tr) return;
        var stack = tr.querySelector(".msg-subject-stack");
        var el = tr.querySelector(".msg-subject-truncate");
        var fly = tr.querySelector(".msg-subject-flyout");
        if (!stack || !el || !fly) return;
        stack.classList.remove("msg-subject-stack--trunc");
        fly.textContent = "";
        fly.setAttribute("aria-hidden", "true");
        stack.removeAttribute("tabindex");
        stack.removeAttribute("aria-label");
        var raw = stack.dataset.subjectFull || "";
        if (!String(raw).trim()) return;
        if (el.scrollWidth > el.clientWidth + 1) {
            stack.classList.add("msg-subject-stack--trunc");
            fly.textContent = raw;
            stack.setAttribute("tabindex", "0");
            stack.setAttribute("aria-label", "Subject: " + raw);
        }
    }

    function syncMsgSubjectTruncationAll(tbody) {
        if (!tbody) return;
        tbody.querySelectorAll("tr").forEach(syncMsgSubjectTruncationForRow);
    }

    function buildAdminReplySubject(base) {
        var s = (base || "").trim();
        if (!s) return "Re: Your message";
        if (/^re:\s*/i.test(s)) {
            return s.length > 200 ? s.slice(0, 200) : s;
        }
        var r = "Re: " + s;
        return r.length > 200 ? r.slice(0, 200) : r;
    }

    A.renderMessages = async function (options) {
        A._lastMessagesListOptions = options || {};
        if (!A._adminDraftReplyDelegationBound) {
            var msgBodyEl = document.getElementById("msg-body");
            if (msgBodyEl) {
                A._adminDraftReplyDelegationBound = true;
                msgBodyEl.addEventListener("click", async function (ev) {
                    var sendBtn = ev.target.closest && ev.target.closest(".admin-ai-draft-send");
                    var cancelBtn = ev.target.closest && ev.target.closest(".admin-ai-draft-cancel");
                    if (sendBtn) {
                        ev.preventDefault();
                        var wrap = sendBtn.closest(".admin-ai-draft-compose");
                        if (!wrap) return;
                        var ta = wrap.querySelector(".admin-ai-draft-input");
                        if (!ta) return;
                        var rid = wrap.getAttribute("data-receiver-user-id");
                        if (!rid) {
                            w.showAppFlash("admin-flash", "Missing recipient for this message.", "danger", 5000);
                            return;
                        }
                        var enc = wrap.getAttribute("data-reply-subject-enc") || "";
                        var base = "";
                        try {
                            base = decodeURIComponent(enc);
                        } catch {
                            base = "";
                        }
                        var subj = buildAdminReplySubject(base);
                        var body = (ta.value || "").trim();
                        if (!body) {
                            w.showAppFlash("admin-flash", "Draft is empty.", "warning", 4000);
                            return;
                        }
                        sendBtn.disabled = true;
                        var cancel = wrap.querySelector(".admin-ai-draft-cancel");
                        if (cancel) cancel.disabled = true;
                        try {
                            var res = await sendMessage(subj, body, rid, null);
                            if (!res.ok) {
                                w.showAppFlash(
                                    "admin-flash",
                                    res.message || "Send failed.",
                                    "danger",
                                    7000
                                );
                                return;
                            }
                            w.showAppFlash("admin-flash", "Reply sent.", "success", 3500);
                            var opts = A._lastMessagesListOptions || { page: 1, pageSize: 50 };
                            await A.renderMessages(opts);
                            if (typeof A.refreshAdminInboxUnreadUi === "function") {
                                await A.refreshAdminInboxUnreadUi(false);
                            }
                        } finally {
                            sendBtn.disabled = false;
                            if (cancel) cancel.disabled = false;
                        }
                        return;
                    }
                    if (cancelBtn) {
                        ev.preventDefault();
                        var wrapC = cancelBtn.closest(".admin-ai-draft-compose");
                        if (!wrapC) return;
                        var taC = wrapC.querySelector(".admin-ai-draft-input");
                        if (!taC) return;
                        var orig = taC.dataset.originalDraft;
                        if (orig === undefined) orig = "";
                        taC.value = orig;
                        var det = wrapC.closest("details");
                        if (det) det.open = false;
                    }
                });
            }
        }
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
                '<details class="admin-msg-details"><summary class="small">Show</summary>' +
                '<div class="admin-staff-read-panel mt-1">' +
                '<pre class="admin-msg-pre small mb-0">' +
                escapeHtml(contentRaw) +
                "</pre></div></details>";
            const senderTopic = messageCategoryHuman(
                pick(m, "senderSuggestedCategory", "SenderSuggestedCategory")
            );
            const senderUserId = pick(m, "senderUserId", "SenderUserId");
            const subjectRawForReply = pick(m, "subject", "Subject") || "";
            const aiCatRaw = pick(m, "aiSuggestedCategory", "AiSuggestedCategory");
            const aiCell = A.formatAiAssistCell(
                aiCatRaw,
                pick(m, "aiConfidence", "AiConfidence"),
                pick(m, "aiSuggestedPriority", "AiSuggestedPriority"),
                pick(m, "aiSummary", "AiSummary"),
                pick(m, "aiSuggestedReplyDraft", "AiSuggestedReplyDraft"),
                pick(m, "aiExtractedJson", "AiExtractedJson"),
                pick(m, "aiModelVersion", "AiModelVersion"),
                {
                    receiverUserId: senderUserId,
                    replySubjectBase: subjectRawForReply
                }
            );
            const needsReassist = aiCatRaw == null || String(aiCatRaw).trim() === "";
            var reassistLabel = needsReassist ? "Get AI assist" : "Re-run AI";
            var reassistHint = needsReassist ? "Use if this message was sent without hints." : "";
            const reassistBlock =
                '<div class="mt-1"><button type="button" class="btn btn-outline-secondary btn-sm msg-reassist-ai" data-id="' +
                escapeHtml(String(id)) +
                '">' +
                escapeHtml(reassistLabel) +
                "</button>" +
                (reassistHint
                    ? '<div class="text-muted small">' + escapeHtml(reassistHint) + "</div>"
                    : "") +
                "</div>";
            const senderUserName = (pick(m, "senderUserName", "SenderUserName") || "").trim();
            const senderLabel = senderUserName || "—";
            const fromCell = senderUserId
                ? '<button type="button" class="btn btn-outline-secondary btn-sm admin-msg-sender-profile" data-user-id="' +
                  escapeHtml(String(senderUserId)) +
                  '" title="Open their account record" aria-label="View sender account">' +
                  escapeHtml(senderLabel) +
                  "</button>"
                : "<span>" + escapeHtml(senderLabel) + "</span>";
            const subjectRaw = subjectRawForReply;
            const subjectEsc = escapeHtml(subjectRaw);
            tr.innerHTML =
                "<td>" +
                fromCell +
                "</td>" +
                '<td class="msg-subject-cell">' +
                '<span class="msg-subject-stack">' +
                '<span class="msg-subject-truncate">' +
                subjectEsc +
                "</span>" +
                '<span class="msg-subject-flyout" aria-hidden="true"></span>' +
                "</span>" +
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
                      escapeHtml(String(id)) +
                      '">Mark read</button>') +
                "</td>" +
                '<td class="msg-cat-cell">' +
                '<div class="admin-select-apply">' +
                '<select class="custom-select custom-select-sm msg-cat" data-id="' +
                escapeHtml(String(id)) +
                '">' +
                '<option value="" selected>Choose…</option>' +
                '<option value="0">Course inquiry</option>' +
                '<option value="1">Complaint</option>' +
                '<option value="2">Feedback</option>' +
                '<option value="4">Technical support</option>' +
                '<option value="5">General question</option>' +
                '<option value="3">Other</option>' +
                "</select>" +
                '<button type="button" class="btn btn-outline-primary btn-sm btn-admin-confirm msg-cat-confirm" data-id="' +
                escapeHtml(String(id)) +
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
            var subjStack = tr.querySelector(".msg-subject-stack");
            if (subjStack) subjStack.dataset.subjectFull = subjectRaw;
            const sel = tr.querySelector(".msg-cat");
            if (sel) {
                var prevVal = finalCat != null && finalCat !== "" ? String(finalCat) : "";
                sel.value = prevVal;
                if (prevVal === "") sel.selectedIndex = 0;
                sel.setAttribute("data-prev-final", prevVal);
            }
            syncMsgCatConfirmState(tr);
            var draftWrap = tr.querySelector(".admin-ai-draft-compose");
            if (draftWrap) {
                var draftTa = draftWrap.querySelector(".admin-ai-draft-input");
                if (draftTa) draftTa.dataset.originalDraft = draftTa.value;
            }
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

        if (!A._msgSubjectResizeBound) {
            A._msgSubjectResizeBound = true;
            var deb;
            w.addEventListener("resize", function () {
                clearTimeout(deb);
                deb = setTimeout(function () {
                    syncMsgSubjectTruncationAll(document.getElementById("msg-body"));
                }, 150);
            });
        }

        if (items.length) {
            msgTable.classList.remove("d-none");
            w.requestAnimationFrame(function () {
                w.requestAnimationFrame(function () {
                    syncMsgSubjectTruncationAll(tbody);
                });
            });
        }

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

    };
})(typeof window !== "undefined" ? window : this);
