import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './TreeConstructor';

test('renders learn react link', () => {
  render(<App familyMembers={[]} familyRelations={[]} />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
