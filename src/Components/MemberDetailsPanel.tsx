import React from 'react';
import './MemberDetailsPanel.css';
import { FamilyMember } from '../tree/types';
import AppButton from '../CommonComponents/AppButton';

interface MemberDetailsPanelProps {
    member?: FamilyMember | null;
    onEdit?: () => void;
    onAddRelationship?: () => void;
}

// Treat the literal string "undefined" (from older saved data) as empty.
const cleanValue = (value: string): string => (value === 'undefined' ? '' : value);

// subtitles are stored as "Date of birth: <dob>\n<additional info>".
function parseSubtitles(subtitles: string | undefined): { dob: string; description: string } {
    if (!subtitles) {
        return { dob: '', description: '' };
    }
    const [first, ...rest] = subtitles.split('\n');
    const dobMatch = first.match(/^Date of birth:\s*(.*)$/);
    if (dobMatch) {
        return { dob: cleanValue(dobMatch[1].trim()), description: cleanValue(rest.join('\n').trim()) };
    }
    return { dob: '', description: cleanValue(subtitles.trim()) };
}

const MemberDetailsPanel: React.FC<MemberDetailsPanelProps> = ({ member, onEdit, onAddRelationship }) => {
    const { dob, description } = parseSubtitles(member?.data.subtitles);
    const sex = member?.data.sex === 'M' ? 'Male' : member?.data.sex === 'F' ? 'Female' : '';

    return (
        <div className={`member-details-panel ${member ? 'open' : ''}`}>
            {member && (
                <div className="member-details-content">
                    <h2 className="member-details-title">{member.data.title}</h2>
                    <div className="member-details-field">
                        <span className="member-details-label">Sex</span>
                        <span className="member-details-value">{sex || '—'}</span>
                    </div>
                    <div className="member-details-field">
                        <span className="member-details-label">Date of birth</span>
                        <span className="member-details-value">{dob || '—'}</span>
                    </div>
                    <div className="member-details-field">
                        <span className="member-details-label">Additional Info</span>
                        <span className="member-details-value">{description || '—'}</span>
                    </div>
                    <div className="member-details-actions">
                        {onEdit && <AppButton label={'Edit'} onClick={onEdit} primary={true} />}
                        {onAddRelationship && (
                            <AppButton label={'Add Relationship'} onClick={onAddRelationship} primary={false} />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MemberDetailsPanel;
