import React, { useState } from 'react';
// import './SlideIn.css'; // Assuming you have some CSS for the slide-in effect
import { RawFamilyMember } from '../utils';

interface SlideInProps {
    members: RawFamilyMember[];
}

const SlideIn: React.FC<SlideInProps> = ({ members }) => {
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [dob, setDob] = useState('');
    const [notes, setNotes] = useState('');
    const [relationships, setRelationships] = useState<{ memberId: number; relationship: string }[]>([]);

    const handleAddRelationship = () => {
        setRelationships([...relationships, { memberId: 0, relationship: '' }]);
    };

    const handleRelationshipChange = (index: number, field: string, value: any) => {
        const newRelationships = [...relationships];
        newRelationships[index] = { ...newRelationships[index], [field]: value };
        setRelationships(newRelationships);
    };

    const handleSubmit = () => {
        if (step === 1) {
            setStep(2);
        } else {
            // onSubmit({ name, dob, notes, relationships });
        }
    };

    return (
        <div className="slide-in-form">
            {step === 1 && (
                <div className="form-step">
                    <h2>General Information</h2>
                    <label>
                        Name:
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
                    </label>
                    <label>
                        Date of Birth:
                        <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                    </label>
                    <label>
                        Notes:
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </label>
                    <button onClick={handleSubmit}>Next</button>
                </div>
            )}
            {step === 2 && (
                <div className="form-step">
                    <h2>Relationships</h2>
                    {relationships.map((relationship, index) => (
                        <div key={index} className="relationship">
                            <label>
                                Member:
                                <select
                                    value={relationship.memberId}
                                    onChange={(e) => handleRelationshipChange(index, 'memberId', parseInt(e.target.value))}
                                >
                                    <option value={0}>Select a member</option>
                                    {members.map((member) => (
                                        <option key={member.id} value={member.id}>
                                            {member?.data?.title}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                Relationship:
                                <input
                                    type="text"
                                    value={relationship.relationship}
                                    onChange={(e) => handleRelationshipChange(index, 'relationship', e.target.value)}
                                />
                            </label>
                        </div>
                    ))}
                    <button onClick={handleAddRelationship}>Add Relationship</button>
                    <button onClick={handleSubmit}>Submit</button>
                </div>
            )}
        </div>
    );
};

export default SlideIn;