// Shared Translation Data & Logic

const translations = {
    en: {
        nav_home: "Home",
        nav_centers: "Find Centers",
        nav_about: "About",
        nav_login: "Login",
        nav_register: "Register",
        hero_title: "Smart Immunization for a Healthier Future",
        hero_desc: "Digitally manage vaccination records, schedules, and reminders for your family. A secure platform for parents, hospitals, and administrators.",
        btn_get_started: "Get Started",
        btn_learn_more: "Learn More",
        learn_title: "Learn About Vaccines",
        learn_subtitle: "Understand the vaccines that protect your child.",
        desc_polio: "Oral Polio Vaccine primarily protects against the poliovirus, which can cause paralysis.",
        desc_covid: "Vaccines designed to protect against COVID-19 and its severe complications.",
        desc_bcg: "Bacille Calmette-Guerin vaccine is primarily used against tuberculosis (TB).",
        desc_hepb: "Recommended for all infants at birth to protect against Hepatitis B virus infection.",
        // Common App Terms
        lbl_email: "Email Address",
        lbl_password: "Password",
        lbl_phone: "Phone Number",
        lbl_name: "Full Name",
        btn_submit: "Submit",
        btn_cancel: "Cancel",
        msg_welcome: "Welcome"
    },
    ml: {
        nav_home: "ഹോം",
        nav_centers: "കേന്ദ്രങ്ങൾ",
        nav_about: "ഞങ്ങളെ കുറിച്ച്",
        nav_login: " ലോഗിൻ",
        nav_register: "രജിസ്റ്റർ",
        hero_title: "ആരോഗ്യമുള്ള ഭാവിക്കായി സ്മാർട്ട് പ്രതിരോധകുത്തിവയ്പ്പ്",
        hero_desc: "നിങ്ങളുടെ കുടുംബത്തിനായുള്ള വാക്സിനേഷൻ രേഖകളും ഷെഡ്യൂളുകളും ഓർമ്മപ്പെടുത്തലുകളും ഡിജിറ്റലായി കൈകാര്യം ചെയ്യുക.",
        btn_get_started: "തുടങ്ങാം",
        btn_learn_more: "കൂടുതൽ അറിയുക",
        learn_title: "വാക്സിനുകളെക്കുറിച്ച് അറിയുക",
        learn_subtitle: "നിങ്ങളുടെ കുട്ടിയെ സംരക്ഷിക്കുന്ന വാക്സിനുകൾ മനസ്സിലാക്കുക.",
        desc_polio: "പോളിയോ വൈറസിനെതിരെ പ്രവർത്തിക്കുന്ന തുള്ളിമരുന്ന്.",
        desc_covid: "കോവിഡിനെതിരെ സംരക്ഷണം നൽകുന്ന വാക്സിൻ.",
        desc_bcg: "ക്ഷയരോഗത്തിനെതിരെ നൽകുന്ന പ്രതിരോധ കുത്തിവയ്പ്പ്.",
        desc_hepb: "ഹെപ്പറ്റൈറ്റിസ് ബി വൈറസിനെതിരെ നൽകുന്ന വാക്സിൻ.",
        lbl_email: "ഇമെയിൽ വിലാസം",
        lbl_password: "പാസ്‌വേഡ്",
        lbl_phone: "ഫോൺ നമ്പർ",
        lbl_name: "യഥാർത്ഥ പേര്",
        btn_submit: "സമർപ്പിക്കുക",
        btn_cancel: "റദ്ദാക്കുക",
        msg_welcome: "സ്വാഗതം"
    },
    ta: {
        nav_home: "முகப்பு",
        nav_centers: "மையங்கள்",
        nav_about: "எங்களை பற்றி",
        nav_login: "உள்நுழைய",
        nav_register: "பதிவு",
        hero_title: "ஆரோக்கியமான எதிர்காலத்திற்கான ஸ்மார்ட் தடுப்பூசி",
        hero_desc: "உங்கள் குடும்பத்திற்கான தடுப்பூசி பதிவுகள் மற்றும் அட்டவணைகளை டிஜிட்டல் முறையில் நிர்வகிக்கவும்.",
        btn_get_started: "தொடங்குங்கள்",
        btn_learn_more: "மேலும் அறிக",
        learn_title: "தடுப்பூசிகள் பற்றி அறிக",
        learn_subtitle: "உங்கள் குழந்தையைப் பாதுகாக்கும் தடுப்பூசிகளைப் புரிந்து கொள்ளுங்கள்.",
        desc_polio: "போலியோ வைரஸுக்கு எதிரான வாய்வழி தடுப்பு மருந்து.",
        desc_covid: "கோவிட்-19 க்கு எதிரான தடுப்பூசி.",
        desc_bcg: "காசநோய்க்கு எதிரான தடுப்பூசி.",
        desc_hepb: "ஹெபடைடிஸ் பி வைரஸுக்கு எதிரான தடுப்பூசி.",
        lbl_email: "மின்னஞ்சல் முகவரி",
        lbl_password: "கடவுச்சொல்",
        lbl_phone: "தொலைபேசி எண்",
        lbl_name: "முழு பெயர்",
        btn_submit: "சமர்ப்பிக்கவும்",
        btn_cancel: "ரத்துசெய்",
        msg_welcome: "வெல்கம்"
    }
};

// Function to apply translation
function updateLanguage(lang) {
    if (!translations[lang]) return;
    const t = translations[lang];

    // Update text content for elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            el.textContent = t[key];
        }
    });

    // Update placeholders if needed
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (t[key]) {
            el.placeholder = t[key];
        }
    });

    // Save preference
    localStorage.setItem('prefLang', lang);

    // Update Selector if exists
    const selector = document.getElementById('langSelect');
    if (selector) selector.value = lang;
}

// Auto-run on load
document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('prefLang') || 'en';
    updateLanguage(savedLang);

    const langSelect = document.getElementById('langSelect');
    if (langSelect) {
        langSelect.value = savedLang;
        langSelect.addEventListener('change', (e) => {
            updateLanguage(e.target.value);
        });
    }
});
