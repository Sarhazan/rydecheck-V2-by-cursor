// React
import { memo } from 'react';
import PropTypes from 'prop-types';

// Icons
import { Loader2 } from 'lucide-react';

/**
 * קומפוננטה להצגת טעינה
 * @param {Object} props
 * @param {string} props.message - הודעת טעינה (אופציונלי)
 * @param {string} props.size - גודל הספינר ('sm' | 'md' | 'lg')
 */
const LoadingSpinner = memo(function LoadingSpinner({ 
  message = 'טוען...', 
  size = 'md' 
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="text-center py-12">
      <Loader2 className={`${sizeClasses[size]} animate-spin mx-auto text-primary-600`} />
      {message && (
        <p className="mt-2 text-gray-600">{message}</p>
      )}
    </div>
  );
});

LoadingSpinner.propTypes = {
  message: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg'])
};

export default LoadingSpinner;
