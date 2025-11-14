import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreatorAcademy from '../components/CreatorAcademy';

jest.mock('../api/creator-academy', () => ({
  getAllAcademyContent: jest.fn(),
  searchAcademyContent: jest.fn(),
  getAllLearningPaths: jest.fn(),
  getMyAcademyProgress: jest.fn(),
  getMyEnrolledPaths: jest.fn(),
  markContentCompleted: jest.fn(),
  enrollInLearningPath: jest.fn(),
}));

const mockedAcademyApi = require('../api/creator-academy');

const mockLesson = {
  _id: 'lesson-1',
  title: 'Master Short-Form Storytelling',
  category: 'strategy',
  summary: 'Craft engaging hooks for vertical video.',
  description: 'Detailed lesson text',
  difficulty: 'Intermediate',
  duration: 12,
  type: 'Workshop',
};

const mockPath = {
  _id: 'path-1',
  title: 'Creator Starter Pack',
  description: 'Everything you need to launch your creator journey.',
  level: 'Beginner',
  courses: [{ id: 'lesson-1' }],
};

describe('CreatorAcademy', () => {
  const user = userEvent.setup();
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    mockedAcademyApi.getAllAcademyContent.mockResolvedValue({
      content: [mockLesson],
    });
    mockedAcademyApi.getAllLearningPaths.mockResolvedValue([mockPath]);
    mockedAcademyApi.getMyAcademyProgress.mockResolvedValue({
      completed: [],
    });
    mockedAcademyApi.getMyEnrolledPaths.mockResolvedValue([]);
    mockedAcademyApi.searchAcademyContent.mockResolvedValue({
      content: [mockLesson],
    });
    mockedAcademyApi.markContentCompleted.mockResolvedValue({ success: true });
    mockedAcademyApi.enrollInLearningPath.mockResolvedValue({ success: true });
    alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    alertSpy.mockRestore();
  });

  it('renders learning path and lessons after data loads', async () => {
    render(<CreatorAcademy onClose={jest.fn()} />);

    expect(screen.getByTestId('academy-loading')).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByText('Creator Starter Pack')).toBeInTheDocument()
    );
    expect(screen.getByText('Master Short-Form Storytelling')).toBeInTheDocument();
    expect(mockedAcademyApi.getAllAcademyContent).toHaveBeenCalledTimes(1);
    expect(mockedAcademyApi.getAllLearningPaths).toHaveBeenCalledTimes(1);
  });

  it('marks a lesson as completed', async () => {
    render(<CreatorAcademy onClose={jest.fn()} />);

    const completeButton = await screen.findByRole('button', { name: /mark complete/i });
    await user.click(completeButton);

    await waitFor(() =>
      expect(mockedAcademyApi.markContentCompleted).toHaveBeenCalledWith('lesson-1')
    );
    await waitFor(() => expect(completeButton).toBeDisabled());
  });

  it('enrolls in a learning path', async () => {
    render(<CreatorAcademy onClose={jest.fn()} />);

    const enrollButton = await screen.findByRole('button', { name: /enroll now/i });
    await user.click(enrollButton);

    await waitFor(() =>
      expect(mockedAcademyApi.enrollInLearningPath).toHaveBeenCalledWith('path-1')
    );
  });
});

