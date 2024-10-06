import React from 'react';
import './Form.css';
import AppButton from './AppButton';

interface Field {
    options?: string[];
    name: string;
    type: string;
    label: string;
    required?: boolean;
}

interface FormProps {
    formTitle: string;
    cancelText?: string;
    submitText?: string;
    fields: Field[];
    onSubmit: (formData: { [key: string]: any }) => void;
    onCancel: () => void;
}

export const Form: React.FC<FormProps> = ({ formTitle, cancelText, submitText, fields, onSubmit, onCancel }) => {
    const [formData, setFormData] = React.useState<{ [key: string]: any }>({});
    const [missingFields, setMissingFields] = React.useState<string[]>([]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
        }
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        let missingFields: string[] = [];

        // Check for required fields
        for (const field of fields) {
            if (field.required && !formData[field.name]) {
                missingFields = [...missingFields, field.name];
            }
        }

        if (missingFields.length) {
            setMissingFields(missingFields);
            return;
        }

        const finalFormData = { ...formData };
        setFormData({});
        onSubmit(finalFormData);
    };

    const handleCancel = (e: React.MouseEvent) => {
        e.preventDefault();
        setFormData({});
        console.log(formData);
        onCancel();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setMissingFields(missingFields.filter((field) => field !== name));
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setMissingFields(missingFields.filter((field) => field !== name));
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setMissingFields(missingFields.filter((field) => field !== name));
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleTextAreaKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    };

    return (
        <form className="form-container" style={{ padding: '10px' }} onKeyDown={handleKeyDown}>
            <h2>{formTitle}</h2>
            {fields.map((field) => (
                <div className="form-group" key={field.name}>
                    <label htmlFor={field.name} className="form-label">{field.label}</label>
                    {field.type === 'select' && field.options ? (
                        <select
                            name={field.name}
                            id={field.name}
                            onChange={handleSelectChange} required={field.required || false}
                            className={field?.required && missingFields.includes(field.name) ? 'form-input-missing' : 'form-input'}
                            value={''}
                        >
                            {field.options.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    ) : field.type === 'textarea' ? (
                        <textarea
                            name={field.name}
                            id={field.name}
                            value={formData[field.name] || ''}
                            onChange={handleTextAreaChange}
                            required={field.required || false}
                            onKeyDown={handleTextAreaKeyDown}
                            className={field?.required && missingFields.includes(field.name) ? 'form-textarea-missing' : 'form-textarea'} />
                    ) : (
                        <input
                            type={field.type}
                            name={field.name}
                            id={field.name}
                            value={formData[field.name] || ''}
                            onChange={handleChange}
                            required={field?.required || false}
                            className={field?.required && missingFields.includes(field.name) ? 'form-input-missing' : 'form-input'}
                        />
                    )}
                </div>
            ))}

            <div className="form-group">
                <div className="form-label">
                    <AppButton label={submitText || 'Submit'} onClick={handleSubmit} primary={true} />
                </div>
                <div>
                    <AppButton label={cancelText || 'Cancel'} onClick={handleCancel} />
                </div>
            </div>
        </form>
    );
};

export default Form;