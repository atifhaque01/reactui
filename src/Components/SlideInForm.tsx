import React, { useState } from 'react';
import './SlideInForm.css'; // Make sure to create and style this CSS file
import AppButton from '../CommonComponents/AppButton';
import Form from '../CommonComponents/Form';

interface SlideInFormProps {
    members: any[];
}

const SlideInForm: React.FC<SlideInFormProps> = ({ members }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isAddRelationshipOpen, setIsAddRelationshipOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState('');

    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);
    const handleOpenRel = () => setIsAddRelationshipOpen(true);
    const handleCloseRel = () => setIsAddRelationshipOpen(false);
    const handleSubmitMember = (formData: { [key: string]: any }) => {
        // Handle form submission logic here with formData
        console.log(formData);
        setSelectedMember(formData.name);
        handleOpenRel();
        handleClose();
    };

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
                        { name: 'name', type: 'text', label: 'Name', required: true },
                        { name: 'gender', type: 'select', label: 'Gender', options: ['Male', 'Female'] },
                        { name: 'dob', type: 'date', label: 'Date of birth' },
                        { name: 'description', type: 'textarea', label: 'Additional Notes' },
                    ]}
                    onSubmit={handleSubmitMember}
                    onCancel={handleClose}
                />
            </div>
            <div className={`slide-in-form ${isAddRelationshipOpen ? 'open' : ''}`} style={{ display: 'flex', padding: '10px' }}>
                <Form
                    formTitle={`Add Relationship for ${selectedMember}`}
                    cancelText='Skip'
                    fields={[
                        { name: 'relationships', type: 'select', label: 'Add Relationships', options: members },
                    ]}
                    onSubmit={handleSubmitRelationship}
                    onCancel={handleCloseRel}
                />
            </div>
        </div>
    );
};

export default SlideInForm;