import { memo } from 'react';

const Card = memo(({ 
  children, 
  title,
  subtitle,
  className = '',
  padding = 'default',
  hover = false
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    default: 'p-6',
    lg: 'p-8'
  };
  
  const hoverClass = hover ? 'hover:border-neutral-300 hover:shadow-sm transition-all duration-150' : '';
  
  return (
    <div className={`bg-white rounded-xl border border-gray-200 ${hoverClass} ${className}`}>
      {(title || subtitle) && (
        <div className={`border-b border-gray-100 ${paddingClasses[padding]} pb-4`}>
          {title && (
            <h3 className="text-lg font-semibold text-neutral-900 mb-0">{title}</h3>
          )}
          {subtitle && (
            <p className="text-sm text-neutral-500 mt-1 mb-0">{subtitle}</p>
          )}
        </div>
      )}
      
      <div className={title || subtitle ? paddingClasses[padding] + ' pt-6' : paddingClasses[padding]}>
        {children}
      </div>
    </div>
  );
});

Card.displayName = 'Card';

export default Card;
