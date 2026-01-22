import React from 'react';

const Placeholder = ({ title, icon }) => {
    return (
        <div className="placeholder-page">
            <div className="placeholder-content">
                <div className="placeholder-icon">{icon}</div>
                <h2 className="placeholder-title">{title}</h2>
                <p className="placeholder-text">Coming soon</p>
            </div>
        </div>
    );
};

export default Placeholder;
