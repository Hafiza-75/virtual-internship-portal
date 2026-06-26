import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'bot', text: "Hi! I'm your AI mentor. How can I help you today?" }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    
    const scrollRef = useRef(null);
    const chatbotRef = useRef(null); 

    // Auto-scroll logic
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Auto-close
    useEffect(() => {
        const handleClickOutside = (event) => {
            
            if (isOpen && chatbotRef.current && !chatbotRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]); 

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput("");
        setLoading(true);

        try {
            const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/chat/`, { 
                message: currentInput 
            });
            
            const botMessage = { role: 'bot', text: res.data.reply };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, { role: 'bot', text: "Sorry, I'm having trouble connecting to the server." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container} ref={chatbotRef}>
            {/* Chat Window */}
            {isOpen && (
                <div style={styles.chatWindow}>
                    <div style={styles.header}>
                        <span>✨ AI Career Guide</span>
                        <button onClick={() => setIsOpen(false)} style={styles.closeBtn}>×</button>
                    </div>
                    
                    <div style={styles.messageArea} ref={scrollRef}>
                        {messages.map((msg, i) => (
                            <div key={i} style={msg.role === 'user' ? styles.userMsg : styles.botMsg}>
                                {msg.text}
                            </div>
                        ))}
                        {loading && <div style={styles.botMsg}>Typing...</div>}
                    </div>

                    <div style={styles.inputArea}>
                        <input 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask me anything..."
                            style={styles.input}
                            disabled={loading}
                        />
                        <button 
                            onClick={handleSend} 
                            style={{...styles.sendBtn, opacity: loading ? 0.5 : 1}}
                            disabled={loading}
                        >
                            ➤
                        </button>
                    </div>
                </div>
            )}

            {/* Floating Button */}
            <button onClick={() => setIsOpen(!isOpen)} style={styles.fab}>
                <img src="https://cdn-icons-png.flaticon.com/512/4712/4712035.png" alt="bot" style={{width: '40px'}} />
            </button>
        </div>
    );
};

const styles = {
    container: { position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000, fontFamily: 'Arial' },
    fab: { width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#911825', border: 'none', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    chatWindow: { width: '320px', height: '450px', backgroundColor: 'white', borderRadius: '15px', display: 'flex', flexDirection: 'column', marginBottom: '15px', boxShadow: '0 5px 25px rgba(0,0,0,0.15)', overflow: 'hidden' },
    header: { backgroundColor: '#911825', color: 'white', padding: '15px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' },
    closeBtn: { background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' },
    messageArea: { flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#f9f9f9' },
    botMsg: { alignSelf: 'flex-start', backgroundColor: '#eee', padding: '10px', borderRadius: '10px 10px 10px 0', maxWidth: '80%', fontSize: '14px' },
    userMsg: { alignSelf: 'flex-end', backgroundColor: '#911825', color: 'white', padding: '10px', borderRadius: '10px 10px 0 10px', maxWidth: '80%', fontSize: '14px' },
    inputArea: { padding: '10px', borderTop: '1px solid #ddd', display: 'flex', gap: '5px' },
    input: { flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '5px', outline: 'none' },
    sendBtn: { backgroundColor: '#911825', border: 'none', color: 'white', borderRadius: '5px', padding: '5px 12px', cursor: 'pointer' }
};

export default Chatbot;