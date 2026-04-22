(function (global) {
    var LANGUAGE_DETAILS = {
        ar: {
            name: "Arabic",
            country: "Saudi Arabia and Arabic-speaking regions",
            family: "Afro-Asiatic (Semitic)",
            speakers: "300M+ speakers",
            intro: "Arabic connects learners to a wide regional network in the Middle East and North Africa across education, business, and culture.",
            usage: [
                "Used as an official or major language in many countries across the MENA region.",
                "Important for diplomacy, media, religious studies, and cross-border trade.",
                "Learning Modern Standard Arabic builds a strong base for regional communication.",
            ],
            countryFacts: [
                "Arabic-speaking countries span diverse economies, climates, and cultural traditions.",
                "Major regional hubs include global energy, logistics, and finance sectors.",
                "Arabic literature, calligraphy, and music have deep historical influence.",
            ],
            image: "images/country/arabic.jpg",
        },
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
            image: "images/country/china.jpg",
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
            image: "images/country/uk.jpg",
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
            image: "images/country/france.jpg",
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
            image: "images/country/sweden.jpg",
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
            image: "images/country/italy.jpg",
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
            image: "images/country/japan.jpg",
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
            image: "images/country/spain.jpg",
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
            image: "images/country/germany.jpg",
        },
        da: {
            name: "Danish",
            country: "Denmark",
            family: "Indo-European (North Germanic)",
            speakers: "6M+ speakers",
            intro: "Danish supports integration into daily life, study, and work in Denmark while opening the door to broader Scandinavian communication.",
            usage: [
                "Primary language for public services, education, and employment in Denmark.",
                "Useful for long-term residence, professional networking, and local community life.",
                "Helps learners understand cultural context in Nordic workplaces and society.",
            ],
            countryFacts: [
                "Denmark is recognized for design, sustainability, and social trust.",
                "Copenhagen is a major center for innovation and green urban planning.",
                "Danish work culture values clarity, collaboration, and balanced routines.",
            ],
            image: "images/country/denmark.jpg",
        },
        nl: {
            name: "Dutch",
            country: "Netherlands, Belgium",
            family: "Indo-European (West Germanic)",
            speakers: "24M+ speakers",
            intro: "Dutch is practical for education and career opportunities in the Netherlands and Flanders, especially in international-facing sectors.",
            usage: [
                "Used in government, education, and business across Dutch-speaking regions.",
                "Useful for relocation, university life, and customer-facing roles.",
                "Supports communication in logistics, trade, and engineering contexts.",
            ],
            countryFacts: [
                "The Netherlands is known for trade, water management, and technology ecosystems.",
                "Dutch cities combine strong international access with local cultural identity.",
                "Dutch-speaking Belgium adds multilingual exposure in European institutions.",
            ],
            image: "images/country/netherlands.jpg",
        },
        fi: {
            name: "Finnish",
            country: "Finland",
            family: "Uralic",
            speakers: "5M+ speakers",
            intro: "Finnish helps learners fully participate in Finnish society, from education and public services to long-term career pathways.",
            usage: [
                "Core language for local administration, schools, and healthcare access.",
                "Important for permanent settlement and workplace communication in Finland.",
                "Useful for understanding everyday life, media, and social norms.",
            ],
            countryFacts: [
                "Finland is known for education quality, technology, and innovation.",
                "Finnish society emphasizes reliability, directness, and equal opportunity.",
                "Nature and seasonal rhythms strongly shape daily life and culture.",
            ],
            image: "images/country/finland.jpg",
        },
        el: {
            name: "Greek",
            country: "Greece, Cyprus",
            family: "Indo-European (Hellenic)",
            speakers: "13M+ speakers",
            intro: "Greek offers practical communication value in Greece and Cyprus, with added cultural depth through one of the world’s oldest literary traditions.",
            usage: [
                "Used across public life, education, and business in Greek-speaking regions.",
                "Useful for tourism, local services, and long-term residence.",
                "Supports learning in culture, history, and Mediterranean regional contexts.",
            ],
            countryFacts: [
                "Greece combines major tourism activity with shipping and service industries.",
                "Greek cultural heritage continues to influence global arts and scholarship.",
                "Cyprus adds multilingual exposure and strong international business links.",
            ],
            image: "images/country/greece.jpg",
        },
        he: {
            name: "Hebrew",
            country: "Israel",
            family: "Afro-Asiatic (Semitic)",
            speakers: "9M+ speakers",
            intro: "Hebrew is essential for daily communication, study, and professional life in Israel, especially in technology and innovation settings.",
            usage: [
                "Primary language in education, public institutions, and local workplaces.",
                "Useful for relocation, community participation, and professional growth.",
                "Important in sectors such as software, biotech, and research.",
            ],
            countryFacts: [
                "Israel has a globally connected startup and technology ecosystem.",
                "Hebrew media and contemporary culture are highly active and diverse.",
                "Multilingual communities create rich real-world language practice contexts.",
            ],
            image: "images/country/israel.jpg",
        },
        is: {
            name: "Icelandic",
            country: "Iceland",
            family: "Indo-European (North Germanic)",
            speakers: "350K+ speakers",
            intro: "Icelandic supports local integration in Iceland and offers access to a unique linguistic and literary tradition.",
            usage: [
                "Used in government, schools, and most community settings in Iceland.",
                "Helpful for long-term residence, workplace communication, and services.",
                "Useful for understanding local media, culture, and civic life.",
            ],
            countryFacts: [
                "Iceland is known for renewable energy use and strong digital literacy.",
                "The country preserves historical language traditions in modern contexts.",
                "Small-community communication makes practical language ability especially valuable.",
            ],
            image: "images/country/iceland.jpg",
        },
        ko: {
            name: "Korean",
            country: "South Korea",
            family: "Koreanic",
            speakers: "80M+ speakers",
            intro: "Korean is increasingly valuable for technology, media, and business engagement across East Asia and global Korean-speaking communities.",
            usage: [
                "Primary language for education, services, and industry in South Korea.",
                "Useful for careers linked to Korean companies and supply chains.",
                "Important in media sectors including entertainment, gaming, and design.",
            ],
            countryFacts: [
                "South Korea is a major center for electronics, automotive, and digital services.",
                "Korean popular culture has strong global influence in music and film.",
                "Workplace communication often reflects hierarchy and context sensitivity.",
            ],
            image: "images/country/korea.jpg",
        },
        no: {
            name: "Norwegian",
            country: "Norway",
            family: "Indo-European (North Germanic)",
            speakers: "5M+ speakers",
            intro: "Norwegian supports everyday communication and long-term career opportunities in Norway’s public and private sectors.",
            usage: [
                "Used in administration, education, and most local workplaces in Norway.",
                "Useful for settlement, professional networking, and social participation.",
                "Provides strong access to Scandinavian regional communication patterns.",
            ],
            countryFacts: [
                "Norway is known for energy, maritime industries, and high living standards.",
                "Norwegian society emphasizes trust, punctuality, and clear communication.",
                "Regional dialect variation makes listening practice especially important.",
            ],
            image: "images/country/norway.jpg",
        },
        fa: {
            name: "Persian",
            country: "Iran and Persian-speaking regions",
            family: "Indo-European (Iranian)",
            speakers: "120M+ speakers",
            intro: "Persian (Farsi) is a major regional language with strong literary heritage and practical value in cultural, academic, and business contexts.",
            usage: [
                "Used in public life, education, and media in Iran and related regions.",
                "Useful for cross-cultural communication and regional market understanding.",
                "Supports study of Persian literature, history, and contemporary society.",
            ],
            countryFacts: [
                "Persian cultural influence spans poetry, architecture, and visual arts.",
                "Iran links historical traditions with modern urban and academic life.",
                "Persian-speaking communities are active across multiple countries.",
            ],
            image: "images/country/iran.jpg",
        },
        pl: {
            name: "Polish",
            country: "Poland",
            family: "Indo-European (Slavic)",
            speakers: "45M+ speakers",
            intro: "Polish is practical for education and employment in Poland and valuable for communication with Polish-speaking communities across Europe.",
            usage: [
                "Core language in schools, services, and local business in Poland.",
                "Useful for relocation, administration, and workplace integration.",
                "Helpful for industries such as manufacturing, logistics, and IT.",
            ],
            countryFacts: [
                "Poland has a fast-developing economy with strong regional connectivity.",
                "Major cities combine historical identity with modern business growth.",
                "Polish culture places value on community ties and national traditions.",
            ],
            image: "images/country/poland.jpg",
        },
        pt: {
            name: "Portuguese",
            country: "Portugal, Brazil and Lusophone regions",
            family: "Indo-European (Romance)",
            speakers: "260M+ speakers",
            intro: "Portuguese connects learners to one of the largest global language communities across Europe, South America, and Africa.",
            usage: [
                "Official language in Portugal, Brazil, and multiple Lusophone countries.",
                "Useful for global business, tourism, and international collaboration.",
                "Supports communication in education, trade, and cultural industries.",
            ],
            countryFacts: [
                "Portuguese-speaking countries span multiple continents and markets.",
                "Brazil drives large-scale media, technology, and service demand.",
                "Portuguese culture has strong global visibility in music and literature.",
            ],
            image: "images/country/portugal.jpg",
        },
        ru: {
            name: "Russian",
            country: "Russia and Eastern Europe",
            family: "Indo-European (Slavic)",
            speakers: "250M+ speakers",
            intro: "Russian is widely used across Eurasia and remains valuable in technical fields, regional business, and cross-border communication.",
            usage: [
                "Used in education, media, and commerce across multiple countries.",
                "Useful for engineering, science, and regional market communication.",
                "Helps learners navigate multilingual environments in Eastern Europe and Central Asia.",
            ],
            countryFacts: [
                "Russian-speaking regions cover vast geographic and cultural diversity.",
                "The language has a major literary and scientific publication tradition.",
                "Regional communication often combines formal and informal registers.",
            ],
            image: "images/country/russia.jpg",
        },
        th: {
            name: "Thai",
            country: "Thailand",
            family: "Kra-Dai",
            speakers: "60M+ speakers",
            intro: "Thai supports practical communication in one of Southeast Asia’s major tourism, service, and regional business hubs.",
            usage: [
                "Primary language for public services, education, and local business in Thailand.",
                "Useful for hospitality, travel, healthcare, and customer-facing roles.",
                "Helps learners engage confidently in daily life and professional contexts.",
            ],
            countryFacts: [
                "Thailand is a major regional destination for tourism and trade.",
                "Thai communication reflects politeness levels and social context.",
                "Bangkok is a key urban center for services, retail, and logistics.",
            ],
            image: "images/country/thailand.jpg",
        },
        tr: {
            name: "Turkish",
            country: "Turkey",
            family: "Turkic",
            speakers: "90M+ speakers",
            intro: "Turkish is useful for communication across a strategically connected region bridging Europe and Asia.",
            usage: [
                "Primary language in education, services, and commerce in Turkey.",
                "Important for regional logistics, manufacturing, and trade partnerships.",
                "Useful for long-term residence and daily communication in local communities.",
            ],
            countryFacts: [
                "Turkey has strong regional transport, tourism, and industrial sectors.",
                "Istanbul is a major cultural and commercial crossroads.",
                "Turkish media and business networks extend across nearby regions.",
            ],
            image: "images/country/turkey.jpg",
        },
        vi: {
            name: "Vietnamese",
            country: "Vietnam",
            family: "Austroasiatic",
            speakers: "85M+ speakers",
            intro: "Vietnamese supports communication in one of Southeast Asia’s fastest-growing economies and expanding international markets.",
            usage: [
                "Primary language in government, education, and commerce in Vietnam.",
                "Useful for manufacturing, sourcing, logistics, and service industries.",
                "Helps learners engage with local communities and workplace communication.",
            ],
            countryFacts: [
                "Vietnam has strong growth in technology, manufacturing, and exports.",
                "Major cities combine rapid development with rich local traditions.",
                "Vietnamese diaspora communities create wider global language use.",
            ],
            image: "images/country/vietnam.jpg",
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

    function fallbackUsage(name) {
        return [
            name + " is actively used in education, daily communication, and professional settings.",
            "This course track helps learners build practical communication confidence.",
            "You can use this language in travel, study, and cross-cultural teamwork.",
        ];
    }

    function fallbackFacts(name, country) {
        return [
            country + " has a rich cultural identity linked to the " + name + " language.",
            "Learning " + name + " helps you understand local social and communication norms.",
            "Language study supports deeper connection with media, people, and institutions.",
        ];
    }

    function buildLanguageInfo(key) {
        var detail = LANGUAGE_DETAILS[key];
        if (!detail) return null;
        var name = detail.name || key.toUpperCase();
        var country = detail.country || name;
        return {
            name: name,
            country: country,
            family: detail.family || "Language family information coming soon",
            speakers: detail.speakers || "Speaker estimate coming soon",
            intro:
                detail.intro ||
                (name +
                    " is available at Deepwell for learners who want practical, real-world communication ability."),
            usage: detail.usage || fallbackUsage(name),
            countryFacts: detail.countryFacts || fallbackFacts(name, country),
            image: detail.image || "images/country/uk.jpg",
        };
    }

    function applyLanguageInfo(statusEl, articleEl, key, info) {
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

    function renderDetail(statusEl, articleEl, langRaw) {
        if (!articleEl) return;
        var key = (langRaw || "").toLowerCase().trim();
        var info = buildLanguageInfo(key);
        if (info) {
            applyLanguageInfo(statusEl, articleEl, key, info);
            return;
        }

        if (statusEl) statusEl.textContent = "Loading language details…";
        fetch("/api/Courses", { headers: { Accept: "application/json" } })
            .then(function (res) {
                if (!res.ok) throw new Error("HTTP " + res.status);
                return res.json();
            })
            .then(function (courses) {
                var match = (courses || []).find(function (c) {
                    return (
                        (c.languageCode || c.subjectCode || "")
                            .toLowerCase()
                            .trim() === key
                    );
                });
                if (!match) throw new Error("No matching language");
                var name = (match.languageName || match.subjectName || key).trim();
                var dynamicInfo = {
                    name: name,
                    country: name,
                    family: "Language family information coming soon",
                    speakers: "Speaker estimate coming soon",
                    intro:
                        name +
                        " is available at Deepwell. We are preparing a full language profile for this page.",
                    usage: fallbackUsage(name),
                    countryFacts: fallbackFacts(name, name),
                    image: "images/country/uk.jpg",
                };
                applyLanguageInfo(statusEl, articleEl, key, dynamicInfo);
            })
            .catch(function () {
                if (statusEl)
                    statusEl.textContent =
                        "Language not found. Please select a language from Courses.";
                articleEl.style.display = "none";
            });
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
