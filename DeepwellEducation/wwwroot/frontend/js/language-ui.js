(function (global) {
    var LANGUAGE_DETAILS = {
        zh: {
            name: "Chinese",
            country: "China, Taiwan, Singapore",
            family: "Sino-Tibetan",
            speakers: "1.1B+ total speakers",
            intro: "Chinese (Mandarin) is one of the world's most influential languages for communication, trade, and modern culture.",
            usage: [
                "Official in China and Taiwan; also one of the official languages in Singapore.",
                "Widely used by Chinese-speaking communities across Asia, Europe, and North America.",
                "Important in global trade, manufacturing, and cross-border business.",
            ],
            countryFacts: [
                "China combines long historical traditions with rapidly growing innovation sectors.",
                "Major cities connect advanced technology with rich cultural heritage.",
                "Festivals like Lunar New Year are celebrated globally.",
            ],
            image: "images/country/greatwall.png",
        },
        en: {
            name: "English",
            country:
                "United Kingdom, United States, Canada, Australia and more",
            family: "Indo-European (Germanic)",
            speakers: "1.5B+ including second-language users",
            intro: "English is the leading global bridge language for education, technology, and international communication.",
            usage: [
                "Official or widely used in many countries across all continents.",
                "Dominant language in international aviation, academia, and global media.",
                "Frequently used as a common working language in multinational teams.",
            ],
            countryFacts: [
                "The UK is known for literary history and globally recognized universities.",
                "English-speaking countries have diverse cultures and accents.",
                "A large portion of online professional resources is first published in English.",
            ],
            image: "images/country/london.png",
        },
        fr: {
            name: "French",
            country: "France, Belgium, Switzerland, Canada, parts of Africa",
            family: "Indo-European (Romance)",
            speakers: "300M+ worldwide",
            intro: "French is a major international language with strong influence in diplomacy, arts, and global institutions.",
            usage: [
                "Official in multiple countries across Europe, Africa, and North America.",
                "One of the working languages of many international institutions.",
                "Useful for study, tourism, and cultural industries.",
            ],
            countryFacts: [
                "France is globally recognized for art, cuisine, fashion, and architecture.",
                "French-speaking Africa includes fast-growing multilingual markets.",
                "French cultural works continue to shape global film and literature.",
            ],
            image: "images/country/paris.png",
        },
        sv: {
            name: "Swedish",
            country: "Sweden, parts of Finland",
            family: "Indo-European (North Germanic)",
            speakers: "10M+ native speakers",
            intro: "Swedish supports daily life, education, and career growth in Sweden and broader Nordic contexts.",
            usage: [
                "Primary language in Sweden and one of official languages in Finland.",
                "Useful for local integration, employment, and public services in Sweden.",
                "Provides a gateway to understanding other Scandinavian languages.",
            ],
            countryFacts: [
                "Sweden is known for innovation, sustainability, and high quality of life.",
                "Swedish society emphasizes equality, trust, and work-life balance.",
                "Key sectors include technology, engineering, and design.",
            ],
            image: "images/country/stockholm.png",
        },
        it: {
            name: "Italian",
            country: "Italy, parts of Switzerland",
            family: "Indo-European (Romance)",
            speakers: "65M+ native speakers",
            intro: "Italian combines cultural richness with practical value in tourism, arts, and design industries.",
            usage: [
                "Official in Italy and one of official languages in Switzerland.",
                "Widely studied for culture, cuisine, music, and travel.",
                "Useful in fashion, design, and high-end manufacturing sectors.",
            ],
            countryFacts: [
                "Italy has major historical cities and UNESCO heritage sites.",
                "Italian food culture and craftsmanship are globally recognized.",
                "Italian cultural history strongly influences global art and architecture.",
            ],
            image: "images/country/florence.png",
        },
        ja: {
            name: "Japanese",
            country: "Japan",
            family: "Japonic",
            speakers: "125M+ native speakers",
            intro: "Japanese is highly valuable for engaging with Japan's technology, business ecosystem, and cultural industries.",
            usage: [
                "Primary language in Japan with broad use in business and education.",
                "Important for careers linked to Japanese companies and supply chains.",
                "Widely used in media sectors such as animation, games, and design.",
            ],
            countryFacts: [
                "Japan is a global leader in manufacturing, robotics, and innovation.",
                "Japanese culture mixes traditional arts with cutting-edge urban life.",
                "Communication style emphasizes context awareness and politeness levels.",
            ],
            image: "images/country/fuji.png",
        },
        es: {
            name: "Spanish",
            country: "Spain, Latin America, parts of the United States",
            family: "Indo-European (Romance)",
            speakers: "560M+ total speakers",
            intro: "Spanish is one of the largest world languages, connecting people across Europe and the Americas.",
            usage: [
                "Official in over 20 countries, especially in Latin America.",
                "Extensively used in international business, healthcare, and education.",
                "Useful for travel, cultural exchange, and regional market access.",
            ],
            countryFacts: [
                "Spanish-speaking countries are diverse in culture, economy, and history.",
                "Spain and Latin America have globally influential music and literature.",
                "Spanish media and entertainment content has wide international reach.",
            ],
            image: "images/country/spanish.png",
        },
        de: {
            name: "German",
            country: "Germany, Austria, Switzerland",
            family: "Indo-European (Germanic)",
            speakers: "130M+ total speakers",
            intro: "German is central to European engineering, research, and higher education opportunities.",
            usage: [
                "Official in Germany, Austria, and one of official languages in Switzerland.",
                "Important for technical industries, research institutions, and apprenticeships.",
                "Useful for careers in manufacturing, automotive, and industrial design.",
            ],
            countryFacts: [
                "Germany has one of Europe’s largest economies and strong export sectors.",
                "German-speaking countries are known for technical education quality.",
                "Many universities and companies offer international pathways for skilled learners.",
            ],
            image: "images/country/castle.png",
        },
    };

    var escapeHtml =
        global.DeepwellDom &&
        typeof global.DeepwellDom.escapeHtml === "function"
            ? global.DeepwellDom.escapeHtml
            : function (s) {
                  if (s == null || s === "") return "";
                  var d = document.createElement("div");
                  d.textContent = s;
                  return d.innerHTML;
              };

    function renderList(el, items) {
        if (!el) return;
        el.innerHTML = (items || [])
            .map(function (item) {
                return "<li>" + escapeHtml(item) + "</li>";
            })
            .join("");
    }

    function renderDetail(statusEl, articleEl, langRaw) {
        if (!articleEl) return;
        var key = (langRaw || "").toLowerCase().trim();
        var info = LANGUAGE_DETAILS[key];
        if (!info) {
            if (statusEl)
                statusEl.textContent =
                    "Language not found. Please select a language from Courses.";
            articleEl.style.display = "none";
            return;
        }

        if (statusEl) statusEl.textContent = "";
        articleEl.style.display = "block";
        document.getElementById("lang-title").textContent = info.name;
        document.getElementById("lang-name").textContent = info.name;
        document.getElementById("lang-country").textContent = info.country;
        document.getElementById("lang-family").textContent = info.family;
        document.getElementById("lang-speakers").textContent = info.speakers;
        document.getElementById("lang-intro").textContent = info.intro;
        document.getElementById("lang-country-image").src = info.image;
        document.getElementById("lang-country-image").alt =
            info.name + " country landmark";
        renderList(document.getElementById("lang-usage"), info.usage);
        renderList(
            document.getElementById("lang-country-facts"),
            info.countryFacts,
        );
        document.getElementById("lang-courses-link").href =
            "course.html?lang=" + encodeURIComponent(key);
        updateCourseCount(key);
    }

    function updateCourseCount(langCode) {
        var countEl = document.getElementById("lang-course-count");
        if (!countEl) return;
        countEl.textContent = "Loading...";
        fetch("/api/Courses", { headers: { Accept: "application/json" } })
            .then(function (res) {
                if (!res.ok) throw new Error("HTTP " + res.status);
                return res.json();
            })
            .then(function (courses) {
                var n = (courses || []).filter(function (c) {
                    return (
                        (c.languageCode || c.subjectCode || "")
                            .toLowerCase()
                            .trim() === langCode
                    );
                }).length;
                countEl.textContent = String(n);
            })
            .catch(function () {
                countEl.textContent = "N/A";
            });
    }

    global.DeepwellLanguage = {
        renderDetail: renderDetail,
    };
})(window);
