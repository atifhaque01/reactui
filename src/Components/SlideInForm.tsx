import React, { useState } from 'react';
import './SlideInForm.css'; // Make sure to create and style this CSS file
import AppButton from '../CommonComponents/AppButton';
import Form from '../CommonComponents/Form';
import { RawFamilyMember } from '../utils';
import submitMember from '../Services/submitMember';

interface SlideInFormProps {
    members: RawFamilyMember[];
}

const SlideInForm: React.FC<SlideInFormProps> = ({ members }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isAddRelationshipOpen, setIsAddRelationshipOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<RawFamilyMember | null>(null);
    const [missingFields, setMissingFields] = React.useState<string[]>([]);
    const [relationshipFields, setRelationshipFields] = React.useState<
        {
            name: string;
            type: string;
            label: string;
            complexOptions: RawFamilyMember[];
            relationshipOptions: string[];
            required: true;
        }[]>([]);
    const [relationshipCounter, setRelationshipCounter] = React.useState<number>(0);

    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);
    const handleOpenRel = () => setIsAddRelationshipOpen(true);
    const handleCloseRel = () => setIsAddRelationshipOpen(false);
    const handleSubmitMember = (formData: any) => {
        // Handle form submission logic here with formData
        console.log(formData);
        const member: RawFamilyMember = {
            data: {
                sex: formData.gender === "Male" ? "M" : "F",
                subtitles: `Date of birth: ${formData.dob}\n${formData.description}`,
                title: formData.title,
            }
        }
        setSelectedMember(member);
        submitMember(member);
        addRelationship();
        handleOpenRel();
        handleClose();
    };

    const addRelationship = () => {
        setRelationshipFields([...relationshipFields, {
            name: `relationship${relationshipCounter}`,
            type: 'select', label: '',
            complexOptions: members,
            relationshipOptions: ['Parent', 'Child', 'Spouse'],
            required: true
        }]);
        setRelationshipCounter(relationshipCounter + 1);
    }

    const handleSubmitRelationship = (formData: { [key: string]: any }) => {
        // Handle form submission logic here with formData
        console.log(formData);
        handleCloseRel();
    }

    return (
        <div style={{ textAlign: 'left' }}>
            <AppButton onClick={handleOpen} label={'Add Family Member'} primary={false} />
            <div className={`slide-in-form ${isOpen ? 'open' : ''}`} style={{ display: 'flex', padding: '10px' }}>
                <Form
                    formTitle={'Add Family Member'}
                    fields={[
                        { name: 'title', type: 'text', label: 'Name', required: true },
                        { name: 'gender', type: 'select', label: 'Gender', options: ['Male', 'Female'], required: true },
                        { name: 'dob', type: 'date', label: 'Date of birth' },
                        { name: 'description', type: 'textarea', label: 'Additional Info' },
                    ]}
                    onSubmit={handleSubmitMember}
                    onCancel={handleClose}
                    missingFields={missingFields}
                    setMissingFields={setMissingFields}
                />
            </div>
            <div className={`slide-in-form ${isAddRelationshipOpen ? 'open' : ''}`} style={{ display: 'flex', padding: '10px' }}>
                <Form
                    formTitle={`Add Relationship(s) for ${selectedMember?.data.title}`}
                    cancelText='Skip'
                    fields={relationshipFields}
                    onSubmit={handleSubmitRelationship}
                    onCancel={handleCloseRel}
                    missingFields={missingFields}
                    setMissingFields={setMissingFields}
                    // setFamilyMembers={setFamilyMembers}
                    addRelationship={addRelationship}
                />
            </div>
        </div>
    );
};

export default SlideInForm;