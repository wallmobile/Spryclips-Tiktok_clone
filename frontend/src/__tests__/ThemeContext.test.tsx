import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

const ThemeToggleTester = () => {
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <div>
      <span data-testid="mode-indicator">{darkMode ? 'dark' : 'light'}</span>
      <button onClick={toggleDarkMode}>toggle</button>
    </div>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    cleanup();
    document.body.classList.remove('dark-mode');
    document.documentElement.classList.remove('dark-mode');
    window.localStorage.clear();
  });

  it('toggles dark mode class and persists preference', () => {
    render(
      <ThemeProvider>
        <ThemeToggleTester />
      </ThemeProvider>
    );

    const indicator = screen.getByTestId('mode-indicator');
    const toggleButton = screen.getByText('toggle');

    expect(indicator).toHaveTextContent('light');
    expect(document.body.classList.contains('dark-mode')).toBe(false);

    fireEvent.click(toggleButton);

    expect(indicator).toHaveTextContent('dark');
    expect(document.body.classList.contains('dark-mode')).toBe(true);
    expect(document.documentElement.classList.contains('dark-mode')).toBe(true);
    expect(JSON.parse(window.localStorage.getItem('darkMode') || 'false')).toBe(true);

    fireEvent.click(toggleButton);

    expect(indicator).toHaveTextContent('light');
    expect(document.body.classList.contains('dark-mode')).toBe(false);
    expect(JSON.parse(window.localStorage.getItem('darkMode') || 'true')).toBe(false);
  });
});

