import React from 'react';
import { render } from '@testing-library/react';
import TreeConstructor from './TreeConstructor';

test('renders without crashing when there is no data', () => {
  const { container } = render(<TreeConstructor familyMembers={[]} familyRelations={[]} />);
  expect(container).toBeInTheDocument();
});
