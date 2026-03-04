import { memo } from 'react';

const Button = memo(({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  onClick,
  type = 'button',
  disabled = false,
  className = ''
}) => {
  const baseClasses = 'font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center';
  
  const variantClasses = {
    primary: 'bg-black text-white hover:bg-neutral-800 active:bg-black',
    secondary: 'bg-white text-black border border-neutral-300 hover:bg-neutral-50 active:bg-neutral-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
    success: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800',
    outline: 'border border-neutral-900 text-neutral-900 hover:bg-neutral-50 active:bg-neutral-100'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-base'
  };
  
  const widthClass = fullWidth ? 'w-full' : '';
  
  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`;
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={combinedClasses}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
