import { useState, memo } from 'react';
import { HiEye, HiEyeOff } from 'react-icons/hi';

const Input = memo(({ 
  label,
  type = 'text',
  placeholder = '',
  value,
  onChange,
  name,
  id,
  required = false,
  disabled = false,
  error = '',
  icon,
  className = '',
  showPasswordToggle = false,
  autoComplete,
  onBlur,
  onFocus,
  helperText = '',
  maxLength
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || name;
  
  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const inputType = (type === 'password' && showPasswordToggle && showPassword) ? 'text' : type;
  
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-neutral-400">{icon}</span>
          </div>
        )}
        
        <input
          type={inputType}
          id={inputId}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          maxLength={maxLength}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          className={`
            w-full px-4 py-2.5 border rounded-lg text-neutral-900 placeholder-neutral-400
            focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
            disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed
            transition-all duration-150
            ${icon ? 'pl-10' : ''}
            ${showPasswordToggle && type === 'password' ? 'pr-10' : ''}
            ${error ? 'border-red-500' : 'border-neutral-300'}
          `}
        />

        {showPasswordToggle && type === 'password' && (
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={0}
          >
            {showPassword ? (
              <HiEyeOff className="w-5 h-5" />
            ) : (
              <HiEye className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
      
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-red-500" role="alert">
          {error}
        </p>
      )}

      {!error && helperText && (
        <p id={`${inputId}-helper`} className="mt-1 text-sm text-neutral-500">
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
