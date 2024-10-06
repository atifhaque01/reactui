import React from 'react';
// import './PageHeader.css'; // Assuming you will add some styles

export const PageHeader: React.FC = () => {
    return (
        <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'green', padding: '10px' }}>
            <div className="logo" style={{ color: 'white' }}>Family Tree</div>
            <nav style={{ flex: 1 }}>
                <ul className="nav-links" style={{ display: 'flex', justifyContent: 'space-around', listStyle: 'none', margin: 0, padding: 0 }}>
                    <li><a href="/" style={{ color: 'white', textDecoration: 'none' }}>Home</a></li>
                    <li><a href="/about" style={{ color: 'white', textDecoration: 'none' }}>About</a></li>
                    <li><a href="/services" style={{ color: 'white', textDecoration: 'none' }}>Services</a></li>
                    <li><a href="/contact" style={{ color: 'white', textDecoration: 'none' }}>Contact</a></li>
                </ul>
            </nav>
        </header>
    );
};

export default PageHeader;