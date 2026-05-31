import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomSelect } from '../src/components/SelectComponents';

describe('CustomSelect', () => {
  it('renders and opens menu, allows selection', async () => {
    const values = ['A', 'B', 'C'];
    const onChange = vi.fn();
    render(<CustomSelect id="test-select" value="" values={values} onChange={onChange} placeholder="เลือก" />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    const option = await screen.findByText('B');
    expect(option).toBeInTheDocument();
    fireEvent.click(option);
    expect(onChange).toHaveBeenCalledWith('B');
  });
});
