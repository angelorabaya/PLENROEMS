import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSend, FiArrowLeft, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';
import aiBotImage from '../assets/airobot.png';
import '../styles/ordinance-bot.css';

// API URL helper
const getApiUrl = () => {
    return '';
};

const OrdinanceBot = () => {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const [messages, setMessages] = useState(() => {
        try {
            const saved = localStorage.getItem('ordinance_bot_chat_history');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to load chat history", e);
            return [];
        }
    });
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [botStatus, setBotStatus] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Check bot status on mount
    useEffect(() => {
        checkBotStatus();
    }, []);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input on mount and after any state change
    useEffect(() => {
        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => {
            inputRef.current?.focus();
        }, 50);
        return () => clearTimeout(timer);
    }, [messages, isLoading]);

    // Save chat history to local storage
    useEffect(() => {
        localStorage.setItem('ordinance_bot_chat_history', JSON.stringify(messages));
    }, [messages]);

    const checkBotStatus = async () => {
        try {
            const res = await fetch(`${getApiUrl()}/api/ordinance-bot/status`);
            const data = await res.json();
            setBotStatus(data);
            if (!data.ready) {
                setError(data.message);
            }
        } catch (err) {
            setError('Unable to connect to the server');
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setError(null);

        // Add user message to chat
        setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const res = await fetch(`${getApiUrl()}/api/ordinance-bot/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to get response');
            }

            // Add bot response to chat
            setMessages((prev) => [...prev, { role: 'bot', content: data.response }]);
        } catch (err) {
            setError(err.message);
            // Remove the user message if there was an error
            setMessages((prev) => prev.slice(0, -1));
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(e);
            // Immediately refocus the input after submission
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    };

    const clearChat = () => {
        setMessages([]);
        setError(null);
        localStorage.removeItem('ordinance_bot_chat_history');
    };

    return (
        <div className={`ordinance-bot-page ${theme === 'dark' ? 'dark' : 'light'}`}>
            {/* Header */}
            <header className="ob-header">
                <div className="ob-header-left">
                    <button
                        className="ob-back-btn"
                        onClick={() => navigate(-1)}
                        aria-label="Go back"
                    >
                        <FiArrowLeft size={18} />
                    </button>
                    <div className="ob-title-group">
                        <div className="ob-icon-wrapper">
                            <img src={aiBotImage} alt="AI Bot" className="ob-bot-image" />
                        </div>
                        <div>
                            <h1 className="ob-title">Ordinance Bot</h1>
                            <p className="ob-subtitle">Ask questions about the PLENRO Ordinance</p>
                        </div>
                    </div>
                </div>
                <button
                    className="ob-clear-btn"
                    onClick={clearChat}
                    disabled={messages.length === 0}
                >
                    <FiRefreshCw size={14} />
                    Clear Chat
                </button>
            </header>

            {/* Chat Container */}
            <main className="ob-chat-container">
                <div className="ob-messages-wrapper">
                    {messages.length === 0 && !error && (
                        <div className="ob-empty-state">
                            <div className="ob-empty-icon">
                                <img src={aiBotImage} alt="AI Bot" className="ob-bot-image-large" />
                            </div>
                            <h2>Welcome to Ordinance Bot</h2>
                            <p>
                                I can answer questions about the <strong>PLENRO Ordinance</strong>{' '}
                                document. Ask me about regulations, requirements, penalties, or any
                                specific sections.
                            </p>
                            <div className="ob-suggestions">
                                <button onClick={() => setInput('What is this ordinance about?')}>
                                    What is this ordinance about?
                                </button>
                                <button
                                    onClick={() =>
                                        setInput('What are the penalties for violations?')
                                    }
                                >
                                    What are the penalties?
                                </button>
                                <button
                                    onClick={() => setInput('Who does this ordinance apply to?')}
                                >
                                    Who does this apply to?
                                </button>
                            </div>
                        </div>
                    )}

                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`ob-message ob-message-${msg.role}`}
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            <div className="ob-message-bubble">
                                <div className="ob-message-content">{msg.content}</div>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="ob-message ob-message-bot">
                            <div className="ob-message-bubble">
                                <div className="ob-typing-indicator">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="ob-error">
                            <FiAlertCircle size={18} />
                            <span>{error}</span>
                            <button onClick={() => setError(null)}>Dismiss</button>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </main>

            {/* Input Area */}
            <footer className="ob-input-area">
                <form onSubmit={sendMessage} className="ob-input-form">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about the PLENRO Ordinance..."
                        className="ob-input"
                        rows={1}
                        disabled={isLoading || (botStatus && !botStatus.ready)}
                    />
                    <button
                        type="submit"
                        className="ob-send-btn"
                        disabled={!input.trim() || isLoading || (botStatus && !botStatus.ready)}
                        aria-label="Send message"
                    >
                        <FiSend size={18} />
                    </button>
                </form>
                <p className="ob-disclaimer">
                    This bot only answers questions about the PLENRO Ordinance document.
                </p>
            </footer>
        </div>
    );
};

export default OrdinanceBot;
