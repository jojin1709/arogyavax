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

    // Chatbot Logic
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

                // Simple Logic
                let response = "I'm just a demo bot, but I can help you register or find a hospital!";
                if (userMessage.toLowerCase().includes('schedule')) response = "You can view the vaccination schedule in your patient dashboard after logging in.";
                if (userMessage.toLowerCase().includes('login')) response = "Click the 'Login' button at the top right to access your account.";
                if (userMessage.toLowerCase().includes('vaccine')) response = "We support tracking for BCG, OPV, Hepatitis B, and many other mandatory vaccines.";

                incomingChatLi.querySelector("p").textContent = response;
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
});
