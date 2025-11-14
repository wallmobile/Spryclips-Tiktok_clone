import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Navbar from '../Navbar';

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      username: 'testuser',
      profile: { avatar: '' }
    },
    isAuthenticated: true,
    logout: jest.fn()
  })
}));

jest.mock('../../context/NotificationContext', () => ({
  useNotification: () => ({
    unreadCount: 3,
    notifications: [],
    markAllAsRead: jest.fn(),
    refreshNotifications: jest.fn()
  })
}));

jest.mock('../../store/videoStore', () => ({
  useVideoStore: () => ({
    searchQuery: '',
    setSearchQuery: jest.fn(),
    setSearchResults: jest.fn(),
    setIsSearching: jest.fn()
  })
}));

describe('Navbar', () => {
  it('renders search input and user avatar', async () => {
    render(<Navbar />);
    const user = userEvent.setup();
    await user.click(screen.getByTitle('Search'));
    expect(screen.getByPlaceholderText(/search\.\.\./i)).toBeInTheDocument();
    expect(screen.getByAltText('testuser')).toBeInTheDocument();
  });
});
