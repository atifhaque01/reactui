import React from 'react';

export const PageHeader: React.FC = () => {
    return (
        <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'green' }}>
            <div className="logo" style={{ display: 'flex', alignItems: 'center', color: 'white' }}>
                <img src={process.env.PUBLIC_URL + '/logo512.png'} alt="Family Tree" style={{ height: '80px', marginRight: '10px' }} />
            </div>
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