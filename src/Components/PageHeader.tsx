import React from 'react';
import { RawFamilyMember } from '../utils';
import './PageHeader.css';

interface PageHeaderProps {
    members?: RawFamilyMember[];
    onSelectMember?: (id: string) => void;
    /** Action buttons (e.g. add/manage members) rendered on the right side. */
    children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ members = [], onSelectMember, children }) => {
    const [query, setQuery] = React.useState('');
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

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

    const showNoMatches = isOpen && query.trim().length > 0 && matches.length === 0;

    return (
        <header className="page-header">
            <div className="page-header-brand">
                <img className="page-header-logo" src={process.env.PUBLIC_URL + '/logo192.png'} alt="" />
                <h1 className="page-header-title">Family Tree</h1>
            </div>
            <div className="page-header-search" ref={containerRef}>
                <input
                    className="page-header-search-input"
                    type="search"
                    value={query}
                    placeholder="Search members…"
                    aria-label="Search family members"
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                />
                {isOpen && (matches.length > 0 || showNoMatches) && (
                    <ul className="page-header-search-results">
                        {matches.map((member) => (
                            <li
                                key={member.id}
                                className="page-header-search-result"
                                onClick={() => handleSelect(member)}
                                onMouseDown={(event) => event.preventDefault()}
                            >
                                {member.data.title}
                            </li>
                        ))}
                        {showNoMatches && <li className="page-header-search-empty">No matching members</li>}
                    </ul>
                )}
            </div>
            <div className="page-header-actions">{children}</div>
        </header>
    );
};

export default PageHeader;