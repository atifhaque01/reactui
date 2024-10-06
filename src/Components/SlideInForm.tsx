import React, { useState } from 'react';
import './SlideInForm.css'; // Make sure to create and style this CSS file
import AppButton from '../CommonComponents/AppButton';
import Form from '../CommonComponents/Form';

const SlideInForm: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);
    const handleSubmit = (formData: { [key: string]: any }) => {
        // Handle form submission logic here with formData
        console.log(formData);
        handleClose();
    };

    return (
        <div style={{ textAlign: 'left' }}>
            <AppButton onClick={handleOpen} label={'Add Family Member'} primary={false} />
            <div className={`slide-in-form ${isOpen ? 'open' : ''}`} style={{ display: 'flex', padding: '10px' }}>
                <Form
                    formTitle={'Add Family Member'}
                    fields={[
                        { name: 'name', type: 'text', label: 'Name', required: true },
                        { name: 'gender', type: 'select', label: 'Gender', options:['Male', 'Female'], required: true },
                        { name: 'dob', type: 'date', label: 'Date of birth', required: true },
                        { name: 'description', type: 'textarea', label: 'Additional Notes', required: true },
                    ]}
                    onSubmit={handleSubmit}
                    onCancel={handleClose}
                />
            </div>
        </div>
    );
};

export default SlideInForm;