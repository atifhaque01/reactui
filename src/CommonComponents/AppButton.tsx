import React from 'react';
import styled from 'styled-components';

interface AppButtonProps {
    label: string;
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
    primary?: boolean;
    disabled?: boolean;
}

const StyledButton = styled.button<{ $primary?: boolean }>`
    background: ${props => (props.$primary ? '#1d6b3c' : 'white')};
    color: ${props => (props.$primary ? 'white' : '#1d6b3c')};
    border: 2px solid #1d6b3c;
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    border-radius: 6px;
    transition: background 0.2s, color 0.2s;
    white-space: nowrap;

    &:hover {
        background: ${props => (props.$primary ? '#155230' : '#e8f2ec')};
    }

    &:disabled {
        background: lightgray;
        color: gray;
        border-color: gray;
        cursor: not-allowed;
    }
`;

const AppButton: React.FC<AppButtonProps> = ({ label, onClick, primary, disabled }) => {
    return <StyledButton $primary={primary} onClick={onClick} disabled={disabled}>{label}</StyledButton>;
};

export default AppButton;