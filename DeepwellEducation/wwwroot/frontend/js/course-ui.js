(function (global) {
    /** Canonical languageCode values for the eight school languages (ISO-style, lowercase). */
    var LANGUAGE_BY_CODE = {
        zh: 'Chinese',
        en: 'English',
        fr: 'French',
        sv: 'Swedish',
        it: 'Italian',
        ja: 'Japanese',
        es: 'Spanish',
        de: 'German'
    };

    var LEVEL_LABELS = { 0: 'Beginner', 1: 'Intermediate', 2: 'Advanced' };

    function categoryLabel(v) {
        return Number(v) === 0 ? 'Language' : '—';
    }

    function courseLanguageCode(c) {
        return (c.languageCode || c.subjectCode || '').toLowerCase().trim();
    }

    function languageLabelFromCourse(c) {
        // Always prefer a stable label from languageCode so UI is consistent
        // even if database LanguageName varies (e.g., "Spanish" vs "Español").
        var code = courseLanguageCode(c);
        if (LANGUAGE_BY_CODE[code]) return LANGUAGE_BY_CODE[code];
        var named = c.languageName || c.subjectName;
        if (named) return named;
        return c.languageCode || c.subjectCode || '—';
    }

    function normalizeLangFilter(raw) {
        if (raw == null || raw === '') return null;
        var k = String(raw).toLowerCase().trim();
        return LANGUAGE_BY_CODE[k] != null ? k : null;
    }

    /** @returns {number|null} 0 Beginner, 1 Intermediate, 2 Advanced, or null = no filter */
    function normalizeLevelFilter(raw) {
        if (raw == null || raw === '') return null;
        var s = String(raw).toLowerCase().trim();
        if (s === '0' || s === 'beginner') return 0;
        if (s === '1' || s === 'intermediate') return 1;
        if (s === '2' || s === 'advanced') return 2;
        var n = Number(s);
        if (n === 0 || n === 1 || n === 2) return n;
        return null;
    }

    function levelLabel(v) {
        return LEVEL_LABELS[v] != null ? LEVEL_LABELS[v] : '—';
    }

    function escapeHtml(s) {
        if (s == null || s === '') return '';
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    function truncate(s, n) {
        if (!s) return '';
        return s.length <= n ? s : s.slice(0, n) + '…';
    }

    function formatLanguageLine(c) {
        var code = courseLanguageCode(c);
        var name =
            (code && LANGUAGE_BY_CODE[code]) ||
            c.languageName ||
            c.subjectName ||
            '';
        var rawCode = c.languageCode || c.subjectCode || code || '';
        if (name && code) return name + ' (' + code + ')';
        return name || rawCode || '—';
    }

    function levelNumber(v) {
        var n = Number(v);
        if (n === 1 || n === 2) return n;
        return 0;
    }

    function buildDetailContent(c) {
        var language = languageLabelFromCourse(c);
        var lvl = levelNumber(c.level);
        var levelText = levelLabel(c.level);
        var duration = lvl === 0 ? '8 weeks' : (lvl === 1 ? '10 weeks' : '12 weeks');
        var intensity = lvl === 0 ? 'light to moderate' : (lvl === 1 ? 'moderate' : 'moderate to intensive');
        return {
            audience: [
                'Learners interested in practical ' + language + ' communication.',
                'Current level: ' + levelText + '.',
                'Recommended weekly commitment: ' + intensity + ' study pace.'
            ],
            outcomes: [
                'Use ' + language + ' confidently in daily life and classroom scenarios.',
                'Improve listening, speaking, reading, and writing with guided feedback.',
                'Build vocabulary and grammar patterns for real situations.'
            ],
            highlights: [
                'Small-group activities with speaking-focused sessions.',
                'Structured homework and progress checkpoints.',
                'Teacher feedback on pronunciation and fluency.',
                'Practical culture and communication context.'
            ],
            modules: [
                'Week 1-2: Foundations and essential expressions.',
                'Week 3-4: Grammar patterns and guided dialogues.',
                'Week 5-6: Reading/listening comprehension and vocabulary expansion.',
                'Week 7+: Applied communication project and review (' + duration + ' plan).'
            ]
        };
    }

    function renderList(el, items, ordered) {
        if (!el) return;
        var tag = ordered ? 'ol' : 'ul';
        var html = '';
        items.forEach(function (t) {
            html += '<li>' + escapeHtml(t) + '</li>';
        });
        // keep parent type but fully refresh content
        el.innerHTML = html;
        if (el.tagName.toLowerCase() !== tag) {
            // no-op: markup already defines element types; this is a safety note.
        }
    }

    function firstN(items, n) {
        return (items || []).slice(0, n);
    }

    function fetchJson(url) {
        return fetch(url, { headers: { Accept: 'application/json' } }).then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        });
    }

    function appendCatalogCourseCard(rowEl, c, i) {
        var imgN = (i % 6) + 1;
        var col = document.createElement('div');
        col.className = 'col-lg-4 col-md-6 mb-4';
        var langBadge = languageLabelFromCourse(c);
        var detail = buildDetailContent(c);
        var quickPoints = firstN(detail.highlights, 2)
            .map(function (p) { return '<li>' + escapeHtml(p) + '</li>'; })
            .join('');
        col.innerHTML =
            '<div class="rounded overflow-hidden mb-2">' +
            '<img class="img-fluid" src="images/course-' + imgN + '.jpg" alt="">' +
            '<div class="bg-secondary p-4">' +
            '<div class="d-flex justify-content-between align-items-center mb-2 flex-wrap">' +
            '<span class="badge badge-primary mb-1">' +
            escapeHtml(langBadge) +
            '</span>' +
            '<small class="text-muted m-0">' + escapeHtml(levelLabel(c.level)) + '</small>' +
            '</div>' +
            '<div class="mb-3">' +
            '<small class="m-0 text-muted">' +
            escapeHtml(formatLanguageLine(c)) +
            '</small></div>' +
            '<a class="h5 d-block" href="course-detail.html?id=' +
            encodeURIComponent(c.id) +
            '">' +
            escapeHtml(c.name) +
            '</a>' +
            '<ul class="mt-2 mb-3 pl-3 small text-dark">' + quickPoints + '</ul>' +
            '<div class="border-top mt-4 pt-4">' +
            '<p class="text-muted small mb-2">' +
            escapeHtml(truncate(c.description, 140)) +
            '</p>' +
            '<a class="btn btn-outline-primary btn-sm" href="course-detail.html?id=' + encodeURIComponent(c.id) + '">View full details</a>' +
            '</div></div></div>';
        rowEl.appendChild(col);
    }

    function renderCatalog(rowEl, statusEl, languageCodeRaw, filterBannerEl, levelRaw) {
        if (!rowEl) return;
        var langFilter = normalizeLangFilter(languageCodeRaw);
        var levelFilter = normalizeLevelFilter(levelRaw);

        if (filterBannerEl) {
            var parts = [];
            if (langFilter != null) {
                parts.push(
                    'Language: <strong>' + escapeHtml(LANGUAGE_BY_CODE[langFilter]) + '</strong>'
                );
            }
            if (levelFilter != null) {
                parts.push('Level: <strong>' + escapeHtml(LEVEL_LABELS[levelFilter]) + '</strong>');
            }
            if (parts.length) {
                filterBannerEl.classList.remove('d-none');
                filterBannerEl.innerHTML =
                    parts.join(' · ') + ' · <a href="course.html">Clear filters</a>';
            } else {
                filterBannerEl.classList.add('d-none');
                filterBannerEl.innerHTML = '';
            }
        }

        if (statusEl) statusEl.textContent = 'Loading courses…';
        fetchJson('/api/Courses')
            .then(function (courses) {
                if (langFilter != null) {
                    courses = courses.filter(function (c) {
                        return courseLanguageCode(c) === langFilter;
                    });
                }
                if (levelFilter != null) {
                    courses = courses.filter(function (c) {
                        return Number(c.level) === levelFilter;
                    });
                }
                if (statusEl) statusEl.textContent = '';
                rowEl.innerHTML = '';
                if (!courses.length) {
                    if (statusEl) {
                        if (langFilter != null || levelFilter != null) {
                            statusEl.textContent = 'No courses match these filters.';
                        } else {
                            statusEl.textContent = 'No courses available yet.';
                        }
                    }
                    return;
                }
                courses.forEach(function (c, i) {
                    appendCatalogCourseCard(rowEl, c, i);
                });
            })
            .catch(function () {
                if (statusEl) statusEl.textContent = 'Could not load courses. Is the API running?';
            });
    }

    /** Home page: show first N courses from the same API as the catalog. */
    function renderHomePopular(rowEl, statusEl, opts) {
        opts = opts || {};
        var limit = typeof opts.limit === 'number' && opts.limit > 0 ? opts.limit : 6;
        var levelFilter = normalizeLevelFilter(opts.level);
        var languageCodes = Array.isArray(opts.languageCodes) ? opts.languageCodes : null;
        if (!rowEl) return;
        if (statusEl) statusEl.textContent = 'Loading courses…';
        fetchJson('/api/Courses')
            .then(function (courses) {
                if (statusEl) statusEl.textContent = '';
                rowEl.innerHTML = '';
                if (levelFilter != null) {
                    courses = courses.filter(function (c) { return Number(c.level) === levelFilter; });
                }
                if (languageCodes && languageCodes.length) {
                    var allowed = {};
                    languageCodes.forEach(function (c) {
                        if (c) allowed[String(c).toLowerCase().trim()] = true;
                    });
                    courses = courses.filter(function (c) {
                        return allowed[courseLanguageCode(c)] === true;
                    });
                }

                // Prefer one course per language (e.g. Beginner) for a "featured" home section.
                var byLang = {};
                courses.forEach(function (c) {
                    var k = courseLanguageCode(c);
                    if (!k) return;
                    if (!byLang[k]) byLang[k] = c;
                });
                var ordered = [];
                Object.keys(LANGUAGE_BY_CODE).forEach(function (k) {
                    if (byLang[k]) ordered.push(byLang[k]);
                });
                // Fallback: if data has unexpected language codes, append remaining.
                courses.forEach(function (c) {
                    if (ordered.indexOf(c) === -1) ordered.push(c);
                });

                var list = firstN(ordered, limit);
                if (!list.length) {
                    if (statusEl) statusEl.textContent = 'No courses available yet.';
                    return;
                }
                list.forEach(function (c, i) {
                    appendCatalogCourseCard(rowEl, c, i);
                });
            })
            .catch(function () {
                if (statusEl) statusEl.textContent = 'Could not load courses. Is the API running?';
            });
    }

    function bindApplyButton(courseId) {
        var applyBtn = document.getElementById('cd-apply-btn');
        var applyStatus = document.getElementById('cd-apply-status');
        if (!applyBtn || !applyStatus) return;

        function setApplyStatus(message, variant, html) {
            var v = variant || 'info';
            applyStatus.className = 'app-flash app-flash--' + v + ' mb-0 mt-2';
            applyStatus.classList.remove('d-none');
            if (html) applyStatus.innerHTML = message;
            else applyStatus.textContent = message;
        }

        applyBtn.onclick = async function () {
            var token = localStorage.getItem('token');
            if (!token) {
                setApplyStatus('You must login first before applying. <a href="login.html" class="text-primary">Go to Login</a>', 'warning', true);
                return;
            }
            if (!courseId) {
                setApplyStatus('Please open a valid course detail page first.', 'danger');
                return;
            }
            if (typeof submitJoinRequest !== 'function') {
                setApplyStatus('Application service is not available right now.', 'danger');
                return;
            }
            applyBtn.disabled = true;
            setApplyStatus('Submitting request...', 'info');
            try {
                var res = await submitJoinRequest(courseId);
                if (!res || !res.ok) {
                    setApplyStatus((res && res.message) ? res.message : 'Could not submit request.', 'danger');
                } else {
                    setApplyStatus('Application submitted. You can track it in My account.', 'success');
                }
            } catch (e) {
                setApplyStatus(e && e.message ? e.message : 'Could not submit request.', 'danger');
            } finally {
                applyBtn.disabled = false;
            }
        };
    }

    function renderDetail(statusEl, articleEl, courseId) {
        bindApplyButton(courseId);
        if (!articleEl) return;
        if (!courseId) {
            if (statusEl) statusEl.textContent = 'Please open a course from the course list to view full details.';
            articleEl.style.display = 'block';
            return;
        }
        if (statusEl) statusEl.textContent = 'Loading…';
        articleEl.style.display = 'none';
        fetchJson('/api/Courses/' + encodeURIComponent(courseId))
            .then(function (c) {
                if (statusEl) statusEl.textContent = '';
                var detail = buildDetailContent(c);
                document.getElementById('cd-title').textContent = c.name || '';
                document.getElementById('cd-category').textContent = languageLabelFromCourse(c);
                document.getElementById('cd-level').textContent = levelLabel(c.level);
                document.getElementById('cd-subject').textContent = formatLanguageLine(c);
                document.getElementById('cd-desc').textContent = c.description || '—';
                renderList(document.getElementById('cd-for-list'), detail.audience, false);
                renderList(document.getElementById('cd-outcome-list'), detail.outcomes, false);
                renderList(document.getElementById('cd-highlight-list'), detail.highlights, false);
                renderList(document.getElementById('cd-module-list'), detail.modules, true);
                bindApplyButton(c.id);
                articleEl.style.display = 'block';
            })
            .catch(function () {
                if (statusEl) statusEl.textContent = 'Course not found or could not load.';
            });
    }

    global.DeepwellCourse = {
        renderCatalog: renderCatalog,
        renderHomePopular: renderHomePopular,
        renderDetail: renderDetail,
        categoryLabel: categoryLabel,
        levelLabel: levelLabel,
        languageLabelFromCourse: languageLabelFromCourse,
        normalizeLevelFilter: normalizeLevelFilter,
        LANGUAGE_BY_CODE: LANGUAGE_BY_CODE
    };
})(window);
