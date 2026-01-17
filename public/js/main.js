// Main JS file
console.log('ArogyaVax loaded');

// Dark Mode Toggle Logic
const toggleTheme = () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateToggleIcon(next);
};

const updateToggleIcon = (theme) => {
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
};

// Init Theme
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

document.addEventListener('DOMContentLoaded', () => {
    updateToggleIcon(savedTheme);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.addEventListener('click', toggleTheme);

    initGlobalChatbot();
});


// --- GLOBAL CHATBOT INJECTION ---
function initGlobalChatbot() {
    // 1. Inject HTML if not exists
    if (!document.querySelector('.chatbot')) {
        const chatbotHTML = `
        <button class="chatbot-toggler">
            <span>💬</span>
        </button>
        <div class="chatbot">
            <header>
                <h2>ArogyaVax Assistant</h2>
                <span class="close-btn" style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); cursor: pointer;">✕</span>
            </header>
            <ul class="chatbox">
                <li class="chat incoming">
                    <p>Hi there! 👋<br>How can I help you with your vaccination needs today?</p>
                </li>
            </ul>
            <div class="chat-input">
                <textarea placeholder="Type a message..." required></textarea>
                <span id="send-btn">➤</span>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', chatbotHTML);
    }

    // 2. Chatbot Logic
    const chatbotToggler = document.querySelector(".chatbot-toggler");
    const closeBtn = document.querySelector(".close-btn");
    const chatbox = document.querySelector(".chatbox");
    const chatInput = document.querySelector(".chat-input textarea");
    const sendChatBtn = document.querySelector(".chat-input span");

    if (chatbotToggler) {
        chatbotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));
        closeBtn.addEventListener("click", () => document.body.classList.remove("show-chatbot"));

        const createChatLi = (message, className) => {
            const chatLi = document.createElement("li");
            chatLi.classList.add("chat", className);
            chatLi.innerHTML = `<p>${message}</p>`;
            return chatLi;
        }

        const handleChat = () => {
            const userMessage = chatInput.value.trim();
            if (!userMessage) return;

            // Append User Message
            chatbox.appendChild(createChatLi(userMessage, "outgoing"));
            chatInput.value = "";
            chatbox.scrollTo(0, chatbox.scrollHeight);

            // Simulate Bot Response
            setTimeout(() => {
                const incomingChatLi = createChatLi("Thinking...", "incoming");
                chatbox.appendChild(incomingChatLi);
                chatbox.scrollTo(0, chatbox.scrollHeight);

                // Expanded Logic (Knowledge Base)
                let response = "I'm here to help! You can ask about **vaccines**, **schedules**, or **login**.";
                const msg = userMessage.toLowerCase();

                if (msg.includes('schedule') || msg.includes('time')) response = "You can view the full vaccination schedule in your **Patient Dashboard**. It tracks everything from birth to 12 years.";
                else if (msg.includes('login') || msg.includes('sign in')) response = "Click the **Login** button at the top right. If you are a nurse, toggle to 'Nurse Staff' on the login page.";
                else if (msg.includes('register') || msg.includes('sign up')) response = "New here? Click **Register**, fill in your details, and verify your email with the OTP.";
                else if (msg.includes('polio') || msg.includes('opv')) response = "Polio (OPV) is given at birth, 6 months, and 4-6 years. It protects against paralysis.";
                else if (msg.includes('bcg')) response = "BCG is the first vaccine given at birth to protect against Tuberculosis (TB).";
                else if (msg.includes('covid') || msg.includes('covaxin')) response = "We record COVID-19 vaccinations too! Check your dashboard for certificates.";
                else if (msg.includes('nurse')) response = "Nurses can log in to manage appointments and update patient records securely.";
                else if (msg.includes('hello') || msg.includes('hi')) response = "Hello! 👋 How can I assist you with ArogyaVax today?";

                incomingChatLi.querySelector("p").innerHTML = response.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>'); // Simple markdown parsing
            }, 600);
        }

        sendChatBtn.addEventListener("click", handleChat);
        chatInput.addEventListener("keyup", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleChat();
            }
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initGlobalChatbot();
});
