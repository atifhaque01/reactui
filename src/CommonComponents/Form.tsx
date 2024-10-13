import React from 'react';
import './Form.css';
import AppButton from './AppButton';
import { RawFamilyMember } from '../utils';

interface Field {
    options?: string[];
    complexOptions?: RawFamilyMember[];
    relationshipOptions?: string[];
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
    missingFields: string[];
    setMissingFields: (fields: string[]) => void;
    // setFamilyMembers?: (members: RawFamilyMember[]) => void;
    addRelationship?: () => void;
}

export const Form: React.FC<FormProps> = (
    {
        formTitle,
        cancelText,
        submitText,
        fields,
        onSubmit,
        onCancel,
        missingFields,
        setMissingFields,
        // setFamilyMembers,
        addRelationship
    }) => {
    const [formData, setFormData] = React.useState<{ [key: string]: any }>({});
    const [missingBanner, setMissingBanner] = React.useState(false);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        let preMissingFields: string[] = [];
        setMissingBanner(false);

        // Check for required fields
        for (const field of fields) {
            if (field.required && !formData[field.name]) {
                preMissingFields = [...preMissingFields, field.name];
            }
        }

        if (preMissingFields.length) {
            setMissingFields(preMissingFields);
            setMissingBanner(true);
            return;
        }

        for (const field of fields) {
            if (field?.complexOptions && field.relationshipOptions) {
                if (!formData?.relationships || !formData?.relationshipType) {
                    setMissingBanner(true);
                    return;
                }
            }
        }

        const finalFormData = { ...formData };
        setFormData({});
        onSubmit(finalFormData);
    };

    const handleCancel = (e: React.MouseEvent) => {
        e.preventDefault();
        setFormData({});
        setMissingFields([]);
        setMissingBanner(false);
        console.log(formData);
        onCancel();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setMissingFields(missingFields.filter((field) => field !== name));
        setMissingBanner(false);
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (value === 'Please Select') {
            return;
        }
        setMissingFields(missingFields.filter((field) => field !== name));
        setMissingBanner(false);
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setMissingFields(missingFields.filter((field) => field !== name));
        setMissingBanner(false);
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
            {fields[0]?.complexOptions && <div className="form-group">
                <h3 className="form-label">Name</h3>
                <h3 className='form-right-header'>Relationship</h3>
            </div>}
            {fields.map((field) => (
                <div className="form-group" key={field.name}>
                    {!field?.complexOptions &&
                        <label htmlFor={field.name} className="form-label">{field.label}</label>
                    }
                    {field?.complexOptions &&
                        <select
                            name={field.name}
                            id={field.name}
                            onChange={handleSelectChange} required={field.required || false}
                            className="form-label-spcl-select"
                            value={formData[field.name] || 'Please Select'}
                        >
                            <option key={'Please Select'} value={'Please Select'}>
                                {'Please Select'}
                            </option>
                            {field?.complexOptions.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.data.title}
                                </option>
                            ))}
                        </select>
                    }
                    {field.type === 'select' && field.options ? (
                        <select
                            name={field.name}
                            id={field.name}
                            onChange={handleSelectChange} required={field.required || false}
                            value={formData[field.name] || 'Please Select'}
                            className={field?.required && missingFields.includes(field.name) ?
                                'form-input-missing' : 'form-input'}
                        >
                            <option key={'Please Select'} value={'Please Select'}>
                                {'Please Select'}
                            </option>
                            {field.options.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    ) : field.type === 'select' &&
                        field?.complexOptions && field.relationshipOptions?.length ? (
                        <div>
                            <select
                                name={'relationshipType'}
                                id={'relationshipType'}
                                onChange={handleSelectChange} required={field.required || false}
                                className="form-input"
                            >
                                <option key={'Please Select'} value={'Please Select'}>
                                    {'Please Select'}
                                </option>
                                {field.relationshipOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </div>
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
            {missingBanner && <div className="missing-banner">Please Fill all required data</div>}
            {fields[0]?.complexOptions &&
                <div className="form-group">
                    <div className="form-label">
                        <AppButton label={'+ Add'} onClick={handleSubmit} primary={true} />
                    </div>
                    <div>
                        <AppButton label={'- RemoveLast'} onClick={handleCancel} />
                    </div>
                </div>
            }
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