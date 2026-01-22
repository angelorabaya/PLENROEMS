import React from 'react';
import * as Switch from '@radix-ui/react-switch';
import { FiSun, FiMoon } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';
import '../styles/theme-toggle.css';

const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="theme-toggle-container">
            <Switch.Root
                className="SwitchRoot"
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
                aria-label="Toggle theme"
            >
                <Switch.Thumb className="SwitchThumb">
                    {theme === 'dark' ? (
                        <FiMoon className="toggle-icon moon" />
                    ) : (
                        <FiSun className="toggle-icon sun" />
                    )}
                </Switch.Thumb>
            </Switch.Root>
        </div>
    );
};

export default ThemeToggle;
