import React from 'react';
import styled from 'styled-components';

interface AppButtonProps {
    label: string;
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
    primary?: boolean;
}

const StyledButton = styled.button<{ $primary?: boolean }>`
    background: ${props => (props.$primary ? 'green' : 'white')};
    color: ${props => (props.$primary ? 'white' : 'black')};
    border: solid green;
    padding: 10px 20px;
    font-size: 16px;
    cursor: pointer;
    border-radius: 5px;
    transition: background 0.3s;

    &:hover {
        background: ${props => (props.$primary ? 'darkblue' : 'lightgray')};
    }
`;

const AppButton: React.FC<AppButtonProps> = ({ label, onClick, primary }) => {
    return <StyledButton $primary={primary} onClick={onClick}>{label}</StyledButton>;
};

export default AppButton;