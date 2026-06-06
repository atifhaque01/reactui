import React from 'react';
import { RawFamilyMember } from '../utils';

interface PageHeaderProps {
    members?: RawFamilyMember[];
    onSelectMember?: (id: string) => void;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ members = [], onSelectMember }) => {
    const [query, setQuery] = React.useState('');
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLLIElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const matches = React.useMemo(() => {
        const trimmed = query.trim().toLowerCase();
        if (!trimmed) {
            return [];
        }
        return members
            .filter((member) => member.data.title.toLowerCase().includes(trimmed))
            .slice(0, 10);
    }, [query, members]);

    const handleSelect = (member: RawFamilyMember) => {
        if (member.id && onSelectMember) {
            onSelectMember(member.id);
        }
        setQuery('');
        setIsOpen(false);
    };

    return (
        <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'green' }}>
            <div className="logo" style={{ display: 'flex', alignItems: 'center', color: 'white' }}>
                <img src={process.env.PUBLIC_URL + '/logo512.png'} alt="Family Tree" style={{ height: '80px', marginRight: '10px' }} />
            </div>
            <nav style={{ flex: 1 }}>
                <ul className="nav-links" style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', listStyle: 'none', margin: 0, padding: 0 }}>
                    {/* <li><a href="/" style={{ color: 'white', textDecoration: 'none' }}>Home</a></li>
                    <li><a href="/about" style={{ color: 'white', textDecoration: 'none' }}>About</a></li>
                    <li><a href="/services" style={{ color: 'white', textDecoration: 'none' }}>Services</a></li>
                    <li><a href="/contact" style={{ color: 'white', textDecoration: 'none' }}>Contact</a></li> */}
                    <li ref={containerRef} style={{ position: 'relative' }}>
                        <input
                            type="text"
                            value={query}
                            placeholder="Search members..."
                            onChange={(event) => {
                                setQuery(event.target.value);
                                setIsOpen(true);
                            }}
                            onFocus={() => setIsOpen(true)}
                            style={{
                                padding: '6px 10px',
                                borderRadius: '4px',
                                border: 'none',
                                outline: 'none',
                                minWidth: '180px',
                                fontSize: '14px',
                            }}
                        />
                        {isOpen && matches.length > 0 && (
                            <ul
                                style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 4px)',
                                    left: 0,
                                    right: 0,
                                    margin: 0,
                                    padding: 0,
                                    listStyle: 'none',
                                    backgroundColor: 'white',
                                    color: 'black',
                                    borderRadius: '4px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                    maxHeight: '300px',
                                    overflowY: 'auto',
                                    zIndex: 1000,
                                }}
                            >
                                {matches.map((member) => (
                                    <li
                                        key={member.id}
                                        onClick={() => handleSelect(member)}
                                        onMouseDown={(event) => event.preventDefault()}
                                        onMouseEnter={(event) => (event.currentTarget.style.backgroundColor = '#f0f0f0')}
                                        onMouseLeave={(event) => (event.currentTarget.style.backgroundColor = 'white')}
                                        style={{
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {member.data.title}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </li>
                </ul>
            </nav>
        </header>
    );
};

export default PageHeader;